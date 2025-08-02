import { motion } from 'framer-motion';
import { Target, Trophy, MessageSquare, Utensils, Calendar } from 'lucide-react';
import { UserMenu } from '@/components/UserMenu';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface BottomTabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function BottomTabNavigation({ 
  activeTab, 
  onTabChange
}: BottomTabNavigationProps) {
  const tabs: Tab[] = [
    { id: 'scorecard', label: 'Scorecard', icon: Target },
    { id: 'social', label: 'Social', icon: MessageSquare, badge: 3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'orders', label: 'F&B', icon: Utensils },
    { id: 'events', label: 'Events', icon: Calendar },
  ];

  return (
    <div className="relative">
      {/* Premium glass bottom navigation */}
      <div className="bg-white/[0.02] backdrop-blur-2xl border-t border-white/10">
        <div className="absolute inset-0 bg-gradient-to-t from-white/[0.02] to-transparent" />
        
        <div className="relative flex items-center px-4 py-3">
          {/* Main tabs */}
          <div className="flex items-center justify-around flex-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 min-w-0 flex-1 relative ${
                    isActive 
                      ? 'bg-white/10' 
                      : 'hover:bg-white/5'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                >
                {/* Premium tab indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl border border-cyan-500/30"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 25
                    }}
                  />
                )}
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative">
                    <Icon 
                      className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-400'
                      }`} 
                    />
                    
                    {/* Premium badge */}
                    {tab.badge && tab.badge > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-lg shadow-red-500/50"
                      >
                        {tab.badge > 9 ? '9+' : tab.badge}
                      </motion.div>
                    )}
                  </div>
                  
                  <span className={`text-xs font-medium mt-1 transition-colors tracking-tight ${
                    isActive ? 'text-cyan-400' : 'text-slate-500'
                  }`}>
                    {tab.label}
                  </span>
                </div>
                </motion.button>
              );
            })}
          </div>
          
          {/* User Avatar */}
          <div className="ml-3 border-l border-white/10 pl-3">
            <UserMenu className="scale-90" position="top" />
          </div>
        </div>
      </div>
      
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent blur-xl -z-10" />
    </div>
  );
}