import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Download, Share2, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import QRCode from 'qrcode';
import { SocialSharingManager } from '../utils/socialSharing';
import toast from 'react-hot-toast';

interface ViralQRGeneratorProps {
  gameId: string;
  gameName: string;
  playerName?: string;
  customBranding?: {
    logo?: string;
    colors?: {
      primary: string;
      secondary: string;
    };
    text?: string;
  };
  onShare?: (platform: string) => void;
  className?: string;
}

const ViralQRGenerator: React.FC<ViralQRGeneratorProps> = ({
  gameId,
  gameName,
  playerName,
  customBranding,
  onShare,
  className = "",
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareCount, setShareCount] = useState(0);

  const gameUrl = `https://parparty.com/join/${gameId}`;

  useEffect(() => {
    generateQRCode();
  }, [gameId, customBranding]);

  const generateQRCode = async () => {
    setIsGenerating(true);
    try {
      const options = {
        width: 300,
        margin: 2,
        color: {
          dark: customBranding?.colors?.primary || '#000000',
          light: customBranding?.colors?.secondary || '#FFFFFF'
        },
        errorCorrectionLevel: 'M' as const,
      };

      const dataUrl = await QRCode.toDataURL(gameUrl, options);
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      toast.success('Game link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `parparty-${gameId}-qr.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('QR code downloaded!');
  };

  const handleShare = async (platform: string) => {
    try {
      const result = await SocialSharingManager.shareGameQR(
        gameId,
        gameName,
        { platform: platform as any }
      );

      if (result.success) {
        setShareCount(prev => prev + 1);
        onShare?.(platform);
        
        if (platform === 'copy') {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Failed to share');
    }
  };

  const shareText = playerName 
    ? `🏌️ ${playerName} invited you to join "${gameName}" on ParParty!`
    : `🏌️ Join "${gameName}" on ParParty!`;

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <Card className="p-6">
        <div className="text-center space-y-4">
          {/* Header */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            <QrCode className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold">Invite Players</h3>
          </div>

          {/* Game Info */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-900">{gameName}</h4>
            {playerName && (
              <p className="text-sm text-gray-600">Hosted by {playerName}</p>
            )}
          </div>

          {/* QR Code */}
          <div className="relative">
            {isGenerating ? (
              <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Generating QR code...</p>
                </div>
              </div>
            ) : qrDataUrl ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                <img
                  src={qrDataUrl}
                  alt="Game QR Code"
                  className="w-64 h-64 mx-auto rounded-lg shadow-lg"
                />
                
                {/* Custom branding overlay */}
                {customBranding?.logo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white p-2 rounded-lg shadow-md">
                      <img
                        src={customBranding.logo}
                        alt="Logo"
                        className="w-8 h-8"
                      />
                    </div>
                  </div>
                )}
                
                {/* Share count badge */}
                {shareCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 bg-green-100 text-green-800"
                  >
                    {shareCount} shares
                  </Badge>
                )}
              </motion.div>
            ) : (
              <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Failed to generate QR code</p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600 space-y-1">
            <p>📱 <strong>Scan to join instantly</strong></p>
            <p>🔗 Or share the link below</p>
          </div>

          {/* Link */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 truncate font-mono">
              {gameUrl}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="flex items-center space-x-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </Button>
              
              <Button
                onClick={handleDownloadQR}
                variant="outline"
                disabled={!qrDataUrl}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </Button>
            </div>

            {/* Share Button */}
            <Button
              onClick={() => handleShare('native')}
              className="w-full flex items-center space-x-2 bg-green-600 hover:bg-green-700"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Game</span>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <span>🏌️ Easy to join</span>
              <span>📱 No app required</span>
              <span>🎉 More fun together</span>
            </div>
          </div>

          {/* Custom branding text */}
          {customBranding?.text && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                {customBranding.text}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ViralQRGenerator;