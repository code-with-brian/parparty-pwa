import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  showBorder?: boolean;
  isOnline?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg'
};

const borderSizes = {
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-3',
  xl: 'border-3'
};

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  className = '',
  onClick,
  showBorder = false,
  isOnline = false
}: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  const baseClasses = `
    relative rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600
    flex items-center justify-center font-medium text-white
    ${sizeClasses[size]}
    ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
    ${showBorder ? `${borderSizes[size]} border-white/20` : ''}
    ${className}
  `;

  return (
    <motion.div
      className={baseClasses}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
    >
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide broken image and show fallback
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : initials ? (
        <span className="select-none">{initials}</span>
      ) : (
        <User className={`${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : size === 'lg' ? 'w-6 h-6' : 'w-8 h-8'}`} />
      )}
      
      {/* Online indicator */}
      {isOnline && (
        <div className="absolute bottom-0 right-0 transform translate-x-1 translate-y-1">
          <div className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-2.5 h-2.5' : 'w-3 h-3'} bg-green-500 rounded-full border-2 border-gray-900`} />
        </div>
      )}
    </motion.div>
  );
}

export function AvatarGroup({
  children,
  max = 3,
  size = 'md',
  className = ''
}: {
  children: React.ReactNode;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const childrenArray = React.Children.toArray(children);
  const visibleChildren = childrenArray.slice(0, max);
  const remainingCount = childrenArray.length - max;

  const overlapClasses = {
    sm: '-ml-2',
    md: '-ml-3',
    lg: '-ml-4',
    xl: '-ml-5'
  };

  return (
    <div className={`flex items-center ${className}`}>
      {visibleChildren.map((child, index) => (
        <div
          key={index}
          className={`${index > 0 ? overlapClasses[size] : ''} relative z-${max - index}`}
          style={{ zIndex: max - index }}
        >
          {child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={`${overlapClasses[size]} relative z-0 ${sizeClasses[size]} rounded-full bg-gray-700 border-2 border-white/20 flex items-center justify-center text-white font-medium`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}