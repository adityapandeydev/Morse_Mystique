const express = require("express");
const rateLimit = require('express-rate-limit');
const { puzzleLinks, answers, answerSets, getRandomSet } = require('../config/puzzleData');
const { validateLoginRequest, validateSubmitRequest, validateVerifyRequest } = require('../middleware/validation');
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
router.post("/login", loginLimiter, validateLoginRequest, async (req, res) => {
    const { email, deviceID } = req.body;
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT);

    if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    try {
        // Assign a random answer set
        const answerSet = getRandomSet();
        
        await pool.query(
            `INSERT INTO users (email_id, device_id, session_start, answer_set) 
             VALUES ($1, $2, NOW(), $3)`,
            [email, deviceID, answerSet]
        );

        res.json({
            success: true,
            sessionTimeout,
            answerSet // Send the assigned set to frontend
        });
    } catch (error) {
        handleServerError(error, res);
    }
});

/** Update User's Total Time and Solved Count */
router.post("/submit-time", validateSubmitRequest, async (req, res) => {
    const { email, totalTime, solvedCount } = req.body;
    
    try {
        // Store both the total time and the remaining time
        await pool.query(
            "UPDATE users SET total_time = $1, solved_count = $2, remaining_time = $3 WHERE email_id = $4",
            [totalTime, solvedCount, req.body.remainingTime, email]
        );

        res.json({ 
            success: true,
            totalTime: totalTime
        });
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

// Add validateCheckAnswer middleware
const validateCheckAnswer = (req, res, next) => {
    const { index, answer, email } = req.body;
    
    if (!email || index === undefined || !answer) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields"
        });
    }

    if (!validateEmail(email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email format"
        });
    }

    if (index < 0 || index > 4) {
        return res.status(400).json({
            success: false,
            message: "Invalid puzzle index"
        });
    }

    next();
};

/** Check Answer */
router.post("/check-answer", validateCheckAnswer, async (req, res) => {
    const { index, answer, email } = req.body;

    try {
        // Get user's answer set
        const user = await pool.query(
            "SELECT answer_set FROM users WHERE email_id = $1",
            [email]
        );

        if (user.rows.length === 0) {
            return res.json({ success: false, message: "User not found" });
        }

        const answerSet = user.rows[0].answer_set;
        const correctAnswer = answerSets[answerSet][index];

        // Ensure both are uppercase and trimmed for comparison
        const normalizedAnswer = answer.trim().toUpperCase();
        const normalizedCorrect = correctAnswer.trim().toUpperCase();

        const isCorrect = normalizedAnswer === normalizedCorrect;
        
        if (isCorrect) {
            // Update solved count
            await pool.query(
                "UPDATE users SET solved_count = GREATEST(solved_count, $1) WHERE email_id = $2",
                [index + 1, email]
            );
        }

        // Log the comparison for debugging
        console.log({
            userAnswer: normalizedAnswer,
            correctAnswer: normalizedCorrect,
            answerSet,
            index,
            isCorrect
        });

        res.json({
            success: true,
            isCorrect,
            next: isCorrect ? puzzleLinks[index] : null
        });
    } catch (error) {
        console.error("Check answer error:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

/** Verify Session and Get Time Remaining */
router.post("/verify", validateVerifyRequest, async (req, res) => {
    const { email, deviceID } = req.body;
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT);

    try {
        const user = await pool.query(
            `SELECT 
                *,
                CASE 
                    WHEN total_time IS NOT NULL THEN remaining_time
                    ELSE GREATEST(0, $1 - EXTRACT(EPOCH FROM (NOW() - session_start))::integer)
                END as time_remaining
            FROM users 
            WHERE email_id = $2 AND device_id = $3`,
            [sessionTimeout, email, deviceID]  // Fixed parameter order
        );

        if (user.rowCount === 0) {
            return res.json({ 
                success: false, 
                message: "User not found"
            });
        }

        res.json({ 
            success: true,
            isSubmitted: user.rows[0].total_time !== null,
            timeRemaining: user.rows[0].time_remaining,
            totalTime: user.rows[0].total_time,
            solvedCount: user.rows[0].solved_count
        });
    } catch (error) {
        console.error("Verify error:", error);
        handleServerError(error, res);
    }
});

module.exports = router;