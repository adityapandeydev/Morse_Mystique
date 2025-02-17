import { useState, useEffect } from "react";

// Update the puzzle type
interface Puzzle {
  id: number;
  next?: string;  // Make next optional since it comes from the server
}

const puzzles: Puzzle[] = Array(5).fill(null).map((_, i) => ({ id: i + 1 }));

// Move modals outside main component
interface ModalProps {
    onCancel: () => void;
    onContinue: () => void;
    totalTime: string;
}

const FirstConfirmModal = ({ onCancel, onContinue, totalTime }: ModalProps) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Are you sure?</h2>
            <p className="text-gray-300 mb-6">
                Your total time will be: {totalTime}
                <br /><br />
                Once submitted, you won't be able to modify your answers or times.
            </p>
            <div className="flex justify-end gap-4">
                <button className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded" onClick={onCancel}>
                    Cancel
                </button>
                <button className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded" onClick={onContinue}>
                    Continue
                </button>
            </div>
        </div>
    </div>
);

const FinalConfirmModal = ({ onCancel, onContinue, totalTime }: ModalProps) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-red-400">Are you REALLY sure?</h2>
            <p className="text-gray-300 mb-6">
                This is your final chance to go back. 
                <br />
                Your total time will be locked at: <span className="font-bold">{totalTime}</span>
                <br /><br />
                <span className="font-bold text-red-400">This action cannot be undone!</span>
            </p>
            <div className="flex justify-end gap-4">
                <button
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
                    onClick={onCancel}
                >
                    Go Back
                </button>
                <button
                    className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded"
                    onClick={onContinue}
                >
                    Submit Final Answer
                </button>
            </div>
        </div>
    </div>
);

