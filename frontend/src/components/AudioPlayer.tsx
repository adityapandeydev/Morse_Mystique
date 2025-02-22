import { useState, useRef, useEffect } from 'react';
import { API_URL } from '../config';

interface AudioPlayerProps {
    set: string;
    puzzleIndex: number;
}

const AudioPlayer = ({ set, puzzleIndex }: AudioPlayerProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isLoadedRef = useRef(false);

    // Load audio source when component mounts
    useEffect(() => {
        if (audioRef.current) {
            isLoadedRef.current = false;
            audioRef.current.src = `${API_URL}/api/audio/${set}/${puzzleIndex}`;
            audioRef.current.load();
        }
    }, [set, puzzleIndex]);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handlePlay = async () => {
        if (!audioRef.current) return;

        try {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                await audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        } catch (error) {
            console.error('Audio playback error:', error);
            setError('Failed to play audio');
            setIsPlaying(false);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current || !isLoadedRef.current) return;
        const newTime = Number(e.target.value);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    return (
        <div className="flex items-center gap-3 bg-gray-900 p-2 rounded-lg w-48 shadow-lg">
            <button
                onClick={handlePlay}
                className={`p-2 rounded-full ${
                    isPlaying ? 'bg-red-500' : 'bg-blue-500'
                } hover:opacity-90 transition-all transform hover:scale-105 flex-shrink-0`}
                title={error || 'Play/Pause'}
                disabled={!isLoadedRef.current}
            >
                {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                )}
            </button>

            <div className="flex-1">
                <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    disabled={!isLoadedRef.current}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    style={{
                        background: `linear-gradient(to right, #3b82f6 ${(currentTime/duration)*100}%, #374151 ${(currentTime/duration)*100}%)`
                    }}
                />
                <div className="flex justify-between w-full text-xs text-gray-400 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <audio
                ref={audioRef}
                onTimeUpdate={() => {
                    if (audioRef.current) {
                        setCurrentTime(audioRef.current.currentTime);
                    }
                }}
                onLoadedMetadata={() => {
                    if (audioRef.current) {
                        setDuration(audioRef.current.duration);
                        isLoadedRef.current = true;
                    }
                }}
                onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                    if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                    }
                }}
                onError={() => {
                    setIsPlaying(false);
                    setError('Audio failed to load');
                    isLoadedRef.current = false;
                }}
                style={{ display: 'none' }}
            />
        </div>
    );
};

export default AudioPlayer; 