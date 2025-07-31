import React, { useState, useEffect } from 'react';
import { notificationManager, NotificationPreferences } from '../utils/notificationManager';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface NotificationPreferencesProps {
  onClose?: () => void;
}

export const NotificationPreferencesComponent: React.FC<NotificationPreferencesProps> = ({ onClose }) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    gameEvents: true,
    orderUpdates: true,
    socialMoments: true,
    achievements: true,
    marketing: false,
    sound: true,
    vibration: true,
  });
  const [isSupported, setIsSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Load current preferences
    const currentPrefs = notificationManager.getPreferences();
    setPreferences(currentPrefs);
    setIsSupported(notificationManager.isSupported());
    setPermissionStatus(notificationManager.getPermissionStatus());
  }, []);

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    notificationManager.updatePreferences({ [key]: value });
  };

  const requestPermission = async () => {
    const granted = await notificationManager.requestPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };

  const testNotification = async () => {
    await notificationManager.testNotification();
  };

  const PreferenceToggle: React.FC<{
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
  }> = ({ label, description, checked, onChange, disabled = false }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
      </label>
    </div>
  );

  if (!isSupported) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Notifications Not Supported</h3>
          <p className="text-gray-600 mb-4">
            Your device or browser doesn't support push notifications.
          </p>
          {onClose && (
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Notification Settings</h3>
        <p className="text-sm text-gray-600">
          Customize which notifications you'd like to receive during your golf rounds.
        </p>
      </div>

      {/* Permission Status */}
      <div className="mb-6 p-4 rounded-lg bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Permission Status</h4>
            <p className="text-xs text-gray-500">
              {permissionStatus === 'granted' ? 'Notifications enabled' : 
               permissionStatus === 'denied' ? 'Notifications blocked' : 
               'Permission not requested'}
            </p>
          </div>
          {permissionStatus !== 'granted' && (
            <Button onClick={requestPermission} size="sm">
              Enable
            </Button>
          )}
        </div>
      </div>

      {/* Master Toggle */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <PreferenceToggle
          label="Enable Notifications"
          description="Turn all notifications on or off"
          checked={preferences.enabled}
          onChange={(checked) => handlePreferenceChange('enabled', checked)}
          disabled={permissionStatus !== 'granted'}
        />
      </div>

      {/* Notification Categories */}
      <div className="space-y-1">
        <PreferenceToggle
          label="Game Events"
          description="Score updates, achievements, and game milestones"
          checked={preferences.gameEvents}
          onChange={(checked) => handlePreferenceChange('gameEvents', checked)}
          disabled={!preferences.enabled || permissionStatus !== 'granted'}
        />

        <PreferenceToggle
          label="Order Updates"
          description="Food & beverage order status notifications"
          checked={preferences.orderUpdates}
          onChange={(checked) => handlePreferenceChange('orderUpdates', checked)}
          disabled={!preferences.enabled || permissionStatus !== 'granted'}
        />

        <PreferenceToggle
          label="Social Moments"
          description="Photos, comments, and social interactions"
          checked={preferences.socialMoments}
          onChange={(checked) => handlePreferenceChange('socialMoments', checked)}
          disabled={!preferences.enabled || permissionStatus !== 'granted'}
        />

        <PreferenceToggle
          label="Achievements"
          description="Personal bests and milestone celebrations"
          checked={preferences.achievements}
          onChange={(checked) => handlePreferenceChange('achievements', checked)}
          disabled={!preferences.enabled || permissionStatus !== 'granted'}
        />

        <PreferenceToggle
          label="Marketing"
          description="Sponsor offers and course promotions"
          checked={preferences.marketing}
          onChange={(checked) => handlePreferenceChange('marketing', checked)}
          disabled={!preferences.enabled || permissionStatus !== 'granted'}
        />
      </div>

      {/* Sound & Vibration */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Notification Style</h4>
        
        <PreferenceToggle
          label="Sound"
          description="Play notification sounds"
          checked={preferences.sound}
          onChange={(checked) => handlePreferenceChange('sound', checked)}
          disabled={!preferences.enabled || permissionStatus !== 'granted'}
        />

        <PreferenceToggle
          label="Vibration"
          description="Vibrate for important notifications"
          checked={preferences.vibration}
          onChange={(checked) => handlePreferenceChange('vibration', checked)}
          disabled={!preferences.enabled || permissionStatus !== 'granted'}
        />
      </div>

      {/* Test Button */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <Button
          onClick={testNotification}
          variant="outline"
          className="w-full"
          disabled={!preferences.enabled || permissionStatus !== 'granted'}
        >
          Test Notification
        </Button>
      </div>

      {/* Close Button */}
      {onClose && (
        <div className="mt-4">
          <Button onClick={onClose} variant="outline" className="w-full">
            Done
          </Button>
        </div>
      )}
    </Card>
  );
};