import React, { useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error';
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000); // Auto-close after 5 seconds
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
  };

  return (
    <div
      className={twMerge(
        'p-3 rounded-md shadow-lg flex items-center justify-between space-x-4',
        typeStyles[type]
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <span>{message}</span>
      <button
        onClick={() => onClose(id)}
        className="ml-4 text-white opacity-75 hover:opacity-100 focus:outline-none"
        aria-label="Close"
      >
        &times;
      </button>
    </div>
  );
};

export default Toast;
