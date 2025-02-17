import { useState, useEffect } from "react";

const puzzles = [
    { id: 1, answer: "HELLO", next: "https://example.com/next1" },
    { id: 2, answer: "WORLD", next: "https://example.com/next2" },
    { id: 3, answer: "REACT", next: "https://example.com/next3" },
    { id: 4, answer: "MORSE", next: "https://example.com/next4" },
    { id: 5, answer: "CODE", next: "PUZZLE OVER" },
];

export default function MorseCodePuzzle() {
    const [userInputs, setUserInputs] = useState(() => {
        return JSON.parse(localStorage.getItem("userInputs") || "[]") || Array(5).fill("");
    });
    const [unlocked, setUnlocked] = useState(() => {
        return JSON.parse(localStorage.getItem("unlockedPuzzles") || "[]") || Array(5).fill(false);
    });
    const [email, setEmail] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        return localStorage.getItem("userLoggedIn") === "true";
    });
    const [loginMessage, setLoginMessage] = useState("");

    // Save progress to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("userInputs", JSON.stringify(userInputs));
        localStorage.setItem("unlockedPuzzles", JSON.stringify(unlocked));
    }, [userInputs, unlocked]);

    // Add reload warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isLoggedIn) {
                e.preventDefault();
                e.returnValue = ""; // Required for Chrome
                return "Are you sure you want to leave? Your progress may be lost.";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [isLoggedIn]);

    const handleLogin = async () => {
        const deviceID = localStorage.getItem("deviceID") || crypto.randomUUID();
        localStorage.setItem("deviceID", deviceID);

        try {
            const response = await fetch("http://localhost:5000/api/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, deviceID }),
            });

            const data = await response.json();
            if (data.success) {
                setIsLoggedIn(true);
                localStorage.setItem("userLoggedIn", "true");
                localStorage.setItem("userEmail", email);
            } else {
                setLoginMessage("Login denied: " + data.message);
            }
        } catch (error) {
            setLoginMessage("Server error. Please try again: " + error);
        }
    };

    const handleChange = (index: number, value: string) => {
        const newInputs = [...userInputs];
        newInputs[index] = value.toUpperCase();
        setUserInputs(newInputs);

        if (newInputs[index] === puzzles[index].answer) {
            const newUnlocked = [...unlocked];
            newUnlocked[index] = true;
            setUnlocked(newUnlocked);
        }
    };

    // Optional: Add a logout function if needed
    const handleLogout = () => {
        setIsLoggedIn(false);
        setUserInputs(Array(5).fill(""));
        setUnlocked(Array(5).fill(false));
        setEmail("");
        localStorage.removeItem("userLoggedIn");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userInputs");
        localStorage.removeItem("unlockedPuzzles");
    };

    if (!isLoggedIn) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
                <h1 className="text-4xl font-bold mb-6">Login to Play</h1>
                <input
                    type="email"
                    className="p-3 rounded-md bg-gray-700 text-white border border-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 w-80 text-lg"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button
                    className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-md"
                    onClick={handleLogin}
                >
                    Login
                </button>
                {loginMessage && <p className="mt-4 text-red-400">{loginMessage}</p>}
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-r from-gray-900 to-black text-white">
            {/* DEV-ONLY-START: Logout button for development */}
            <div className="p-4 flex justify-end">
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-bold rounded-md"
                >
                    Logout (Dev Only)
                </button>
            </div>
            {/* DEV-ONLY-END */}
            
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                <h1 className="text-4xl font-bold mb-6 tracking-widest">Morse Code Puzzle</h1>
                <div className="flex flex-col gap-6 w-full max-w-lg p-6 bg-gray-800 rounded-lg shadow-lg">
                    {puzzles.map((puzzle, index) => (
                        <div key={puzzle.id} className="flex items-center justify-between w-full gap-4">
                            <input
                                type="text"
                                className="p-3 rounded-md bg-gray-700 text-white border border-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 flex-1 text-lg tracking-widest text-center"
                                placeholder="Enter decoded message"
                                value={userInputs[index]}
                                onChange={(e) => handleChange(index, e.target.value)}
                                disabled={unlocked[index]}
                            />
                            {unlocked[index] && (
                                <div className="w-48 h-12 flex items-center justify-center bg-gray-900 text-center rounded-md shadow-md">
                                    {puzzle.next === "PUZZLE OVER" ? (
                                        <span className="text-green-400 font-bold">🎉 Puzzle Completed! 🎉</span>
                                    ) : (
                                        <a
                                            href={puzzle.next}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 underline hover:text-blue-300 transition"
                                        >
                                            Next Puzzle
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