export default function MorseCodePuzzle() {
    const [userInputs, setUserInputs] = useState(() => {
        return JSON.parse(localStorage.getItem("userInputs") ?? "[]") ?? Array(5).fill("");
    });
    const [unlocked, setUnlocked] = useState(() => {
        return JSON.parse(localStorage.getItem("unlockedPuzzles") ?? "[]") ?? Array(5).fill(false);
    });
    const [email, setEmail] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        return localStorage.getItem("userLoggedIn") === "true";
    });
    const [loginMessage, setLoginMessage] = useState("");

    // Add new state for timers
    const [timers, setTimers] = useState(() => {
        return JSON.parse(localStorage.getItem("puzzleTimers") ?? "[]") ?? Array(5).fill(0);
    });
    const [currentTimer, setCurrentTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [currentPuzzleStartTime, setCurrentPuzzleStartTime] = useState<number | null>(null);

    // Add new state for confirmation modals
    const [showFirstConfirm, setShowFirstConfirm] = useState(false);
    const [showFinalConfirm, setShowFinalConfirm] = useState(false);

    // Add countdown timer state (2 hours in seconds = 7200)
    const [countdownTime, setCountdownTime] = useState(() => {
        const savedTime = localStorage.getItem("countdownTime");
        return savedTime ? parseInt(savedTime) : 7200;
    });

    // Add new state for submission status
    const [isSubmitted, setIsSubmitted] = useState(() => {
        return localStorage.getItem("isSubmitted") === "true";
    });

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

    // Start timer for first puzzle on login
    useEffect(() => {
        if (isLoggedIn && !unlocked[0] && !currentPuzzleStartTime) {
            setCurrentPuzzleStartTime(Date.now());
            setIsTimerRunning(true);
        }
    }, [isLoggedIn]);

    // Timer effect
    type Timeout = ReturnType<typeof setTimeout>;
    useEffect(() => {
        let intervalId: Timeout;

        if (isTimerRunning && currentPuzzleStartTime) {
            intervalId = setInterval(() => {
                const currentTime = Math.floor((Date.now() - currentPuzzleStartTime) / 1000);
                setCurrentTimer(currentTime);
            }, 1000);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isTimerRunning, currentPuzzleStartTime]);

    // Save timers to localStorage
    useEffect(() => {
        localStorage.setItem("puzzleTimers", JSON.stringify(timers));
    }, [timers]);

    // Add countdown timer effect
    useEffect(() => {
        if (isLoggedIn && countdownTime > 0) {
            const countdownInterval = setInterval(() => {
                setCountdownTime(prevTime => {
                    const newTime = prevTime - 1;
                    localStorage.setItem("countdownTime", newTime.toString());
                    
                    // Auto-submit when timer reaches 0
                    if (newTime === 0) {
                        handleSubmit();
                    }
                    return newTime;
                });
            }, 1000);

            return () => clearInterval(countdownInterval);
        }
    }, [isLoggedIn]);

    // Add new effect for session verification
    useEffect(() => {
        const verifySession = async () => {
            const userEmail = localStorage.getItem("userEmail");
            const deviceID = localStorage.getItem("deviceID");

            if (userEmail && deviceID) {
                try {
                    const response = await fetch("http://localhost:5000/api/user/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: userEmail, deviceID }),
                    });

                    const data = await response.json();
                    if (!data.success) {
                        // User not found in DB or unauthorized
                        setIsLoggedIn(false);
                        localStorage.removeItem("userLoggedIn");
                        localStorage.removeItem("userEmail");
                        localStorage.removeItem("deviceID");
                        localStorage.removeItem("userInputs");
                        localStorage.removeItem("unlockedPuzzles");
                        localStorage.removeItem("puzzleTimers");
                        localStorage.removeItem("countdownTime");
                        localStorage.removeItem("isSubmitted");
                    }
                } catch (error) {
                    console.error("Session verification error:", error);
                }
            }
        };

        verifySession();
    }, []);

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
                // Reset all states and localStorage on successful login
                setIsLoggedIn(true);
                setUserInputs(Array(5).fill(""));
                setUnlocked(Array(5).fill(false));
                setTimers(Array(5).fill(0));
                setCurrentTimer(0);
                setCountdownTime(7200);
                setIsSubmitted(false);
                setCurrentPuzzleStartTime(Date.now());
                setIsTimerRunning(true);

                // Reset localStorage
                localStorage.setItem("userLoggedIn", "true");
                localStorage.setItem("userEmail", email);
                localStorage.setItem("userInputs", JSON.stringify(Array(5).fill("")));
                localStorage.setItem("unlockedPuzzles", JSON.stringify(Array(5).fill(false)));
                localStorage.setItem("puzzleTimers", JSON.stringify(Array(5).fill(0)));
                localStorage.setItem("countdownTime", "7200");
                localStorage.removeItem("isSubmitted");
            } else {
                setLoginMessage("Login denied: " + data.message);
            }
        } catch (error) {
            setLoginMessage("Server error. Please try again: " + error);
        }
    };

    // Add keypress handler for login
    const handleLoginKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    // Modify handleChange
    const handleChange = async (index: number, value: string) => {
        if (countdownTime === 0) return;
        const newInputs = [...userInputs];
        newInputs[index] = value.toUpperCase();
        setUserInputs(newInputs);

        try {
            const response = await fetch("http://localhost:5000/api/user/check-answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    index,
                    answer: value
                }),
            });

            const data = await response.json();
            if (data.isCorrect) {
                // Stop current timer
                setIsTimerRunning(false);
                const newTimers = [...timers];
                newTimers[index] = currentTimer;
                setTimers(newTimers);

                // Update unlocked status
                const newUnlocked = [...unlocked];
                newUnlocked[index] = true;
                setUnlocked(newUnlocked);

                // Start timer for next puzzle and focus next input
                if (index < puzzles.length - 1) {
                    setCurrentPuzzleStartTime(Date.now());
                    setCurrentTimer(0);
                    setIsTimerRunning(true);
                    
                    // Focus next input
                    const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                    if (nextInput) {
                        nextInput.focus();
                    }
                }
            }
        } catch (error) {
            console.error("Error checking answer:", error);
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTotalTime = (): number => {
        return timers.reduce((acc: number, curr: number) => acc + curr, 0);
    };

    const handleSubmit = async () => {
        const totalTime = getTotalTime();
        const userEmail = localStorage.getItem("userEmail");
        const solvedCount = unlocked.filter(Boolean).length;

        try {
            const response = await fetch("http://localhost:5000/api/user/submit-time", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email: userEmail,
                    totalTime: totalTime,
                    solvedCount: solvedCount
                }),
            });

            const data = await response.json();
            if (data.success) {
                // Set submission state
                setIsSubmitted(true);
                localStorage.setItem("isSubmitted", "true");
                
                // Close modals
                setShowFirstConfirm(false);
                setShowFinalConfirm(false);
                
                // Stop all timers
                setIsTimerRunning(false);
                setCurrentPuzzleStartTime(null);
            } else {
                console.error("Failed to submit time:", data.message);
            }
        } catch (error) {
            console.error("Error submitting time:", error);
        }
    };

    // Format countdown time
    const formatCountdown = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
                    onKeyPress={handleLoginKeyPress}
                    autoFocus
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
            {/* Countdown timer without logout button */}
            <div className="p-4 flex justify-center items-center">
                <div className="text-center">
                    <div className={`text-2xl font-mono font-bold ${countdownTime < 300 ? 'text-red-500' : 'text-white'}`}>
                        {formatCountdown(countdownTime)}
                    </div>
                    <div className="text-sm text-gray-400">Time Remaining</div>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-6">
                <h1 className="text-4xl font-bold mb-6 tracking-widest">Morse Code Puzzle</h1>
                <div className="flex flex-col gap-6 w-full max-w-lg p-6 bg-gray-800 rounded-lg shadow-lg">
                    {puzzles.map((puzzle, index) => (
                        <div key={puzzle.id} className="flex items-center justify-between w-full gap-4">
                            <div className="w-32 h-12 flex items-center justify-center bg-gray-900 text-center rounded-md shadow-md font-mono">
                                {unlocked[index] ? formatTime(timers[index]) : (
                                    index === unlocked.findIndex((u: boolean) => !u) && !isSubmitted && 
                                    formatTime(currentTimer)
                                )}
                            </div>
                            <input
                                type="text"
                                className="p-3 rounded-md bg-gray-700 text-white border border-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 flex-1 text-lg tracking-widest text-center"
                                placeholder="Enter decoded message"
                                value={userInputs[index]}
                                onChange={(e) => handleChange(index, e.target.value)}
                                disabled={unlocked[index] || isSubmitted}
                                data-index={index}
                                autoFocus={index === 0 && !isSubmitted}
                            />
                            {unlocked[index] && (
                                <div className="w-48 h-12 flex items-center justify-center bg-gray-900 text-center rounded-md shadow-md">
                                    {index === 4 ? (
                                        <div className="flex flex-col items-center">
                                            <span className="text-green-400 font-bold">Completed!</span>
                                        </div>
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
                    
                    {/* Final time display or submit button */}
                    <div className="flex items-center justify-between w-full gap-4">
                        {isSubmitted ? (
                            <div className="w-full flex flex-col items-center justify-center h-12 bg-gray-900 text-center rounded-md shadow-md font-mono">
                                <div>Final Time: {formatTime(getTotalTime())}</div>
                                <div className="text-sm text-gray-400">
                                    Puzzles Solved: {unlocked.filter(Boolean).length}/5
                                </div>
                            </div>
                        ) : (
                            <button
                                className="w-full h-12 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-md"
                                onClick={() => setShowFirstConfirm(true)}
                            >
                                Submit
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Only show modals if not submitted */}
            {!isSubmitted && showFirstConfirm && (
                <FirstConfirmModal 
                    onCancel={() => setShowFirstConfirm(false)}
                    onContinue={() => {
                        setShowFirstConfirm(false);
                        setShowFinalConfirm(true);
                    }}
                    totalTime={formatTime(getTotalTime())}
                />
            )}
            {!isSubmitted && showFinalConfirm && (
                <FinalConfirmModal 
                    onCancel={() => setShowFinalConfirm(false)}
                    onContinue={handleSubmit}
                    totalTime={formatTime(getTotalTime())}
                />
            )}
        </div>
    );
}