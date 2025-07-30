import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QRScanner from '../QRScanner';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false)
  }
}));

vi.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: vi.fn()
  },
  CameraResultType: {
    DataUrl: 'dataUrl'
  },
  CameraSource: {
    Camera: 'camera'
  }
}));

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia
  },
  configurable: true
});

describe('QRScanner', () => {
  const mockOnScan = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render initial scan button', () => {
    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    expect(screen.getByText('Start Web Camera')).toBeInTheDocument();
    expect(screen.getByText('Scan a ParParty QR code to join a game')).toBeInTheDocument();
  });

  it('should show error message when provided', () => {
    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
      />
    );

    // Simulate clicking scan button to trigger an error
    fireEvent.click(screen.getByText('Start Web Camera'));

    // Mock getUserMedia to reject
    mockGetUserMedia.mockRejectedValueOnce(new Error('Camera access denied'));

    waitFor(() => {
      expect(screen.getByText(/Camera access denied/)).toBeInTheDocument();
    });
  });

  it('should handle web camera scanning', async () => {
    const mockStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }])
    };

    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
      />
    );

    fireEvent.click(screen.getByText('Start Web Camera'));

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: { facingMode: 'environment' }
      });
    });
  });

  it('should handle camera access denial', async () => {
    const cameraError = new Error('Camera access denied');
    mockGetUserMedia.mockRejectedValueOnce(cameraError);

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
      />
    );

    fireEvent.click(screen.getByText('Start Web Camera'));

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it('should show cancel button when scanning', async () => {
    const mockStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }])
    };

    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
      />
    );

    fireEvent.click(screen.getByText('Start Web Camera'));

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Point camera at QR code')).toBeInTheDocument();
    });
  });

  it('should handle cancel button click', async () => {
    const mockTrack = { stop: vi.fn() };
    const mockStream = {
      getTracks: vi.fn(() => [mockTrack])
    };

    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
      />
    );

    fireEvent.click(screen.getByText('Start Web Camera'));

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(mockTrack.stop).toHaveBeenCalled();
      expect(screen.getByText('Start Web Camera')).toBeInTheDocument();
    });
  });

  it('should handle fallback disabled', () => {
    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        fallbackToCamera={false}
      />
    );

    fireEvent.click(screen.getByText('Start Web Camera'));

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'QR scanning not supported on this platform'
      })
    );
  });

  it('should simulate QR code detection after timeout', async () => {
    vi.useFakeTimers();
    
    const mockStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }])
    };

    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
      />
    );

    fireEvent.click(screen.getByText('Start Web Camera'));

    await waitFor(() => {
      expect(screen.getByText('Point camera at QR code')).toBeInTheDocument();
    });

    // Fast-forward time to trigger simulated QR detection
    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(mockOnScan).toHaveBeenCalledWith('parparty://join?game=DEMO123');
    });

    vi.useRealTimers();
  });

  describe('Native platform behavior', () => {
    beforeEach(() => {
      vi.mocked(require('@capacitor/core').Capacitor.isNativePlatform).mockReturnValue(true);
    });

    it('should show native camera button for native platforms', () => {
      render(
        <QRScanner
          onScan={mockOnScan}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('Open Camera')).toBeInTheDocument();
    });

    it('should handle native camera scanning', async () => {
      const { Camera } = require('@capacitor/camera');
      Camera.getPhoto.mockResolvedValueOnce({
        dataUrl: 'data:image/jpeg;base64,mock-image-data'
      });

      render(
        <QRScanner
          onScan={mockOnScan}
          onError={mockOnError}
        />
      );

      fireEvent.click(screen.getByText('Open Camera'));

      await waitFor(() => {
        expect(Camera.getPhoto).toHaveBeenCalledWith({
          quality: 90,
          allowEditing: false,
          resultType: 'dataUrl',
          source: 'camera'
        });
      });

      // Wait for simulated QR decoding
      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith('parparty://join?game=DEMO123');
      }, { timeout: 2000 });
    });

    it('should handle native camera errors', async () => {
      const { Camera } = require('@capacitor/camera');
      const cameraError = new Error('Camera not available');
      Camera.getPhoto.mockRejectedValueOnce(cameraError);

      render(
        <QRScanner
          onScan={mockOnScan}
          onError={mockOnError}
        />
      );

      fireEvent.click(screen.getByText('Open Camera'));

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(cameraError);
      });
    });
  });
});