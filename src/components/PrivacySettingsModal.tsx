import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Shield, 
  Eye, 
  EyeOff, 
  Users, 
  Lock,
  Globe,
  UserCheck,
  Save,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  gameActivity: 'public' | 'friends' | 'private';
  statsVisible: boolean;
  achievementsVisible: boolean;
  allowFriendRequests: boolean;
  allowGameInvites: boolean;
  showOnlineStatus: boolean;
  dataSharing: boolean;
}

export function PrivacySettingsModal({ isOpen, onClose }: PrivacySettingsModalProps) {
  const { success, error } = useToast();
  const { userSettings, updatePrivacySettings } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: userSettings?.profileVisibility || 'public',
    gameActivity: userSettings?.gameActivity || 'friends',
    statsVisible: userSettings?.statsVisible ?? true,
    achievementsVisible: userSettings?.achievementsVisible ?? true,
    allowFriendRequests: userSettings?.allowFriendRequests ?? true,
    allowGameInvites: userSettings?.allowGameInvites ?? true,
    showOnlineStatus: userSettings?.showOnlineStatus ?? true,
    dataSharing: userSettings?.dataSharing ?? false,
  });

  // Update local settings when userSettings changes
  useEffect(() => {
    if (userSettings) {
      setSettings({
        profileVisibility: userSettings.profileVisibility,
        gameActivity: userSettings.gameActivity,
        statsVisible: userSettings.statsVisible,
        achievementsVisible: userSettings.achievementsVisible,
        allowFriendRequests: userSettings.allowFriendRequests,
        allowGameInvites: userSettings.allowGameInvites,
        showOnlineStatus: userSettings.showOnlineStatus,
        dataSharing: userSettings.dataSharing,
      });
    }
  }, [userSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      await updatePrivacySettings(settings);
      success('Privacy settings saved', 'Your privacy preferences have been updated');
      onClose();
    } catch (saveError) {
      error('Failed to save settings', 'Please try again later');
      console.error('Failed to save privacy settings:', saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const visibilityOptions = [
    { value: 'public', label: 'Public', description: 'Anyone can see', icon: Globe },
    { value: 'friends', label: 'Friends Only', description: 'Only your friends', icon: Users },
    { value: 'private', label: 'Private', description: 'Only you', icon: Lock },
  ] as const;

  const VisibilitySelector = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: 'public' | 'friends' | 'private';
    onChange: (value: 'public' | 'friends' | 'private') => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        {visibilityOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`p-3 rounded-lg border text-center transition-all ${
                value === option.value
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : 'border-white/20 hover:border-white/40 text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 mx-auto mb-1" />
              <p className="text-xs font-medium">{option.label}</p>
              <p className="text-xs opacity-70">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const ToggleSwitch = ({ 
    checked, 
    onChange, 
    label, 
    description 
  }: { 
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description: string;
  }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-cyan-500' : 'bg-gray-600'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-6' : ''
          }`}
        />
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <Card className="bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader className="relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">Privacy Settings</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Profile Visibility */}
                <VisibilitySelector
                  value={settings.profileVisibility}
                  onChange={(value) => setSettings(prev => ({ ...prev, profileVisibility: value }))}
                  label="Profile Visibility"
                />

                {/* Game Activity */}
                <VisibilitySelector
                  value={settings.gameActivity}
                  onChange={(value) => setSettings(prev => ({ ...prev, gameActivity: value }))}
                  label="Game Activity"
                />

                {/* Content Visibility */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-white">Content Visibility</h3>
                  
                  <ToggleSwitch
                    checked={settings.statsVisible}
                    onChange={(checked) => setSettings(prev => ({ ...prev, statsVisible: checked }))}
                    label="Show Stats"
                    description="Display your golf statistics on your profile"
                  />
                  
                  <ToggleSwitch
                    checked={settings.achievementsVisible}
                    onChange={(checked) => setSettings(prev => ({ ...prev, achievementsVisible: checked }))}
                    label="Show Achievements"
                    description="Display your achievements and badges"
                  />
                </div>

                {/* Communication */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-white">Communication</h3>
                  
                  <ToggleSwitch
                    checked={settings.allowFriendRequests}
                    onChange={(checked) => setSettings(prev => ({ ...prev, allowFriendRequests: checked }))}
                    label="Allow Friend Requests"
                    description="Let other players send you friend requests"
                  />
                  
                  <ToggleSwitch
                    checked={settings.allowGameInvites}
                    onChange={(checked) => setSettings(prev => ({ ...prev, allowGameInvites: checked }))}
                    label="Allow Game Invites"
                    description="Let friends invite you to games"
                  />
                  
                  <ToggleSwitch
                    checked={settings.showOnlineStatus}
                    onChange={(checked) => setSettings(prev => ({ ...prev, showOnlineStatus: checked }))}
                    label="Show Online Status"
                    description="Display when you're online to friends"
                  />
                </div>

                {/* Data & Privacy */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-white">Data & Privacy</h3>
                  
                  <ToggleSwitch
                    checked={settings.dataSharing}
                    onChange={(checked) => setSettings(prev => ({ ...prev, dataSharing: checked }))}
                    label="Anonymous Data Sharing"
                    description="Help improve ParParty by sharing anonymous usage data"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:opacity-90"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>

                {/* Privacy Notice */}
                <div className="text-xs text-gray-400 text-center space-y-1 pt-2 border-t border-white/10">
                  <p>Your privacy is important to us. We never sell your data.</p>
                  <p>
                    <button className="text-cyan-400 hover:underline">
                      Learn more about our privacy policy
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}