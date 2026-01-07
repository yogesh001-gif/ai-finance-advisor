// API Configuration
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Global variables
let transactions = [];
let incomeExpenseChart = null;
let categoryChart = null;
let gamificationProfile = null;
let currentSort = {
    column: 'date',
    direction: 'desc'
};
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

const overlay = document.querySelector('.overlay');

// DOM Elements - Landing Page
const landingPage = document.getElementById('landing-page');
const appContainer = document.getElementById('app-container');

// DOM Elements - App
const sidebar = document.querySelector('.sidebar');
const mainContainer = document.querySelector('.main-container');
const menuToggle = document.getElementById('menu-toggle');
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');
const themeToggle = document.getElementById('theme-toggle');

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

// Filters
const typeFilter = document.getElementById('typeFilter');
const categoryFilter = document.getElementById('categoryFilter');

// Auth Elements
const authOverlay = document.getElementById('auth-overlay');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const otpForm = document.getElementById('otp-form');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');
const otpError = document.getElementById('otp-error');
const logoutBtn = document.getElementById('logout-btn');
const userNameDisplay = document.getElementById('user-name');
const userEmailDisplay = document.getElementById('user-email');
const authCloseBtn = document.getElementById('auth-close-btn');

// OTP related variables
let pendingOTPEmail = null;

// Landing Page Elements
const landingLoginBtn = document.getElementById('landing-login-btn');
const landingSignupBtn = document.getElementById('landing-signup-btn');
const heroGetStarted = document.getElementById('hero-get-started');
const ctaSignupBtn = document.getElementById('cta-signup-btn');

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

// Auth helper - add token to request headers
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
}

// Check if user is authenticated
function isAuthenticated() {
    return authToken && currentUser;
}

// Show auth modal
function showAuthModal(showSignup = false) {
    if (authOverlay) {
        authOverlay.classList.remove('hidden');
        // Clear any previous errors
        if (loginError) loginError.classList.remove('show');
        if (signupError) signupError.classList.remove('show');
        if (otpError) otpError.classList.remove('show');
        
        // Hide OTP form and show appropriate form
        if (otpForm) otpForm.classList.remove('active');
        
        if (showSignup) {
            if (loginForm) loginForm.classList.remove('active');
            if (signupForm) signupForm.classList.add('active');
        } else {
            if (signupForm) signupForm.classList.remove('active');
            if (loginForm) loginForm.classList.add('active');
        }
    }
}

// Hide auth modal
function hideAuthModal() {
    if (authOverlay) {
        authOverlay.classList.add('hidden');
    }
    // Reset OTP state
    pendingOTPEmail = null;
    hideOTPForm();
}

// Show OTP form
function showOTPForm(email) {
    if (loginForm) loginForm.classList.remove('active');
    if (signupForm) signupForm.classList.remove('active');
    if (otpForm) {
        otpForm.classList.add('active');
        const otpEmailDisplay = document.getElementById('otp-email-display');
        if (otpEmailDisplay) otpEmailDisplay.textContent = email;
        const otpInput = document.getElementById('otp-input');
        if (otpInput) {
            otpInput.value = '';
            otpInput.focus();
        }
    }
}

// Hide OTP form and show login form
function hideOTPForm() {
    if (otpForm) otpForm.classList.remove('active');
    if (loginForm) loginForm.classList.add('active');
    if (otpError) otpError.classList.remove('show');
    const otpInput = document.getElementById('otp-input');
    if (otpInput) otpInput.value = '';
}

// Complete login after successful authentication
async function completeLogin(data) {
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Update UI and load data
    updateAuthUI();
    await loadTransactions();
    await loadGamificationProfile();
    showNotification(`Welcome back, ${currentUser.name}!`, 'success');
}

// Update UI based on auth status
function updateAuthUI() {
    if (isAuthenticated()) {
        // Hide landing, show app
        if (landingPage) landingPage.style.display = 'none';
        if (appContainer) appContainer.classList.remove('hidden');
        hideAuthModal();
        
        // Update user info
        if (userNameDisplay) userNameDisplay.textContent = currentUser.name || 'User';
        if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email || '';
    } else {
        // Show landing, hide app
        if (landingPage) landingPage.style.display = 'flex';
        if (appContainer) appContainer.classList.add('hidden');
    }
}

