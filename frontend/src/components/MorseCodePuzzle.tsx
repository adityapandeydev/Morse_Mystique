import { useState, useEffect, useCallback, memo } from "react";
import { Puzzle } from "../types";
import { formatTime, formatCountdown, validateEmail } from "../utils/formatters";
import FirstConfirmModal from "./modals/FirstConfirmModal";
import FinalConfirmModal from "./modals/FinalConfirmModal";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useTimer } from "../hooks/useTimer";
import { useParams, Navigate } from 'react-router-dom';
import AudioPlayer from './AudioPlayer';

const puzzles: Puzzle[] = Array(5).fill(null).map((_, i) => ({ id: i + 1 }));

const API_URL = import.meta.env.VITE_API_URL;

// Network error handler
const handleFetchError = (error: unknown, setMessage: (msg: string) => void) => {
    console.error("Network error:", error);
    setMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
};

// Add these utility functions at the top of the component
const clearAllStorage = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userLoggedIn");
    localStorage.removeItem("userInputs");
    localStorage.removeItem("unlockedPuzzles");
    localStorage.removeItem("puzzleTimers");
    localStorage.removeItem("finalTime");
    localStorage.removeItem("pausedTime");
    localStorage.removeItem("isSubmitted");
};

const resetAllStates = (
    setIsLoggedIn: (value: boolean) => void,
    setIsSubmitted: (value: boolean) => void,
    setFinalTime: (value: number | null) => void,
    setPausedTime: (value: number | null) => void,
    setCountdownTime: (value: number) => void
) => {
    setIsLoggedIn(false);
    setIsSubmitted(false);
    setFinalTime(null);
    setPausedTime(null);
    setCountdownTime(60);
};

