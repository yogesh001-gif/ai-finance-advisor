// API Configuration - Frontend running on port 3001
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Global variables
let transactions = [];
let incomeExpenseChart = null;
let categoryChart = null;

// DOM Elements
const transactionForm = document.getElementById('transactionForm');
const typeSelect = document.getElementById('type');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const descriptionInput = document.getElementById('description');
const refreshBtn = document.getElementById('refreshBtn');
const getAdviceBtn = document.getElementById('getAdviceBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notificationMessage');
const closeNotification = document.getElementById('closeNotification');
const clearAllBtn = document.getElementById('clearAllBtn');

// Summary elements
const totalIncomeElement = document.getElementById('totalIncome');
const totalExpensesElement = document.getElementById('totalExpenses');
const netAmountElement = document.getElementById('netAmount');

// Lists
const transactionsList = document.getElementById('transactionsList');
const aiAdviceContainer = document.getElementById('aiAdviceContainer');
const quickTipsContainer = document.getElementById('quickTips');

// Filters
const typeFilter = document.getElementById('typeFilter');
const categoryFilter = document.getElementById('categoryFilter');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Set today's date as default
    dateInput.value = new Date().toISOString().split('T')[0];
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        showNotification('Error: Chart.js library failed to load. Charts will not be available.', 'error');
        console.error('Chart.js is not loaded');
    } else {
        console.log('Chart.js loaded successfully, version:', Chart.version);
        // Configure Chart.js defaults
        Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        Chart.defaults.color = '#666';
    }
    
    // Test backend connection first
    await testBackendConnection();
    
    // Load initial data
    await loadTransactions();
    await loadQuickTips();
    
    // Setup event listeners
    setupEventListeners();
    
    showNotification('Welcome to AI Finance Advisor!', 'success');
}

