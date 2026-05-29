document.addEventListener('DOMContentLoaded', () => {
    
    const form = document.getElementById('expense-form');
    const nameInput = document.getElementById('item-name');
    const amountInput = document.getElementById('item-amount');
    const categoryInput = document.getElementById('item-category');
    const transactionList = document.getElementById('transaction-list');
    const balanceDisplay = document.getElementById('total-balance');
    const chartCanvas = document.getElementById('expense-chart');
    
    let transactions = JSON.parse(localStorage.getItem('expenses')) || [];
    let myChart = null;

    const categoryColors = {
        'Food': '#f59e0b',
        'Transport': '#3b82f6',
        'Fun': '#ec4899',
        'Utilities': '#10b981',
        'Other': '#6b7280'
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    function init() {
        updateUI();
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const category = categoryInput.value;

        if (!name || isNaN(amount) || amount <= 0 || !category) {
            alert('Please fill out all fields correctly.');
            return;
        }

        const transaction = {
            id: crypto.randomUUID(),
            name: name,
            amount: amount,
            category: category,
            date: new Date().toISOString()
        };

        transactions.push(transaction);
        saveData();
        
        nameInput.value = '';
        amountInput.value = '';
        categoryInput.value = '';
        
        updateUI();
    });

    window.deleteTransaction = function(id) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateUI();
    };

    function saveData() {
        localStorage.setItem('expenses', JSON.stringify(transactions));
    }

    function updateUI() {
        renderList();
        updateBalance();
        updateChart();
    }

    function renderList() {
        transactionList.innerHTML = ''; 

        if (transactions.length === 0) {
            transactionList.innerHTML = '<div class="empty-state">No transactions added yet.</div>';
            return;
        }

        const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedTransactions.forEach(t => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-name">${t.name}</span>
                    <span class="transaction-category" style="color: ${categoryColors[t.category]}">${t.category}</span>
                </div>
                <div class="transaction-right">
                    <span class="transaction-amount">${formatCurrency(t.amount)}</span>
                    <button class="delete-btn" onclick="deleteTransaction('${t.id}')" title="Delete">
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

    function updateBalance() {
        const total = transactions.reduce((acc, curr) => acc + curr.amount, 0);
        balanceDisplay.innerText = formatCurrency(total);
    }

    function updateChart() {
        const categoryTotals = {};
        transactions.forEach(t => {
            if (categoryTotals[t.category]) {
                categoryTotals[t.category] += t.amount;
            } else {
                categoryTotals[t.category] = t.amount;
            }
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);
        const backgroundColors = labels.map(label => categoryColors[label] || categoryColors['Other']);

        if (myChart) {
            myChart.destroy();
        }

        if (labels.length === 0) {
             myChart = new Chart(chartCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e2e8f0'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
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
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { font: { family: "'Inter', sans-serif" }, usePointStyle: true, padding: 20 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) { label += ': '; }
                                if (context.raw !== null) {
                                    label += formatCurrency(context.raw);
                                }
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