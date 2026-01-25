const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { generateToken, authenticate } = require('../middleware/auth');
const { Redis } = require('@upstash/redis');

// Upstash Redis configuration
const otpRedis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
});

// Create email transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    requireTLS: true,
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000, // 10 seconds
    socketTimeout: 10000 // 10 seconds
});

// Verify transporter connection
transporter.verify((error, success) => {
    if (error) {
        console.log('Email transporter error:', error.message);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Generate 6-digit OTP
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

// Send OTP email using nodemailer
async function sendOTPEmail(email, otp, userName) {
    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: '🔐 Your AI Finance Advisor Login OTP',
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #667eea; margin: 0;">AI Finance Advisor</h1>
                    <p style="color: #666; margin-top: 5px;">Your Personal Financial Assistant</p>
                </div>
                
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 20px;">
                    <p style="color: rgba(255,255,255,0.9); margin: 0 0 10px 0; font-size: 16px;">Hello ${userName},</p>
                    <p style="color: white; margin: 0 0 20px 0; font-size: 14px;">Use the following OTP to complete your sign-in:</p>
                    <div style="background: white; border-radius: 12px; padding: 20px; display: inline-block;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${otp}</span>
                    </div>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <p style="color: #666; margin: 0; font-size: 14px;">
                        <strong>⏱️ This code expires in 5 minutes.</strong><br><br>
                        If you didn't request this code, please ignore this email or contact support if you have concerns.
                    </p>
                </div>
                
                <div style="text-align: center; color: #999; font-size: 12px;">
                    <p>© ${new Date().getFullYear()} AI Finance Advisor. All rights reserved.</p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('OTP email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Failed to send OTP email. Please try again.');
    }
}

// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ 
                error: 'Please provide name, email, and password.' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters long.' 
            });
        }

        if (confirmPassword && password !== confirmPassword) {
            return res.status(400).json({ 
                error: 'Passwords do not match.' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                error: 'An account with this email already exists.' 
            });
        }

        // Create new user
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'Account created successfully!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                error: 'An account with this email already exists.' 
            });
        }
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ error: messages[0] });
        }
        
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// POST /api/auth/login - Login user (Step 1: Validate credentials and send OTP)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Please provide email and password.' 
            });
        }

        // Find user and include password for comparison
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        
        if (!user) {
            return res.status(401).json({ 
                error: 'Invalid email or password.' 
            });
        }

        if (!user.isActive) {
            return res.status(401).json({ 
                error: 'Account is deactivated. Please contact support.' 
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.status(401).json({ 
                error: 'Invalid email or password.' 
            });
        }

        // Check if email is configured - if not, skip OTP and login directly
        // Always require OTP, regardless of email configuration

        // Generate and store OTP in Redis
        const otp = generateOTP();
        const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
        await otpRedis.set(
            `otp:${email.toLowerCase()}`,
            JSON.stringify({
                otp,
                expiry: otpExpiry,
                userId: user._id,
                userName: user.name,
                attempts: 0
            }),
            { ex: 300 } // 5 minutes expiry
        );

        // Try to send OTP email
        let otpMessage = 'OTP generated.';
        try {
            await sendOTPEmail(email, otp, user.name);
            otpMessage = 'OTP sent to your email!';
        } catch (emailError) {
            console.error('Email sending failed:', emailError.message);
            otpMessage = 'OTP generated, but email could not be sent.';
        }
        res.json({
            message: otpMessage,
            requiresOTP: true,
            email: email.toLowerCase()
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// POST /api/auth/verify-otp - Verify OTP and complete login
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ 
                error: 'Please provide email and OTP.' 
            });
        }

        const redisKey = `otp:${email.toLowerCase()}`;
        const storedRaw = await otpRedis.get(redisKey);
        if (!storedRaw) {
            return res.status(401).json({
                error: 'OTP expired or invalid. Please try again.'
            });
        }
        let storedData;
        try {
            storedData = JSON.parse(storedRaw);
        } catch (e) {
            await otpRedis.del(redisKey);
            return res.status(401).json({
                error: 'OTP expired or invalid. Please try again.'
            });
        }
        if (Date.now() > storedData.expiry) {
            await otpRedis.del(redisKey);
            return res.status(401).json({
                error: 'OTP has expired. Please request a new one.'
            });
        }
        // Track wrong OTP attempts
        if (storedData.otp !== otp) {
            storedData.attempts = (storedData.attempts || 0) + 1;
            if (storedData.attempts >= 5) {
                await otpRedis.del(redisKey);
                return res.status(401).json({
                    error: 'Too many wrong OTP attempts. Please request a new OTP.'
                });
            }
            await otpRedis.set(redisKey, JSON.stringify(storedData), { ex: Math.floor((storedData.expiry - Date.now()) / 1000) });
            return res.status(401).json({
                error: `Wrong OTP. ${5 - storedData.attempts} attempts remaining.`
            });
        }
        // OTP verified - complete login
        const user = await User.findById(storedData.userId);
        if (!user) {
            return res.status(401).json({
                error: 'User not found.'
            });
        }
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        // Generate token
        const token = generateToken(user._id);
        // Clear OTP
        await otpRedis.del(redisKey);
        res.json({
            message: 'Login successful!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                lastLogin: user.lastLogin
            }
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
});

// POST /api/auth/resend-otp - Resend OTP
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                error: 'Please provide email.' 
            });
        }

        const redisKey = `otp:${email.toLowerCase()}`;
        const storedRaw = await otpRedis.get(redisKey);
        if (!storedRaw) {
            return res.status(400).json({
                error: 'No pending verification. Please login again.'
            });
        }
        let storedData;
        try {
            storedData = JSON.parse(storedRaw);
        } catch (e) {
            await otpRedis.del(redisKey);
            return res.status(400).json({
                error: 'No pending verification. Please login again.'
            });
        }
        // Generate new OTP
        const otp = generateOTP();
        const otpExpiry = Date.now() + 5 * 60 * 1000;
        storedData.otp = otp;
        storedData.expiry = otpExpiry;
        storedData.attempts = 0;
        await otpRedis.set(redisKey, JSON.stringify(storedData), { ex: 300 });
        // Send OTP email
        await sendOTPEmail(email, otp, storedData.userName);
        res.json({
            message: 'New OTP sent to your email!'
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ error: 'Failed to resend OTP. Please try again.' });
    }
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                createdAt: req.user.createdAt,
                lastLogin: req.user.lastLogin
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info.' });
    }
});

// PUT /api/auth/update-profile - Update user profile
router.put('/update-profile', authenticate, async (req, res) => {
    try {
        const { name, email } = req.body;
        const updates = {};

        if (name) updates.name = name.trim();
        if (email) {
            // Check if email is already taken by another user
            const existingUser = await User.findOne({ 
                email: email.toLowerCase(), 
                _id: { $ne: req.userId } 
            });
            if (existingUser) {
                return res.status(400).json({ 
                    error: 'Email is already in use.' 
                });
            }
            updates.email = email.toLowerCase().trim();
        }

        const user = await User.findByIdAndUpdate(
            req.userId, 
            updates, 
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Profile updated successfully!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// PUT /api/auth/change-password - Change password
router.put('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                error: 'Please provide current and new password.' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                error: 'New password must be at least 6 characters long.' 
            });
        }

        // Get user with password
        const user = await User.findById(req.userId).select('+password');
        
        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ 
                error: 'Current password is incorrect.' 
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully!' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password.' });
    }
});

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', authenticate, (req, res) => {
    // JWT is stateless, so logout is handled client-side by removing the token
    res.json({ message: 'Logged out successfully!' });
});

module.exports = router;