async function testBackendConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`Backend server not responding: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Backend connection successful:', data);
        
    } catch (error) {
        console.error('Backend connection failed:', error);
        showNotification('Warning: Cannot connect to backend server. Please ensure the backend is running on port 5000.', 'error');
    }
}

function setupEventListeners() {
    // Form submission
    transactionForm.addEventListener('submit', handleTransactionSubmit);
    
    // Refresh button
    refreshBtn.addEventListener('click', loadTransactions);
    
    // AI Advice button
    getAdviceBtn.addEventListener('click', getAIAdvice);
    
    // Notification close
    closeNotification.addEventListener('click', hideNotification);
    
    // Filters
    typeFilter.addEventListener('change', filterTransactions);
    categoryFilter.addEventListener('input', debounce(filterTransactions, 300));
        
    // Clear All button
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async function() {
            if (confirm('Are you sure you want to clear all details? This action cannot be undone.')) {
                try {
                    showLoading();
                    const response = await fetch(`${API_BASE_URL}/transactions/clear-all`, {
                        method: 'DELETE',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                    if (response.ok) {
                        showNotification('All details cleared successfully.', 'success');
                        await loadTransactions();
                    } else {
                        const errorData = await response.json();
                        showNotification(errorData.error || 'Failed to clear details.', 'error');
                    }
                } catch (err) {
                    showNotification('Error clearing details.', 'error');
                } finally {
                    hideLoading();
                }
            }
        });
    }
    
    // Window resize handler for charts
    window.addEventListener('resize', debounce(function() {
        if (incomeExpenseChart) {
            incomeExpenseChart.resize();
        }
        if (categoryChart) {
            categoryChart.resize();
        }
    }, 250));
    
    // Chart container observer for better responsiveness
    if (window.ResizeObserver) {
        const chartsContainer = document.querySelector('.charts-container');
        if (chartsContainer) {
            const resizeObserver = new ResizeObserver(debounce(function() {
                updateCharts();
            }, 300));
            resizeObserver.observe(chartsContainer);
        }
    }
}

// Transaction Management
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const transactionData = {
        type: typeSelect.value,
        amount: parseFloat(amountInput.value),
        category: categoryInput.value.trim(),
        description: descriptionInput.value.trim(),
        date: dateInput.value
    };
    
    try {
        showLoading();
        await addTransaction(transactionData);
        transactionForm.reset();
        dateInput.value = new Date().toISOString().split('T')[0];
        await loadTransactions();
        showNotification('Transaction added successfully!', 'success');
    } catch (error) {
        showNotification('Error adding transaction: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function addTransaction(transactionData) {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(transactionData)
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
}

async function loadTransactions() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/transactions`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        transactions = data.transactions;
        
        updateSummary(data.summary);
        renderTransactions(transactions);
        updateCharts();
        
    } catch (error) {
        console.error('Load transactions error:', error);
        showNotification('Error loading transactions: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function updateSummary(summary) {
    totalIncomeElement.textContent = formatCurrency(summary.totalIncome);
    totalExpensesElement.textContent = formatCurrency(summary.totalExpenses);
    netAmountElement.textContent = formatCurrency(summary.netAmount);
    
    // Update color based on positive/negative
    netAmountElement.style.color = summary.netAmount >= 0 ? '#4ecdc4' : '#ff6b6b';
}

function renderTransactions(transactionsToRender) {
    if (transactionsToRender.length === 0) {
        transactionsList.innerHTML = `
            <div class="text-center" style="padding: 40px; color: #666;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; color: #ddd;"></i>
                <p>No transactions found. Add your first transaction above!</p>
            </div>
        `;
        return;
    }
    
    transactionsList.innerHTML = transactionsToRender
        .slice(0, 20) // Show only recent 20 transactions
        .map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-type ${transaction.type}">
                        <i class="fas fa-${transaction.type === 'income' ? 'arrow-up' : 'arrow-down'}"></i>
                        ${transaction.category}
                    </div>
                    <div class="transaction-details">
                        ${transaction.description || 'No description'}
                    </div>
                    <div class="transaction-date">
                        ${formatDate(transaction.date)}
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                </div>
            </div>
        `).join('');
}

function filterTransactions() {
    const typeFilterValue = typeFilter.value;
    const categoryFilterValue = categoryFilter.value.toLowerCase();
    
    let filteredTransactions = transactions;
    
    if (typeFilterValue) {
        filteredTransactions = filteredTransactions.filter(t => t.type === typeFilterValue);
    }
    
    if (categoryFilterValue) {
        filteredTransactions = filteredTransactions.filter(t => 
            t.category.toLowerCase().includes(categoryFilterValue)
        );
    }
    
    renderTransactions(filteredTransactions);
}

// Charts
function updateCharts() {
    try {
        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            updateIncomeExpenseChart();
            updateCategoryChart();
        }, 100);
    } catch (error) {
        console.error('Chart update error:', error);
        showNotification('Warning: Charts failed to update', 'error');
    }
}

function destroyCharts() {
    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
        incomeExpenseChart = null;
    }
    if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
    }
}

function updateIncomeExpenseChart() {
    try {
        const canvas = document.getElementById('incomeExpenseChart');
        if (!canvas) {
            console.error('Income expense chart canvas not found');
            return;
        }
        
        // Clear any existing chart
        if (incomeExpenseChart) {
            incomeExpenseChart.destroy();
            incomeExpenseChart = null;
        }
        
        const context = canvas.getContext('2d');
        
        // Get last 6 months data
        const monthlyData = getMonthlyData();
        const labels = Object.keys(monthlyData).sort();
        
        if (labels.length === 0) {
            // Display "No data" message
            displayNoDataMessage(canvas, 'No income/expense data available');
            return;
        }
        
        const incomeData = labels.map(month => monthlyData[month].income || 0);
        const expenseData = labels.map(month => monthlyData[month].expenses || 0);
        
        incomeExpenseChart = new Chart(context, {
            type: 'bar',
            data: {
                labels: labels.map(formatMonthLabel),
                datasets: [{
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(78, 205, 196, 0.8)',
                    borderColor: 'rgba(78, 205, 196, 1)',
                    borderWidth: 2,
                    borderRadius: 4,
                    borderSkipped: false,
                }, {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(255, 107, 107, 0.8)',
                    borderColor: 'rgba(255, 107, 107, 1)',
                    borderWidth: 2,
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ₹' + context.parsed.y.toLocaleString('en-IN');
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#666'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#666',
                            callback: function(value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    } catch (error) {
        console.error('Income expense chart error:', error);
        showNotification('Failed to load income/expense chart', 'error');
    }
}

function updateCategoryChart() {
    try {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) {
            console.error('Category chart canvas not found');
            return;
        }
        
        // Clear any existing chart
        if (categoryChart) {
            categoryChart.destroy();
            categoryChart = null;
        }
        
        const context = canvas.getContext('2d');
        
        // Get expense categories
        const categoryData = getCategoryData();
        const categories = Object.keys(categoryData);
        const amounts = Object.values(categoryData);
        
        if (categories.length === 0) {
            displayNoDataMessage(canvas, 'No expense categories available\nAdd some expense transactions to see the breakdown');
            return;
        }
        
        // Sort by amount (highest first)
        const sortedData = categories.map((cat, index) => ({
            category: cat,
            amount: amounts[index]
        })).sort((a, b) => b.amount - a.amount);
        
        const sortedCategories = sortedData.map(item => item.category);
        const sortedAmounts = sortedData.map(item => item.amount);
        
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
            '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
            '#7bed9f', '#2ed573', '#ffb8b8', '#ff7675', '#a29bfe'
        ];
        
        categoryChart = new Chart(context, {
            type: 'doughnut',
            data: {
                labels: sortedCategories,
                datasets: [{
                    data: sortedAmounts,
                    backgroundColor: colors.slice(0, sortedCategories.length),
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    hoverBorderWidth: 5,
                    hoverBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return {
                                            text: `${label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            strokeStyle: data.datasets[0].borderColor,
                                            lineWidth: data.datasets[0].borderWidth,
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const total = sortedAmounts.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                return `${context.label}: ₹${context.parsed.toLocaleString('en-IN')} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000
                }
            }
        });
    } catch (error) {
        console.error('Category chart error:', error);
        showNotification('Failed to load category chart', 'error');
    }
}

function displayNoDataMessage(canvas, message) {
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set styles
    context.fillStyle = '#999';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Split message into lines
    const lines = message.split('\n');
    const lineHeight = 20;
    const startY = canvas.height / 2 - (lines.length - 1) * lineHeight / 2;
    
    // Draw icon
    context.font = '40px Arial';
    context.fillStyle = '#ddd';
    context.fillText('📊', canvas.width / 2, startY - 40);
    
    // Draw text lines
    context.font = '14px Arial';
    context.fillStyle = '#999';
    lines.forEach((line, index) => {
        context.fillText(line, canvas.width / 2, startY + index * lineHeight);
    });
}

function getMonthlyData() {
    const monthlyData = {};
    
    transactions.forEach(transaction => {
        try {
            // Handle both string and Date objects
            let dateStr;
            if (typeof transaction.date === 'string') {
                dateStr = transaction.date;
            } else if (transaction.date instanceof Date) {
                dateStr = transaction.date.toISOString();
            } else {
                console.warn('Invalid date format:', transaction.date);
                return;
            }
            
            const month = dateStr.substring(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expenses: 0 };
            }
            
            if (transaction.type === 'income') {
                monthlyData[month].income += transaction.amount;
            } else {
                monthlyData[month].expenses += transaction.amount;
            }
        } catch (error) {
            console.error('Error processing transaction date:', transaction, error);
        }
    });
    
    return monthlyData;
}

function getCategoryData() {
    const categoryData = {};
    
    transactions
        .filter(t => t.type === 'expense')
        .forEach(transaction => {
            categoryData[transaction.category] = 
                (categoryData[transaction.category] || 0) + transaction.amount;
        });
    
    return categoryData;
}

// AI Advice
async function getAIAdvice() {
    if (transactions.length === 0) {
        showNotification('Please add some transactions first to get AI advice.', 'error');
        return;
    }
    
    try {
        showLoading();
        getAdviceBtn.disabled = true;
        getAdviceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Advice...';
        
        const response = await fetch(`${API_BASE_URL}/ai-advice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get AI advice');
        }
        
        const data = await response.json();
        displayAIAdvice(data);
        
    } catch (error) {
        showNotification('Error getting AI advice: ' + error.message, 'error');
        aiAdviceContainer.innerHTML = `
            <div class="advice-placeholder">
                <i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i>
                <p>Failed to get AI advice. Please try again later.</p>
                <small style="color: #999; margin-top: 10px; display: block;">${error.message}</small>
            </div>
        `;
    } finally {
        hideLoading();
        getAdviceBtn.disabled = false;
        getAdviceBtn.innerHTML = '<i class="fas fa-magic"></i> Get AI Advice';
    }
}

