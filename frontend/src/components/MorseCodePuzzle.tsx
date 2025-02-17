import { useState } from "react";

const puzzles = [
    { id: 1, answer: "HELLO", next: "https://example.com/next1" },
    { id: 2, answer: "WORLD", next: "https://example.com/next2" },
    { id: 3, answer: "REACT", next: "https://example.com/next3" },
    { id: 4, answer: "MORSE", next: "https://example.com/next4" },
    { id: 5, answer: "CODE", next: "PUZZLE OVER" },
];

export default function MorseCodePuzzle() {
    const [userInputs, setUserInputs] = useState(Array(5).fill(""));
    const [unlocked, setUnlocked] = useState(Array(5).fill(false));

    const handleChange = (index, value) => {
        const newInputs = [...userInputs];
        newInputs[index] = value.toUpperCase();
        setUserInputs(newInputs);

        if (newInputs[index] === puzzles[index].answer) {
            const newUnlocked = [...unlocked];
            newUnlocked[index] = true;
            setUnlocked(newUnlocked);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
            <h1 className="text-3xl font-bold mb-6">Morse Code Puzzle</h1>
            <div className="flex flex-col gap-4">
                {puzzles.map((puzzle, index) => (
                    <div key={puzzle.id} className="flex items-center justify-between w-full max-w-md gap-4">
                        <input
                            type="text"
                            className="p-2 rounded-md text-black flex-1"
                            placeholder="Enter decoded message"
                            value={userInputs[index]}
                            onChange={(e) => handleChange(index, e.target.value)}
                            disabled={unlocked[index]}
                        />
                        <div className="w-54 h-10 p-2 bg-gray-800 text-center rounded-md">
                            {unlocked[index] && (
                                puzzle.next === "PUZZLE OVER" ? (
                                    <span className="text-green-400 font-bold">🎉 Puzzle Completed! 🎉</span>
                                ) : (
                                    <a
                                        href={puzzle.next}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 underline"
                                    >
                                        Next Puzzle
                                    </a>
                                )
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