// Setup landing page event listeners
function setupLandingPageListeners() {
    // Landing page buttons to show auth modal
    if (landingLoginBtn) {
        landingLoginBtn.addEventListener('click', () => showAuthModal(false));
    }
    
    if (landingSignupBtn) {
        landingSignupBtn.addEventListener('click', () => showAuthModal(true));
    }
    
    if (heroGetStarted) {
        heroGetStarted.addEventListener('click', () => showAuthModal(true));
    }
    
    if (ctaSignupBtn) {
        ctaSignupBtn.addEventListener('click', () => showAuthModal(true));
    }
    
    // Close auth modal button
    if (authCloseBtn) {
        authCloseBtn.addEventListener('click', hideAuthModal);
    }
    
    // Close auth modal when clicking outside
    if (authOverlay) {
        authOverlay.addEventListener('click', (e) => {
            if (e.target === authOverlay) {
                hideAuthModal();
            }
        });
    }
    
    // Mobile menu toggle for landing page
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const landingNavLinks = document.querySelector('.landing-nav-links');
    
    if (mobileMenuBtn && landingNavLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            landingNavLinks.classList.toggle('active');
        });
    }
    
    // Landing page theme toggle
    const landingThemeToggle = document.getElementById('landing-theme-toggle');
    if (landingThemeToggle) {
        landingThemeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            // Sync with app sidebar toggle if it exists
            if (themeToggle) {
                themeToggle.checked = newTheme === 'dark';
            }
            updateChartColors();
        });
    }
    
    // Back to top button
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });
        
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Setup auth event listeners
function setupAuthListeners() {
    // Check if auth elements exist
    if (!authOverlay || !loginForm || !signupForm) {
        console.warn('Auth elements not found');
        return;
    }
    
    // Toggle between login and signup
    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.remove('active');
            signupForm.classList.add('active');
            if (loginError) loginError.classList.remove('show');
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            signupForm.classList.remove('active');
            loginForm.classList.add('active');
            if (signupError) signupError.classList.remove('show');
        });
    }

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailEl = document.getElementById('login-email');
        const passwordEl = document.getElementById('login-password');
        if (!emailEl || !passwordEl) {
            console.error('Login form elements not found');
            return;
        }
        
        const email = emailEl.value.trim();
        const password = passwordEl.value;
        
        console.log('Attempting login for:', email);
        
        const submitBtn = loginForm.querySelector('.auth-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
        }
        if (loginError) loginError.classList.remove('show');

        try {
            console.log('Fetching:', `${API_BASE_URL}/auth/login`);
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            console.log('Response status:', response.status);

            const data = await response.json();
            console.log('Response data:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Check if OTP is required
            if (data.requiresOTP) {
                pendingOTPEmail = data.email;
                showOTPForm(data.email);
                showNotification('OTP sent to your email!', 'success');
            } else {
                // Direct login (fallback)
                completeLogin(data);
            }

        } catch (error) {
            if (loginError) {
                loginError.textContent = error.message;
                loginError.classList.add('show');
            } else {
                showNotification(error.message, 'error');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';
            }
        }
    });

    // OTP form submission
    if (otpForm) {
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const otpInput = document.getElementById('otp-input');
            if (!otpInput || !pendingOTPEmail) {
                console.error('OTP form elements not found');
                return;
            }
            
            const otp = otpInput.value.trim();
            
            const submitBtn = otpForm.querySelector('.auth-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
            }
            if (otpError) otpError.classList.remove('show');

            try {
                const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: pendingOTPEmail, otp })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Verification failed');
                }

                // Complete login
                completeLogin(data);
                pendingOTPEmail = null;

            } catch (error) {
                if (otpError) {
                    otpError.textContent = error.message;
                    otpError.classList.add('show');
                } else {
                    showNotification(error.message, 'error');
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>Verify & Sign In</span><i class="fas fa-check"></i>';
                }
            }
        });
    }

    // Resend OTP
    const resendOTPBtn = document.getElementById('resend-otp-btn');
    if (resendOTPBtn) {
        resendOTPBtn.addEventListener('click', async () => {
            if (!pendingOTPEmail) return;
            
            resendOTPBtn.disabled = true;
            resendOTPBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            try {
                const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: pendingOTPEmail })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to resend OTP');
                }

                showNotification('New OTP sent to your email!', 'success');
                
                // Disable button for 30 seconds
                let countdown = 30;
                resendOTPBtn.innerHTML = `<i class="fas fa-clock"></i> Resend in ${countdown}s`;
                const interval = setInterval(() => {
                    countdown--;
                    resendOTPBtn.innerHTML = `<i class="fas fa-clock"></i> Resend in ${countdown}s`;
                    if (countdown <= 0) {
                        clearInterval(interval);
                        resendOTPBtn.disabled = false;
                        resendOTPBtn.innerHTML = '<i class="fas fa-redo"></i> Resend OTP';
                    }
                }, 1000);

            } catch (error) {
                showNotification(error.message, 'error');
                resendOTPBtn.disabled = false;
                resendOTPBtn.innerHTML = '<i class="fas fa-redo"></i> Resend OTP';
            }
        });
    }

    // Back to login button
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            hideOTPForm();
            pendingOTPEmail = null;
        });
    }

    // Signup form submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameEl = document.getElementById('signup-name');
        const emailEl = document.getElementById('signup-email');
        const passwordEl = document.getElementById('signup-password');
        const confirmPasswordEl = document.getElementById('signup-confirm-password');
        
        if (!nameEl || !emailEl || !passwordEl || !confirmPasswordEl) return;
        
        const name = nameEl.value.trim();
        const email = emailEl.value.trim();
        const password = passwordEl.value;
        const confirmPassword = confirmPasswordEl.value;

        if (password !== confirmPassword) {
            if (signupError) {
                signupError.textContent = 'Passwords do not match';
                signupError.classList.add('show');
            }
            return;
        }

        const submitBtn = signupForm.querySelector('.auth-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
        }
        if (signupError) signupError.classList.remove('show');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Save auth data
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            // Update UI
            updateAuthUI();
            showNotification(`Welcome ${currentUser.name}! Your account has been created.`, 'success');

        } catch (error) {
            if (signupError) {
                signupError.textContent = error.message;
                signupError.classList.add('show');
            } else {
                showNotification(error.message, 'error');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Create Account</span><i class="fas fa-arrow-right"></i>';
            }
        }
    });

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
        });
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    transactions = [];
    gamificationProfile = null;
    
    // Reset forms and clear errors
    if (loginForm) {
        loginForm.reset();
        loginForm.classList.add('active');
    }
    if (signupForm) {
        signupForm.reset();
        signupForm.classList.remove('active');
    }
    if (loginError) loginError.classList.remove('show');
    if (signupError) signupError.classList.remove('show');
    
    // Update UI
    updateAuthUI();
    if (typeof updateSummary === 'function') updateSummary({ totalIncome: 0, totalExpenses: 0, netAmount: 0, count: 0 });
    if (typeof displayTransactions === 'function') displayTransactions([]);
    if (typeof updateCharts === 'function') updateCharts();
    
    showNotification('You have been logged out successfully.', 'success');
}

