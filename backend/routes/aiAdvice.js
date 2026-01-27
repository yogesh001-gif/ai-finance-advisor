const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const Transaction = require('../models/Transaction');
const { authenticate } = require('../middleware/auth');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// All routes require authentication
router.use(authenticate);

// POST /api/ai-advice - Get AI financial advice
router.post('/', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
            return res.status(500).json({ 
                error: 'Gemini API key not configured. Please set your API key in the .env file.' 
            });
        }

        // Get ALL user's financial data for comprehensive analysis
        const transactions = await Transaction.find({ userId: req.userId }).sort({ date: -1 });

        if (transactions.length === 0) {
            return res.status(400).json({
                error: 'No transaction data found. Please add some transactions first.'
            });
        }

        // Calculate the actual period covered by transactions
        const oldestDate = transactions[transactions.length - 1].date;
        const newestDate = transactions[0].date;
        const monthsCovered = Math.max(1, Math.ceil((newestDate - oldestDate) / (1000 * 60 * 60 * 24 * 30)));

        // Calculate financial summary
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const netSavings = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

        // Category breakdown
        const expenseCategories = {};
        const incomeCategories = {};
        
        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
            });
            
        transactions
            .filter(t => t.type === 'income')
            .forEach(t => {
                incomeCategories[t.category] = (incomeCategories[t.category] || 0) + t.amount;
            });

        // Sort categories by spending
        const topExpenseCategories = Object.entries(expenseCategories)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
            
        const topIncomeCategories = Object.entries(incomeCategories)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);

        // Monthly spending pattern and trend analysis
        const monthlyData = {};
        transactions.forEach(t => {
            const month = t.date.toISOString().substring(0, 7);
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expenses: 0, transactions: 0 };
            }
            monthlyData[month][t.type === 'income' ? 'income' : 'expenses'] += t.amount;
            monthlyData[month].transactions++;
        });

        // Calculate trends
        const sortedMonths = Object.keys(monthlyData).sort();
        let incomeGrowth = 0;
        let expenseGrowth = 0;
        
        if (sortedMonths.length >= 2) {
            const firstMonth = monthlyData[sortedMonths[0]];
            const lastMonth = monthlyData[sortedMonths[sortedMonths.length - 1]];
            
            incomeGrowth = firstMonth.income > 0 ? 
                ((lastMonth.income - firstMonth.income) / firstMonth.income) * 100 : 0;
            expenseGrowth = firstMonth.expenses > 0 ? 
                ((lastMonth.expenses - firstMonth.expenses) / firstMonth.expenses) * 100 : 0;
        }

        // Financial health indicators
        const avgMonthlyIncome = totalIncome / monthsCovered;
        const avgMonthlyExpenses = totalExpenses / monthsCovered;
        const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
        
        // Emergency fund assessment
        const recommendedEmergencyFund = avgMonthlyExpenses * 6;
        const currentEmergencyFundStatus = netSavings >= recommendedEmergencyFund ? 'Adequate' : 'Insufficient';
        
        // Investment capacity
        const investmentCapacity = Math.max(0, netSavings * 0.7); // 70% of savings for investment

        // Prepare prompt for AI
        const financialSummary = {
            totalIncome: totalIncome.toFixed(2),
            totalExpenses: totalExpenses.toFixed(2),
            netSavings: netSavings.toFixed(2),
            savingsRate: savingsRate.toFixed(1),
            expenseRatio: expenseRatio.toFixed(1),
            incomeGrowth: incomeGrowth.toFixed(1),
            expenseGrowth: expenseGrowth.toFixed(1),
            topExpenseCategories: topExpenseCategories.map(([cat, amount]) => 
                `${cat}: ₹${amount.toFixed(2)} (${((amount/totalExpenses)*100).toFixed(1)}%)`
            ),
            topIncomeCategories: topIncomeCategories.map(([cat, amount]) => 
                `${cat}: ₹${amount.toFixed(2)}`
            ),
            monthlyAverage: {
                income: avgMonthlyIncome.toFixed(2),
                expenses: avgMonthlyExpenses.toFixed(2)
            },
            emergencyFund: {
                recommended: recommendedEmergencyFund.toFixed(2),
                status: currentEmergencyFundStatus,
                gap: Math.max(0, recommendedEmergencyFund - netSavings).toFixed(2)
            },
            investmentCapacity: investmentCapacity.toFixed(2)
        };

        const prompt = `You are a personal finance advisor. Analyze this EXACT financial data and give SPECIFIC advice based ONLY on these numbers. Do NOT give generic advice.

USER'S ACTUAL FINANCIAL DATA (${transactions.length} transactions over ${monthsCovered} month(s)):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INCOME:
• Total Income: ₹${financialSummary.totalIncome}
• Monthly Average: ₹${financialSummary.monthlyAverage.income}
• Sources: ${financialSummary.topIncomeCategories.length > 0 ? financialSummary.topIncomeCategories.join(' | ') : 'No income recorded'}

EXPENSES:
• Total Expenses: ₹${financialSummary.totalExpenses}
• Monthly Average: ₹${financialSummary.monthlyAverage.expenses}
• Top Spending: ${financialSummary.topExpenseCategories.length > 0 ? financialSummary.topExpenseCategories.join(' | ') : 'No expenses recorded'}

SAVINGS:
• Net Savings: ₹${financialSummary.netSavings}
• Savings Rate: ${financialSummary.savingsRate}%
• Emergency Fund Status: ${financialSummary.emergencyFund.status} (Gap: ₹${financialSummary.emergencyFund.gap})
• Available for Investment: ₹${financialSummary.investmentCapacity}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS: You MUST reference the EXACT numbers above in your response. Give personalized advice.

**1. 📊 Financial Health Score**
Rate their finances (Poor/Fair/Good/Excellent) based on their ${financialSummary.savingsRate}% savings rate. Mention their exact income ₹${financialSummary.totalIncome} and expenses ₹${financialSummary.totalExpenses}.

**2. 💡 Budget Optimization**
Look at their TOP SPENDING categories above. Tell them exactly which category to reduce and by how much ₹.

**3. 💰 Savings Recommendation**
Based on their monthly income ₹${financialSummary.monthlyAverage.income}, suggest exact monthly savings target. Recommend PPF/FD/Liquid Funds with specific amounts.

**4. 📈 Investment Plan**
They have ₹${financialSummary.investmentCapacity} available. Suggest exact SIP amounts for mutual funds. Give specific allocation (e.g., "₹X in ELSS, ₹Y in Index Fund").

**5. ✅ Action Items This Month**
Give 3 specific actions with exact ₹ amounts based on their data.

Keep response focused and use their ACTUAL numbers throughout.`;

        // Get AI response using Gemini
        const result = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
            contents: prompt
        });
        const advice = result.text;

        res.json({
            advice,
            financialSummary,
            metadata: {
                analysisDate: new Date().toISOString(),
                dataPoints: transactions.length,
                periodAnalyzed: `${monthsCovered} month(s)`
            }
        });

    } catch (error) {
        console.error('AI Advice Error:', error);
        
        // Provide more specific error messages
        if (error.message && error.message.includes('API key')) {
            return res.status(500).json({ 
                error: 'Invalid Gemini API key. Please check your API key configuration.' 
            });
        }
        
        if (error.message && error.message.includes('quota')) {
            return res.status(402).json({ 
                error: 'Gemini API quota exceeded. Please check your billing.' 
            });
        }
        
        if (error.message && error.message.includes('invalid_api_key')) {
            return res.status(500).json({ 
                error: 'Invalid Gemini API key' 
            });
        }

        if (error.message && error.message.includes('network')) {
            return res.status(503).json({ 
                error: 'Network error connecting to Gemini API. Please try again later.' 
            });
        }

        // Generic fallback with helpful message
        res.status(500).json({ 
            error: 'Unable to generate AI advice at this time. This could be due to API configuration or network issues. Please check your Gemini API key and try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/ai-advice/quick-tips - Get quick financial tips
router.get('/quick-tips', async (req, res) => {
    try {
        const tips = [
            {
                category: 'Savings',
                tip: 'Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings and investments',
                priority: 'high'
            },
            {
                category: 'Investment',
                tip: 'Start SIP in diversified mutual funds and ELSS for tax benefits',
                priority: 'medium'
            },
            {
                category: 'Emergency Fund',
                tip: 'Build 6-12 months of expenses in high-yield savings or liquid funds',
                priority: 'high'
            },
            {
                category: 'Debt',
                tip: 'Pay off high-interest credit card debt before investing',
                priority: 'high'
            },
            {
                category: 'Tax Planning',
                tip: 'Maximize Section 80C (₹1.5L) with PPF, ELSS, and NSC investments',
                priority: 'medium'
            },
            {
                category: 'Insurance',
                tip: 'Get adequate term life insurance and health insurance for 80D benefits',
                priority: 'high'
            },
            {
                category: 'Gold Investment',
                tip: 'Consider digital gold or gold ETFs for portfolio diversification',
                priority: 'low'
            }
        ];

        res.json({ tips });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/ai-advice/chat - Chatbot endpoint
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
            return res.status(500).json({ 
                error: 'Gemini API key not configured. Please set your API key in the .env file.' 
            });
        }

        // Get ALL user's financial data for comprehensive context
        const allTransactions = await Transaction.find({ userId: req.userId }).sort({ date: -1 });

        let financialContext = '';
        let topExpenseCategory = 'expenses';
        let userTotalIncome = 0;
        
        if (allTransactions.length > 0) {
            const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const totalExpenses = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const netSavings = totalIncome - totalExpenses;
            const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;
            
            userTotalIncome = totalIncome;
            
            // Get category breakdown
            const expenseCategories = {};
            const incomeCategories = {};
            allTransactions.filter(t => t.type === 'expense').forEach(t => {
                expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
            });
            allTransactions.filter(t => t.type === 'income').forEach(t => {
                incomeCategories[t.category] = (incomeCategories[t.category] || 0) + t.amount;
            });
            
            // Get top expense category
            const sortedExpenses = Object.entries(expenseCategories).sort(([,a], [,b]) => b - a);
            if (sortedExpenses.length > 0) {
                topExpenseCategory = sortedExpenses[0][0];
            }
            
            const topExpenses = sortedExpenses
                .slice(0, 5)
                .map(([cat, amt]) => `${cat}: ₹${amt.toFixed(2)}`)
                .join(', ');
            
            const topIncomes = Object.entries(incomeCategories)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([cat, amt]) => `${cat}: ₹${amt.toFixed(2)}`)
                .join(', ');
            
            financialContext = `
━━━━ USER'S ACTUAL FINANCIAL DATA ━━━━
Total Transactions: ${allTransactions.length}
Total Income: ₹${totalIncome.toFixed(2)}
Total Expenses: ₹${totalExpenses.toFixed(2)}
Net Savings: ₹${netSavings.toFixed(2)}
Savings Rate: ${savingsRate}%
Income Sources: ${topIncomes || 'None recorded'}
Expense Categories: ${topExpenses || 'None recorded'}
All Categories Used: ${[...new Set(allTransactions.map(t => t.category))].join(', ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
        }

        const chatPrompt = `You are a helpful Indian personal finance assistant. Answer the user's question using their ACTUAL financial data below.

${financialContext}

USER'S QUESTION: ${message}

RULES:
1. If the user has financial data above, ALWAYS use their EXACT numbers (₹ amounts, categories, percentages) in your response.
2. Give SPECIFIC advice, not generic tips. For example:
   - Instead of "reduce expenses", say "reduce your ${topExpenseCategory} spending"
   - Instead of "save more", say "based on your ₹${userTotalIncome.toFixed(0)} income, aim to save ₹X monthly"
3. If asked about their finances, quote their exact data.
4. For investment questions, calculate specific SIP amounts based on their savings.
5. Keep response concise but helpful.
6. Use Indian financial context (PPF, ELSS, SIP, Section 80C, etc.)

If the question is NOT about finance, politely redirect to financial topics.

Answer:`;

        const result = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
            contents: chatPrompt
        });
        const response = result.text;
        res.json({
            response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chat Error:', error);
        
        if (error.message && error.message.includes('API key')) {
            return res.status(401).json({ 
                error: 'Invalid Gemini API key. Please check your API key configuration.' 
            });
        }
        
        if (error.message && error.message.includes('quota')) {
            return res.status(402).json({ 
                error: 'Gemini API quota exceeded. Please check your billing.' 
            });
        }

        res.status(500).json({ 
            error: 'Unable to process your question at this time. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
