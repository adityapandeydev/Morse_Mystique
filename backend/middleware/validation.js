const { validateEmail } = require('../utils/validators');

const validateRequest = (requiredFields) => (req, res, next) => {
    // Check required fields exist
    for (const field of requiredFields) {
        if (req.body[field] === undefined) {
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

const validateLoginRequest = validateRequest(['email', 'deviceID', 'set']);

module.exports = {
    validateLoginRequest,
    validateSubmitRequest: validateRequest(['email', 'totalTime', 'solvedCount', 'remainingTime']),
    validateVerifyRequest: validateRequest(['email', 'deviceID'])
}; 