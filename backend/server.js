const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const aiAdviceRoutes = require('./routes/aiAdvice');
const gamificationRoutes = require('./routes/gamification');

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = 'https://ai-finance-advisorr.vercel.app';

// Security headers
app.use(helmet());

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// 🔒 Production CORS (Vercel only)
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/ai-advice', aiAdviceRoutes);
app.use('/api/gamification', gamificationRoutes);

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AI Finance Advisor API is running' });
});


// Root route for Render or base URL
app.get('/', (req, res) => {
  res.send(`
    <h1>AI Finance Advisor API</h1>
    <p>Welcome! The backend is running.</p>
    <ul>
      <li>Health check: <a href="/api/health">/api/health</a></li>
      <li>Auth: <code>/api/auth</code></li>
      <li>Transactions: <code>/api/transactions</code></li>
      <li>AI Advice: <code>/api/ai-advice</code></li>
      <li>Gamification: <code>/api/gamification</code></li>
    </ul>
    <p>See <a href="https://github.com/yogesh001-gif/ai-finance-advisor">GitHub Repo</a></p>
  `);
});

// 404 for all other undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
