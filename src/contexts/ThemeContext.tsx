import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  applyTheme: (settings: {
    theme?: 'light' | 'dark' | 'system';
    accentColor?: string;
    fontSize?: 'small' | 'medium' | 'large';
    animationLevel?: 'none' | 'reduced' | 'full';
    compactMode?: boolean;
    highContrast?: boolean;
    showAnimatedBackgrounds?: boolean;
  }) => void;
  getCurrentTheme: () => 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

// Define color palettes for each accent color
const accentColorPalettes = {
  cyan: {
    primary: '0, 187, 255',      // rgb(0, 187, 255)
    primaryHover: '14, 165, 233', // rgb(14, 165, 233)
    secondary: '6, 182, 212',     // rgb(6, 182, 212)
    accent: '34, 197, 94',        // rgb(34, 197, 94)
  },
  blue: {
    primary: '59, 130, 246',      // rgb(59, 130, 246)
    primaryHover: '37, 99, 235',  // rgb(37, 99, 235)
    secondary: '96, 165, 250',    // rgb(96, 165, 250)
    accent: '147, 197, 253',      // rgb(147, 197, 253)
  },
  purple: {
    primary: '147, 51, 234',      // rgb(147, 51, 234)
    primaryHover: '126, 34, 206', // rgb(126, 34, 206)
    secondary: '168, 85, 247',    // rgb(168, 85, 247)
    accent: '196, 181, 253',      // rgb(196, 181, 253)
  },
  pink: {
    primary: '236, 72, 153',      // rgb(236, 72, 153)
    primaryHover: '219, 39, 119', // rgb(219, 39, 119)
    secondary: '244, 114, 182',   // rgb(244, 114, 182)
    accent: '251, 207, 232',      // rgb(251, 207, 232)
  },
  green: {
    primary: '34, 197, 94',       // rgb(34, 197, 94)
    primaryHover: '22, 163, 74',  // rgb(22, 163, 74)
    secondary: '74, 222, 128',    // rgb(74, 222, 128)
    accent: '187, 247, 208',      // rgb(187, 247, 208)
  },
  orange: {
    primary: '249, 115, 22',      // rgb(249, 115, 22)
    primaryHover: '234, 88, 12',  // rgb(234, 88, 12)
    secondary: '251, 146, 60',    // rgb(251, 146, 60)
    accent: '254, 215, 170',      // rgb(254, 215, 170)
  },
  red: {
    primary: '239, 68, 68',       // rgb(239, 68, 68)
    primaryHover: '220, 38, 38',  // rgb(220, 38, 38)
    secondary: '248, 113, 113',   // rgb(248, 113, 113)
    accent: '252, 165, 165',      // rgb(252, 165, 165)
  },
  yellow: {
    primary: '245, 158, 11',      // rgb(245, 158, 11)
    primaryHover: '217, 119, 6',  // rgb(217, 119, 6)
    secondary: '251, 191, 36',    // rgb(251, 191, 36)
    accent: '254, 240, 138',      // rgb(254, 240, 138)
  },
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { userSettings } = useAuth();

  const detectSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const getCurrentTheme = (): 'light' | 'dark' => {
    if (!userSettings) return 'dark';
    
    if (userSettings.theme === 'system') {
      return detectSystemTheme();
    }
    
    return userSettings.theme;
  };

  const applyTheme = (settings: {
    theme?: 'light' | 'dark' | 'system';
    accentColor?: string;
    fontSize?: 'small' | 'medium' | 'large';
    animationLevel?: 'none' | 'reduced' | 'full';
    compactMode?: boolean;
    highContrast?: boolean;
    showAnimatedBackgrounds?: boolean;
  }) => {
    const root = document.documentElement;
    
    // Apply theme (light/dark)
    if (settings.theme) {
      const actualTheme = settings.theme === 'system' ? detectSystemTheme() : settings.theme;
      root.classList.toggle('dark', actualTheme === 'dark');
      root.classList.toggle('light', actualTheme === 'light');
    }

    // Apply accent color
    if (settings.accentColor && accentColorPalettes[settings.accentColor as keyof typeof accentColorPalettes]) {
      const palette = accentColorPalettes[settings.accentColor as keyof typeof accentColorPalettes];
      root.style.setProperty('--color-primary', palette.primary);
      root.style.setProperty('--color-primary-hover', palette.primaryHover);
      root.style.setProperty('--color-secondary', palette.secondary);
      root.style.setProperty('--color-accent', palette.accent);
    }

    // Apply font size
    if (settings.fontSize) {
      root.classList.remove('text-small', 'text-medium', 'text-large');
      root.classList.add(`text-${settings.fontSize}`);
      
      // Set CSS custom properties for font sizing
      const fontSizes = {
        small: {
          xs: '0.6rem',
          sm: '0.7rem',
          base: '0.8rem',
          lg: '0.9rem',
          xl: '1rem',
          '2xl': '1.125rem',
          '3xl': '1.25rem',
        },
        medium: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
        },
        large: {
          xs: '0.875rem',
          sm: '1rem',
          base: '1.125rem',
          lg: '1.25rem',
          xl: '1.5rem',
          '2xl': '1.875rem',
          '3xl': '2.25rem',
        },
      };

      const sizes = fontSizes[settings.fontSize];
      Object.entries(sizes).forEach(([key, value]) => {
        root.style.setProperty(`--font-size-${key}`, value);
      });
    }

    // Apply animation level
    if (settings.animationLevel) {
      root.classList.remove('animations-none', 'animations-reduced', 'animations-full');
      root.classList.add(`animations-${settings.animationLevel}`);
      
      // Set CSS custom properties for animation control
      const animationSettings = {
        none: {
          duration: '0s',
          transition: 'none',
        },
        reduced: {
          duration: '0.15s',
          transition: 'all 0.15s ease-in-out',
        },
        full: {
          duration: '0.3s',
          transition: 'all 0.3s ease-in-out',
        },
      };

      const settings_anim = animationSettings[settings.animationLevel];
      root.style.setProperty('--animation-duration', settings_anim.duration);
      root.style.setProperty('--transition-default', settings_anim.transition);
    }

    // Apply compact mode
    if (settings.compactMode !== undefined) {
      root.classList.toggle('compact-mode', settings.compactMode);
      
      // Set spacing variables
      const spacing = settings.compactMode ? {
        xs: '0.125rem',
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      } : {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      };

      Object.entries(spacing).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, value);
      });
    }

    // Apply high contrast mode
    if (settings.highContrast !== undefined) {
      root.classList.toggle('high-contrast', settings.highContrast);
    }

    // Apply animated backgrounds
    if (settings.showAnimatedBackgrounds !== undefined) {
      root.classList.toggle('animated-backgrounds', settings.showAnimatedBackgrounds);
    }
  };

  // Apply settings when userSettings changes
  useEffect(() => {
    if (userSettings) {
      applyTheme({
        theme: userSettings.theme,
        accentColor: userSettings.accentColor,
        fontSize: userSettings.fontSize,
        animationLevel: userSettings.animationLevel,
        compactMode: userSettings.compactMode,
        highContrast: userSettings.highContrast,
        showAnimatedBackgrounds: userSettings.showAnimatedBackgrounds,
      });
    }
  }, [userSettings]);

  // Listen for system theme changes
  useEffect(() => {
    if (!userSettings || userSettings.theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme({ theme: 'system' });
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [userSettings?.theme]);

  const value: ThemeContextType = {
    applyTheme,
    getCurrentTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};