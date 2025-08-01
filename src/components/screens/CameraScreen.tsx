import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  X, 
  RotateCw, 
  Flashlight, 
  Download,
  Share2,
  MapPin,
  Trophy,
  Tag,
  Check,
  RotateCcw,
  Zap
} from 'lucide-react';

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: Date;
  holeNumber?: number;
  tags: string[];
  caption?: string;
}

interface CameraScreenProps {
  onClose: () => void;
  currentHole?: number;
}

export function CameraScreen({ onClose, currentHole }: CameraScreenProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('auto');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [showTagging, setShowTagging] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const availableTags = [
    { id: 'great-shot', label: 'Great Shot', icon: Trophy, color: 'text-yellow-400' },
    { id: 'birdie', label: 'Birdie', icon: Zap, color: 'text-green-400' },
    { id: 'eagle', label: 'Eagle', icon: Trophy, color: 'text-yellow-400' },
    { id: 'hole-in-one', label: 'Hole in One', icon: Trophy, color: 'text-purple-400' },
    { id: 'beautiful-course', label: 'Beautiful Course', icon: MapPin, color: 'text-blue-400' },
    { id: 'tough-hole', label: 'Tough Hole', icon: MapPin, color: 'text-red-400' },
    { id: 'with-friends', label: 'With Friends', icon: Tag, color: 'text-cyan-400' },
    { id: 'perfect-weather', label: 'Perfect Weather', icon: Tag, color: 'text-green-400' }
  ];

  const startCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      // Fallback for development/desktop
    }
  }, [cameraFacing]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Add flash effect
    setIsCapturing(true);
    setTimeout(() => setIsCapturing(false), 200);

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    const photo: CapturedPhoto = {
      id: Date.now().toString(),
      dataUrl,
      timestamp: new Date(),
      holeNumber: currentHole,
      tags: [],
      caption: ''
    };

    setCapturedPhoto(photo);
    setShowTagging(true);
    stopCamera();
  }, [currentHole, stopCamera]);

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setShowTagging(false);
    setSelectedTags([]);
    setCaption('');
    startCamera();
  };

  const savePhoto = () => {
    if (!capturedPhoto) return;

    const updatedPhoto = {
      ...capturedPhoto,
      tags: selectedTags,
      caption
    };

    // In a real app, you'd save this to your backend
    console.log('Saving photo:', updatedPhoto);

    // Create download link
    const link = document.createElement('a');
    link.download = `golf-photo-${updatedPhoto.timestamp.getTime()}.jpg`;
    link.href = updatedPhoto.dataUrl;
    link.click();

    onClose();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const flipCamera = () => {
    setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
    if (streamRef.current) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  };

  // Start camera when component mounts
  React.useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Camera flash overlay */}
      <AnimatePresence>
        {isCapturing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white z-10"
          />
        )}
      </AnimatePresence>

      {/* Camera View */}
      {!capturedPhoto && (
        <>
          {/* Video preview */}
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Hole indicator */}
            {currentHole && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-white text-sm font-medium">Hole {currentHole}</span>
              </div>
            )}

            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="border border-white/20" />
                ))}
              </div>
            </div>
          </div>

          {/* Camera Controls */}
          <div className="bg-black/80 backdrop-blur-sm p-6">
            {/* Top controls */}
            <div className="flex items-center justify-between mb-6">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="p-3 bg-white/10 rounded-full"
              >
                <X className="w-6 h-6 text-white" />
              </motion.button>

              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFlashMode(prev => 
                    prev === 'off' ? 'auto' : prev === 'auto' ? 'on' : 'off'
                  )}
                  className={`p-3 rounded-full ${
                    flashMode === 'on' ? 'bg-yellow-500/20 text-yellow-400' :
                    flashMode === 'auto' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-white/10 text-white'
                  }`}
                >
                  <Flashlight className="w-5 h-5" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={flipCamera}
                  className="p-3 bg-white/10 rounded-full"
                >
                  <RotateCw className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>

            {/* Capture button */}
            <div className="flex items-center justify-center">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={capturePhoto}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl"
              >
                <div className="w-16 h-16 bg-white border-4 border-gray-300 rounded-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-600" />
                </div>
              </motion.button>
            </div>
          </div>
        </>
      )}

      {/* Photo Preview & Tagging */}
      {capturedPhoto && (
        <div className="flex-1 flex flex-col">
          {/* Photo preview */}
          <div className="flex-1 relative">
            <img 
              src={capturedPhoto.dataUrl} 
              alt="Captured" 
              className="w-full h-full object-cover"
            />
            
            {/* Hole indicator */}
            {capturedPhoto.holeNumber && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-white text-sm font-medium">Hole {capturedPhoto.holeNumber}</span>
              </div>
            )}
          </div>

          {/* Tagging interface */}
          <AnimatePresence>
            {showTagging && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                className="bg-slate-900/95 backdrop-blur-xl p-6 max-h-96 overflow-y-auto"
              >
                {/* Caption input */}
                <div className="mb-4">
                  <label className="block text-white text-sm font-medium mb-2">Caption</label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                {/* Tags */}
                <div className="mb-6">
                  <label className="block text-white text-sm font-medium mb-3">Tags</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.id);
                      return (
                        <motion.button
                          key={tag.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleTag(tag.id)}
                          className={`flex items-center gap-2 p-3 rounded-xl transition-all ${
                            isSelected 
                              ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400' 
                              : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <tag.icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : tag.color}`} />
                          <span className="text-sm font-medium">{tag.label}</span>
                          {isSelected && <Check className="w-4 h-4 ml-auto" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={retakePhoto}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 border border-white/20 rounded-xl text-white"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retake
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={savePhoto}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Save & Share
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}