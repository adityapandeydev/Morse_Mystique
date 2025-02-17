import { useState, useEffect, useCallback, memo } from "react";
import { Puzzle } from "../types";
import { formatTime, formatCountdown, validateEmail } from "../utils/formatters";
import FirstConfirmModal from "./modals/FirstConfirmModal";
import FinalConfirmModal from "./modals/FinalConfirmModal";

const puzzles: Puzzle[] = Array(5).fill(null).map((_, i) => ({ id: i + 1 }));

// Network error handler
const handleFetchError = (error: unknown, setMessage: (msg: string) => void) => {
    console.error("Network error:", error);
    setMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
};

const MorseCodePuzzle = () => {
    // Initialize isLoggedIn first
    const [isLoggedIn, setIsLoggedIn] = useState(false); // Remove localStorage initialization

    // Initialize other states with default values instead of localStorage
    const [userInputs, setUserInputs] = useState(Array(5).fill(""));
    const [unlocked, setUnlocked] = useState(Array(5).fill(false));
    const [timers, setTimers] = useState(Array(5).fill(0));
    const [email, setEmail] = useState("");
    const [loginMessage, setLoginMessage] = useState("");
    const [currentTimer, setCurrentTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [currentPuzzleStartTime, setCurrentPuzzleStartTime] = useState<number | null>(null);
    const [showFirstConfirm, setShowFirstConfirm] = useState(false);
    const [showFinalConfirm, setShowFinalConfirm] = useState(false);
    const [countdownTime, setCountdownTime] = useState(60);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [puzzleData, setPuzzleData] = useState<{[key: number]: {next: string}}>({});

    // Add effect to initialize from localStorage after verification
    useEffect(() => {
        const verifyAndInitialize = async () => {
            const userEmail = localStorage.getItem("userEmail");
            const deviceID = localStorage.getItem("deviceID");

            if (userEmail && deviceID) {
                try {
                    const fetchConfig = {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        credentials: 'include' as const
                    };

                    const response = await fetch("http://localhost:5000/api/user/verify", {
                        ...fetchConfig,
                        body: JSON.stringify({ email: userEmail, deviceID }),
                    });

                    const data = await response.json();
                    if (data.success) {
                        // Only initialize from localStorage if verification succeeds
                        setIsLoggedIn(true);
                        setUserInputs(JSON.parse(localStorage.getItem("userInputs") ?? "[]") ?? Array(5).fill(""));
                        setUnlocked(JSON.parse(localStorage.getItem("unlockedPuzzles") ?? "[]") ?? Array(5).fill(false));
                        setTimers(JSON.parse(localStorage.getItem("puzzleTimers") ?? "[]") ?? Array(5).fill(0));
                        setCountdownTime(parseInt(localStorage.getItem("countdownTime") ?? "60"));
                        setIsSubmitted(localStorage.getItem("isSubmitted") === "true");
                    } else {
                        // Clear everything if verification fails
                        localStorage.clear();
                        setIsLoggedIn(false);
                    }
                } catch (error) {
                    console.error("Session verification error:", error);
                    localStorage.clear();
                    setIsLoggedIn(false);
                }
            }
        };

        verifyAndInitialize();
    }, []);

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
    }, [isLoggedIn, currentPuzzleStartTime, unlocked]);

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

            const response = await fetch("http://localhost:5000/api/user/submit-time", {
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
    }, [unlocked, getTotalTime]);

    // Add countdown timer effect
    useEffect(() => {
        if (isLoggedIn && countdownTime > 0) {
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
    }, [isLoggedIn, countdownTime, handleSubmit]);

    // Memoize handlers
    const handleLogin = useCallback(async () => {
        if (!validateEmail(email)) {
            setLoginMessage("Please enter a valid email address");
            return;
        }

        const deviceID = localStorage.getItem("deviceID") || crypto.randomUUID();
        try {
            const fetchConfig = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include' as const
            };

            const response = await fetch("http://localhost:5000/api/user/login", {
                ...fetchConfig,
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
                setCountdownTime(60);
                setIsSubmitted(false);
                setCurrentPuzzleStartTime(Date.now());
                setIsTimerRunning(true);

                // Reset localStorage
                localStorage.setItem("userLoggedIn", "true");
                localStorage.setItem("userEmail", email);
                localStorage.setItem("userInputs", JSON.stringify(Array(5).fill("")));
                localStorage.setItem("unlockedPuzzles", JSON.stringify(Array(5).fill(false)));
                localStorage.setItem("puzzleTimers", JSON.stringify(Array(5).fill(0)));
                localStorage.setItem("countdownTime", "60");
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
        
        const newInputs = [...userInputs];
        newInputs[index] = value.toUpperCase();
        setUserInputs(newInputs);

        try {
            const userEmail = localStorage.getItem("userEmail");
            const fetchConfig = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include' as const
            };

            const response = await fetch("http://localhost:5000/api/user/check-answer", {
                ...fetchConfig,
                body: JSON.stringify({ 
                    index,
                    answer: value,
                    email: userEmail
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

                setPuzzleData(prev => ({
                    ...prev,
                    [index]: { next: data.next }
                }));
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