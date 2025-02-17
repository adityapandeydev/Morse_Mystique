require("dotenv").config();
const express = require("express");
const cors = require("cors");

const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Update CORS configuration to be more permissive in development
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Add OPTIONS handling for preflight requests
app.options('*', cors(corsOptions));

// Use Routes
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Add this after dotenv config to verify
console.log('Session timeout:', process.env.SESSION_TIMEOUT);
