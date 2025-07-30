/**
 * Generate a unique device ID for guest sessions
 */
export function generateDeviceId(): string {
  // Check if we already have a device ID stored
  const existingId = localStorage.getItem('parparty_device_id');
  if (existingId) {
    return existingId;
  }

  // Generate a new device ID
  const deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  localStorage.setItem('parparty_device_id', deviceId);
  return deviceId;
}

/**
 * Check if running on mobile device
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if running in Capacitor native app
 */
export function isNative(): boolean {
  return !!(window as any).Capacitor;
}