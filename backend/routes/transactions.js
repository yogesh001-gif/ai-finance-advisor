const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// DELETE /api/transactions/clear-all - Delete all transactions
router.delete('/clear-all', async (req, res) => {
  try {
    await Transaction.deleteMany({});
    res.json({ message: 'All transactions cleared.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/transactions - Get all transactions
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, type, category } = req.query;
    let query = {};

    // Filter by date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Filter by type
    if (type && ['income', 'expense'].includes(type)) {
      query.type = type;
    }

    // Filter by category
    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      transactions,
      summary: {
        totalIncome,
        totalExpenses,
        netAmount: totalIncome - totalExpenses,
        count: transactions.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/transactions - Add new transaction
router.post('/', async (req, res) => {
  try {
    const { type, amount, category, description, date, tags } = req.body;

    // Validation
    if (!type || !amount || !category) {
      return res.status(400).json({ 
        error: 'Type, amount, and category are required' 
      });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ 
        error: 'Type must be either "income" or "expense"' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        error: 'Amount must be greater than 0' 
      });
    }

    const transaction = new Transaction({
      type,
      amount: parseFloat(amount),
      category,
      description: description || '',
      date: date ? new Date(date) : new Date(),
      tags: tags || []
    });

    const savedTransaction = await transaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/transactions/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Transaction.distinct('category');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/transactions/stats - Get financial statistics
router.get('/stats', async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const transactions = await Transaction.find({
      date: { $gte: startDate }
    });

    // Group by month
    const monthlyStats = {};
    transactions.forEach(transaction => {
      const month = transaction.date.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyStats[month]) {
        monthlyStats[month] = { income: 0, expenses: 0 };
      }
      if (transaction.type === 'income') {
        monthlyStats[month].income += transaction.amount;
      } else {
        monthlyStats[month].expenses += transaction.amount;
      }
    });

    // Category breakdown
    const categoryStats = {};
    transactions.forEach(transaction => {
      if (!categoryStats[transaction.category]) {
        categoryStats[transaction.category] = { income: 0, expenses: 0 };
      }
      if (transaction.type === 'income') {
        categoryStats[transaction.category].income += transaction.amount;
      } else {
        categoryStats[transaction.category].expenses += transaction.amount;
      }
    });

    res.json({
      monthlyStats,
      categoryStats,
      period: `${months} months`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
