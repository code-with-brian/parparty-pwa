import { motion } from 'framer-motion';
import { Target, Users, MessageSquare, Utensils, Camera } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface BottomTabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onCameraPress?: () => void;
}

export function BottomTabNavigation({ 
  activeTab, 
  onTabChange, 
  onCameraPress 
}: BottomTabNavigationProps) {
  const tabs: Tab[] = [
    { id: 'scorecard', label: 'Scorecard', icon: Target },
    { id: 'social', label: 'Social', icon: MessageSquare, badge: 3 },
    { id: 'camera', label: 'Camera', icon: Camera },
    { id: 'orders', label: 'F&B', icon: Utensils },
    { id: 'players', label: 'Players', icon: Users },
  ];

  return (
    <div className="bg-white/95 backdrop-blur-md border-t border-gray-200">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'camera' && onCameraPress) {
                  onCameraPress();
                } else {
                  onTabChange(tab.id);
                }
              }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-0 flex-1 relative ${
                isActive 
                  ? 'bg-green-100' 
                  : 'hover:bg-gray-50'
              }`}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
            >
              {/* Tab indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-green-100 rounded-xl"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                  }}
                />
              )}
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative">
                  <Icon 
                    className={`w-6 h-6 transition-colors ${
                      isActive ? 'text-green-600' : 'text-gray-500'
                    }`} 
                  />
                  
                  {/* Badge */}
                  {tab.badge && tab.badge > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
                    >
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </motion.div>
                  )}
                </div>
                
                <span className={`text-xs font-medium mt-1 transition-colors ${
                  isActive ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {tab.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}