const MorseCodePuzzle = () => {
    // Move all hooks before any conditional returns
    const { setId } = useParams<{ setId: string }>();
    const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("userLoggedIn") === "true");
    const [userInputs, setUserInputs] = useLocalStorage('userInputs', Array(5).fill(''));
    const [unlocked, setUnlocked] = useLocalStorage('unlockedPuzzles', Array(5).fill(false));
    const [timers, setTimers] = useLocalStorage('puzzleTimers', Array(5).fill(0));
    const [isSubmitted, setIsSubmitted] = useLocalStorage('isSubmitted', false);
    const [countdownTime, setCountdownTime] = useState(60); // Default to 60 seconds
    const [email, setEmail] = useState("");
    const [loginMessage, setLoginMessage] = useState("");
    const [currentTimer, setCurrentTimer] = useTimer(false, null);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [currentPuzzleStartTime, setCurrentPuzzleStartTime] = useState<number | null>(null);
    const [showFirstConfirm, setShowFirstConfirm] = useState(false);
    const [showFinalConfirm, setShowFinalConfirm] = useState(false);
    const [finalTime, setFinalTime] = useState<number | null>(() => {
        const saved = localStorage.getItem("finalTime");
        return saved ? parseInt(saved) : null;
    });
    const [pausedTime, setPausedTime] = useState<number | null>(() => {
        const saved = localStorage.getItem("pausedTime");
        return saved ? parseInt(saved) : null;
    });
    const [answerSet, setAnswerSet] = useState<string | null>(null);
    const [timerStartTime, setTimerStartTime] = useState(() => Date.now());
    const [initialTimeout, setInitialTimeout] = useState(() => {
        return parseInt(localStorage.getItem("initialTimeout") ?? "60");
    });

    // Generate deviceID once and store it
    useEffect(() => {
        if (!localStorage.getItem("deviceID")) {
            localStorage.setItem("deviceID", crypto.randomUUID());
        }
    }, []);

    // Move getTotalTime before handleSubmit
    const getTotalTime = useCallback((): number => {
        const initialTimeout = parseInt(localStorage.getItem("initialTimeout") ?? "0");
        if (isSubmitted) {
            const finalCountdown = parseInt(localStorage.getItem("finalCountdown") ?? "0");
            return initialTimeout - finalCountdown;
        }
        return initialTimeout - countdownTime;
    }, [countdownTime, isSubmitted]);

    // Update handleSubmit
    const handleSubmit = useCallback(async () => {
        try {
            const solvedCount = unlocked.filter(Boolean).length;
            const email = localStorage.getItem("userEmail");
            const totalTime = getTotalTime();

            const response = await fetch(`${API_URL}/api/user/submit-time`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    totalTime,
                    solvedCount,
                    remainingTime: countdownTime
                })
            });

            const data = await response.json();
            if (data.success) {
                setIsSubmitted(true);
                setFinalTime(totalTime);
                setPausedTime(countdownTime);
                localStorage.setItem("finalTime", totalTime.toString());
                localStorage.setItem("pausedTime", countdownTime.toString());
                localStorage.setItem("isSubmitted", "true");
            }
        } catch (error) {
            console.error("Submit error:", error);
        }
    }, [unlocked, getTotalTime, countdownTime, setIsSubmitted]);

    // Update auto-submit in useEffect
    useEffect(() => {
        if (!isSubmitted && countdownTime <= 0) {
            handleSubmit();
        }
    }, [countdownTime, isSubmitted, handleSubmit]);

    // Update the countdown timer effect
    useEffect(() => {
        let intervalId: number;

        if (isLoggedIn && !isSubmitted && countdownTime > 0) {
            const updateTimer = () => {
                const now = Date.now();
                const elapsedSeconds = Math.floor((now - timerStartTime) / 1000);
                const newTime = Math.max(0, initialTimeout - elapsedSeconds); // Use initialTimeout instead of 60

                setCountdownTime(newTime);

                if (newTime === 0) {
                    handleSubmit();
                }
            };

            // Initial update
            updateTimer();
            
            // Update every 100ms for smoother countdown
            intervalId = setInterval(updateTimer, 100);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isLoggedIn, isSubmitted, timerStartTime, handleSubmit, initialTimeout, countdownTime]);

    // Add fullscreen handler
    const enterFullscreen = useCallback(() => {
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        }
    }, []);

    // Handle visibility and fullscreen changes
    useEffect(() => {
        if (!isLoggedIn || isSubmitted) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                handleSubmit();
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                handleSubmit();
            }
        };

        // Enter fullscreen on login
        enterFullscreen();

        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [isLoggedIn, isSubmitted, handleSubmit, enterFullscreen]);

    // Update login handler to clear all stored times
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
                },
                body: JSON.stringify({ 
                    email, 
                    deviceID,
                    set: setId!.toUpperCase() // Add non-null assertion (!) since we validate setId earlier
                }),
            });

            const data = await response.json();
            if (data.success) {
                // Clear all stored times
                localStorage.removeItem("finalTime");
                localStorage.removeItem("pausedTime");
                setFinalTime(null);
                setPausedTime(null);
                
                setInitialTimeout(data.sessionTimeout);
                localStorage.setItem("initialTimeout", data.sessionTimeout.toString());
                setTimerStartTime(Date.now());
                setCountdownTime(data.sessionTimeout);
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

                // Update answer set
                setAnswerSet(data.answerSet);
                localStorage.setItem("answerSet", data.answerSet);

                enterFullscreen();
            } else {
                setLoginMessage("Login denied: " + data.message);
            }
        } catch (error) {
            handleFetchError(error, setLoginMessage);
        }
    }, [email, setId, enterFullscreen, setCurrentTimer, setIsSubmitted, setTimers, setUnlocked, setUserInputs]);

    // Update the verify endpoint handler
    useEffect(() => {
        const verifyAndInitialize = async () => {
            const userEmail = localStorage.getItem("userEmail");
            const deviceID = localStorage.getItem("deviceID");
            const storedPausedTime = localStorage.getItem("pausedTime");

            if (!userEmail || !deviceID) {
                return; // Don't clear storage if credentials are missing
            }

            try {
                const response = await fetch(`${API_URL}/api/user/verify`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ email: userEmail, deviceID }),
                });

                const data = await response.json();
                
                if (!data.success) {
                    // Only clear if explicitly not found
                    if (data.message === "User not found") {
                        clearAllStorage();
                        resetAllStates(setIsLoggedIn, setIsSubmitted, setFinalTime, setPausedTime, setCountdownTime);
                    }
                    return;
                }

                // User exists and is verified
                setIsLoggedIn(true);
                if (data.isSubmitted) {
                    setIsSubmitted(true);
                    setFinalTime(data.totalTime);
                    if (storedPausedTime) {
                        setPausedTime(parseInt(storedPausedTime));
                    }
                    setCountdownTime(data.timeRemaining);
                } else {
                    // Calculate and set the timer start time based on remaining time
                    const now = Date.now();
                    setTimerStartTime(now - ((60 - data.timeRemaining) * 1000));
                    setCountdownTime(data.timeRemaining);
                }

                // Update answer set
                setAnswerSet(localStorage.getItem("answerSet"));
            } catch (error) {
                console.error("Session verification error:", error);
                // Don't clear storage on network errors
            }
        };

        verifyAndInitialize();
    }, [setIsLoggedIn, setIsSubmitted, setFinalTime, setPausedTime, setCountdownTime]);

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

    // Update the puzzle timer effect
    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval>;

        if (isTimerRunning && currentPuzzleStartTime && !isSubmitted && !pausedTime) {
            intervalId = setInterval(() => {
                const now = Date.now();
                const elapsed = Math.floor((now - currentPuzzleStartTime) / 1000);
                setCurrentTimer(elapsed);
            }, 100); // More frequent updates for better accuracy
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isTimerRunning, currentPuzzleStartTime, isSubmitted, pausedTime, setCurrentTimer]);

    // Save timers to localStorage
    useEffect(() => {
        localStorage.setItem("puzzleTimers", JSON.stringify(timers));
    }, [timers]);

    // Add handleLoginKeyPress function
    const handleLoginKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    // Add handleChange function back
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
                },
                body: JSON.stringify({ 
                    index,
                    answer: value,
                    email: userEmail
                }),
            });

            const data = await response.json();
            if (data.isCorrect) {
                setIsTimerRunning(false);
                
                const newTimers = [...timers];
                newTimers[index] = currentTimer;
                setTimers(newTimers);
                
                const newUnlocked = [...unlocked];
                newUnlocked[index] = true;
                setUnlocked(newUnlocked);
                
                if (index === 4) {
                    handleSubmit();
                } else if (index < 4) {
                    setCurrentTimer(0);
                    setCurrentPuzzleStartTime(Date.now());
                    setIsTimerRunning(true);
                    
                    const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                    if (nextInput) {
                        nextInput.focus();
                    }
                }
            }
        } catch (error) {
            handleFetchError(error, () => {});
        }
    }, [countdownTime, timers, unlocked, currentTimer, userInputs, setTimers, setUnlocked, setCurrentTimer, setUserInputs, handleSubmit]);

    // Update the first submit click handler
    const handleFirstSubmit = useCallback(() => {
        // Don't store pausedTime yet, just show confirmation
        setShowFirstConfirm(true);
    }, []);

    // Update handleFinalConfirm to handle both pausing and submission
    const handleFinalConfirm = useCallback(() => {
        // Now store the paused time
        setPausedTime(countdownTime);
        localStorage.setItem("pausedTime", countdownTime.toString());
        
        setShowFirstConfirm(false);
        setShowFinalConfirm(false);
        handleSubmit();
    }, [countdownTime, handleSubmit]);

    // Update the timer effect for puzzle progress
    useEffect(() => {
        if (isLoggedIn && !isSubmitted && !unlocked[0] && !currentPuzzleStartTime) {
            setCurrentPuzzleStartTime(Date.now());
            setIsTimerRunning(true);
        }
        
        const currentUnsolved = unlocked.findIndex(u => !u);
        if (currentUnsolved !== -1 && !isSubmitted && !showFinalConfirm) {
            setCurrentPuzzleStartTime(Date.now());
            setIsTimerRunning(true);
        }
    }, [isLoggedIn, isSubmitted, currentPuzzleStartTime, unlocked, showFinalConfirm]);

    // Then add the validation check
    const validSets = ['A', 'B', 'C', 'D', 'E'];
    if (!setId || !validSets.includes(setId.toUpperCase())) {
        return <Navigate to="/set/A" replace />;
    }

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
            <div className="absolute top-4 right-4">
                <img src="/logo.png" alt="Logo" className="h-30" />
            </div>

            <div className="p-3 flex justify-center items-center">
                <div className="text-center">
                    <div className={`text-2xl font-mono font-bold ${!isSubmitted && countdownTime < 300 ? 'text-red-500' : 'text-white'}`}>
                        {formatCountdown(isSubmitted ? (pausedTime ?? countdownTime) : countdownTime)}
                    </div>
                    <div className="text-sm text-gray-400">
                        Time Remaining
                    </div>
                </div>
            </div>
            
            {answerSet && (
                <div className="text-center">
                    <span className="px-3 py-1 bg-gray-800 rounded-full text-sm font-mono">
                        Set {answerSet}
                    </span>
                </div>
            )}
            
            <div className="flex-1 flex flex-col items-center justify-center p-5">
                <h1 className="text-4xl font-bold mb-6 tracking-widest">Morse Code Puzzle</h1>
                <div className="flex flex-col gap-4 w-full max-w-lg p-6 bg-gray-800 rounded-lg shadow-lg">
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
                            {/* Show audio player for current puzzle and already solved puzzles */}
                            {((index === unlocked.findIndex(u => !u)) || unlocked[index]) && !isSubmitted && (
                                <AudioPlayer 
                                    set={answerSet ?? ''} 
                                    puzzleIndex={index + 1}
                                />
                            )}
                        </div>
                    ))}
                    
                    {/* Final time display or submit button */}
                    <div className="flex items-center justify-between w-full gap-4">
                        {isSubmitted && (
                            <div className="w-full flex flex-col items-center justify-center h-16 bg-gray-900 text-center rounded-md shadow-md font-mono border border-gray-700">
                                <div className="text-lg font-bold text-green-400">
                                    Final Time: {formatTime(finalTime ?? 0)}
                                </div>
                                <div className="text-sm text-gray-400">
                                    Puzzles Solved: {unlocked.filter(Boolean).length}/5
                                </div>
                            </div>
                        )}
                        {!isSubmitted && (showFirstConfirm || showFinalConfirm) && (
                            <div className="w-full flex flex-col items-center justify-center h-12 bg-gray-900 text-center rounded-md shadow-md font-mono">
                                <div>Time: {formatTime(60 - (pausedTime ?? countdownTime))}</div>
                                <div className="text-sm text-gray-400">
                                    Puzzles Solved: {unlocked.filter(Boolean).length}/5
                                </div>
                            </div>
                        )}
                        {!isSubmitted && !showFirstConfirm && !showFinalConfirm && (
                            <button
                                className="w-full h-12 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-md"
                                onClick={handleFirstSubmit}
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
                    show={showFinalConfirm} 
                    onClose={() => setShowFinalConfirm(false)}
                    onConfirm={handleFinalConfirm}
                />
            )}

            {/* Footer */}
        <footer className="mt-auto border-t border-gray-700 text-sm text-gray-400 py-2 px-4 flex justify-between items-center">
            <div className="flex items-center gap-1">
                <span>©</span> 
                <span>2025 Aditya Pandey</span>
            </div>
            <span>All rights reserved - Microsoft Student Chapter, VIT AP</span>
        </footer>
        </div>
    );
}

export default memo(MorseCodePuzzle);