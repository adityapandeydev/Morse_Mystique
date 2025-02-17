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