function displayAIAdvice(data) {
    const advice = data.advice.replace(/\n/g, '<br>');
    const formattedAdvice = formatAIAdvice(advice);
    
    aiAdviceContainer.innerHTML = `
        <div class="ai-advice">
            <div class="advice-header" style="margin-bottom: 20px; padding: 15px; background: #f0f8ff; border-radius: 8px;">
                <h3 style="color: #667eea; margin: 0 0 5px 0;">
                    <i class="fas fa-robot"></i> AI Financial Analysis
                </h3>
                <small style="color: #666;">
                    Analysis Date: ${formatDate(data.metadata.analysisDate)} | 
                    Data Points: ${data.metadata.dataPoints} transactions | 
                    Period: ${data.metadata.periodAnalyzed}
                </small>
            </div>
            <div class="advice-content">
                ${formattedAdvice}
            </div>
        </div>
    `;
}

function formatAIAdvice(advice) {
    // Format the AI advice with better styling
    return advice
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #667eea;">$1</strong>')
        .replace(/(\d+\.\s)/g, '<br><strong style="color: #333;">$1</strong>')
        .replace(/(\$[\d,]+(?:\.\d{2})?)/g, '<span style="color: #4ecdc4; font-weight: bold;">$1</span>')
        .replace(/(Emergency Fund|Investment|Tax|Savings|Budget)/gi, '<span style="color: #ff6b6b; font-weight: bold;">$1</span>');
}

