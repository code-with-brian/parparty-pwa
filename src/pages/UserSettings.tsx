import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  User as UserIcon, 
  Bell, 
  Shield, 
  Palette,
  HelpCircle,
  LogOut,
  Camera,
  Mail,
  Phone,
  MapPin,
  Save
} from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { notificationManager } from '@/utils/notificationManager';

type TabType = 'profile' | 'notifications' | 'account' | 'help';

export default function UserSettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, updateProfile, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: ''
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    gameUpdates: true,
    socialActivity: true,
    achievements: true,
    marketing: false,
    pushEnabled: false
  });

  React.useEffect(() => {
    // Check push notification permission status
    notificationManager.checkPermission().then(enabled => {
      setNotifications(prev => ({ ...prev, pushEnabled: enabled }));
    });
  }, []);

  if (!isAuthenticated || !user) {
    navigate('/');
    return null;
  }

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        name: formData.name,
        email: formData.email
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePushNotifications = async () => {
    if (!notifications.pushEnabled) {
      const granted = await notificationManager.requestPermission();
      setNotifications(prev => ({ ...prev, pushEnabled: granted }));
    } else {
      // In a real app, you'd disable push notifications on the server
      setNotifications(prev => ({ ...prev, pushEnabled: false }));
    }
  };

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: UserIcon },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
    { id: 'account' as TabType, label: 'Account', icon: Shield },
    { id: 'help' as TabType, label: 'Help', icon: HelpCircle }
  ];

  return (
    <MobileLayout
      header={
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </motion.button>
            <h1 className="text-lg font-light text-white">Settings</h1>
          </div>
        </div>
      }
    >
      <div className="p-4 pb-20">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Avatar Section */}
                <div className="flex items-center gap-4">
                  <Avatar
                    src={user.image}
                    name={user.name}
                    size="xl"
                    showBorder
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Change Photo
                  </Button>
                </div>

                {/* Form Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Name
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!isEditing}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditing}
                        className="bg-white/5 border-white/10 text-white pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="(555) 123-4567"
                        className="bg-white/5 border-white/10 text-white pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="City, State"
                        className="bg-white/5 border-white/10 text-white pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  {isEditing ? (
                    <>
                      <Button
                        onClick={() => setIsEditing(false)}
                        variant="outline"
                        className="flex-1 border-white/20 text-white hover:bg-white/10"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90"
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats Summary */}
            <Card className="glass border-white/10">
              <CardContent className="p-6">
                <h3 className="text-white font-medium mb-4">Golf Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-cyan-400">42</p>
                    <p className="text-xs text-gray-400">Games Played</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">78.5</p>
                    <p className="text-xs text-gray-400">Avg Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-400">3</p>
                    <p className="text-xs text-gray-400">Hole in Ones</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-400">15</p>
                    <p className="text-xs text-gray-400">Achievements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Push Notifications Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Push Notifications</p>
                      <p className="text-xs text-gray-400">Get alerts on your device</p>
                    </div>
                  </div>
                  <button
                    onClick={handleTogglePushNotifications}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notifications.pushEnabled ? 'bg-cyan-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        notifications.pushEnabled ? 'translate-x-6' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Notification Types */}
                <div className="space-y-3">
                  {[
                    { key: 'gameUpdates', label: 'Game Updates', desc: 'Score changes, game invites' },
                    { key: 'socialActivity', label: 'Social Activity', desc: 'Comments, reactions, mentions' },
                    { key: 'achievements', label: 'Achievements', desc: 'New badges and milestones' },
                    { key: 'marketing', label: 'Marketing', desc: 'Product updates and offers' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifications(prev => ({
                          ...prev,
                          [item.key]: !prev[item.key as keyof typeof notifications]
                        }))}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          notifications[item.key as keyof typeof notifications] ? 'bg-cyan-500' : 'bg-gray-600'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                            notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : ''
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <button className="w-full p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-white">Privacy Settings</p>
                          <p className="text-xs text-gray-400">Control who can see your activity</p>
                        </div>
                      </div>
                      <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                    </div>
                  </button>

                  <button className="w-full p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Palette className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-white">Appearance</p>
                          <p className="text-xs text-gray-400">Theme and display options</p>
                        </div>
                      </div>
                      <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                    </div>
                  </button>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <Button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    variant="outline"
                    className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-white/10">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400 text-center">
                  ParParty Golf v1.0.0 • Terms of Service • Privacy Policy
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Help Tab */}
        {activeTab === 'help' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Help & Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-400">
                  Get help with ParParty Golf or contact our support team.
                </p>
                <div className="space-y-3">
                  <button className="w-full p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
                    <p className="text-sm font-medium text-white">FAQ</p>
                    <p className="text-xs text-gray-400">Frequently asked questions</p>
                  </button>
                  <button className="w-full p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
                    <p className="text-sm font-medium text-white">Contact Support</p>
                    <p className="text-xs text-gray-400">Get help from our team</p>
                  </button>
                  <button className="w-full p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
                    <p className="text-sm font-medium text-white">Report a Bug</p>
                    <p className="text-xs text-gray-400">Help us improve the app</p>
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </MobileLayout>
  );
}