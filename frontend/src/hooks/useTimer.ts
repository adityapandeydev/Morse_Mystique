import { useState, useEffect } from 'react';

export function useTimer(isRunning: boolean, startTime: number | null): [number, (n: number) => void] {
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        let intervalId: number;

        if (isRunning && startTime) {
            intervalId = window.setInterval(() => {
                setCurrentTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }

        return () => clearInterval(intervalId);
    }, [isRunning, startTime]);

    return [currentTime, setCurrentTime];
} 