import { ArrowLeft, MoreHorizontal, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onShare?: () => void;
  onMore?: () => void;
  showBackButton?: boolean;
  rightAction?: React.ReactNode;
}

export function NavigationHeader({
  title,
  subtitle,
  onBack,
  onShare,
  onMore,
  showBackButton = true,
  rightAction
}: NavigationHeaderProps) {
  return (
    <div className="relative">
      {/* Premium glass header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] backdrop-blur-2xl border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
        
        {/* Left side */}
        <div className="relative flex items-center gap-4 flex-1">
          {showBackButton && onBack && (
            <motion.button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm transition-all hover:bg-white/10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </motion.button>
          )}
          
          {/* Premium ParParty Branding */}
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/25"
              animate={{ 
                boxShadow: [
                  '0 0 20px rgba(34, 211, 238, 0.25)',
                  '0 0 30px rgba(34, 211, 238, 0.4)',
                  '0 0 20px rgba(34, 211, 238, 0.25)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <span className="text-white font-bold">⛳</span>
            </motion.div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-light text-white tracking-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-slate-400 font-mono truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="relative flex items-center gap-3">
          {rightAction}
          
          {onShare && (
            <motion.button
              onClick={onShare}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm transition-all hover:bg-white/10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Share className="w-4 h-4 text-white" />
            </motion.button>
          )}
          
          {onMore && (
            <motion.button
              onClick={onMore}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm transition-all hover:bg-white/10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MoreHorizontal className="w-4 h-4 text-white" />
            </motion.button>
          )}
        </div>
      </div>
      
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent blur-xl -z-10" />
    </div>
  );
}