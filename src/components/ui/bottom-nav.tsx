import { motion } from 'framer-motion';
import { Target, MessageSquare, Utensils, Trophy, Camera } from 'lucide-react';
import { Button } from './button';

interface BottomNavProps {
  activeTab: 'scorecard' | 'social' | 'orders';
  onTabChange: (tab: 'scorecard' | 'social' | 'orders') => void;
  onPhotoCapture?: () => void;
  className?: string;
}

export function BottomNav({ activeTab, onTabChange, onPhotoCapture, className = '' }: BottomNavProps) {
  const tabs = [
    {
      id: 'scorecard' as const,
      label: 'Scorecard',
      icon: Target,
      color: 'text-green-600'
    },
    {
      id: 'social' as const,
      label: 'Social',
      icon: MessageSquare,
      color: 'text-blue-600'
    },
    {
      id: 'orders' as const,
      label: 'Orders',
      icon: Utensils,
      color: 'text-purple-600'
    }
  ];

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`fixed bottom-0 left-0 right-0 z-40 ${className}`}
    >
      <div className="glass border-t border-white/20 px-4 py-2 safe-area-pb">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  isActive 
                    ? `${tab.color} bg-white/20` 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
                <span className="text-xs font-medium">{tab.label}</span>
                
                {isActive && (
                  <motion.div 
                    className={`absolute -bottom-1 left-1/2 w-1 h-1 ${tab.color.replace('text-', 'bg-')} rounded-full`}
                    initial={{ scale: 0, x: '-50%' }}
                    animate={{ scale: 1, x: '-50%' }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}

          {/* Photo Capture FAB */}
          {onPhotoCapture && (
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                onClick={onPhotoCapture}
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-full w-12 h-12 p-0 shadow-lg"
              >
                <Camera className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Add safe area padding utility
export const SafeAreaStyles = `
  .safe-area-pb {
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  .safe-area-pt {
    padding-top: env(safe-area-inset-top);
  }
  
  .safe-area-pl {
    padding-left: env(safe-area-inset-left);
  }
  
  .safe-area-pr {
    padding-right: env(safe-area-inset-right);
  }
`;