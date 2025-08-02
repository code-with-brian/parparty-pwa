import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  User as UserIcon, 
  LogOut, 
  Trophy,
  Bell,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

interface UserMenuProps {
  className?: string;
  position?: 'auto' | 'top' | 'bottom';
}

export function UserMenu({ className = '', position = 'auto' }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom');
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, signInWithGoogle, signInWithApple } = useAuth();

  // Auto-detect dropdown position based on available space
  useEffect(() => {
    if (position === 'auto' && menuRef.current && isOpen) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If there's more space above and not enough below, position on top
      setDropdownPosition(spaceAbove > spaceBelow && spaceBelow < 300 ? 'top' : 'bottom');
    } else if (position !== 'auto') {
      setDropdownPosition(position);
    }
  }, [isOpen, position]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  const menuItems = [
    {
      icon: UserIcon,
      label: 'Profile',
      onClick: () => {
        navigate('/settings');
        setIsOpen(false);
      }
    },
    {
      icon: Trophy,
      label: 'My Stats',
      onClick: () => {
        navigate('/stats');
        setIsOpen(false);
      }
    },
    {
      icon: Bell,
      label: 'Notifications',
      onClick: () => {
        navigate('/settings?tab=notifications');
        setIsOpen(false);
      }
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => {
        navigate('/settings');
        setIsOpen(false);
      }
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      onClick: () => {
        // Could open help modal or navigate to help page
        setIsOpen(false);
      }
    },
    {
      icon: LogOut,
      label: 'Sign Out',
      onClick: handleLogout,
      className: 'text-red-400 hover:bg-red-500/10'
    }
  ];

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      setIsOpen(false);
    } catch (error) {
      console.error('Google sign-in failed:', error);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
      setIsOpen(false);
    } catch (error) {
      console.error('Apple sign-in failed:', error);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div ref={menuRef} className={`relative ${className}`}>
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Sign In
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0.95, 
                y: dropdownPosition === 'top' ? 10 : -10 
              }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0 
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.95, 
                y: dropdownPosition === 'top' ? 10 : -10 
              }}
              transition={{ duration: 0.15 }}
              className={`absolute right-0 w-64 z-50 ${
                dropdownPosition === 'top' 
                  ? 'bottom-full mb-2 origin-bottom-right' 
                  : 'top-full mt-2 origin-top-right'
              }`}
            >
              <div className="rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="p-4">
                  <p className="text-sm text-gray-400 mb-3 text-center">
                    Sign in to save your progress and connect with friends
                  </p>
                  
                  <div className="space-y-2">
                    <button
                      onClick={handleGoogleSignIn}
                      className="w-full h-12 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </button>

                    <button
                      onClick={handleAppleSignIn}
                      className="w-full h-12 bg-black text-white hover:bg-gray-900 font-medium rounded-lg flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5 mr-3 fill-current" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      Continue with Apple
                    </button>

                    <div className="relative my-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-600" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-gray-900 text-gray-400">or</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        navigate('/join');
                        setIsOpen(false);
                      }}
                      className="w-full h-10 border border-gray-600 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors text-sm"
                    >
                      Continue as Guest
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <Avatar
        src={user.image}
        name={user.name}
        size="md"
        onClick={() => setIsOpen(!isOpen)}
        showBorder
        className="shadow-lg shadow-cyan-500/25"
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ 
              opacity: 0, 
              scale: 0.95, 
              y: dropdownPosition === 'top' ? 10 : -10 
            }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0 
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.95, 
              y: dropdownPosition === 'top' ? 10 : -10 
            }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 w-64 z-50 ${
              dropdownPosition === 'top' 
                ? 'bottom-full mb-2 origin-bottom-right' 
                : 'top-full mt-2 origin-top-right'
            }`}
          >
            <div className="rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={user.image}
                    name={user.name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.name}
                    </p>
                    {user.email && (
                      <p className="text-xs text-gray-400 truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={index}
                      onClick={item.onClick}
                      className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors ${item.className || ''}`}
                      whileHover={{ x: 2 }}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </motion.button>
                  );
                })}
              </div>

              {/* Premium badge */}
              <div className="px-4 py-3 border-t border-white/10 bg-gradient-to-r from-cyan-500/10 to-blue-600/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cyan-400 font-medium">
                    ParParty Premium
                  </span>
                  <span className="text-xs text-gray-500">
                    Member since 2024
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}