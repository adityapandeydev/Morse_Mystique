import { memo } from 'react';

interface Props {
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const FinalConfirmModal = ({ show, onClose, onConfirm }: Props) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-6 rounded-lg max-w-sm w-full">
                <h2 className="text-xl font-bold mb-4">Really Sure?</h2>
                <p className="mb-6">This action cannot be undone.</p>
                <div className="flex justify-end gap-4">
                    <button
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded"
                        onClick={onConfirm}
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default memo(FinalConfirmModal); 