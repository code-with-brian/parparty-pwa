import React, { useState } from 'react';
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

  const content = conversionContent[trigger];
  const Icon = content.icon;

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
      // In a real implementation, you'd integrate with actual social auth
      await onSignUp({
        name: `${method} User`,
        method
      });
      
      onExecuteAction();
      onClose();
    } catch (error) {
      console.error('Social sign up failed:', error);
      setStep('signup');
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
          <CardHeader className="text-center pb-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
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

                  <Button
                    onClick={() => handleSocialSignUp('apple')}
                    className="w-full h-12 bg-black text-white hover:bg-gray-900 font-medium"
                    disabled={isSubmitting}
                  >
                    <svg className="w-5 h-5 mr-3 fill-current" viewBox="0 0 24 24">
                      <path d="M12.017 0C8.396 0 8.025.044 6.825.156 5.623.268 4.808.62 4.088 1.026c-.72.405-1.334.954-1.746 1.619C1.926 3.31 1.574 4.125 1.462 5.327 1.35 6.527 1.306 6.898 1.306 10.519s.044 3.992.156 5.192c.112 1.202.464 2.017.926 2.682.412.665 1.026 1.214 1.746 1.619.72.406 1.535.758 2.737.87 1.2.112 1.571.156 5.192.156s3.992-.044 5.192-.156c1.202-.112 2.017-.464 2.682-.926.665-.412 1.214-1.026 1.619-1.746.406-.72.758-1.535.87-2.737.112-1.2.156-1.571.156-5.192s-.044-3.992-.156-5.192c-.112-1.202-.464-2.017-.926-2.682-.412-.665-1.026-1.214-1.746-1.619C16.983.614 16.168.262 14.966.15 13.766.038 13.395-.006 9.774-.006S5.782.038 4.582.15c-1.202.112-2.017.464-2.682.926-.665.412-1.214 1.026-1.619 1.746-.406.72-.758 1.535-.87 2.737C-.006 6.753-.05 7.124-.05 10.745s.044 3.992.156 5.192c.112 1.202.464 2.017.926 2.682.412.665 1.026 1.214 1.746 1.619.72.406 1.535.758 2.737.87 1.2.112 1.571.156 5.192.156s3.992-.044 5.192-.156c1.202-.112 2.017-.464 2.682-.926.665-.412 1.214-1.026 1.619-1.746.406-.72.758-1.535.87-2.737.112-1.2.156-1.571.156-5.192s-.044-3.992-.156-5.192c-.112-1.202-.464-2.017-.926-2.682-.412-.665-1.026-1.214-1.746-1.619C16.208.614 15.393.262 14.191.15 12.991.038 12.62-.006 9-.006z"/>
                    </svg>
                    Continue with Apple
                  </Button>

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