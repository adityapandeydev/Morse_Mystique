const { validateEmail } = require('../utils/validators');

const validateRequest = (req, res, next) => {
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

module.exports = { validateRequest }; 