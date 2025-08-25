# AI Personal Finance & Investment Advisor

A comprehensive web application that acts as your personal finance coach, powered by AI to provide intelligent financial recommendations.

## Features

### 🔧 Core Functionality
- **Transaction Tracking**: Add and categorize income and expenses
- **Financial Dashboard**: Visual representation of your financial health
- **AI-Powered Advice**: Get personalized financial recommendations
- **Investment Suggestions**: AI-driven investment opportunities
- **Tax Optimization**: Strategies to minimize tax burden
- **Savings Recommendations**: Actionable ways to improve savings rate

### 📊 Visualizations
- Income vs Expenses chart (Chart.js)
- Category-wise expense breakdown
- Monthly spending patterns
- Financial summary cards

### 🤖 AI Features
- Personalized financial analysis
- Budget optimization suggestions
- Investment recommendations based on financial capacity
- Quick financial tips and best practices

## Project Architecture

### Frontend (HTML, CSS, JavaScript)
- **Responsive UI** for income/expense input
- **Interactive Charts** using Chart.js
- **Real-time updates** and filtering
- **AI advice panel** with chatbot-style interface

### Backend (Node.js + Express)
- **RESTful API** with the following endpoints:
  - `POST /api/transaction` - Add income/expense
  - `GET /api/transactions` - Get all transactions with filtering
  - `GET /api/transactions/stats` - Get financial statistics
  - `POST /api/ai-advice` - Get AI financial advice
  - `GET /api/ai-advice/quick-tips` - Get quick financial tips

### Database (MongoDB)
- **Transaction storage** with comprehensive schema
- **Indexed queries** for better performance
- **Data aggregation** for analytics

### AI Integration (Gemini API)
- **Google Gemini API** for generating financial advice
- **Contextual prompts** with user's financial data
- **Structured responses** for actionable recommendations

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Gemini API key (Google Generative AI)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ai-finance-advisor
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-1.5-flash
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Open `index.html` in a web browser or serve it using a local server:
   ```bash
   # Using Python
   python -m http.server 3001
   
   # Using Node.js http-server (recommended)
   npx http-server -p 3001
   
   # Using npm script
   npm start
   ```

3. The application will be available at `http://127.0.0.1:3001`

## API Documentation

### Transactions API

#### Add Transaction
```http
POST /api/transactions
Content-Type: application/json

{
  "type": "expense",
  "amount": 50.00,
  "category": "Food",
  "description": "Lunch at restaurant",
  "date": "2023-12-01"
}
```

#### Get Transactions
```http
GET /api/transactions?type=expense&startDate=2023-11-01&endDate=2023-12-01
```

#### Get Statistics
```http
GET /api/transactions/stats?months=6
```

### AI Advice API

#### Get AI Financial Advice
```http
POST /api/ai-advice
```

#### Get Quick Tips
```http
GET /api/ai-advice/quick-tips
```

## Usage Guide

### Adding Transactions
1. Fill in the transaction form with type, amount, category, and date
2. Add optional description for better tracking
3. Click "Add Transaction" to save

### Viewing Financial Data
- **Summary Cards**: Quick overview of income, expenses, and net amount
- **Charts**: Visual representation of spending patterns
- **Transaction List**: Detailed view of recent transactions with filtering

### Getting AI Advice
1. Ensure you have some transaction history
2. Click "Get AI Advice" button
3. Wait for AI analysis (usually 10-30 seconds)
4. Review personalized recommendations

### Understanding AI Recommendations
The AI analyzes your financial data and provides advice on:
- **Budget Analysis**: Current financial health assessment
- **Savings Optimization**: Ways to improve savings rate
- **Expense Reduction**: Categories to focus on cutting
- **Investment Suggestions**: Based on your savings capacity
- **Tax Strategies**: Methods to reduce tax burden
- **Emergency Planning**: Recommendations for emergency funds

## Data Security

- All financial data is stored locally in your MongoDB instance
- No sensitive financial information is permanently stored by Gemini API or Google
- API communications use HTTPS in production
- Rate limiting implemented to prevent abuse

## Customization

### Adding New Categories
The application automatically learns from your transaction categories. Simply type new categories when adding transactions.

### Modifying AI Prompts
Edit the prompt in `backend/routes/aiAdvice.js` to customize the type of advice the AI provides.

### Styling Changes
Modify `frontend/styles.css` to customize the application's appearance.

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check the connection string in `.env`

2. **Gemini API Errors**
   - Verify your Gemini API key is correct
   - Check your Google Generative AI account has available credits
   - Ensure the model specified exists

3. **CORS Issues**
   - The backend includes CORS middleware
   - Ensure frontend is served from the correct origin

4. **Chart Not Displaying**
   - Check browser console for JavaScript errors
   - Ensure Chart.js is loaded correctly

## Future Enhancements

- **Goal Setting**: Set and track financial goals
- **Budget Categories**: Predefined budget allocations
- **Bill Reminders**: Automated payment reminders
- **Export Features**: PDF reports and CSV exports
- **Multi-currency Support**: Handle different currencies
- **Mobile App**: React Native mobile application
- **Bank Integration**: Connect to banking APIs for automatic transaction import

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Create an issue in the repository

---

**Note**: This application is for educational and personal use. AI advice is powered by Google Gemini API. Always consult with qualified financial advisors for major financial decisions.
