const { validateEmail } = require('../utils/validators');

// Separate validation for different endpoints
const validateLoginRequest = (req, res, next) => {
    const { email, deviceID } = req.body;
    
    if (!email || !deviceID) {
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

    next();
};

const validateSubmitRequest = (req, res, next) => {
    const { email, totalTime, solvedCount } = req.body;

    if (!email || totalTime === undefined || solvedCount === undefined) {
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

    next();
};

const validateVerifyRequest = (req, res, next) => {
    const { email, deviceID } = req.body;
    
    if (!email || !deviceID) {
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

    next();
};

module.exports = { 
    validateLoginRequest,
    validateSubmitRequest,
    validateVerifyRequest
}; 