const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

/** Admin Registration */
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if admin already exists
    const existingAdmin = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);
    if (existingAdmin.rowCount > 0) {
      return res.status(400).json({ success: false, message: "Admin already exists" });
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new admin
    await pool.query(
      "INSERT INTO admins (name, email, password) VALUES ($1, $2, $3)",
      [name, email, hashedPassword]
    );

    res.status(201).json({ success: true, message: "Admin registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/** Admin Login */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);

    if (admin.rowCount === 0) {
      return res.status(401).json({ success: false, message: "Admin not found" });
    }

    const validPassword = await bcrypt.compare(password, admin.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { adminId: admin.rows[0].id, name: admin.rows[0].name }, 
      process.env.JWT_SECRET, 
      { expiresIn: "2h" }
    );

    res.json({ success: true, token, message: "Login successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
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
      "INSERT INTO registered_users (email_id, added_by_admin) VALUES ($1, $2)",
      [email, addedByAdmin]
    );
    res.json({ success: true, message: "User added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error adding user" });
  }
});

module.exports = router;