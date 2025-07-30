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
    <div className="flex items-center justify-between px-4 py-3">
      {/* Left side */}
      <div className="flex items-center gap-3 flex-1">
        {showBackButton && onBack && (
          <motion.div
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="w-10 h-10 p-0 rounded-full hover:bg-green-100"
            >
              <ArrowLeft className="w-5 h-5 text-green-700" />
            </Button>
          </motion.div>
        )}
        
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {rightAction}
        
        {onShare && (
          <motion.div
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              className="w-10 h-10 p-0 rounded-full hover:bg-green-100"
            >
              <Share className="w-4 h-4 text-green-700" />
            </Button>
          </motion.div>
        )}
        
        {onMore && (
          <motion.div
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onMore}
              className="w-10 h-10 p-0 rounded-full hover:bg-green-100"
            >
              <MoreHorizontal className="w-4 h-4 text-green-700" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}