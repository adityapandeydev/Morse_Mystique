const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// Store puzzle data at the top level
const puzzleLinks = [
  "https://example.com/next1",
  "https://example.com/next2",
  "https://example.com/next3",
  "https://example.com/next4",
  "PUZZLE OVER"
];

const answers = ["HELLO", "WORLD", "REACT", "MORSE", "CODE"];

/** User Login */
router.post("/login", async (req, res) => {
  const { email, deviceID } = req.body;

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

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/** Update User's Total Time and Solved Count */
router.post("/submit-time", async (req, res) => {
  const { email, totalTime, solvedCount } = req.body;

  try {
    await pool.query(
      "UPDATE users SET total_time = $1, solved_count = $2 WHERE email_id = $3",
      [totalTime, solvedCount, email]
    );

    res.json({ success: true, message: "Time and progress submitted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error submitting progress" });
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

// Modify to check answer in backend
router.post("/check-answer", async (req, res) => {
  const { index, answer } = req.body;
  
  const isCorrect = answers[index] === answer.toUpperCase();
  
  res.json({ 
    success: true,
    isCorrect,
    next: isCorrect ? puzzleLinks[index] : null
  });
});

/** Verify User Session and Return Game State */
router.post("/verify", async (req, res) => {
  const { email, deviceID } = req.body;

  try {
    // Check if user exists and get their game state
    const user = await pool.query(
      "SELECT * FROM users WHERE email_id = $1 AND device_id = $2",
      [email, deviceID]
    );

    if (user.rowCount === 0) {
      return res.json({ 
        success: false, 
        message: "User not found or unauthorized" 
      });
    }

    // Return all game state data
    res.json({ 
      success: true,
      gameState: {
        email: user.rows[0].email_id,
        totalTime: user.rows[0].total_time,
        solvedCount: user.rows[0].solved_count,
        isSubmitted: user.rows[0].total_time !== null, // If they have a time, they've submitted
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
