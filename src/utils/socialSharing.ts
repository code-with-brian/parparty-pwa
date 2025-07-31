import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import QRCode from 'qrcode';

export interface ShareContent {
  title: string;
  text: string;
  url: string;
  image?: string;
}

export interface ShareOptions {
  platform?: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'whatsapp' | 'sms' | 'email' | 'copy';
  hashtags?: string[];
  via?: string;
}

export interface ShareResult {
  success: boolean;
  platform?: string;
  error?: string;
}

export class SocialSharingManager {
  private static readonly PLATFORM_URLS = {
    twitter: 'https://twitter.com/intent/tweet',
    facebook: 'https://www.facebook.com/sharer/sharer.php',
    linkedin: 'https://www.linkedin.com/sharing/share-offsite/',
    whatsapp: 'https://wa.me/',
    sms: 'sms:',
    email: 'mailto:',
  };

  /**
   * Share content using native sharing if available, fallback to web sharing
   */
  static async shareContent(content: ShareContent, options: ShareOptions = {}): Promise<ShareResult> {
    try {
      // If a specific platform is requested, use it
      if (options.platform && options.platform !== 'native') {
        return await this.shareToPlatform(content, options);
      }

      // Try native sharing first
      if (this.isNativeShareSupported() && (!options.platform || options.platform === 'native')) {
        return await this.shareNative(content);
      }

      // Fallback to copy to clipboard
      return await this.copyToClipboard(content.url);
    } catch (error) {
      console.error('Share failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Share game highlights with customized content
   */
  static async shareHighlights(
    gameId: string,
    playerName: string,
    narrative: string,
    stats: any,
    options: ShareOptions = {}
  ): Promise<ShareResult> {
    const shareUrl = `https://parparty.com/highlights/${gameId}`;
    const hashtags = ['#ParParty', '#Golf', '#GolfLife', ...(options.hashtags || [])];
    
    let shareText = `🏌️ Just finished an amazing round of golf! ${narrative.slice(0, 100)}...`;
    
    if (stats.bestScore) {
      shareText += ` Best hole: ${stats.bestScore} strokes!`;
    }
    
    if (options.platform === 'twitter') {
      shareText += ` ${hashtags.join(' ')}`;
      if (options.via) {
        shareText += ` via @${options.via}`;
      }
    }

    const content: ShareContent = {
      title: `${playerName}'s Golf Round`,
      text: shareText,
      url: shareUrl,
    };

    return this.shareContent(content, options);
  }

  /**
   * Share game moments and achievements
   */
  static async shareAchievement(
    achievement: string,
    gameId: string,
    playerName: string,
    options: ShareOptions = {}
  ): Promise<ShareResult> {
    const shareUrl = `https://parparty.com/game/${gameId}`;
    const hashtags = ['#ParParty', '#Golf', '#Achievement', ...(options.hashtags || [])];
    
    let shareText = `🏆 ${achievement}! Playing with ParParty makes every round memorable.`;
    
    if (options.platform === 'twitter') {
      shareText += ` ${hashtags.join(' ')}`;
    }

    const content: ShareContent = {
      title: `${playerName} achieved: ${achievement}`,
      text: shareText,
      url: shareUrl,
    };

    return this.shareContent(content, options);
  }

  /**
   * Generate and share viral QR code for game
   */
  static async shareGameQR(
    gameId: string,
    gameName: string,
    options: ShareOptions = {}
  ): Promise<ShareResult> {
    try {
      // Generate QR code
      const gameUrl = `https://parparty.com/join/${gameId}`;
      const qrDataUrl = await QRCode.toDataURL(gameUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const shareText = `🏌️ Join my golf game "${gameName}"! Scan this QR code or visit: ${gameUrl}`;
      
      const content: ShareContent = {
        title: `Join ${gameName} on ParParty`,
        text: shareText,
        url: gameUrl,
        image: qrDataUrl,
      };

      return this.shareContent(content, options);
    } catch (error) {
      console.error('QR share failed:', error);
      return {
        success: false,
        error: 'Failed to generate QR code'
      };
    }
  }

  /**
   * Create referral link with tracking
   */
  static generateReferralLink(gameId: string, referrerId: string): string {
    const baseUrl = `https://parparty.com/join/${gameId}`;
    const params = new URLSearchParams({
      ref: referrerId,
      utm_source: 'referral',
      utm_medium: 'social',
      utm_campaign: 'game_invite'
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Share referral invitation
   */
  static async shareReferral(
    gameId: string,
    gameName: string,
    referrerName: string,
    referrerId: string,
    options: ShareOptions = {}
  ): Promise<ShareResult> {
    const referralUrl = this.generateReferralLink(gameId, referrerId);
    
    const shareText = `🏌️ ${referrerName} invited you to join "${gameName}" on ParParty! Join the fun and track your round together.`;
    
    const content: ShareContent = {
      title: `Join ${gameName} with ${referrerName}`,
      text: shareText,
      url: referralUrl,
    };

    return this.shareContent(content, options);
  }

  /**
   * Check if native sharing is supported
   */
  private static isNativeShareSupported(): boolean {
    return 'share' in navigator && typeof navigator.share === 'function';
  }

  /**
   * Share using native Web Share API
   */
  private static async shareNative(content: ShareContent): Promise<ShareResult> {
    try {
      await navigator.share({
        title: content.title,
        text: content.text,
        url: content.url,
      });
      
      return { success: true, platform: 'native' };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Share cancelled by user' };
      }
      throw error;
    }
  }

  /**
   * Share to specific platform
   */
  private static async shareToPlatform(
    content: ShareContent,
    options: ShareOptions
  ): Promise<ShareResult> {
    const platform = options.platform!;
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        const twitterParams = new URLSearchParams({
          text: content.text,
          url: content.url,
        });
        if (options.hashtags?.length) {
          twitterParams.set('hashtags', options.hashtags.join(','));
        }
        if (options.via) {
          twitterParams.set('via', options.via);
        }
        shareUrl = `${this.PLATFORM_URLS.twitter}?${twitterParams.toString()}`;
        break;

      case 'facebook':
        const fbParams = new URLSearchParams({
          u: content.url,
          quote: content.text,
        });
        shareUrl = `${this.PLATFORM_URLS.facebook}?${fbParams.toString()}`;
        break;

      case 'linkedin':
        const linkedinParams = new URLSearchParams({
          url: content.url,
          title: content.title,
          summary: content.text,
        });
        shareUrl = `${this.PLATFORM_URLS.linkedin}?${linkedinParams.toString()}`;
        break;

      case 'whatsapp':
        const whatsappText = `${content.text} ${content.url}`;
        shareUrl = `${this.PLATFORM_URLS.whatsapp}?text=${encodeURIComponent(whatsappText)}`;
        break;

      case 'sms':
        const smsText = `${content.text} ${content.url}`;
        shareUrl = `${this.PLATFORM_URLS.sms}?body=${encodeURIComponent(smsText)}`;
        break;

      case 'email':
        const emailParams = new URLSearchParams({
          subject: content.title,
          body: `${content.text}\n\n${content.url}`,
        });
        shareUrl = `${this.PLATFORM_URLS.email}?${emailParams.toString()}`;
        break;

      case 'copy':
        return this.copyToClipboard(content.url);

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Open share URL
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: shareUrl });
    } else {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }

    return { success: true, platform };
  }

  /**
   * Copy content to clipboard
   */
  private static async copyToClipboard(text: string): Promise<ShareResult> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      
      return { success: true, platform: 'clipboard' };
    } catch (error) {
      throw new Error('Failed to copy to clipboard');
    }
  }

  /**
   * Get available sharing platforms
   */
  static getAvailablePlatforms(): string[] {
    const platforms = ['copy', 'email', 'sms'];
    
    if (this.isNativeShareSupported()) {
      platforms.unshift('native');
    }
    
    // Add social platforms (always available via web)
    platforms.push('twitter', 'facebook', 'linkedin', 'whatsapp');
    
    return platforms;
  }

  /**
   * Get platform display info
   */
  static getPlatformInfo(platform: string): { name: string; icon: string; color: string } {
    const platformInfo: Record<string, { name: string; icon: string; color: string }> = {
      native: { name: 'Share', icon: '📤', color: 'bg-blue-500' },
      twitter: { name: 'Twitter', icon: '🐦', color: 'bg-blue-400' },
      facebook: { name: 'Facebook', icon: '📘', color: 'bg-blue-600' },
      linkedin: { name: 'LinkedIn', icon: '💼', color: 'bg-blue-700' },
      whatsapp: { name: 'WhatsApp', icon: '💬', color: 'bg-green-500' },
      sms: { name: 'SMS', icon: '💬', color: 'bg-green-600' },
      email: { name: 'Email', icon: '📧', color: 'bg-gray-600' },
      copy: { name: 'Copy Link', icon: '📋', color: 'bg-gray-500' },
    };
    
    return platformInfo[platform] || { name: platform, icon: '🔗', color: 'bg-gray-400' };
  }
}

// Export types explicitly for better module resolution
export type { ShareContent, ShareOptions, ShareResult };