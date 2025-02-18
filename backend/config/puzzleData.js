require('dotenv').config();

const answerSets = {
    'A': process.env.ANSWER_SET_A.split(','),
    'B': process.env.ANSWER_SET_B.split(','),
    'C': process.env.ANSWER_SET_C.split(','),
    'D': process.env.ANSWER_SET_D.split(','),
    'E': process.env.ANSWER_SET_E.split(',')
};

const puzzleLinks = [
    process.env.PUZZLE_LINK_1 || "https://example.com/next1",
    process.env.PUZZLE_LINK_2 || "https://example.com/next2",
    process.env.PUZZLE_LINK_3 || "https://example.com/next3",
    process.env.PUZZLE_LINK_4 || "https://example.com/next4",
    "PUZZLE OVER"
];

const getRandomSet = () => {
    const sets = ['A', 'B', 'C', 'D', 'E'];
    return sets[Math.floor(Math.random() * sets.length)];
};

// Validate that all answer sets are properly loaded
const validateAnswerSets = () => {
    const sets = ['A', 'B', 'C', 'D', 'E'];
    for (const set of sets) {
        if (!answerSets[set] || answerSets[set].length !== 5) {
            throw new Error(`Invalid or missing answer set ${set}`);
        }
    }
};

// Validate on startup
validateAnswerSets();

module.exports = {
    puzzleLinks,
    answerSets,
    getRandomSet
}; 