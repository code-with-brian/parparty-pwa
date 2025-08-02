// Utility functions for toast notifications
// These can be used as a convenience API throughout the app

export interface ToastConfig {
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Common toast configurations for different scenarios
export const toastConfigs = {
  // Success messages
  profileUpdated: {
    title: 'Profile updated',
    description: 'Your changes have been saved successfully',
  },
  
  avatarUploaded: {
    title: 'Avatar updated',
    description: 'Your new profile picture is now active',
  },
  
  notificationsEnabled: {
    title: 'Notifications enabled',
    description: 'You will now receive game updates',
  },
  
  notificationsDisabled: {
    title: 'Notifications disabled',
    description: 'You will no longer receive notifications',
  },
  
  gameJoined: {
    title: 'Joined game',
    description: 'Welcome to the game!',
  },
  
  scoreRecorded: {
    title: 'Score recorded',
    description: 'Your score has been saved',
  },
  
  // Error messages
  profileUpdateFailed: {
    title: 'Failed to update profile',
    description: 'Please check your connection and try again',
    duration: 7000,
  },
  
  notificationPermissionDenied: {
    title: 'Permission denied',
    description: 'Please enable notifications in your browser settings',
    duration: 8000,
  },
  
  connectionError: {
    title: 'Connection error',
    description: 'Please check your internet connection',
    duration: 6000,
  },
  
  gameNotFound: {
    title: 'Game not found',
    description: 'The game may have been deleted or you may not have access',
    duration: 7000,
  },
  
  // Info messages
  gameStarting: {
    title: 'Game starting',
    description: 'Get ready to tee off!',
  },
  
  featureComingSoon: {
    title: 'Coming soon',
    description: 'This feature will be available in a future update',
  },
  
  // Warning messages
  unsavedChanges: {
    title: 'Unsaved changes',
    description: 'You have unsaved changes that will be lost',
    duration: 6000,
    action: {
      label: 'Save now',
      onClick: () => {},
    },
  },
  
  gameEnding: {
    title: 'Game ending soon',
    description: 'Make sure to submit your final scores',
    duration: 8000,
  },
} as const;

// Helper function to get toast config with overrides
export const getToastConfig = (
  configKey: keyof typeof toastConfigs,
  overrides?: Partial<ToastConfig>
): ToastConfig => {
  return {
    ...toastConfigs[configKey],
    ...overrides,
  };
};

// Common toast patterns for quick use
export const createToast = {
  success: (title: string, description?: string): ToastConfig => ({
    title,
    description,
  }),
  
  error: (title: string, description?: string): ToastConfig => ({
    title,
    description,
    duration: 7000,
  }),
  
  warning: (title: string, description?: string): ToastConfig => ({
    title,
    description,
    duration: 6000,
  }),
  
  info: (title: string, description?: string): ToastConfig => ({
    title,
    description,
  }),
  
  withAction: (title: string, description: string, actionLabel: string, actionFn: () => void): ToastConfig => ({
    title,
    description,
    action: {
      label: actionLabel,
      onClick: actionFn,
    },
  }),
};