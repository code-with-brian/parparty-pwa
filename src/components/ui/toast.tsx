import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Re-export for convenience
export type { Toast as ToastInterface };

interface ToastProps extends Toast {
  onRemove: (id: string) => void;
}

const toastVariants = {
  success: {
    className: 'bg-green-500/10 border-green-500/30 text-green-400',
    icon: CheckCircle2,
  },
  error: {
    className: 'bg-red-500/10 border-red-500/30 text-red-400',
    icon: AlertCircle,
  },
  warning: {
    className: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    icon: AlertTriangle,
  },
  info: {
    className: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    icon: Info,
  },
};

export function ToastComponent({ 
  id, 
  type, 
  title, 
  description, 
  action, 
  onRemove 
}: ToastProps) {
  const variant = toastVariants[type];
  const Icon = variant.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-xl',
        variant.className
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        {description && (
          <p className="mt-1 text-xs opacity-80 leading-relaxed">
            {description}
          </p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 text-xs font-medium underline opacity-80 hover:opacity-100 transition-opacity"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onRemove(id)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastComponent {...toast} onRemove={onRemove} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}