const express = require("express");
const bcrypt = require('bcrypt');  // Add this line
const { puzzleLinks, answers, answerSets, getRandomSet } = require('../config/puzzleData');
const { validateLoginRequest, validateSubmitRequest, validateVerifyRequest } = require('../middleware/validation');
const pool = require("../config/db");
const { validateEmail } = require('../utils/validators');

const router = express.Router();

// Error handler
const handleServerError = (error, res) => {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
};

// Add registration endpoint
router.post("/register", async (req, res) => {
    const { email, password } = req.body;

    if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
    }

    try {
        // Check if user already exists
        const existingUser = await pool.query(
            "SELECT * FROM registered_users WHERE email_id = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        await pool.query(
            "INSERT INTO registered_users (email_id, password) VALUES ($1, $2)",
            [email, hashedPassword]
        );

        res.json({
            success: true,
            message: "Registration successful"
        });
    } catch (error) {
        console.error("Registration error:", error);
        handleServerError(error, res);
    }
});

/** User Login */
router.post("/login", validateLoginRequest, async (req, res) => {
    const { email, password, deviceID, set } = req.body;
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT);

    if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    try {
        // Check if user exists and verify password
        const user = await pool.query(
            "SELECT * FROM registered_users WHERE email_id = $1",
            [email]
        );

        if (user.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(403).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // First check if user is registered
        const registeredUser = await pool.query(
            "SELECT * FROM registered_users WHERE email_id = $1",
            [email]
        );

        if (registeredUser.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: "User not registered for the event" 
            });
        }

        // Check if user already has an active session
        const existingSession = await pool.query(
            "SELECT * FROM users WHERE email_id = $1",
            [email]
        );

        if (existingSession.rows.length > 0) {
            // If session exists with different device ID, reject the login
            if (existingSession.rows[0].device_id !== deviceID) {
                return res.status(403).json({
                    success: false,
                    message: "Session already active on another device"
                });
            }

            // If same device, allow login and return existing set
            return res.json({
                success: true,
                sessionTimeout,
                answerSet: existingSession.rows[0].answer_set
            });
        }

        // Create new session
        const result = await pool.query(
            `INSERT INTO users (email_id, device_id, session_start, answer_set) 
             VALUES ($1, $2, NOW(), $3) 
             RETURNING *`,
            [email, deviceID, set]
        );

        res.json({
            success: true,
            sessionTimeout,
            answerSet: set
        });
    } catch (error) {
        handleServerError(error, res);
    }
});

/** Update User's Total Time and Solved Count */
router.post("/submit-time", validateSubmitRequest, async (req, res) => {
    const { email, totalTime, solvedCount, remainingTime, isAutoSubmit } = req.body;
    
    try {
        // For auto-submit, ensure we count all 5 puzzles if they're solved
        const finalSolvedCount = isAutoSubmit ? 5 : solvedCount;

        // Store both the total time and the remaining time
        const result = await pool.query(
            "UPDATE users SET total_time = $1, solved_count = $2, remaining_time = $3 WHERE email_id = $4 RETURNING solved_count",
            [totalTime, finalSolvedCount, remainingTime, email]
        );

        res.json({ 
            success: true,
            totalTime: totalTime,
            updatedSolvedCount: result.rows[0]?.solved_count
        });
    } catch (error) {
        console.error("Submit time error:", error);
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
        
        // Validate answer set exists
        if (!answerSets[answerSet] || !answerSets[answerSet][index]) {
            console.error('Invalid answer set or index:', { answerSet, index });
            return res.json({ 
                success: false,
                message: "Invalid answer set configuration" 
            });
        }

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
            isCorrect
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