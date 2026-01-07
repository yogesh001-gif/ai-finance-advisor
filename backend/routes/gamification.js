const express = require('express');
const router = express.Router();
const GamificationProfile = require('../models/Gamification');
const Transaction = require('../models/Transaction');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get user's gamification profile
router.get('/profile', async (req, res) => {
    try {
        console.log('Getting gamification profile for user:', req.userId);
        let profile = await GamificationProfile.findOne({ userId: req.userId });
        
        if (!profile) {
            console.log('Creating new profile...');
            // Create new profile with initial achievements
            const achievementTemplates = GamificationProfile.getAchievementTemplates();
            console.log('Achievement templates:', achievementTemplates ? achievementTemplates.length : 'undefined');
            
            profile = new GamificationProfile({
                userId: req.userId,
                achievements: achievementTemplates ? achievementTemplates.map(template => ({
                    ...template,
                    isUnlocked: false,
                    unlockedAt: null
                })) : []
            });
            
            // Generate initial challenges
            console.log('Generating challenges...');
            await generateChallenges(profile);
            await profile.save();
            console.log('Profile saved');
        }
        
        // Update level based on current points
        profile.level = profile.calculateLevel();
        await profile.save();

        res.json({
            profile: {
                level: profile.level,
                totalPoints: profile.totalPoints,
                pointsForNextLevel: profile.getPointsForNextLevel(),
                currentStreaks: profile.currentStreaks,
                longestStreaks: profile.longestStreaks,
                achievements: profile.achievements,
                activeChallenges: profile.activeChallenges,
                stats: profile.stats
            }
        });
    } catch (error) {
        console.error('Error getting gamification profile:', error);
        res.status(500).json({ error: 'Failed to get gamification profile' });
    }
});

// Check and update achievements after transaction
router.post('/check-achievements', async (req, res) => {
    try {
        const profile = await GamificationProfile.findOne({ userId: req.userId });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const transactions = await Transaction.find({ userId: req.userId });
        const newlyUnlocked = await checkAndUnlockAchievements(profile, transactions);
        
        await profile.save();

        res.json({
            newlyUnlocked,
            totalPoints: profile.totalPoints,
            level: profile.level
        });
    } catch (error) {
        console.error('Error checking achievements:', error);
        res.status(500).json({ error: 'Failed to check achievements' });
    }
});

// Update challenge progress
router.post('/update-challenge/:challengeId', async (req, res) => {
    try {
        const { challengeId } = req.params;
        const { progress } = req.body;

        const profile = await GamificationProfile.findOne({ userId: req.userId });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const challenge = profile.activeChallenges.id(challengeId);
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        challenge.currentProgress = Math.min(progress, challenge.targetValue);
        
        // Check if challenge is completed
        if (challenge.currentProgress >= challenge.targetValue && !challenge.isCompleted) {
            challenge.isCompleted = true;
            challenge.completedAt = new Date();
            profile.totalPoints += challenge.points;
            
            // Move to completed challenges
            profile.completedChallenges.push(challenge.toObject());
            profile.activeChallenges.pull(challengeId);
            
            // Update level
            profile.level = profile.calculateLevel();
        }

        await profile.save();

        res.json({
            challenge,
            totalPoints: profile.totalPoints,
            level: profile.level,
            completed: challenge.isCompleted
        });
    } catch (error) {
        console.error('Error updating challenge:', error);
        res.status(500).json({ error: 'Failed to update challenge' });
    }
});

