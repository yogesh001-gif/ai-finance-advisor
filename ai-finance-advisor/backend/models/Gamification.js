const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    category: { type: String, required: true }, // saving, investing, budgeting, consistency
    difficulty: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], required: true },
    points: { type: Number, required: true },
    condition: { type: Object, required: true }, // Achievement conditions
    isUnlocked: { type: Boolean, default: false },
    unlockedAt: { type: Date }
});

const challengeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    type: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    category: { type: String, required: true },
    targetValue: { type: Number, required: true },
    currentProgress: { type: Number, default: 0 },
    points: { type: Number, required: true },
    deadline: { type: Date, required: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date }
});

const gamificationProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    level: { type: Number, default: 1 },
    totalPoints: { type: Number, default: 0 },
    currentStreaks: {
        dailyTransaction: { count: { type: Number, default: 0 }, lastDate: { type: String, default: null } },
        savingGoal: { count: { type: Number, default: 0 }, lastDate: { type: String, default: null } },
        budgetStick: { count: { type: Number, default: 0 }, lastDate: { type: String, default: null } }
    },
    longestStreaks: {
        dailyTransaction: { type: Number, default: 0 },
        savingGoal: { type: Number, default: 0 },
        budgetStick: { type: Number, default: 0 }
    },
    achievements: [achievementSchema],
    activeChallenges: [challengeSchema],
    completedChallenges: [challengeSchema],
    stats: {
        totalTransactions: { type: Number, default: 0 },
        totalSaved: { type: Number, default: 0 },
        budgetGoalsAchieved: { type: Number, default: 0 },
        investmentsMade: { type: Number, default: 0 },
        monthsActive: { type: Number, default: 0 }
    },
    preferences: {
        notifications: { type: Boolean, default: true },
        challengeDifficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }
    }
}, {
    timestamps: true
});

// Define achievement templates
const ACHIEVEMENT_TEMPLATES = [
    // Transaction Achievements
    {
        id: 'first_transaction',
        name: 'Getting Started',
        description: 'Record your first transaction',
        icon: '🎯',
        category: 'consistency',
        difficulty: 'bronze',
        points: 50,
        condition: { type: 'transaction_count', value: 1 }
    },
    {
        id: 'transaction_milestone_10',
        name: 'Tracking Pro',
        description: 'Record 10 transactions',
        icon: '📊',
        category: 'consistency',
        difficulty: 'bronze',
        points: 100,
        condition: { type: 'transaction_count', value: 10 }
    },
    {
        id: 'transaction_milestone_50',
        name: 'Data Master',
        description: 'Record 50 transactions',
        icon: '📈',
        category: 'consistency',
        difficulty: 'silver',
        points: 250,
        condition: { type: 'transaction_count', value: 50 }
    },
    {
        id: 'transaction_milestone_100',
        name: 'Financial Chronicler',
        description: 'Record 100 transactions',
        icon: '🏆',
        category: 'consistency',
        difficulty: 'gold',
        points: 500,
        condition: { type: 'transaction_count', value: 100 }
    },

    // Saving Achievements
    {
        id: 'first_save',
        name: 'Smart Saver',
        description: 'Save ₹1000 or more in a month',
        icon: '💰',
        category: 'saving',
        difficulty: 'bronze',
        points: 150,
        condition: { type: 'monthly_savings', value: 1000 }
    },
    {
        id: 'save_5k',
        name: 'Savings Champion',
        description: 'Save ₹5000 or more in a month',
        icon: '💎',
        category: 'saving',
        difficulty: 'silver',
        points: 300,
        condition: { type: 'monthly_savings', value: 5000 }
    },
    {
        id: 'save_10k',
        name: 'Wealth Builder',
        description: 'Save ₹10000 or more in a month',
        icon: '👑',
        category: 'saving',
        difficulty: 'gold',
        points: 600,
        condition: { type: 'monthly_savings', value: 10000 }
    },

    // Streak Achievements
    {
        id: 'streak_7',
        name: 'Week Warrior',
        description: 'Record transactions for 7 consecutive days',
        icon: '🔥',
        category: 'consistency',
        difficulty: 'bronze',
        points: 200,
        condition: { type: 'daily_streak', value: 7 }
    },
    {
        id: 'streak_30',
        name: 'Monthly Master',
        description: 'Record transactions for 30 consecutive days',
        icon: '⚡',
        category: 'consistency',
        difficulty: 'silver',
        points: 400,
        condition: { type: 'daily_streak', value: 30 }
    },
    {
        id: 'streak_100',
        name: 'Consistency King',
        description: 'Record transactions for 100 consecutive days',
        icon: '👑',
        category: 'consistency',
        difficulty: 'platinum',
        points: 1000,
        condition: { type: 'daily_streak', value: 100 }
    },

    // Budget Achievements
    {
        id: 'under_budget',
        name: 'Budget Boss',
        description: 'Stay under your monthly budget',
        icon: '🎯',
        category: 'budgeting',
        difficulty: 'bronze',
        points: 200,
        condition: { type: 'under_budget', value: 1 }
    },
    {
        id: 'budget_streak_3',
        name: 'Budget Master',
        description: 'Stay under budget for 3 consecutive months',
        icon: '🏅',
        category: 'budgeting',
        difficulty: 'silver',
        points: 500,
        condition: { type: 'budget_streak', value: 3 }
    },

    // Investment Achievements
    {
        id: 'first_investment',
        name: 'Future Planner',
        description: 'Make your first investment transaction',
        icon: '📊',
        category: 'investing',
        difficulty: 'bronze',
        points: 300,
        condition: { type: 'investment_count', value: 1 }
    },
    {
        id: 'diversified_investor',
        name: 'Diversified Investor',
        description: 'Invest in 5 different categories',
        icon: '🌟',
        category: 'investing',
        difficulty: 'gold',
        points: 800,
        condition: { type: 'investment_categories', value: 5 }
    }
];

