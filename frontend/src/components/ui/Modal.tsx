import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { twMerge } from 'tailwind-merge';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const modalRoot = typeof document !== 'undefined' ? document.body : null;

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, className, children, footer }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !modalRoot) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className={twMerge(
          'w-full max-w-lg rounded-lg bg-white text-foreground shadow-xl dark:bg-slate-900',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {children}
        </div>
        {footer && <div className="border-t border-border px-6 py-4 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    modalRoot
  );
};

export default Modal;
