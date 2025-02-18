const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

/** Admin Registration */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Log the request data (remove in production)
    console.log("Register attempt:", { name, email });

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Check if admin already exists using correct column names
    const existingAdmin = await pool.query(
      "SELECT * FROM admins WHERE email_id = $1 OR name = $2",
      [email, name]
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Admin with this email or name already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert using correct column names
    await pool.query(
      "INSERT INTO admins (email_id, name, password_hash) VALUES ($1, $2, $3)",
      [email, name, hashedPassword]
    );

    res.json({ success: true, message: "Admin registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed: " + error.message
    });
  }
});

/** Admin Login */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Use correct column name email_id
    const result = await pool.query(
      "SELECT * FROM admins WHERE email_id = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { id: admin.email_id, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ success: true, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed: " + error.message
    });
  }
});

/** Middleware: Authenticate Admin */
const authenticateAdmin = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(403).json({ success: false, message: "Access denied" });

  try {
    const verified = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.admin = verified;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

/** Admin Adds Registered Users */
router.post("/add-user", authenticateAdmin, async (req, res) => {
  const { email } = req.body;
  const addedByAdmin = req.admin.name;

  try {
    await pool.query(
      "INSERT INTO registered_users (email_id, added_by) VALUES ($1, $2)",
      [email, addedByAdmin]
    );
    res.json({ success: true, message: "User added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error adding user" });
  }
});

// Add this route to get registered users
router.get("/registered-users", authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT email_id, added_by 
             FROM registered_users 
             ORDER BY email_id ASC`
        );

        res.json({
            success: true,
            users: result.rows
        });
    } catch (error) {
        console.error("Error fetching registered users:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Update the users route to include remaining_time
router.get("/users", authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT email_id, device_id, total_time, solved_count, 
                    session_start, remaining_time
             FROM users 
             ORDER BY solved_count DESC, total_time ASC NULLS LAST`
        );

        res.json({
            success: true,
            users: result.rows
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

module.exports = router;