// Challenge templates that rotate
const CHALLENGE_TEMPLATES = [
    // Daily Challenges
    {
        id: 'daily_track',
        name: 'Daily Tracker',
        description: 'Record at least one transaction today',
        icon: '📝',
        type: 'daily',
        category: 'consistency',
        targetValue: 1,
        points: 10
    },
    {
        id: 'daily_save',
        name: 'Daily Saver',
        description: 'Save at least ₹100 today',
        icon: '💰',
        type: 'daily',
        category: 'saving',
        targetValue: 100,
        points: 20
    },

    // Weekly Challenges
    {
        id: 'weekly_budget',
        name: 'Weekly Budgeter',
        description: 'Stay within your weekly expense limit',
        icon: '🎯',
        type: 'weekly',
        category: 'budgeting',
        targetValue: 1,
        points: 50
    },
    {
        id: 'weekly_category',
        name: 'Category Master',
        description: 'Track expenses in at least 5 different categories this week',
        icon: '📊',
        type: 'weekly',
        category: 'consistency',
        targetValue: 5,
        points: 75
    },

    // Monthly Challenges
    {
        id: 'monthly_save_goal',
        name: 'Monthly Saver',
        description: 'Save at least ₹2000 this month',
        icon: '🏆',
        type: 'monthly',
        category: 'saving',
        targetValue: 2000,
        points: 200
    },
    {
        id: 'monthly_investment',
        name: 'Investment Builder',
        description: 'Make at least one investment this month',
        icon: '📈',
        type: 'monthly',
        category: 'investing',
        targetValue: 1,
        points: 150
    }
];

gamificationProfileSchema.statics.getAchievementTemplates = function() {
    return ACHIEVEMENT_TEMPLATES;
};

gamificationProfileSchema.statics.getChallengeTemplates = function() {
    return CHALLENGE_TEMPLATES;
};

// Calculate level based on points
gamificationProfileSchema.methods.calculateLevel = function() {
    const points = this.totalPoints;
    if (points < 100) return 1;
    if (points < 300) return 2;
    if (points < 600) return 3;
    if (points < 1000) return 4;
    if (points < 1500) return 5;
    if (points < 2500) return 6;
    if (points < 4000) return 7;
    if (points < 6000) return 8;
    if (points < 9000) return 9;
    return 10;
};

// Get points needed for next level
gamificationProfileSchema.methods.getPointsForNextLevel = function() {
    const levelThresholds = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 9000];
    const currentLevel = this.calculateLevel();
    if (currentLevel >= 10) return 0;
    return levelThresholds[currentLevel] - this.totalPoints;
};

module.exports = mongoose.model('GamificationProfile', gamificationProfileSchema);
