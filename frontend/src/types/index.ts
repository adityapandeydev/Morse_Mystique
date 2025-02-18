export interface Puzzle {
    id: number;
}

export interface ModalProps {
    onCancel: () => void;
    onContinue: () => void;
    totalTime: string;
}

export interface PuzzleData {
    id: number;
    next: string | null;
    isCorrect: boolean;
}

export interface UserData {
    email_id: string;
    device_id: string;
    total_time: number | null;
    solved_count: number;
    remaining_time: number | null;
}

export interface RegisteredUser {
    email_id: string;
    added_by: string;
} 