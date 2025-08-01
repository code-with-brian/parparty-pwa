import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';


import { useGuestConversion } from '../contexts/AuthContext';
import { GuestSessionManager } from '../lib/GuestSessionManager';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface UserConversionProps {
  guestId: Id<"guests">;
  onConversionComplete?: () => void;
  onCancel?: () => void;
  showBenefits?: boolean;
}

export const UserConversion: React.FC<UserConversionProps> = ({
  guestId,
  onConversionComplete,
  onCancel,
  showBenefits = true,
}) => {
  const [step, setStep] = useState<'benefits' | 'form' | 'converting' | 'success'>('benefits');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { convertGuestToUser } = useGuestConversion();
  
  // Get guest conversion data
  const conversionData = useQuery(api.userConversion.getGuestConversionData, { guestId });
  const eligibility = useQuery(api.userConversion.checkConversionEligibility, { guestId });
  const benefits = useQuery(api.userConversion.previewAccountBenefits, {});

  // Pre-fill name from guest session if available
  useEffect(() => {
    if (conversionData?.guest?.name && !formData.name) {
      setFormData(prev => ({ ...prev, name: conversionData.guest.name || '' }));
    }
  }, [conversionData, formData.name]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConvert = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setStep('converting');

    try {
      await convertGuestToUser(
        guestId,
        formData.name.trim(),
        formData.email.trim() || undefined
      );

      setStep('success');
      
      // Call completion callback after a short delay
      setTimeout(() => {
        onConversionComplete?.();
      }, 2000);
    } catch (error) {
      console.error('Conversion failed:', error);
      setErrors({ general: 'Failed to create account. Please try again.' });
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  if (!eligibility?.eligible) {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <div className="text-center">
          <div className="text-4xl mb-4">⛳</div>
          <h3 className="text-lg font-semibold mb-2">Account Creation Locked</h3>
          <p className="text-gray-600 mb-4">{eligibility?.reason}</p>
          <Button onClick={onCancel} variant="outline">
            Continue Playing
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 'benefits' && showBenefits) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card className="p-6 mb-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Save Your Golf Journey!</h2>
            <p className="text-gray-600">{eligibility?.message}</p>
          </div>

          {conversionData && (
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-3">Your Golf Activity</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>Games Played:</span>
                  <Badge variant="secondary">{conversionData.summary.totalGames}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Scores Recorded:</span>
                  <Badge variant="secondary">{conversionData.summary.totalScores}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Photos Taken:</span>
                  <Badge variant="secondary">{conversionData.summary.totalPhotos}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Rewards Earned:</span>
                  <Badge variant="secondary">{conversionData.summary.totalRedemptions}</Badge>
                </div>
              </div>
            </div>
          )}

          {benefits && (
            <div className="mb-6">
              <h3 className="font-semibold mb-4">Account Benefits</h3>
              <div className="grid gap-3">
                {benefits.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-xl">{benefit.icon}</span>
                    <div>
                      <h4 className="font-medium">{benefit.title}</h4>
                      <p className="text-sm text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={() => setStep('form')} className="flex-1">
              Create My Account
            </Button>
            <Button onClick={onCancel} variant="outline">
              Maybe Later
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-3xl mb-3">⛳</div>
          <h2 className="text-xl font-bold mb-2">Create Your Account</h2>
          <p className="text-gray-600 text-sm">Join the ParParty community!</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name *
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your name"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email (optional)
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter your email"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            <p className="text-xs text-gray-500 mt-1">
              Optional: Get updates about your games and new features
            </p>
          </div>

          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleConvert} 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
            <Button onClick={() => setStep('benefits')} variant="outline">
              Back
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (step === 'converting') {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⛳</div>
          <h3 className="text-lg font-semibold mb-2">Creating Your Account</h3>
          <p className="text-gray-600">Saving your golf journey...</p>
        </div>
      </Card>
    );
  }

  if (step === 'success') {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <div className="text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold mb-2">Welcome to ParParty!</h3>
          <p className="text-gray-600 mb-4">
            Your account has been created and all your golf data has been saved.
          </p>
          <div className="bg-green-50 rounded-lg p-3 mb-4">
            <p className="text-green-800 text-sm">
              ✅ All your games, scores, and photos are now safely stored in your account
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return null;
};

export default UserConversion;