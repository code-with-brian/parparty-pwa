import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { type Toast, type ToastType, ToastContainer } from '@/components/ui/toast';

interface ToastContextType {
  toast: (options: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000, // Default 5 seconds
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    return addToast(options);
  }, [addToast]);

  const success = useCallback((title: string, description?: string) => {
    return addToast({
      type: 'success',
      title,
      description,
    });
  }, [addToast]);

  const error = useCallback((title: string, description?: string) => {
    return addToast({
      type: 'error',
      title,
      description,
      duration: 7000, // Errors stay longer
    });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string) => {
    return addToast({
      type: 'warning',
      title,
      description,
    });
  }, [addToast]);

  const info = useCallback((title: string, description?: string) => {
    return addToast({
      type: 'info',
      title,
      description,
    });
  }, [addToast]);

  const value: ToastContextType = {
    toast,
    success,
    error,
    warning,
    info,
    dismiss: removeToast,
    dismissAll: removeAllToasts,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Convenience hook for quick notifications
export const useNotifications = () => {
  const { success, error, warning, info } = useToast();

  return {
    notifySuccess: success,
    notifyError: error,
    notifyWarning: warning,
    notifyInfo: info,
  };
};