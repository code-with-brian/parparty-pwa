import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError: (error: Error) => void;
  fallbackToCamera?: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onError,
  fallbackToCamera = true
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isNative = Capacitor.isNativePlatform();

  // Cleanup function for web camera
  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return cleanup;
  }, []);

  // Native QR scanning using Capacitor Camera
  const scanWithNativeCamera = async () => {
    try {
      setIsScanning(true);
      setError(null);

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        // In a real implementation, you'd use a QR code library to decode the image
        // For now, we'll simulate QR code detection
        const qrData = await decodeQRFromImage(image.dataUrl);
        if (qrData) {
          onScan(qrData);
        } else {
          throw new Error('No QR code found in image');
        }
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onError(error);
    } finally {
      setIsScanning(false);
    }
  };

  // Web camera fallback for PWA users
  const scanWithWebCamera = async () => {
    try {
      setIsScanning(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Start QR code detection
        startQRDetection();
      }
    } catch (err) {
      const error = err as Error;
      setError('Camera access denied or not available');
      onError(error);
      setIsScanning(false);
    }
  };

  // Simulate QR code detection from web camera
  const startQRDetection = () => {
    const detectQR = () => {
      if (!videoRef.current || !canvasRef.current || !isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // In a real implementation, you'd use a QR code detection library here
      // For now, we'll simulate detection after a few seconds
      setTimeout(() => {
        if (isScanning) {
          // Simulate finding a QR code
          const simulatedQR = 'parparty://join?game=DEMO123';
          cleanup();
          onScan(simulatedQR);
        }
      }, 3000);
    };

    const interval = setInterval(detectQR, 100);
    
    // Cleanup interval when component unmounts or scanning stops
    setTimeout(() => {
      clearInterval(interval);
    }, 10000);
  };

  // Simulate QR code decoding from image
  const decodeQRFromImage = async (dataUrl: string): Promise<string | null> => {
    // In a real implementation, you'd use a QR code library like jsQR
    // For now, we'll simulate successful detection
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('parparty://join?game=DEMO123');
      }, 1000);
    });
  };

  const handleScan = () => {
    if (isNative) {
      scanWithNativeCamera();
    } else if (fallbackToCamera) {
      scanWithWebCamera();
    } else {
      onError(new Error('QR scanning not supported on this platform'));
    }
  };

  const handleStop = () => {
    cleanup();
    setError(null);
  };

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold">Scan QR Code</h3>
        
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        {!isScanning ? (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Scan a ParParty QR code to join a game
            </p>
            <Button onClick={handleScan} className="w-full">
              {isNative ? 'Open Camera' : 'Start Web Camera'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {!isNative && (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-blue-500"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-blue-500"></div>
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-blue-500"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-blue-500"></div>
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-600">
              {isNative ? 'Processing image...' : 'Point camera at QR code'}
            </p>
            
            <Button onClick={handleStop} variant="outline" className="w-full">
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default QRScanner;