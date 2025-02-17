const express = require("express");
const pool = require("../config/db");

const router = express.Router();

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

module.exports = router;
