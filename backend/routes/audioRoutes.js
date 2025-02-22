const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

router.get('/audio/:set/:puzzle', (req, res) => {
    const { set, puzzle } = req.params;
    
    try {
        // Skip audio1 as it's not needed
        if (puzzle === '1') {
            return res.status(404).json({ 
                success: false, 
                message: "Audio not available" 
            });
        }

        // Construct the file path
        const filePath = path.join(__dirname, `../Round 2/Set ${set}/Question  (${puzzle})/audio${puzzle}.mp3`);
        console.log('Attempting to access:', filePath);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log('File not found:', filePath); // Debug log
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
            console.error('Stream error:', error); // Debug log
            res.status(500).json({
                success: false,
                message: "Error streaming audio"
            });
        });

        stream.pipe(res);
    } catch (error) {
        console.error('Audio route error:', error); // Debug log
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

module.exports = router; 