async function initializeApp() {
    // Setup landing page listeners first
    setupLandingPageListeners();
    
    // Setup auth listeners
    setupAuthListeners();
    
    // Set today's date as default
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Check Chart.js
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js library not loaded yet');
    } else {
        Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        if (typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
        }
    }

    // Check if user is already logged in
    if (isAuthenticated()) {
        updateAuthUI();
        await testBackendConnection();
        await loadTransactions();
        await loadGamificationProfile();
        showNotification(`Welcome back, ${currentUser.name}!`, 'success');
    } else {
        updateAuthUI();
    }
    
    setupEventListeners();
    
    // Set initial theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeToggle) themeToggle.checked = savedTheme === 'dark';
    updateChartColors();
}

async function testBackendConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            mode: 'cors'
        });
        if (!response.ok) throw new Error(`Backend not responding: ${response.status}`);
        console.log('Backend connection successful.');
    } catch (error) {
        console.error('Backend connection failed:', error);
        showNotification('Warning: Cannot connect to backend. Please start the server.', 'error');
    }
}

const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatMessages = document.getElementById('chatMessages');
const clearChatBtn = document.getElementById('clearChatBtn');
const quickQuestionBtns = document.querySelectorAll('.quick-question-btn');

// Gamification elements
const refreshGamificationBtn = document.getElementById('refreshGamificationBtn');
const playerLevel = document.getElementById('playerLevel');
const currentPoints = document.getElementById('currentPoints');
const nextLevelPoints = document.getElementById('nextLevelPoints');
const totalPoints = document.getElementById('totalPoints');
const levelProgress = document.getElementById('levelProgress');
const dailyStreak = document.getElementById('dailyStreak');
const savingStreak = document.getElementById('savingStreak');
const budgetStreak = document.getElementById('budgetStreak');
const longestDailyStreak = document.getElementById('longestDailyStreak');
const longestSavingStreak = document.getElementById('longestSavingStreak');
const longestBudgetStreak = document.getElementById('longestBudgetStreak');
const activeChallenges = document.getElementById('activeChallenges');
const achievementsList = document.getElementById('achievementsList');
const achievementFilters = document.querySelectorAll('.filter-btn');

