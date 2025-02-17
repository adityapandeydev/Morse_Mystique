import { useState, useEffect, useCallback, memo } from "react";
import { Puzzle } from "../types";
import { formatTime, formatCountdown, validateEmail } from "../utils/formatters";
import FirstConfirmModal from "./modals/FirstConfirmModal";
import FinalConfirmModal from "./modals/FinalConfirmModal";

const puzzles: Puzzle[] = Array(5).fill(null).map((_, i) => ({ id: i + 1 }));

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Network error handler
const handleFetchError = (error: unknown, setMessage: (msg: string) => void) => {
    console.error("Network error:", error);
    setMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
};

const MorseCodePuzzle = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        return localStorage.getItem("userLoggedIn") === "true";
    });

    const [userInputs, setUserInputs] = useState(() => {
        return JSON.parse(localStorage.getItem("userInputs") ?? "[]") || Array(5).fill("");
    });

    const [unlocked, setUnlocked] = useState(() => {
        return JSON.parse(localStorage.getItem("unlockedPuzzles") ?? "[]") || Array(5).fill(false);
    });

    const [timers, setTimers] = useState(() => {
        return JSON.parse(localStorage.getItem("puzzleTimers") ?? "[]") || Array(5).fill(0);
    });

    const [isSubmitted, setIsSubmitted] = useState(() => {
        return localStorage.getItem("isSubmitted") === "true";
    });

    // Only start countdown if not submitted
    const [countdownTime, setCountdownTime] = useState(() => {
        if (localStorage.getItem("isSubmitted") === "true") {
            return 0;
        }
        // Get from localStorage but will be updated from server on verify/login
        return parseInt(localStorage.getItem("countdownTime") ?? "0");
    });

    const [email, setEmail] = useState("");
    const [loginMessage, setLoginMessage] = useState("");
    const [currentTimer, setCurrentTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [currentPuzzleStartTime, setCurrentPuzzleStartTime] = useState<number | null>(null);
    const [showFirstConfirm, setShowFirstConfirm] = useState(false);
    const [showFinalConfirm, setShowFinalConfirm] = useState(false);
    const [puzzleData, setPuzzleData] = useState<{[key: number]: {next: string}}>({});

    // Generate deviceID once and store it
    useEffect(() => {
        if (!localStorage.getItem("deviceID")) {
            localStorage.setItem("deviceID", crypto.randomUUID());
        }
    }, []);

    // Move getTotalTime before handleSubmit
    const getTotalTime = useCallback((): number => {
        return timers.reduce((acc: number, curr: number) => acc + curr, 0);
    }, [timers]);

    const handleSubmit = useCallback(async () => {
        const totalTime = getTotalTime();
        const userEmail = localStorage.getItem("userEmail");
        const solvedCount = unlocked.filter(Boolean).length;

        try {
            const fetchConfig = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include' as const
            };

            const response = await fetch(`${API_URL}/api/user/submit-time`, {
                ...fetchConfig,
                body: JSON.stringify({ 
                    email: userEmail,
                    totalTime: totalTime,
                    solvedCount: solvedCount
                }),
            });

            const data = await response.json();
            if (data.success) {
                setIsSubmitted(true);
                localStorage.setItem("isSubmitted", "true");
                
                // Save final state
                localStorage.setItem("finalTimers", JSON.stringify(timers));
                localStorage.setItem("finalUnlocked", JSON.stringify(unlocked));
                localStorage.setItem("finalUserInputs", JSON.stringify(userInputs));
                
                setShowFirstConfirm(false);
                setShowFinalConfirm(false);
                setIsTimerRunning(false);
                setCurrentPuzzleStartTime(null);
            } else {
                console.error("Failed to submit time:", data.message);
            }
        } catch (error) {
            handleFetchError(error, () => {});
        }
    }, [unlocked, getTotalTime, timers, userInputs]);

    // Move verification effect after handleSubmit
    useEffect(() => {
        const verifyAndInitialize = async () => {
            const userEmail = localStorage.getItem("userEmail");
            const deviceID = localStorage.getItem("deviceID");

            if (userEmail && deviceID) {
                try {
                    const response = await fetch(`${API_URL}/api/user/verify`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({ email: userEmail, deviceID }),
                    });

                    const data = await response.json();
                    if (data.success) {
                        if (!data.isSubmitted) {
                            // Use server's remaining time
                            setCountdownTime(data.timeRemaining);
                            localStorage.setItem("countdownTime", data.timeRemaining.toString());
                            
                            // Auto-submit if server indicates time is up
                            if (data.shouldSubmit) {
                                handleSubmit();
                                return;
                            }
                        } else {
                            setCountdownTime(0);
                        }
                        setIsLoggedIn(true);
                        setUserInputs(JSON.parse(localStorage.getItem("userInputs") ?? "[]") ?? Array(5).fill(""));
                        setUnlocked(JSON.parse(localStorage.getItem("unlockedPuzzles") ?? "[]") ?? Array(5).fill(false));
                        setTimers(JSON.parse(localStorage.getItem("puzzleTimers") ?? "[]") ?? Array(5).fill(0));
                        setIsSubmitted(localStorage.getItem("isSubmitted") === "true");
                    } else {
                        // Only clear login state, keep deviceID
                        localStorage.removeItem("userEmail");
                        localStorage.removeItem("userLoggedIn");
                        localStorage.removeItem("userInputs");
                        localStorage.removeItem("unlockedPuzzles");
                        localStorage.removeItem("puzzleTimers");
                        localStorage.removeItem("countdownTime");
                        localStorage.removeItem("isSubmitted");
                        setIsLoggedIn(false);
                    }
                } catch (error) {
                    console.error("Session verification error:", error);
                    setIsLoggedIn(false);
                }
            }
        };
        verifyAndInitialize();
    }, [handleSubmit]);

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

    // Only start timer if not submitted and puzzle in progress
    useEffect(() => {
        if (isLoggedIn && !isSubmitted && !unlocked[0] && !currentPuzzleStartTime) {
            setCurrentPuzzleStartTime(Date.now());
            setIsTimerRunning(true);
        }
    }, [isLoggedIn, isSubmitted, currentPuzzleStartTime, unlocked]);

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

    // Update countdown timer effect
    useEffect(() => {
        if (isLoggedIn && !isSubmitted && countdownTime > 0) {
            const countdownInterval = setInterval(() => {
                setCountdownTime(prevTime => {
                    const newTime = prevTime - 1;
                    localStorage.setItem("countdownTime", newTime.toString());
                    
                    if (newTime === 0) {
                        handleSubmit();
                    }
                    return newTime;
                });
            }, 1000);

            return () => clearInterval(countdownInterval);
        }
    }, [isLoggedIn, isSubmitted, countdownTime, handleSubmit]);

    // Memoize handlers
    const handleLogin = useCallback(async () => {
        if (!validateEmail(email)) {
            setLoginMessage("Please enter a valid email address");
            return;
        }

        const deviceID = localStorage.getItem("deviceID");
        try {
            const response = await fetch(`${API_URL}/api/user/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, deviceID }),
            });

            const data = await response.json();
            if (data.success) {
                // Use server's session timeout
                setCountdownTime(data.sessionTimeout);
                localStorage.setItem("countdownTime", data.sessionTimeout.toString());
                
                setIsLoggedIn(true);
                setUserInputs(Array(5).fill(""));
                setUnlocked(Array(5).fill(false));
                setTimers(Array(5).fill(0));
                setCurrentTimer(0);
                setIsSubmitted(false);
                setCurrentPuzzleStartTime(Date.now());
                setIsTimerRunning(true);

                // Reset localStorage
                localStorage.setItem("userLoggedIn", "true");
                localStorage.setItem("userEmail", email);
                localStorage.setItem("userInputs", JSON.stringify(Array(5).fill("")));
                localStorage.setItem("unlockedPuzzles", JSON.stringify(Array(5).fill(false)));
                localStorage.setItem("puzzleTimers", JSON.stringify(Array(5).fill(0)));
                localStorage.removeItem("isSubmitted");
            } else {
                setLoginMessage("Login denied: " + data.message);
            }
        } catch (error) {
            handleFetchError(error, setLoginMessage);
        }
    }, [email]);

    const handleChange = useCallback(async (index: number, value: string) => {
        if (countdownTime === 0) return;
        
        // Update input immediately
        const newInputs = [...userInputs];
        newInputs[index] = value.toUpperCase();
        setUserInputs(newInputs);

        try {
            const userEmail = localStorage.getItem("userEmail");
            const response = await fetch(`${API_URL}/api/user/check-answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    index,
                    answer: value,
                    email: userEmail
                }),
            });

            const data = await response.json();
            if (data.isCorrect) {
                // Stop timer first
                setIsTimerRunning(false);
                
                // Update timer for current puzzle
                const newTimers = [...timers];
                newTimers[index] = currentTimer;
                setTimers(newTimers);
                
                // Update unlocked status
                const newUnlocked = [...unlocked];
                newUnlocked[index] = true;
                setUnlocked(newUnlocked);

                // Save puzzle data
                setPuzzleData(prev => ({
                    ...prev,
                    [index]: { next: data.next }
                }));

                // Wait for state updates
                await new Promise(resolve => setTimeout(resolve, 0));

                // Start timer for next puzzle if not the last one
                if (index < puzzles.length - 1) {
                    setCurrentTimer(0);
                    setCurrentPuzzleStartTime(Date.now());
                    setIsTimerRunning(true);
                    
                    // Focus next input
                    const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                    if (nextInput) {
                        nextInput.focus();
                    }
                }
            }
        } catch (error) {
            handleFetchError(error, () => {});
        }
    }, [countdownTime, timers, unlocked, currentTimer, userInputs]);

    // Add handleLoginKeyPress function
    const handleLoginKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
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
                                            href={puzzleData[index]?.next || '#'}
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

export default memo(MorseCodePuzzle);