// Get leaderboard (for future multi-user support)
router.get('/leaderboard', async (req, res) => {
    try {
        const profiles = await GamificationProfile.find({})
            .sort({ totalPoints: -1 })
            .limit(10)
            .select('userId level totalPoints achievements');

        const leaderboard = profiles.map((profile, index) => ({
            rank: index + 1,
            oduserId: profile.userId.toString(),
            level: profile.level,
            totalPoints: profile.totalPoints,
            achievementCount: profile.achievements.filter(a => a.isUnlocked).length
        }));

        res.json({ leaderboard });
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// Generate new challenges (called periodically)
router.post('/generate-challenges', async (req, res) => {
    try {
        const profile = await GamificationProfile.findOne({ userId: req.userId });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        await generateChallenges(profile);
        await profile.save();

        res.json({
            activeChallenges: profile.activeChallenges,
            message: 'New challenges generated!'
        });
    } catch (error) {
        console.error('Error generating challenges:', error);
        res.status(500).json({ error: 'Failed to generate challenges' });
    }
});

// Update streak
router.post('/update-streak', async (req, res) => {
    try {
        const { streakType } = req.body; // 'dailyTransaction', 'savingGoal', 'budgetStick'
        
        const profile = await GamificationProfile.findOne({ userId: req.userId });
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const today = new Date().toDateString();
        const lastDate = profile.currentStreaks[streakType].lastDate;
        
        if (!lastDate || lastDate !== today) {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
            
            if (lastDate === yesterday) {
                // Continue streak
                profile.currentStreaks[streakType].count += 1;
            } else {
                // Start new streak
                profile.currentStreaks[streakType].count = 1;
            }
            
            profile.currentStreaks[streakType].lastDate = today;
            
            // Update longest streak
            if (profile.currentStreaks[streakType].count > profile.longestStreaks[streakType]) {
                profile.longestStreaks[streakType] = profile.currentStreaks[streakType].count;
            }
        }

        await profile.save();

        res.json({
            currentStreak: profile.currentStreaks[streakType].count,
            longestStreak: profile.longestStreaks[streakType]
        });
    } catch (error) {
        console.error('Error updating streak:', error);
        res.status(500).json({ error: 'Failed to update streak' });
    }
});

// Helper function to check and unlock achievements
async function checkAndUnlockAchievements(profile, transactions) {
    const newlyUnlocked = [];
    
    for (const achievement of profile.achievements) {
        if (achievement.isUnlocked) continue;
        
        let shouldUnlock = false;
        
        switch (achievement.condition.type) {
            case 'transaction_count':
                shouldUnlock = transactions.length >= achievement.condition.value;
                break;
                
            case 'monthly_savings':
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const monthlyTransactions = transactions.filter(t => {
                    const tDate = new Date(t.date);
                    return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
                });
                const monthlyIncome = monthlyTransactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);
                const monthlyExpenses = monthlyTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);
                const monthlySavings = monthlyIncome - monthlyExpenses;
                shouldUnlock = monthlySavings >= achievement.condition.value;
                break;
                
            case 'daily_streak':
                shouldUnlock = profile.currentStreaks.dailyTransaction.count >= achievement.condition.value;
                break;
                
            case 'investment_count':
                const investmentCategories = ['investment', 'mutual fund', 'stocks', 'sip', 'fd'];
                const investments = transactions.filter(t => 
                    investmentCategories.some(cat => 
                        t.category.toLowerCase().includes(cat)
                    )
                );
                shouldUnlock = investments.length >= achievement.condition.value;
                break;
                
            case 'investment_categories':
                const investmentTrans = transactions.filter(t => 
                    ['investment', 'mutual fund', 'stocks', 'sip', 'fd'].some(cat => 
                        t.category.toLowerCase().includes(cat)
                    )
                );
                const uniqueCategories = new Set(investmentTrans.map(t => t.category.toLowerCase()));
                shouldUnlock = uniqueCategories.size >= achievement.condition.value;
                break;
        }
        
        if (shouldUnlock) {
            achievement.isUnlocked = true;
            achievement.unlockedAt = new Date();
            profile.totalPoints += achievement.points;
            newlyUnlocked.push(achievement);
            
            // Update level
            profile.level = profile.calculateLevel();
        }
    }
    
    return newlyUnlocked;
}

// Helper function to generate challenges
async function generateChallenges(profile) {
    const templates = GamificationProfile.getChallengeTemplates();
    const now = new Date();
    
    // Remove expired challenges
    profile.activeChallenges = profile.activeChallenges.filter(challenge => 
        new Date(challenge.deadline) > now
    );
    
    // Generate new challenges if needed
    const dailyChallenges = profile.activeChallenges.filter(c => c.type === 'daily');
    const weeklyChallenges = profile.activeChallenges.filter(c => c.type === 'weekly');
    const monthlyChallenges = profile.activeChallenges.filter(c => c.type === 'monthly');
    
    // Add daily challenges
    if (dailyChallenges.length < 2) {
        const dailyTemplates = templates.filter(t => t.type === 'daily');
        const randomDaily = dailyTemplates[Math.floor(Math.random() * dailyTemplates.length)];
        const deadline = new Date();
        deadline.setHours(23, 59, 59, 999);
        
        profile.activeChallenges.push({
            ...randomDaily,
            deadline,
            currentProgress: 0,
            isCompleted: false
        });
    }
    
    // Add weekly challenges
    if (weeklyChallenges.length < 1) {
        const weeklyTemplates = templates.filter(t => t.type === 'weekly');
        const randomWeekly = weeklyTemplates[Math.floor(Math.random() * weeklyTemplates.length)];
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + (7 - deadline.getDay()));
        deadline.setHours(23, 59, 59, 999);
        
        profile.activeChallenges.push({
            ...randomWeekly,
            deadline,
            currentProgress: 0,
            isCompleted: false
        });
    }
    
    // Add monthly challenges
    if (monthlyChallenges.length < 1) {
        const monthlyTemplates = templates.filter(t => t.type === 'monthly');
        const randomMonthly = monthlyTemplates[Math.floor(Math.random() * monthlyTemplates.length)];
        const deadline = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        deadline.setHours(23, 59, 59, 999);
        
        profile.activeChallenges.push({
            ...randomMonthly,
            deadline,
            currentProgress: 0,
            isCompleted: false
        });
    }
}

module.exports = router;