function setupEventListeners() {
    // Sidebar and Navigation
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            if (window.innerWidth <= 1200) {
                if (sidebar) sidebar.classList.toggle('open');
                if (overlay) overlay.classList.toggle('show');
            } else {
                if (sidebar) sidebar.classList.toggle('collapsed');
                if (mainContainer) mainContainer.classList.toggle('collapsed');
            }
        });
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            if (sidebar) sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.getAttribute('data-section');

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                }
            });

            // Close sidebar on mobile after navigation
            if (window.innerWidth <= 1200) {
                if (sidebar) sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('show');
            }
        });
    });

    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            const theme = themeToggle.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            updateChartColors();
            updateCharts();
        });
    }

    // Form submission
    if (transactionForm) transactionForm.addEventListener('submit', handleTransactionSubmit);

    // Buttons
    if (refreshBtn) refreshBtn.addEventListener('click', loadTransactions);
    if (getAdviceBtn) getAdviceBtn.addEventListener('click', getAIAdvice);
    if (closeNotification) closeNotification.addEventListener('click', hideNotification);
    if (clearAllBtn) clearAllBtn.addEventListener('click', handleClearAll);
    if (clearChatBtn) clearChatBtn.addEventListener('click', clearChat);
    if (sendChatBtn) sendChatBtn.addEventListener('click', sendChatMessage);
    if (refreshGamificationBtn) refreshGamificationBtn.addEventListener('click', loadGamificationProfile);

    // Chat input handling
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }

    // Quick question buttons
    quickQuestionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const question = btn.getAttribute('data-question');
            if (chatInput) {
                chatInput.value = question;
                sendChatMessage();
            }
        });
    });

    // Filters
    if (typeFilter) typeFilter.addEventListener('change', filterAndSortTransactions);
    if (categoryFilter) categoryFilter.addEventListener('input', debounce(filterAndSortTransactions, 300));

    // Table sorting
    document.querySelectorAll('.transaction-table th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-sort');
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            filterAndSortTransactions();
        });
    });

    // Achievement filters
    achievementFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            achievementFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            filterAchievements(filter.getAttribute('data-filter'));
        });
    });
    
    // Ripple effect for buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mousedown', function (e) {
            const rect = e.target.getBoundingClientRect();
            const ripple = document.createElement('span');
            const diameter = Math.max(e.target.clientWidth, e.target.clientHeight);
            const radius = diameter / 2;

            ripple.style.width = ripple.style.height = `${diameter}px`;
            ripple.style.left = `${e.clientX - rect.left - radius}px`;
            ripple.style.top = `${e.clientY - rect.top - radius}px`;
            ripple.classList.add('ripple');

            const existingRipple = btn.querySelector('.ripple');
            if (existingRipple) {
                existingRipple.remove();
            }

            btn.appendChild(ripple);
        });
    });
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
        await updateGamificationAfterTransaction();
        showNotification('Transaction added successfully!', 'success');
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function addTransaction(data) {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        mode: 'cors',
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return await response.json();
}

async function loadTransactions() {
    if (!isAuthenticated()) {
        transactions = [];
        updateSummary({ totalIncome: 0, totalExpenses: 0, netAmount: 0, count: 0 });
        displayTransactions([]);
        updateCharts();
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/transactions`, {
            method: 'GET',
            headers: getAuthHeaders(),
            mode: 'cors'
        });
        
        if (response.status === 401) {
            logout();
            showNotification('Session expired. Please login again.', 'error');
            return;
        }
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        transactions = data.transactions;
        
        updateSummary(data.summary);
        filterAndSortTransactions();
        updateCharts();
    } catch (error) {
        showNotification('Error loading data: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleClearAll() {
    if (confirm('Are you sure you want to clear all transactions? This is irreversible.')) {
        try {
            showLoading();
            const response = await fetch(`${API_BASE_URL}/transactions/clear-all`, { 
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (response.ok) {
                showNotification('All transactions cleared.', 'success');
                await loadTransactions();
            } else {
                const error = await response.json();
                showNotification(error.error || 'Failed to clear.', 'error');
            }
        } catch (err) {
            showNotification('Error clearing data.', 'error');
        } finally {
            hideLoading();
        }
    }
}

function updateSummary(summary) {
    totalIncomeElement.textContent = formatCurrency(summary.totalIncome);
    totalExpensesElement.textContent = formatCurrency(summary.totalExpenses);
    netAmountElement.textContent = formatCurrency(summary.netAmount);
    netAmountElement.style.color = summary.netAmount >= 0 ? 'var(--income-color)' : 'var(--expense-color)';
}

function filterAndSortTransactions() {
    let filtered = [...transactions];

    // Filter
    const type = typeFilter.value;
    const category = categoryFilter.value.toLowerCase();
    if (type) {
        filtered = filtered.filter(t => t.type === type);
    }
    if (category) {
        filtered = filtered.filter(t => t.category.toLowerCase().includes(category));
    }

    // Sort
    filtered.sort((a, b) => {
        let valA = a[currentSort.column];
        let valB = b[currentSort.column];

        if (currentSort.column === 'date') {
            valA = new Date(valA);
            valB = new Date(valB);
        }

        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    renderTransactions(filtered);
}

function renderTransactions(transactionsToRender) {
    if (transactionsToRender.length === 0) {
        transactionsList.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 40px;">No transactions found.</td></tr>`;
        return;
    }

    transactionsList.innerHTML = transactionsToRender.map(t => `
        <tr>
            <td>${t.category}</td>
            <td class="${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</td>
            <td>${formatDate(t.date)}</td>
            <td>${t.description || '-'}</td>
            <td><span class="badge ${t.type}">${t.type}</span></td>
        </tr>
    `).join('');
}

