import { useState } from 'react';
import { Camera, Upload, X, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';  
import { useAuth } from '@/contexts/AuthContext';

import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isPlatform } from '@ionic/react';

interface PhotoCaptureProps {
  gameId: Id<"games">;
  playerId: Id<"players">;
  holeNumber?: number;
  onPhotoShared?: (photoId: Id<"photos">) => void;
  onClose?: () => void;
}

export default function PhotoCapture({ 
  gameId, 
  playerId, 
  holeNumber, 
  onPhotoShared, 
  onClose 
}: PhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Convex mutations
  const uploadPhoto = useMutation(api.photos.uploadPhoto);
  const createPhotoPost = useMutation(api.socialPosts.createPhotoPost);

  const handleCameraCapture = async () => {
    try {
      setIsCapturing(true);

      if (isPlatform('capacitor')) {
        // Use Capacitor camera on mobile
        const image = await CapacitorCamera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });

        if (image.dataUrl) {
          setCapturedImage(image.dataUrl);
        }
      } else {
        // Use web camera API as fallback
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        // Create video element to show camera feed
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        video.addEventListener('loadedmetadata', () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw current frame to canvas
          context?.drawImage(video, 0, 0);
          
          // Convert to data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setCapturedImage(dataUrl);
          
          // Stop camera stream
          stream.getTracks().forEach(track => track.stop());
        });
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      alert('Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const { isAuthenticated, promptSignUp } = useAuth();

  const handleSharePhoto = async () => {
    if (!capturedImage) return;

    if (!isAuthenticated) {
      promptSignUp('photo_share', () => {
        performPhotoShare();
      });
      return;
    }

    await performPhotoShare();
  };

  const performPhotoShare = async () => {
    try {
      setIsUploading(true);

      // For now, we'll use the data URL directly as the photo URL
      // In a production app, you would upload to a cloud storage service
      // and get back a permanent URL
      const photoUrl = capturedImage;

      // Upload photo to Convex
      const photoId = await uploadPhoto({
        gameId,
        playerId,
        url: photoUrl,
        caption: caption || undefined,
        holeNumber,
      });

      // Create social post for the photo
      await createPhotoPost({
        gameId,
        playerId,
        photoId,
        caption: caption || undefined,
      });

      // Notify parent component
      onPhotoShared?.(photoId);

      // Reset state
      setCapturedImage(null);
      setCaption('');
      onClose?.();
    } catch (error) {
      console.error('Error sharing photo:', error);
      alert('Failed to share photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCaption('');
  };

  if (capturedImage) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>Share Your Photo</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-64 object-cover rounded-lg"
            />
          </div>
          
          <Input
            placeholder="Add a caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
          />
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRetake}
              disabled={isUploading}
              className="flex-1"
            >
              Retake
            </Button>
            <Button
              onClick={handleSharePhoto}
              disabled={isUploading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isUploading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Capture Moment</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center text-gray-600 mb-4">
          {holeNumber ? `Share a photo from hole ${holeNumber}` : 'Share a photo from your round'}
        </div>
        
        <div className="space-y-3">
          <Button
            onClick={handleCameraCapture}
            disabled={isCapturing}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isCapturing ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            {isCapturing ? 'Opening Camera...' : 'Take Photo'}
          </Button>
          
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload from Gallery
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}