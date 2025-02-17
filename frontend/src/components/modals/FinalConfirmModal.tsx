import { memo } from 'react';
import { ModalProps } from '../../types';

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

export default memo(FinalConfirmModal); 