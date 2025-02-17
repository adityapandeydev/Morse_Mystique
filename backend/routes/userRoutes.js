const express = require("express");
const rateLimit = require('express-rate-limit');
const { puzzleLinks, answers } = require('../config/puzzleData');
const { validateRequest } = require('../middleware/validation');
const pool = require("../config/db");
const { validateEmail } = require('../utils/validators');

const router = express.Router();

// Stricter rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: "Too many login attempts" }
});

// Error handler
const handleServerError = (error, res) => {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
};

/** User Login */
router.post("/login", loginLimiter, async (req, res) => {
    const { email, deviceID } = req.body;

    if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    try {
        // Check if user is registered
        const registeredUser = await pool.query(
            "SELECT * FROM registered_users WHERE email_id = $1",
            [email]
        );

        if (registeredUser.rowCount === 0) {
            return res.status(403).json({ success: false, message: "User not registered" });
        }

        // Check if user already exists in users table
        const user = await pool.query("SELECT * FROM users WHERE email_id = $1", [email]);

        if (user.rowCount > 0) {
            // Verify device ID
            if (user.rows[0].device_id !== deviceID) {
                return res.status(403).json({ success: false, message: "Unauthorized device" });
            }
        } else {
            // First-time login, store device ID
            await pool.query(
                "INSERT INTO users (email_id, device_id) VALUES ($1, $2)",
                [email, deviceID]
            );
        }

        // Set session start time in database
        await pool.query(
            "UPDATE users SET session_start = NOW() WHERE email_id = $1",
            [email]
        );

        res.json({ 
            success: true,
            sessionTimeout: parseInt(process.env.SESSION_TIMEOUT)
        });
    } catch (error) {
        handleServerError(error, res);
    }
});

/** Update User's Total Time and Solved Count */
router.post("/submit-time", async (req, res) => {
    const { email, totalTime, solvedCount } = req.body;
    
    // Only check for valid ranges
    if (totalTime < 0 || solvedCount < 0 || solvedCount > 5) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid submission data" 
        });
    }

    try {
        // Verify user hasn't already submitted
        const user = await pool.query(
            "SELECT total_time FROM users WHERE email_id = $1",
            [email]
        );

        if (user.rows[0].total_time !== null) {
            return res.status(400).json({
                success: false,
                message: "Time already submitted"
            });
        }

        await pool.query(
            "UPDATE users SET total_time = $1, solved_count = $2 WHERE email_id = $3",
            [totalTime, solvedCount, email]
        );

        res.json({ success: true });
    } catch (error) {
        handleServerError(error, res);
    }
});

// Add new endpoint to get puzzle info
router.get("/puzzle/:index", async (req, res) => {
    const { index } = req.params;
    
    // Only send the next link if answer is correct
    res.json({ 
        id: parseInt(index) + 1,
        next: puzzleLinks[index]
    });
});

/** Check Answer */
router.post("/check-answer", async (req, res) => {
    const { index, answer, email } = req.body;
    
    if (!email || index < 0 || index >= answers.length || typeof answer !== 'string') {
        return res.status(400).json({ success: false, message: "Invalid input" });
    }

    try {
        // Verify puzzle sequence
        const user = await pool.query(
            "SELECT solved_count FROM users WHERE email_id = $1",
            [email]
        );

        // Handle case where user isn't found
        if (user.rowCount === 0) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }

        if (index > user.rows[0].solved_count) {
            return res.status(400).json({
                success: false,
                message: "Invalid puzzle sequence"
            });
        }

        const isCorrect = answers[index] === answer.toUpperCase();
        
        if (isCorrect) {
            // Update solved count in database
            await pool.query(
                "UPDATE users SET solved_count = $1 WHERE email_id = $2 AND solved_count < $1",
                [index + 1, email]
            );
        }

        res.json({ 
            success: true,
            isCorrect,
            next: isCorrect ? puzzleLinks[index] : null
        });
    } catch (error) {
        handleServerError(error, res);
    }
});

/** Verify Session and Get Time Remaining */
router.post("/verify", validateRequest, async (req, res) => {
    const { email, deviceID } = req.body;
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT);

    try {
        const user = await pool.query(
            `SELECT 
                *,
                EXTRACT(EPOCH FROM (NOW() - session_start))::integer as elapsed_time
            FROM users 
            WHERE email_id = $1 AND device_id = $2`,
            [email, deviceID]
        );

        if (user.rowCount === 0) {
            return res.json({ 
                success: false, 
                message: "Please login to continue" 
            });
        }

        const elapsedTime = user.rows[0].elapsed_time || 0;
        const timeRemaining = Math.max(0, sessionTimeout - elapsedTime);

        // If time is up and not submitted, trigger auto-submit
        if (timeRemaining <= 0 && user.rows[0].total_time === null) {
            return res.json({
                success: true,
                isSubmitted: false,
                timeRemaining: 0,
                shouldSubmit: true,
                solvedCount: user.rows[0].solved_count
            });
        }

        res.json({ 
            success: true,
            isSubmitted: user.rows[0].total_time !== null,
            timeRemaining,
            shouldSubmit: false,
            solvedCount: user.rows[0].solved_count
        });
    } catch (error) {
        handleServerError(error, res);
    }
});

module.exports = router;