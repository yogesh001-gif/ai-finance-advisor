# AI Personal Finance & Investment Advisor

A comprehensive web application that acts as your personal finance coach, powered by AI to provide intelligent financial recommendations.


## Features

### 🔒 Authentication & Security
- **User Registration**: Sign up with name, email, and password
- **Secure Login with OTP**: Password-based login with email OTP verification (OTP expires in 5 minutes, 5 attempts max)
- **Resend OTP**: Request a new OTP if needed
- **Profile Management**: Update name/email, change password, deactivate account
- **JWT-based Auth**: Secure API access with tokens
- **Password Hashing**: All passwords are hashed (bcrypt)
- **.env Security**: Sensitive config is never pushed to GitHub

### 🏠 Landing Page & User Journey
- **Modern Landing Page**: Highlights features, testimonials, and app value
- **Onboarding Flow**: Sign up or log in from the landing page
- **Auth Overlay**: Modal for login, registration, and OTP verification
- **Responsive Design**: Works on desktop and mobile

### 🔧 Core Functionality
- **Transaction Tracking**: Add, edit, and categorize income/expenses
- **Financial Dashboard**: Visual summary of your financial health
- **Category Management**: Auto-learned categories, filter by category
- **Data Filtering**: Filter by date, type, and category
- **Delete Transactions**: Remove individual or all transactions

### 📊 Visualizations
- **Income vs Expenses Chart**: Bar/line chart (Chart.js)
- **Expense Breakdown**: Pie chart by category
- **Monthly Trends**: Spending and income patterns
- **Summary Cards**: Income, expenses, net, and more

### 🤖 AI Features
- **Personalized Financial Analysis**: AI reviews your real data
- **Budget Optimization**: Category-specific advice
- **Investment Recommendations**: SIP, mutual funds, and more
- **Tax & Savings Tips**: Actionable, data-driven suggestions
- **Quick Tips**: One-click access to best practices
- **Chatbot (optional)**: Ask finance questions (if enabled)

### 🏆 Gamification & Rewards
- **Achievements**: Earn badges for milestones (transactions, savings, streaks, investments, budgeting)
- **Challenges**: Daily, weekly, and monthly goals (e.g., save ₹100/day, track 5 categories/week)
- **Points & Levels**: Level up as you earn points
- **Streaks**: Track daily/weekly/monthly consistency
- **Leaderboard**: See top users (future multi-user support)
- **Notifications**: In-app reminders and achievement unlocks

### 📱 Other Features
- **Responsive UI**: Mobile and desktop friendly
- **Customizable Categories**: Add any category you want
- **Data Security**: All data stored in your MongoDB
- **Planned**: Goal setting, bill reminders, PDF/CSV export, multi-currency, mobile app, bank integration
## Authentication & User Flow

### Registration
- User provides name, email, password (min 6 chars, confirmed)
- Email must be unique
- Password is hashed before storage
- On success, user receives a JWT token

### Login & OTP Verification
1. User enters email and password
2. If credentials are valid, a 6-digit OTP is generated and emailed (expires in 5 min)
3. User enters OTP in the app
4. If OTP is correct and not expired, login is completed and JWT is issued
5. Up to 5 OTP attempts allowed; after that, must request new OTP
6. User can request OTP resend if needed

### Authenticated Actions
- All sensitive routes require JWT in headers
- Users can update profile (name/email), change password, and logout (client-side token removal)
- Password changes require current password

### Security Notes
- All passwords are hashed (bcrypt)
- JWT tokens are used for stateless authentication
- .env file is excluded from version control
- OTPs are stored in-memory (use Redis for production)
- Email sending uses secure SMTP (configurable)

### Landing Page & Onboarding
- The landing page introduces the app, features, and value
- Users can sign up or log in directly from the landing page
- Auth overlay handles registration, login, and OTP verification in a user-friendly modal
- After login, users are redirected to their dashboard

---

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


### Quick Start (Recommended)

You can use the provided batch scripts to quickly start the app:

```bash
start-app.bat           # Starts both backend and frontend
start-backend.bat       # Starts backend only
start-frontend.bat      # Starts frontend only
```

Or follow the manual steps below for more control.

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your configuration (see example below). **Note:** `.env` is excluded from version control for security.
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

2. Open `index.html` in a web browser, or serve it using a local server:
   ```bash
   # Using Node.js http-server (recommended)
   npx http-server -p 3001

   # Or use the provided script
   npm start
   ```

3. The application will be available at `http://127.0.0.1:3001`
## Environment Variables & Security

- The `.env` file contains sensitive information (API keys, database URIs) and is now excluded from version control via `.gitignore`.
- Make sure to create your own `.env` file in the backend directory before running the app.

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


## Troubleshooting & Tips
5. **.env file pushed by mistake**
   - If you accidentally pushed your `.env` file, remove it from the repo and commit again. The current setup ensures `.env` is ignored.

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


## Support & Contact

## Connect with the Author

You can find me on LinkedIn: [www.linkedin.com/in/yogeshahlawat](https://www.linkedin.com/in/yogeshahlawat)

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Create an issue in the repository

---

**Note**: This application is for educational and personal use. AI advice is powered by Google Gemini API. Always consult with qualified financial advisors for major financial decisions.
npm install http-server --save-dev