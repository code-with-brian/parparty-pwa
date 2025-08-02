import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Camera, 
  Trophy, 
  Heart, 
  MessageCircle, 
  User, 
  Mail, 
  Phone,
  X,
  Zap
} from 'lucide-react';
import { appleAuth } from '@/utils/appleAuth';
import { googleAuth } from '@/utils/googleAuth';

interface ConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: 'photo_share' | 'achievement' | 'reaction' | 'comment' | 'post';
  onSignUp: (userData: SignUpData) => Promise<void>;
  onExecuteAction: () => void;
}

interface SignUpData {
  name: string;
  email?: string;
  phone?: string;
  method: 'google' | 'apple' | 'form';
}

const conversionContent = {
  photo_share: {
    icon: Camera,
    title: "Share This Epic Shot!",
    subtitle: "Join thousands of golfers sharing their best moments",
    cta: "Share Photo",
    motivation: "Your incredible shot deserves to be seen!"
  },
  achievement: {
    icon: Trophy,
    title: "Celebrate This Achievement!",
    subtitle: "Let the community know about your amazing play",
    cta: "Share Achievement", 
    motivation: "This moment is too good not to share!"
  },
  reaction: {
    icon: Heart,
    title: "Join the Conversation!",
    subtitle: "React and connect with fellow golfers",
    cta: "Add Reaction",
    motivation: "Show your support for great golf!"
  },
  comment: {
    icon: MessageCircle,
    title: "Add Your Voice!",
    subtitle: "Share your thoughts with the golf community",
    cta: "Post Comment",
    motivation: "Your insights matter to fellow golfers!"
  },
  post: {
    icon: Zap,
    title: "Share Your Golf Story!",
    subtitle: "Connect with golfers around the world",
    cta: "Create Post",
    motivation: "Join the conversation and inspire others!"
  }
};

export function SmartConversionModal({ 
  isOpen, 
  onClose, 
  trigger, 
  onSignUp, 
  onExecuteAction 
}: ConversionModalProps) {
  const [step, setStep] = useState<'motivation' | 'signup' | 'loading'>('motivation');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isGoogleAvailable, setIsGoogleAvailable] = useState(false);

  const content = conversionContent[trigger];
  const Icon = content.icon;

  // Check social sign-in availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const [appleAvailable, googleAvailable] = await Promise.all([
          appleAuth.isAvailable(),
          googleAuth.isAvailable()
        ]);
        setIsAppleAvailable(appleAvailable);
        setIsGoogleAvailable(googleAvailable);
      } catch (error) {
        console.error('Error checking social auth availability:', error);
        setIsAppleAvailable(false);
        setIsGoogleAvailable(false);
      }
    };

    if (isOpen) {
      checkAvailability();
    }
  }, [isOpen]);

  const handleFormSignUp = async () => {
    if (!formData.name.trim()) return;
    
    setIsSubmitting(true);
    setStep('loading');
    
    try {
      await onSignUp({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        method: 'form'
      });
      
      // Execute the original action immediately
      onExecuteAction();
      onClose();
    } catch (error) {
      console.error('Sign up failed:', error);
      setStep('signup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialSignUp = async (method: 'google' | 'apple') => {
    setIsSubmitting(true);
    setStep('loading');
    
    try {
      if (method === 'apple') {
        // Use real Apple authentication
        const result = await appleAuth.authenticate();
        
        if (result.success && result.user) {
          await onSignUp({
            name: result.user.name,
            email: result.user.email,
            method: 'apple'
          });
          
          onExecuteAction();
          onClose();
          return;
        } else {
          throw new Error(result.error || 'Apple Sign-In failed');
        }
      } else if (method === 'google') {
        // Use real Google authentication
        const result = await googleAuth.authenticate();
        
        if (result.success && result.user) {
          await onSignUp({
            name: result.user.name,
            email: result.user.email,
            method: 'google'
          });
          
          onExecuteAction();
          onClose();
          return;
        } else {
          throw new Error(result.error || 'Google Sign-In failed');
        }
      }
    } catch (error: any) {
      console.error('Social sign up failed:', error);
      
      // Don't show error for user cancellation
      if (error.message?.includes('cancelled') || error.message?.includes('USER_CANCELLED')) {
        setStep('motivation');
      } else {
        // Show error and return to signup
        alert(`Sign-in failed: ${error.message || 'Unknown error'}`);
        setStep('motivation');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardHeader className="relative text-center pb-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
            
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <Icon className="w-8 h-8 text-white" />
            </div>
            
            <CardTitle className="text-xl font-bold text-gray-900">
              {content.title}
            </CardTitle>
            <p className="text-gray-600">
              {content.subtitle}
            </p>
          </CardHeader>

          <CardContent>
            {step === 'motivation' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <p className="text-sm text-green-600 font-medium mb-4">
                    {content.motivation}
                  </p>
                </div>

                <div className="space-y-3">
                  {isGoogleAvailable && (
                    <Button
                      onClick={() => handleSocialSignUp('google')}
                      className="w-full h-12 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                      disabled={isSubmitting}
                    >
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </Button>
                  )}

                  {isAppleAvailable && (
                    <Button
                      onClick={() => handleSocialSignUp('apple')}
                      className="w-full h-12 bg-black text-white hover:bg-gray-900 font-medium"
                      disabled={isSubmitting}
                    >
                      <svg className="w-5 h-5 mr-3 fill-current" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      Continue with Apple
                    </Button>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">or</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setStep('signup')}
                    variant="outline"
                    className="w-full h-12 font-medium"
                    disabled={isSubmitting}
                  >
                    Quick Sign Up
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'signup' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Your name"
                        className="pl-10 h-12"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email (optional)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10 h-12"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone (optional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        type="tel"
                        placeholder="(555) 123-4567"
                        className="pl-10 h-12"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setStep('motivation')}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleFormSignUp}
                    disabled={!formData.name.trim() || isSubmitting}
                    className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                  >
                    {content.cta}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'loading' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="w-12 h-12 mx-auto mb-4 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
                <p className="text-gray-600">Setting up your account...</p>
                <p className="text-sm text-gray-500 mt-2">This will just take a moment!</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}