async function loadQuickTips() {
    try {
        const response = await fetch(`${API_BASE_URL}/ai-advice/quick-tips`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load quick tips');
        }
        
        const data = await response.json();
        displayQuickTips(data.tips);
        
    } catch (error) {
        console.error('Error loading quick tips:', error);
        // Show default tips if API fails
        displayQuickTips([
            { category: 'Savings', tip: 'Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings', priority: 'high' },
            { category: 'Investment', tip: 'Start with low-cost index funds for long-term growth', priority: 'medium' },
            { category: 'Emergency Fund', tip: 'Build 3-6 months of expenses as emergency savings', priority: 'high' }
        ]);
    }
}

function displayQuickTips(tips) {
    quickTipsContainer.innerHTML = tips.map(tip => `
        <div class="tip-item ${tip.priority}-priority">
            <div class="tip-category">${tip.category}</div>
            <div class="tip-content">${tip.tip}</div>
        </div>
    `).join('');
}

// Utility Functions
function formatCurrency(amount) {
    return '₹' + Math.abs(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'Invalid Date';
    }
}

function formatMonthLabel(monthString) {
    try {
        const [year, month] = monthString.split('-');
        const date = new Date(year, month - 1);
        if (isNaN(date.getTime())) {
            return monthString;
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
        });
    } catch (error) {
        console.error('Month formatting error:', error);
        return monthString;
    }
}

function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function showNotification(message, type = 'success') {
    notificationMessage.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(hideNotification, 5000);
}

function hideNotification() {
    notification.classList.add('hidden');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Auto-refresh data every 30 seconds
setInterval(loadTransactions, 30000);
