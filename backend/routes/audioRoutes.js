const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

router.get('/audio/:set/:puzzle', (req, res) => {
    const { set, puzzle } = req.params;
    
    try {
        // Construct the file path
        const filePath = path.join(__dirname, `../Round 2/Set${set}/audio${puzzle}.wav`);
        console.log('Attempting to access:', filePath);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log('File not found:', filePath);
            return res.status(404).json({
                success: false,
                message: "Audio file not found"
            });
        }

        // Set headers to prevent easy downloading
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'inline',
            'Accept-Ranges': 'none',
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'Expires': '0',
            'Pragma': 'no-cache'
        });

        // Create read stream
        const stream = fs.createReadStream(filePath);
        stream.on('error', (error) => {
            console.error('Stream error:', error);
            res.status(500).json({
                success: false,
                message: "Error streaming audio"
            });
        });

        stream.pipe(res);
    } catch (error) {
        console.error('Audio route error:', error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

module.exports = router;