// Charts
function updateChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e1e5e9' : '#666';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    Chart.defaults.color = textColor;
    if (incomeExpenseChart) {
        incomeExpenseChart.options.scales.x.ticks.color = textColor;
        incomeExpenseChart.options.scales.y.ticks.color = textColor;
        incomeExpenseChart.options.scales.y.grid.color = gridColor;
    }
    if (categoryChart) {
        categoryChart.options.plugins.legend.labels.color = textColor;
    }
}

function updateCharts() {
    setTimeout(() => {
        updateIncomeExpenseChart();
        updateCategoryChart();
    }, 100);
}

function updateIncomeExpenseChart() {
    const canvas = document.getElementById('incomeExpenseChart');
    if (!canvas) return;
    if (incomeExpenseChart) incomeExpenseChart.destroy();

    const monthlyData = getMonthlyData();
    const labels = Object.keys(monthlyData).sort();

    if (labels.length === 0) {
        displayNoDataMessage(canvas, 'No data for chart');
        return;
    }

    const incomeData = labels.map(m => monthlyData[m].income || 0);
    const expenseData = labels.map(m => monthlyData[m].expenses || 0);

    incomeExpenseChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels.map(formatMonthLabel),
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(78, 205, 196, 0.7)',
                    borderColor: 'rgba(78, 205, 196, 1)',
                    borderWidth: 1,
                    type: 'bar'
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(255, 107, 107, 0.7)',
                    borderColor: 'rgba(255, 107, 107, 1)',
                    borderWidth: 1,
                    type: 'bar'
                },
                {
                    label: 'Net Flow',
                    data: labels.map(m => (monthlyData[m].income || 0) - (monthlyData[m].expenses || 0)),
                    borderColor: '#8a9cff',
                    borderWidth: 2,
                    fill: false,
                    type: 'line',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true }
            }
        }
    });
    updateChartColors();
}

function updateCategoryChart() {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    if (categoryChart) categoryChart.destroy();

    const categoryData = getCategoryData();
    const categories = Object.keys(categoryData);
    const amounts = Object.values(categoryData);

    if (categories.length === 0) {
        displayNoDataMessage(canvas, 'No expense data');
        return;
    }

    const sortedData = categories.map((cat, i) => ({ cat, amt: amounts[i] }))
        .sort((a, b) => b.amt - a.amt);

    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#feca57', '#96ceb4', '#ff9ff3'];

    categoryChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: sortedData.map(d => d.cat),
            datasets: [{
                data: sortedData.map(d => d.amt),
                backgroundColor: colors,
                borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e1e1e' : '#ffffff',
                borderWidth: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { 
                    position: 'bottom',
                    labels: {
                        padding: 20
                    }
                },
                datalabels: {
                    formatter: (value, ctx) => {
                        const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1) + '%';
                        return percentage;
                    },
                    color: '#fff',
                    font: {
                        weight: 'bold',
                        size: 14,
                    },
                    textShadowColor: 'rgba(0, 0, 0, 0.5)',
                    textShadowBlur: 4,
                }
            }
        }
    });
    updateChartColors();
}

function displayNoDataMessage(canvas, message) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.font = '16px sans-serif';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

function getMonthlyData() {
    const data = {};
    transactions.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!data[month]) data[month] = { income: 0, expenses: 0 };
        if (t.type === 'income') data[month].income += t.amount;
        else data[month].expenses += t.amount;
    });
    return data;
}

function getCategoryData() {
    const data = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.amount;
    });
    return data;
}

// AI Advice
async function getAIAdvice() {
    if (!isAuthenticated()) {
        showNotification('Please login to get AI advice.', 'error');
        return;
    }
    
    if (transactions.length < 3) {
        showNotification('Need at least 3 transactions for AI advice.', 'error');
        return;
    }

    try {
        showLoading();
        getAdviceBtn.disabled = true;
        getAdviceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Thinking...';

        const response = await fetch(`${API_BASE_URL}/ai-advice`, {
            method: 'POST',
            headers: getAuthHeaders(),
            mode: 'cors'
        });

        if (response.status === 401) {
            logout();
            showNotification('Session expired. Please login again.', 'error');
            return;
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get advice');
        }

        const data = await response.json();
        displayAIAdvice(data.advice);

    } catch (error) {
        showNotification('AI Advice Error: ' + error.message, 'error');
        aiAdviceContainer.innerHTML = `<div class="advice-placeholder"><p>Could not get AI advice. Try again later.</p></div>`;
    } finally {
        hideLoading();
        getAdviceBtn.disabled = false;
        getAdviceBtn.innerHTML = '<i class="fas fa-magic"></i> Get AI Advice';
    }
}

