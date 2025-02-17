require('dotenv').config();

const answers = process.env.PUZZLE_ANSWERS.split(',');
const puzzleLinks = [
    process.env.PUZZLE_LINK_1 || "https://example.com/next1",
    process.env.PUZZLE_LINK_2 || "https://example.com/next2",
    process.env.PUZZLE_LINK_3 || "https://example.com/next3",
    process.env.PUZZLE_LINK_4 || "https://example.com/next4",
    "PUZZLE OVER"
];

module.exports = {
    puzzleLinks,
    answers
}; 