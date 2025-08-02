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
  const { user, logout, isAuthenticated } = useAuth();

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

  if (!isAuthenticated || !user) {
    return (
      <motion.button
        onClick={() => navigate('/join')}
        className={`px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity ${className}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Sign In
      </motion.button>
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