function displayAIAdvice(advice) {
    aiAdviceContainer.innerHTML = ''; // Clear previous
    const adviceBlocks = advice.split('\n\n');
    
    adviceBlocks.forEach((block, index) => {
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble', 'ai');
        bubble.style.animationDelay = `${index * 0.2}s`;
        
        // Simple markdown-to-HTML
        block = block.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        block = block.replace(/\*(.*?)\*/g, '<em>$1</em>');
        block = block.replace(/(\d+\.\s)/g, '<br><strong>$1</strong>');
        
        bubble.innerHTML = block;
        aiAdviceContainer.appendChild(bubble);
    });
}

// Utility Functions
function formatCurrency(amount) {
    return '₹' + Math.abs(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

function formatMonthLabel(monthString) {
    const [year, month] = monthString.split('-');
    return new Date(year, month - 1).toLocaleDateString('en-US', {
        month: 'short', year: '2-digit'
    });
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
    setTimeout(hideNotification, 5000);
}

function hideNotification() {
    notification.classList.add('hidden');
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Chatbot Functions
function isFinanceRelated(message) {
    const financeKeywords = [
        // Investment terms
        'invest', 'investment', 'mutual fund', 'sip', 'stock', 'share', 'equity', 'bond', 'fd', 'fixed deposit',
        'ppf', 'epf', 'elss', 'nsc', 'portfolio', 'return', 'dividend', 'capital', 'asset', 'liability',
        
        // Banking terms
        'bank', 'account', 'loan', 'emi', 'credit', 'debit', 'interest', 'savings', 'current account',
        'neft', 'rtgs', 'upi', 'netbanking', 'atm', 'ifsc', 'overdraft',
        
        // Money and finance
        'money', 'finance', 'financial', 'rupee', 'currency', 'payment', 'transaction', 'budget',
        'expense', 'income', 'salary', 'profit', 'loss', 'cash', 'wealth', 'rich', 'poor',
        
        // Tax terms
        'tax', 'income tax', 'tds', 'gst', 'ltcg', 'stcg', '80c', '80d', 'deduction', 'exemption',
        'itr', 'return filing', 'refund',
        
        // Insurance terms
        'insurance', 'policy', 'premium', 'claim', 'health insurance', 'life insurance', 'term insurance',
        'mediclaim', 'cover', 'nominee',
        
        // Planning terms
        'retire', 'retirement', 'pension', 'emergency fund', 'goal', 'plan', 'planning', 'future',
        'education fund', 'marriage', 'house', 'home loan', 'mortgage',
        
        // Market terms
        'market', 'nifty', 'sensex', 'inflation', 'economy', 'economic', 'recession', 'growth',
        'bull market', 'bear market', 'ipo', 'listing',
        
        // Spending terms
        'spend', 'spending', 'buy', 'purchase', 'cost', 'price', 'expensive', 'cheap', 'afford',
        'debt', 'credit card', 'borrow', 'lend'
    ];
    
    const lowerMessage = message.toLowerCase();
    return financeKeywords.some(keyword => lowerMessage.includes(keyword));
}

async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    if (!isAuthenticated()) {
        addChatMessage(message, 'user');
        chatInput.value = '';
        addChatMessage('Please login to use the AI chat feature.', 'bot');
        return;
    }

    // Check if the message is finance-related
    if (!isFinanceRelated(message)) {
        // Add user message first
        addChatMessage(message, 'user');
        chatInput.value = '';
        
        // Add immediate response for non-finance questions
        addChatMessage(
            "I'm a specialized financial assistant and can only help with finance-related questions. Please ask me about investments, savings, budgeting, taxes, insurance, or any other financial topics. How can I help you with your financial planning today?",
            'bot'
        );
        return;
    }

    // Add user message to chat
    addChatMessage(message, 'user');
    chatInput.value = '';

    // Show typing indicator
    showTypingIndicator();

    try {
        const response = await fetch(`${API_BASE_URL}/ai-advice/chat`, {
            method: 'POST',
            headers: getAuthHeaders(),
            mode: 'cors',
            body: JSON.stringify({ message })
        });

        if (response.status === 401) {
            removeTypingIndicator();
            logout();
            addChatMessage('Session expired. Please login again.', 'bot');
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Remove typing indicator and add bot response
        removeTypingIndicator();
        addChatMessage(data.response, 'bot');

    } catch (error) {
        removeTypingIndicator();
        addChatMessage('Sorry, I encountered an error while processing your request. Please try again later.', 'bot');
        console.error('Chat error:', error);
    }
}

function addChatMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', `${type}-message`);

    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    avatar.innerHTML = type === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

    const content = document.createElement('div');
    content.classList.add('message-content');
    
    // Format the message content
    const formattedMessage = formatChatMessage(message);
    content.innerHTML = formattedMessage;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatChatMessage(message) {
    // Convert markdown-like formatting to HTML
    return message
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/(\d+\.\s)/g, '<br><strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/- (.*?)(\n|$)/g, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('chat-message', 'bot-message', 'typing-message');
    typingDiv.id = 'typing-indicator';

    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    avatar.innerHTML = '<i class="fas fa-robot"></i>';

    const content = document.createElement('div');
    content.classList.add('message-content', 'typing-indicator');
    content.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

    typingDiv.appendChild(avatar);
    typingDiv.appendChild(content);
    chatMessages.appendChild(typingDiv);

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function clearChat() {
    chatMessages.innerHTML = `
        <div class="chat-message bot-message">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>Hello! I'm your AI Financial Assistant. Ask me anything about personal finance, investments, budgeting, or any financial questions you have!</p>
            </div>
        </div>
    `;
}

// Gamification Functions
async function loadGamificationProfile() {
    if (!isAuthenticated()) {
        gamificationProfile = null;
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/gamification/profile`, {
            method: 'GET',
            headers: getAuthHeaders(),
            mode: 'cors'
        });
        
        if (response.status === 401) {
            logout();
            showNotification('Session expired. Please login again.', 'error');
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        gamificationProfile = data.profile;
        
        updateGamificationUI();
        
    } catch (error) {
        console.error('Error loading gamification profile:', error);
        showNotification('Error loading gamification data', 'error');
    } finally {
        hideLoading();
    }
}

function updateGamificationUI() {
    if (!gamificationProfile) return;
    
    // Update player stats
    if (playerLevel) playerLevel.textContent = gamificationProfile.level;
    if (totalPoints) totalPoints.textContent = gamificationProfile.totalPoints;
    if (currentPoints) currentPoints.textContent = gamificationProfile.totalPoints;
    if (nextLevelPoints) nextLevelPoints.textContent = gamificationProfile.totalPoints + gamificationProfile.pointsForNextLevel;
    
    // Update progress bar
    const progressPercentage = gamificationProfile.pointsForNextLevel > 0 
        ? ((gamificationProfile.totalPoints % getPointsForLevel(gamificationProfile.level)) / getPointsForLevel(gamificationProfile.level)) * 100
        : 100;
    if (levelProgress) levelProgress.style.width = `${progressPercentage}%`;
    
    // Update streaks
    if (dailyStreak) dailyStreak.textContent = gamificationProfile.currentStreaks?.dailyTransaction?.count || 0;
    if (savingStreak) savingStreak.textContent = gamificationProfile.currentStreaks?.savingGoal?.count || 0;
    if (budgetStreak) budgetStreak.textContent = gamificationProfile.currentStreaks?.budgetStick?.count || 0;
    if (longestDailyStreak) longestDailyStreak.textContent = gamificationProfile.longestStreaks?.dailyTransaction || 0;
    if (longestSavingStreak) longestSavingStreak.textContent = gamificationProfile.longestStreaks?.savingGoal || 0;
    if (longestBudgetStreak) longestBudgetStreak.textContent = gamificationProfile.longestStreaks?.budgetStick || 0;
    
    // Update challenges and achievements
    renderActiveChallenges();
    renderAchievements();
}

function renderActiveChallenges() {
    if (!activeChallenges) return;
    
    if (!gamificationProfile || !gamificationProfile.activeChallenges || gamificationProfile.activeChallenges.length === 0) {
        activeChallenges.innerHTML = `
            <div class="challenge-card">
                <div class="challenge-header">
                    <div class="challenge-icon">🎯</div>
                    <div class="challenge-info">
                        <h4>No Active Challenges</h4>
                        <span class="challenge-type">Ready</span>
                    </div>
                </div>
                <p class="challenge-description">Complete some transactions to unlock new challenges!</p>
            </div>
        `;
        return;
    }
    
    activeChallenges.innerHTML = gamificationProfile.activeChallenges.map(challenge => {
        const progressPercentage = (challenge.currentProgress / challenge.targetValue) * 100;
        const deadline = new Date(challenge.deadline).toLocaleDateString();
        const isCompleted = challenge.isCompleted;
        
        return `
            <div class="challenge-card ${isCompleted ? 'completed' : ''}" data-challenge-id="${challenge._id}">
                ${isCompleted ? '<div class="completed-badge">✓ Completed</div>' : ''}
                <div class="challenge-header">
                    <div class="challenge-icon">${challenge.icon}</div>
                    <div class="challenge-info">
                        <h4>${challenge.name}</h4>
                        <span class="challenge-type">${challenge.type.toUpperCase()}</span>
                    </div>
                </div>
                <p class="challenge-description">${challenge.description}</p>
                <div class="challenge-progress">
                    <div class="progress-info">
                        <span>Progress: ${challenge.currentProgress}/${challenge.targetValue}</span>
                        <span>${Math.round(progressPercentage)}%</span>
                    </div>
                    <div class="challenge-progress-bar">
                        <div class="challenge-progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                </div>
                <div class="challenge-footer">
                    <span class="challenge-points">+${challenge.points} XP</span>
                    <span class="challenge-deadline">Due: ${deadline}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderAchievements(filter = 'all') {
    if (!achievementsList) return;
    if (!gamificationProfile || !gamificationProfile.achievements) {
        achievementsList.innerHTML = '<p>No achievements data available.</p>';
        return;
    }
    
    let achievements = gamificationProfile.achievements;
    
    // Filter achievements
    if (filter !== 'all') {
        if (filter === 'unlocked') {
            achievements = achievements.filter(a => a.isUnlocked);
        } else if (filter === 'locked') {
            achievements = achievements.filter(a => !a.isUnlocked);
        } else {
            achievements = achievements.filter(a => a.category === filter);
        }
    }
    
    achievementsList.innerHTML = achievements.map(achievement => {
        const unlockedDate = achievement.unlockedAt 
            ? new Date(achievement.unlockedAt).toLocaleDateString() 
            : '';
        
        return `
            <div class="achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'}" data-achievement-id="${achievement.id}">
                ${achievement.isUnlocked ? '<div class="unlocked-badge">✓ Unlocked</div>' : ''}
                <div class="achievement-icon">${achievement.icon}</div>
                <h4 class="achievement-name">${achievement.name}</h4>
                <p class="achievement-description">${achievement.description}</p>
                <div class="achievement-footer">
                    <span class="achievement-difficulty ${achievement.difficulty}">${achievement.difficulty}</span>
                    <span class="achievement-points">+${achievement.points} XP</span>
                </div>
                ${achievement.isUnlocked && unlockedDate ? `<p style="font-size: 0.8rem; margin-top: 10px; opacity: 0.8;">Unlocked: ${unlockedDate}</p>` : ''}
            </div>
        `;
    }).join('');
}

function filterAchievements(filter) {
    renderAchievements(filter);
}

async function updateGamificationAfterTransaction() {
    if (!isAuthenticated()) return;
    
    try {
        // Update streak
        await fetch(`${API_BASE_URL}/gamification/update-streak`, {
            method: 'POST',
            headers: getAuthHeaders(),
            mode: 'cors',
            body: JSON.stringify({ streakType: 'dailyTransaction' })
        });
        
        // Check achievements
        const response = await fetch(`${API_BASE_URL}/gamification/check-achievements`, {
            method: 'POST',
            headers: getAuthHeaders(),
            mode: 'cors'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Show notifications for newly unlocked achievements
            if (data.newlyUnlocked && data.newlyUnlocked.length > 0) {
                data.newlyUnlocked.forEach((achievement, index) => {
                    setTimeout(() => {
                        showAchievementNotification(achievement);
                    }, index * 1000);
                });
            }
            
            // Reload gamification profile
            await loadGamificationProfile();
        }
        
    } catch (error) {
        console.error('Error updating gamification:', error);
    }
}

function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-notification-icon">${achievement.icon}</div>
        <div class="achievement-notification-content">
            <h4>Achievement Unlocked!</h4>
            <p>${achievement.name} - +${achievement.points} XP</p>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 4000);
    
    // Play achievement sound (optional)
    playAchievementSound();
}

function playAchievementSound() {
    // Create a simple achievement sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        // Second tone
        setTimeout(() => {
            const oscillator2 = audioContext.createOscillator();
            const gainNode2 = audioContext.createGain();
            
            oscillator2.connect(gainNode2);
            gainNode2.connect(audioContext.destination);
            
            oscillator2.frequency.value = 1000;
            oscillator2.type = 'sine';
            
            gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator2.start(audioContext.currentTime);
            oscillator2.stop(audioContext.currentTime + 0.3);
        }, 200);
        
    } catch (error) {
        // Fallback: no sound if Web Audio API is not available
        console.log('Audio not available');
    }
}

function getPointsForLevel(level) {
    const levelThresholds = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 9000];
    if (level >= levelThresholds.length) return 10000;
    return levelThresholds[level] - levelThresholds[level - 1];
}
