import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MobileLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  showStatusBar?: boolean;
}

export function MobileLayout({ 
  children, 
  header, 
  footer, 
  className = '', 
  showStatusBar = true 
}: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex flex-col">
      {/* Status bar spacer for iOS */}
      {showStatusBar && (
        <div className="h-0 safe-area-pt bg-green-600" />
      )}
      
      {/* Header */}
      {header && (
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white/90 backdrop-blur-md border-b border-green-100 safe-area-pl safe-area-pr"
        >
          {header}
        </motion.header>
      )}
      
      {/* Main content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className={`flex-1 overflow-y-auto safe-area-pl safe-area-pr ${className}`}
      >
        {children}
      </motion.main>
      
      {/* Footer */}
      {footer && (
        <motion.footer
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white/90 backdrop-blur-md border-t border-green-100 safe-area-pl safe-area-pr safe-area-pb"
        >
          {footer}
        </motion.footer>
      )}
    </div>
  );
}