import { cn } from "@/lib/utils";

function Modal({ isOpen, onClose, children, className, ...props }) {
    if (!isOpen) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50",
                className,
            )}
            onClick={onClose}
            {...props}
        >
            <div
                className="p-8 border w-96 shadow-2xl rounded-lg bg-white relative transform transition-all duration-300 ease-out"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                {children}
            </div>
        </div>
    );
}

function ModalHeader({ children, className, ...props }) {
    return (
        <div className={cn("text-2xl font-bold text-gray-900 mb-4", className)} {...props}>
            {children}
        </div>
    );
}

function ModalBody({ children, className, ...props }) {
    return (
        <div className={cn("text-sm text-gray-600", className)} {...props}>
            {children}
        </div>
    );
}

function ModalFooter({ children, className, ...props }) {
    return (
        <div className={cn("mt-4 flex justify-end space-x-2", className)} {...props}>
            {children}
        </div>
    );
}

function ModalCloseButton({ onClose, className, ...props }) {
    return (
        <button
            onClick={onClose}
            className={cn(
                "absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors",
                className,
            )}
            {...props}
        >
            ✕
        </button>
    );
}

export { Modal, ModalHeader, ModalBody, ModalFooter, ModalCloseButton };
