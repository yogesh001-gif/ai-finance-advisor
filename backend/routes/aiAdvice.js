const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Transaction = require('../models/Transaction');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/ai-advice - Get AI financial advice
router.post('/', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
            return res.status(500).json({ 
                error: 'Gemini API key not configured. Please set your API key in the .env file.' 
            });
        }

        // Get user's financial data from last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const transactions = await Transaction.find({
            date: { $gte: sixMonthsAgo }
        }).sort({ date: -1 });

        if (transactions.length === 0) {
            return res.status(400).json({
                error: 'No transaction data found. Please add some transactions first.'
            });
        }

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
        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
            });

        // Sort categories by spending
        const topExpenseCategories = Object.entries(expenseCategories)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        // Monthly spending pattern
        const monthlyData = {};
        transactions.forEach(t => {
            const month = t.date.toISOString().substring(0, 7);
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expenses: 0 };
            }
            monthlyData[month][t.type === 'income' ? 'income' : 'expenses'] += t.amount;
        });

        // Prepare prompt for AI
        const financialSummary = {
            totalIncome: totalIncome.toFixed(2),
            totalExpenses: totalExpenses.toFixed(2),
            netSavings: netSavings.toFixed(2),
            savingsRate: savingsRate.toFixed(1),
            topExpenseCategories: topExpenseCategories.map(([cat, amount]) => 
                `${cat}: ₹${amount.toFixed(2)}`
            ),
            monthlyAverage: {
                income: (totalIncome / 6).toFixed(2),
                expenses: (totalExpenses / 6).toFixed(2)
            }
        };

        const prompt = `As a personal finance advisor for an Indian client, analyze this financial data and provide specific, actionable advice in Indian context:

Financial Summary (Last 6 months):
- Total Income: ₹${financialSummary.totalIncome}
- Total Expenses: ₹${financialSummary.totalExpenses}
- Net Savings: ₹${financialSummary.netSavings}
- Savings Rate: ${financialSummary.savingsRate}%
- Monthly Average Income: ₹${financialSummary.monthlyAverage.income}
- Monthly Average Expenses: ₹${financialSummary.monthlyAverage.expenses}

Top Expense Categories:
${financialSummary.topExpenseCategories.join('\n')}

Please provide advice considering Indian financial context:
1. **Budget Analysis**: Assess the current financial health in Indian context
2. **Savings Recommendations**: Specific ways to improve savings rate (consider Indian savings instruments like PPF, EPF, NSC)
3. **Expense Optimization**: Which categories to focus on reducing
4. **Investment Suggestions**: Based on current savings capacity (consider SIP, mutual funds, stocks, FDs, etc.)
5. **Tax Optimization Tips**: Strategies to minimize tax burden under Indian Income Tax (Section 80C, 80D, etc.)
6. **Emergency Fund**: Recommendations for emergency savings in Indian context

Keep advice practical, specific, and actionable for Indian residents. Include specific amounts in Indian Rupees where relevant. Consider Indian financial products and tax laws.`;

        // Get AI response using Gemini
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
        
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{
                    text: `You are an expert personal finance advisor. Provide practical, specific, and actionable financial advice based on the user's financial data.

${prompt}`
                }]
            }],
            generationConfig: {
                maxOutputTokens: 1500,
                temperature: 0.7,
            },
        });

        const advice = result.response.text();

        res.json({
            advice,
            financialSummary,
            metadata: {
                analysisDate: new Date().toISOString(),
                dataPoints: transactions.length,
                periodAnalyzed: '6 months'
            }
        });

    } catch (error) {
        console.error('AI Advice Error:', error);
        
        // Provide more specific error messages
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
        
        if (error.message && error.message.includes('invalid_api_key')) {
            return res.status(401).json({ 
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

module.exports = router;
