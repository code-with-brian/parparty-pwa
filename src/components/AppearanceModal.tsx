import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Palette, 
  Moon, 
  Sun, 
  Monitor,
  Zap,
  Eye,
  Volume2,
  VolumeX,
  Save,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/contexts/ToastContext';

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  animationLevel: 'none' | 'reduced' | 'full';
  soundEffects: boolean;
  compactMode: boolean;
  showAnimatedBackgrounds: boolean;
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
}

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Light theme' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Dark theme' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follow system' },
] as const;

const accentColors = [
  { name: 'Cyan', value: 'cyan', class: 'bg-cyan-500' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
  { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
  { name: 'Green', value: 'green', class: 'bg-green-500' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-500' },
  { name: 'Red', value: 'red', class: 'bg-red-500' },
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-500' },
];

const animationLevels = [
  { value: 'none', label: 'None', description: 'No animations' },
  { value: 'reduced', label: 'Reduced', description: 'Essential only' },
  { value: 'full', label: 'Full', description: 'All animations' },
] as const;

const fontSizes = [
  { value: 'small', label: 'Small', description: 'Compact text' },
  { value: 'medium', label: 'Medium', description: 'Default size' },
  { value: 'large', label: 'Large', description: 'Easier to read' },
] as const;

export function AppearanceModal({ isOpen, onClose }: AppearanceModalProps) {
  const { success, error } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<AppearanceSettings>({
    theme: 'dark',
    accentColor: 'cyan',
    animationLevel: 'full',
    soundEffects: true,
    compactMode: false,
    showAnimatedBackgrounds: true,
    fontSize: 'medium',
    highContrast: false,
  });

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // TODO: Implement actual appearance settings save
      // await updateAppearanceSettings(settings);
      
      // Apply theme changes immediately (for demo)
      if (settings.theme !== 'system') {
        document.documentElement.classList.toggle('dark', settings.theme === 'dark');
      }
      
      success('Appearance updated', 'Your theme preferences have been saved');
      onClose();
    } catch (saveError) {
      error('Failed to save settings', 'Please try again later');
      console.error('Failed to save appearance settings:', saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const ThemeSelector = () => (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-white">Theme</h3>
      <div className="grid grid-cols-3 gap-3">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => setSettings(prev => ({ ...prev, theme: option.value }))}
              className={`p-4 rounded-lg border text-center transition-all ${
                settings.theme === option.value
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : 'border-white/20 hover:border-white/40 text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">{option.label}</p>
              <p className="text-xs opacity-70">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const AccentColorSelector = () => (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-white">Accent Color</h3>
      <div className="grid grid-cols-4 gap-3">
        {accentColors.map((color) => (
          <button
            key={color.value}
            onClick={() => setSettings(prev => ({ ...prev, accentColor: color.value }))}
            className={`relative p-3 rounded-lg border transition-all ${
              settings.accentColor === color.value
                ? 'border-white/40 scale-105'
                : 'border-white/20 hover:border-white/30'
            }`}
          >
            <div className={`w-8 h-8 rounded-full mx-auto ${color.class}`} />
            <p className="text-xs text-white mt-1">{color.name}</p>
            {settings.accentColor === color.value && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-900 rounded-full" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const RadioGroup = ({ 
    options, 
    value, 
    onChange, 
    label 
  }: { 
    options: readonly { value: string; label: string; description: string }[];
    value: string;
    onChange: (value: any) => void;
    label: string;
  }) => (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-white">{label}</h3>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`w-full p-3 rounded-lg border text-left transition-all ${
              value === option.value
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-white/20 hover:border-white/30 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{option.label}</p>
                <p className="text-xs text-gray-400">{option.description}</p>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 ${
                value === option.value 
                  ? 'border-cyan-500 bg-cyan-500' 
                  : 'border-gray-400'
              }`}>
                {value === option.value && (
                  <div className="w-full h-full rounded-full bg-white scale-50" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const ToggleSwitch = ({ 
    checked, 
    onChange, 
    label, 
    description,
    icon: Icon
  }: { 
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description: string;
    icon?: any;
  }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
      <div className="flex items-center gap-3 flex-1">
        {Icon && <Icon className="w-5 h-5 text-gray-400" />}
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
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
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">Appearance</CardTitle>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <ThemeSelector />

                {/* Accent Color */}
                <AccentColorSelector />

                {/* Animation Level */}
                <RadioGroup
                  options={animationLevels}
                  value={settings.animationLevel}
                  onChange={(value) => setSettings(prev => ({ ...prev, animationLevel: value }))}
                  label="Animation Level"
                />

                {/* Font Size */}
                <RadioGroup
                  options={fontSizes}
                  value={settings.fontSize}
                  onChange={(value) => setSettings(prev => ({ ...prev, fontSize: value }))}
                  label="Font Size"
                />

                {/* Other Options */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-white">Additional Options</h3>
                  
                  <ToggleSwitch
                    checked={settings.soundEffects}
                    onChange={(checked) => setSettings(prev => ({ ...prev, soundEffects: checked }))}
                    label="Sound Effects"
                    description="Play sounds for actions and notifications"
                    icon={settings.soundEffects ? Volume2 : VolumeX}
                  />
                  
                  <ToggleSwitch
                    checked={settings.showAnimatedBackgrounds}
                    onChange={(checked) => setSettings(prev => ({ ...prev, showAnimatedBackgrounds: checked }))}
                    label="Animated Backgrounds"
                    description="Show dynamic background effects"
                    icon={Sparkles}
                  />
                  
                  <ToggleSwitch
                    checked={settings.compactMode}
                    onChange={(checked) => setSettings(prev => ({ ...prev, compactMode: checked }))}
                    label="Compact Mode"
                    description="Use tighter spacing for more content"
                    icon={Zap}
                  />
                  
                  <ToggleSwitch
                    checked={settings.highContrast}
                    onChange={(checked) => setSettings(prev => ({ ...prev, highContrast: checked }))}
                    label="High Contrast"
                    description="Increase contrast for better visibility"
                    icon={Eye}
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
                    className="flex-1 bg-gradient-to-r from-purple-500 to-blue-600 hover:opacity-90"
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

                {/* Preview Notice */}
                <div className="text-xs text-gray-400 text-center space-y-1 pt-2 border-t border-white/10">
                  <p>Changes will be applied immediately after saving</p>
                  <p>Some changes may require a page refresh</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}