/**
 * Cloudflare Images integration utility
 * Provides fast, global image delivery with automatic optimization
 */

interface CloudflareImageUploadResponse {
  result: {
    id: string;
    filename: string;
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
  };
  success: boolean;
  errors: any[];
  messages: any[];
}

interface CloudflareImageOptions {
  requireSignedURLs?: boolean;
  metadata?: Record<string, any>;
}

export class CloudflareImageManager {
  private static readonly ACCOUNT_ID = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID;
  private static readonly ACCOUNT_HASH = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_HASH;
  private static readonly DELIVERY_URL = import.meta.env.VITE_CLOUDFLARE_IMAGE_DELIVERY_URL;
  private static readonly API_TOKEN = import.meta.env.CLOUDFLARE_API_TOKEN; // Server-side only

  /**
   * Generate optimized image URL for different variants
   */
  static getImageUrl(imageId: string, variant: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium'): string {
    if (!this.DELIVERY_URL || !this.ACCOUNT_HASH) {
      console.warn('Cloudflare Images not configured, falling back to placeholder');
      return `/api/placeholder/400/300`;
    }

    return `${this.DELIVERY_URL}/${imageId}/${variant}`;
  }

  /**
   * Get multiple variant URLs at once
   */
  static getImageVariants(imageId: string): Record<string, string> {
    return {
      thumbnail: this.getImageUrl(imageId, 'thumbnail'),
      medium: this.getImageUrl(imageId, 'medium'),
      large: this.getImageUrl(imageId, 'large'),
      original: this.getImageUrl(imageId, 'original'),
    };
  }

  /**
   * Upload image via server (Convex action)
   * This should be called from a Convex action with proper API token
   */
  static async uploadImage(
    file: File | Blob,
    options: CloudflareImageOptions = {}
  ): Promise<string | null> {
    try {
      // This would typically be handled by a Convex action
      // For now, return null to indicate server-side handling needed
      console.log('Image upload should be handled server-side via Convex action');
      return null;
    } catch (error) {
      console.error('Cloudflare image upload failed:', error);
      return null;
    }
  }

  /**
   * Delete image via server (Convex action)
   */
  static async deleteImage(imageId: string): Promise<boolean> {
    try {
      // This would typically be handled by a Convex action
      console.log('Image deletion should be handled server-side via Convex action');
      return false;
    } catch (error) {
      console.error('Cloudflare image deletion failed:', error);
      return false;
    }
  }

  /**
   * Check if Cloudflare Images is properly configured
   */
  static isConfigured(): boolean {
    return !!(this.ACCOUNT_ID && this.ACCOUNT_HASH && this.DELIVERY_URL);
  }

  /**
   * Get configuration status for debugging
   */
  static getConfigStatus() {
    return {
      accountId: !!this.ACCOUNT_ID,
      accountHash: !!this.ACCOUNT_HASH,
      deliveryUrl: !!this.DELIVERY_URL,
      configured: this.isConfigured(),
    };
  }
}

// Convenience functions
export const getCloudflareImageUrl = CloudflareImageManager.getImageUrl;
export const getCloudflareImageVariants = CloudflareImageManager.getImageVariants;
export const isCloudflareConfigured = CloudflareImageManager.isConfigured;

// Common image variants mapping
export const IMAGE_VARIANTS = {
  THUMBNAIL: 'thumbnail', // 150x150
  MEDIUM: 'medium',       // 400x400
  LARGE: 'large',         // 800x800
  ORIGINAL: 'original',   // Original size
} as const;

export type ImageVariant = typeof IMAGE_VARIANTS[keyof typeof IMAGE_VARIANTS];