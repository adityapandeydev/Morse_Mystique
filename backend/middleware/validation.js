const { validateEmail } = require('../utils/validators');

const validateRequest = (requiredFields) => (req, res, next) => {
    // Check required fields exist
    for (const field of requiredFields) {
        if (!req.body[field]) {
            return res.status(400).json({
                success: false,
                message: `Missing required field: ${field}`
            });
        }
    }

    // Validate email if it's required
    if (requiredFields.includes('email') && !validateEmail(req.body.email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email format"
        });
    }

    next();
};

module.exports = {
    validateLoginRequest: validateRequest(['email', 'deviceID']),
    validateSubmitRequest: validateRequest(['email', 'totalTime', 'solvedCount']),
    validateVerifyRequest: validateRequest(['email', 'deviceID'])
}; 