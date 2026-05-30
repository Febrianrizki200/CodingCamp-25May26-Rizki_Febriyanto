document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM Elements ---
    const form = document.getElementById('expense-form');
    const nameInput = document.getElementById('item-name');
    const amountInput = document.getElementById('item-amount');
    const categorySelect = document.getElementById('item-category');
    const customCategoryGroup = document.getElementById('custom-category-group');
    const customCategoryInput = document.getElementById('custom-category-input');
    const addCustomBtn = document.getElementById('add-custom-btn');
    const transactionList = document.getElementById('transaction-list');
    const netBalanceDisplay = document.getElementById('net-balance');
    const totalIncomeDisplay = document.getElementById('total-income');
    const totalExpenseDisplay = document.getElementById('total-expense');
    const chartCanvas = document.getElementById('expense-chart');
    const monthFilter = document.getElementById('month-filter');
    const themeToggle = document.getElementById('theme-toggle');
    
    // --- State Management ---
    let transactions = JSON.parse(localStorage.getItem('expenses')) || [];
    let customCategories = JSON.parse(localStorage.getItem('customCategories')) || {};
    let myChart = null;
    let currentTheme = localStorage.getItem('theme') || 'light';

    // Categories Configuration
    const incomeCategories = {
        'Gaji': '#10b981',
        'Sampingan': '#06b6d4',
        'Investasi': '#8b5cf6',
        'Lainnya': '#6b7280'
    };

    const defaultExpenseCategories = {
        'Food': '#f59e0b',
        'Transport': '#3b82f6',
        'Fun': '#ec4899',
        'Utilities': '#10b981',
        'Other': '#6b7280'
    };

    let allExpenseCategories = { ...defaultExpenseCategories, ...customCategories };

    // --- Helpers ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };

    function getSelectedType() {
        return document.querySelector('input[name="tx-type"]:checked').value;
    }

    // --- Initialization ---
    function init() {
        applyTheme(currentTheme);
        renderCategoryOptions();
        updateMonthFilterOptions();
        updateUI();
    }

    // --- Theme Mode ---
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        themeToggle.innerText = theme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('theme', theme);
        if(myChart) updateChart();
    }

    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(currentTheme);
    });

    // --- Dynamic Category Rendering ---
    function renderCategoryOptions() {
        const type = getSelectedType();
        categorySelect.innerHTML = '<option value="" disabled selected>Pilih kategori</option>';
        
        if (type === 'income') {
            customCategoryGroup.style.display = 'none';
            Object.keys(incomeCategories).forEach(cat => {
                categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
            });
        } else {
            Object.keys(allExpenseCategories).forEach(cat => {
                categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
            });
            categorySelect.innerHTML += `<option value="add_new">+ Tambah Kategori Kustom...</option>`;
        }
    }

    // Listen to Radio type changes to switch category dropdown
    document.querySelectorAll('input[name="tx-type"]').forEach(radio => {
        radio.addEventListener('change', () => {
            renderCategoryOptions();
        });
    });

    categorySelect.addEventListener('change', (e) => {
        if (e.target.value === 'add_new' && getSelectedType() === 'expense') {
            customCategoryGroup.style.display = 'block';
            customCategoryInput.focus();
        } else {
            customCategoryGroup.style.display = 'none';
        }
    });

    addCustomBtn.addEventListener('click', () => {
        const newCatName = customCategoryInput.value.trim();
        if (newCatName && !allExpenseCategories[newCatName] && !incomeCategories[newCatName]) {
            const newColor = getRandomColor();
            customCategories[newCatName] = newColor;
            allExpenseCategories[newCatName] = newColor;
            
            localStorage.setItem('customCategories', JSON.stringify(customCategories));
            
            renderCategoryOptions();
            categorySelect.value = newCatName;
            customCategoryGroup.style.display = 'none';
            customCategoryInput.value = '';
        } else if (allExpenseCategories[newCatName]) {
            alert('Kategori pengeluaran ini sudah ada!');
        }
    });

    // --- Month Filtering Logic ---
    function getFilteredTransactions() {
        const filterVal = monthFilter.value;
        if (filterVal === 'all') return transactions;

        return transactions.filter(t => {
            const tDate = new Date(t.date);
            const tMonthYear = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
            return tMonthYear === filterVal;
        });
    }

    function updateMonthFilterOptions() {
        const uniqueMonths = new Set();
        transactions.forEach(t => {
            const date = new Date(t.date);
            uniqueMonths.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
        });

        const sortedMonths = Array.from(uniqueMonths).sort().reverse();
        const currentSelection = monthFilter.value;
        
        monthFilter.innerHTML = '<option value="all">Semua Waktu</option>';
        sortedMonths.forEach(monthVal => {
            const [year, month] = monthVal.split('-');
            const dateObj = new Date(year, month - 1);
            const monthName = dateObj.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            monthFilter.innerHTML += `<option value="${monthVal}">${monthName}</option>`;
        });

        if (currentSelection !== 'all' && uniqueMonths.has(currentSelection)) {
            monthFilter.value = currentSelection;
        }
    }

    monthFilter.addEventListener('change', updateUI);

    // --- Form Submission ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const type = getSelectedType();
        const name = nameInput.value.trim();
        const amount = parseFloat(amountInput.value);
        let category = categorySelect.value;

        if (category === 'add_new') {
            alert('Selesaikan pembuatan kategori kustom terlebih dahulu.');
            return;
        }

        if (!name || isNaN(amount) || amount <= 0 || !category) {
            alert('Mohon isi semua bidang dengan benar.');
            return;
        }

        const transaction = {
            id: crypto.randomUUID(),
            type: type,
            name: name,
            amount: amount,
            category: category,
            date: new Date().toISOString()
        };

        transactions.push(transaction);
        saveData();
        
        nameInput.value = '';
        amountInput.value = '';
        renderCategoryOptions(); 
        
        updateMonthFilterOptions();
        updateUI();
    });

    window.deleteTransaction = function(id) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateMonthFilterOptions();
        updateUI();
    };

    // --- Core Functions ---
    function saveData() {
        localStorage.setItem('expenses', JSON.stringify(transactions));
    }

    function updateUI() {
        const currentData = getFilteredTransactions();
        renderList(currentData);
        updateBalance(currentData);
        updateChart(currentData);
    }

    function renderList(data) {
        transactionList.innerHTML = ''; 

        if (data.length === 0) {
            transactionList.innerHTML = '<div class="empty-state">Belum ada transaksi pada periode ini.</div>';
            return;
        }

        const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedData.forEach(t => {
            const isIncome = t.type === 'income';
            const catColor = isIncome ? (incomeCategories[t.category] || '#6b7280') : (allExpenseCategories[t.category] || '#6b7280');
            
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-name">${t.name}</span>
                    <span class="transaction-category" style="color: ${catColor}; background: ${catColor}1A; border: 1px solid ${catColor}33;">${t.category}</span>
                </div>
                <div class="transaction-right">
                    <span class="transaction-amount ${isIncome ? 'income-type' : 'expense-type'}">
                        ${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}
                    </span>
                    <button class="delete-btn" onclick="deleteTransaction('${t.id}')" title="Hapus">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            `;
            transactionList.appendChild(item);
        });
    }

    function updateBalance(data) {
        let incomeTotal = 0;
        let expenseTotal = 0;

        data.forEach(t => {
            if (t.type === 'income') incomeTotal += t.amount;
            else expenseTotal += t.amount;
        });

        const netBalance = incomeTotal - expenseTotal;

        totalIncomeDisplay.innerText = formatCurrency(incomeTotal);
        totalExpenseDisplay.innerText = formatCurrency(expenseTotal);
        
        // Sinyal minus/plus untuk Saldo Akhir
        if (netBalance < 0) {
            netBalanceDisplay.innerText = `-${formatCurrency(Math.abs(netBalance))}`;
            netBalanceDisplay.style.color = 'var(--danger)';
        } else {
            netBalanceDisplay.innerText = formatCurrency(netBalance);
            netBalanceDisplay.style.color = 'var(--text-main)';
        }
    }

    function updateChart(data = getFilteredTransactions()) {
        // Chart dikhususkan untuk melihat distribusi "Pengeluaran" saja
        const expenseData = data.filter(t => t.type === 'expense');
        
        const categoryTotals = {};
        expenseData.forEach(t => {
            if (categoryTotals[t.category]) {
                categoryTotals[t.category] += t.amount;
            } else {
                categoryTotals[t.category] = t.amount;
            }
        });

        const labels = Object.keys(categoryTotals);
        const chartData = Object.values(categoryTotals);
        const backgroundColors = labels.map(label => allExpenseCategories[label] || '#6b7280');

        if (myChart) {
            myChart.destroy();
        }

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-text').trim();

        if (labels.length === 0) {
             myChart = new Chart(chartCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Tidak Ada Pengeluaran'],
                    datasets: [{
                        data: [1],
                        backgroundColor: [currentTheme === 'dark' ? '#334155' : '#e2e8f0'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    cutout: '70%'
                }
            });
            return;
        }

        myChart = new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: chartData,
                    backgroundColor: backgroundColors,
                    borderWidth: 2,
                    borderColor: currentTheme === 'dark' ? '#1e293b' : '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { 
                            font: { family: "'Inter', sans-serif" }, 
                            color: textColor,
                            usePointStyle: true, 
                            padding: 20 
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) { label += ': '; }
                                if (context.raw !== null) { label += formatCurrency(context.raw); }
                                return label;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    init();
});
