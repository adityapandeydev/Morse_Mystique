import { memo } from 'react';
import { ModalProps } from '../../types';

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

export default memo(FirstConfirmModal); 