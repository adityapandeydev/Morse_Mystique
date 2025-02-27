require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// Update CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Add OPTIONS handling for preflight requests
app.options('*', cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Routes
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const audioRoutes = require('./routes/audioRoutes');

app.use("/api/2026x", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api", audioRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: "Server error: " + err.message 
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Add this after dotenv config to verify
console.log('Session timeout:', process.env.SESSION_TIMEOUT);