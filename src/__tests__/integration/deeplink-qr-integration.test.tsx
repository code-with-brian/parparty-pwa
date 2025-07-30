import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import JoinGame from '../../pages/JoinGame';
import { DeepLinkHandler } from '../../utils/deepLink';

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

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ gameId: 'TEST123' })
  };
});

describe('Deep Link and QR Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockClear();
    mockNavigate.mockClear();
  });

  it('should validate game ID from URL params', () => {
    render(
      <BrowserRouter>
        <JoinGame />
      </BrowserRouter>
    );

    expect(screen.getByText('Game ID:')).toBeInTheDocument();
    expect(screen.getByText('TEST123')).toBeInTheDocument();
    expect(screen.getByText('Join Game')).toBeInTheDocument();
  });

  it('should show QR scanner when scan button is clicked', async () => {
    render(
      <BrowserRouter>
        <JoinGame />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Scan Different QR Code'));

    await waitFor(() => {
      expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
      expect(screen.getByText('Start Web Camera')).toBeInTheDocument();
    });
  });

  it('should handle deep link parsing correctly', () => {
    const testCases = [
      {
        url: 'parparty://join?game=ABC123',
        expected: { gameId: 'ABC123', action: 'join' }
      },
      {
        url: 'https://parparty.com/join/XYZ789',
        expected: { gameId: 'XYZ789', action: 'join' }
      },
      {
        url: 'invalid-url',
        expected: null
      }
    ];

    testCases.forEach(({ url, expected }) => {
      const result = DeepLinkHandler.parseGameLink(url);
      expect(result).toEqual(expected);
    });
  });

  it('should validate QR data correctly', () => {
    const validQR = 'parparty://join?game=VALID123';
    const result = DeepLinkHandler.validateQRData(validQR);
    
    expect(result).toEqual({
      gameId: 'VALID123',
      action: 'join'
    });
  });

  it('should reject invalid QR data', () => {
    const invalidQRs = [
      'invalid-qr',
      'parparty://join?game=invalid-id',
      'parparty://leave?game=ABC123'
    ];

    invalidQRs.forEach(qr => {
      expect(() => {
        DeepLinkHandler.validateQRData(qr);
      }).toThrow();
    });
  });

  it('should generate correct share links', () => {
    const gameId = 'SHARE123';
    const link = DeepLinkHandler.generateGameLink(gameId);
    
    // Should generate web link for non-native platform
    expect(link).toBe('https://parparty.com/join/SHARE123');
  });

  it('should detect deep link support correctly', () => {
    // With mediaDevices available
    expect(DeepLinkHandler.isDeepLinkSupported()).toBe(true);
    
    // Without mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true
    });
    
    expect(DeepLinkHandler.isDeepLinkSupported()).toBe(false);
    
    // Restore for other tests
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia
      },
      configurable: true
    });
  });

  it('should show error for invalid game ID format', () => {
    // Mock useParams to return invalid game ID
    vi.mocked(require('react-router-dom').useParams).mockReturnValue({ 
      gameId: 'invalid-id' 
    });

    render(
      <BrowserRouter>
        <JoinGame />
      </BrowserRouter>
    );

    expect(screen.getByText(/Invalid game ID format/)).toBeInTheDocument();
    expect(screen.getByText('Invalid game ID format')).toBeInTheDocument();
  });

  it('should show deep link support status', () => {
    render(
      <BrowserRouter>
        <JoinGame />
      </BrowserRouter>
    );

    expect(screen.getByText(/Deep link support:/)).toBeInTheDocument();
    expect(screen.getByText(/Share link:/)).toBeInTheDocument();
  });
});