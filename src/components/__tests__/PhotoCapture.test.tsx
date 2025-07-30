import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import PhotoCapture from '@/components/PhotoCapture';
import type { Id } from '../../../convex/_generated/dataModel';

// Mock Capacitor camera
vi.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: vi.fn(),
  },
  CameraResultType: {
    DataUrl: 'dataUrl',
  },
  CameraSource: {
    Camera: 'camera',
  },
}));

// Mock Ionic platform detection
vi.mock('@ionic/react', () => ({
  isPlatform: vi.fn(),
}));

// Mock Convex client
const mockConvexClient = new ConvexReactClient('https://mock-url.convex.cloud');

// Mock data
const mockGameId = 'game123' as Id<"games">;
const mockPlayerId = 'player123' as Id<"players">;
const mockPhotoId = 'photo123' as Id<"photos">;

// Mock Convex hooks
vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react');
  return {
    ...actual,
    useMutation: vi.fn(),
  };
});

const mockUseMutation = vi.mocked((await import('convex/react')).useMutation);
const mockIsPlatform = vi.mocked((await import('@ionic/react')).isPlatform);
const mockCamera = vi.mocked((await import('@capacitor/camera')).Camera);

describe('PhotoCapture Component', () => {
  const mockOnPhotoShared = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockIsPlatform.mockReturnValue(false); // Default to web platform
    mockUseMutation.mockReturnValue(vi.fn().mockResolvedValue(mockPhotoId));
    
    // Mock getUserMedia for web camera
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
      writable: true,
    });
  });

  const renderPhotoCapture = (props = {}) => {
    const defaultProps = {
      gameId: mockGameId,
      playerId: mockPlayerId,
      holeNumber: 7,
      onPhotoShared: mockOnPhotoShared,
      onClose: mockOnClose,
    };

    return render(
      <ConvexProvider client={mockConvexClient}>
        <PhotoCapture {...defaultProps} {...props} />
      </ConvexProvider>
    );
  };

  it('renders initial capture interface', () => {
    renderPhotoCapture();

    expect(screen.getByText('Capture Moment')).toBeInTheDocument();
    expect(screen.getByText('Share a photo from hole 7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Take Photo/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload from Gallery/ })).toBeInTheDocument();
  });

  it('shows generic message when no hole number provided', () => {
    renderPhotoCapture({ holeNumber: undefined });

    expect(screen.getByText('Share a photo from your round')).toBeInTheDocument();
  });

  it('handles camera capture on mobile platform', async () => {
    mockIsPlatform.mockReturnValue(true);
    mockCamera.getPhoto.mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,test-image-data',
    });

    renderPhotoCapture();

    const takePhotoButton = screen.getByRole('button', { name: /Take Photo/ });
    fireEvent.click(takePhotoButton);

    await waitFor(() => {
      expect(mockCamera.getPhoto).toHaveBeenCalledWith({
        quality: 80,
        allowEditing: false,
        resultType: 'dataUrl',
        source: 'camera',
      });
    });
  });

  it('handles file upload from gallery', async () => {
    renderPhotoCapture();

    // Create a mock file
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      onload: null as any,
      result: 'data:image/jpeg;base64,test-image-data',
    };
    
    vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader as any);

    // Find the hidden file input
    const fileInput = screen.getByRole('button', { name: /Upload from Gallery/ })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    
    expect(fileInput).toBeInTheDocument();

    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    // Simulate FileReader onload
    mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test-image-data' } } as any);

    await waitFor(() => {
      expect(screen.getByText('Share Your Photo')).toBeInTheDocument();
      expect(screen.getByAltText('Captured')).toBeInTheDocument();
    });
  });

  it('shows photo preview after capture', async () => {
    mockIsPlatform.mockReturnValue(true);
    mockCamera.getPhoto.mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,test-image-data',
    });

    renderPhotoCapture();

    const takePhotoButton = screen.getByRole('button', { name: /Take Photo/ });
    fireEvent.click(takePhotoButton);

    await waitFor(() => {
      expect(screen.getByText('Share Your Photo')).toBeInTheDocument();
      expect(screen.getByAltText('Captured')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Add a caption (optional)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retake/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Share/ })).toBeInTheDocument();
    });
  });

  it('allows adding caption to photo', async () => {
    mockIsPlatform.mockReturnValue(true);
    mockCamera.getPhoto.mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,test-image-data',
    });

    renderPhotoCapture();

    // Capture photo
    const takePhotoButton = screen.getByRole('button', { name: /Take Photo/ });
    fireEvent.click(takePhotoButton);

    await waitFor(() => {
      const captionInput = screen.getByPlaceholderText('Add a caption (optional)');
      fireEvent.change(captionInput, { target: { value: 'Beautiful shot from the tee!' } });
      expect(captionInput).toHaveValue('Beautiful shot from the tee!');
    });
  });

  it('handles photo sharing with upload and social post creation', async () => {
    const mockUploadPhoto = vi.fn().mockResolvedValue(mockPhotoId);
    const mockCreatePhotoPost = vi.fn().mockResolvedValue('post123');
    
    mockUseMutation
      .mockReturnValueOnce(mockUploadPhoto)
      .mockReturnValueOnce(mockCreatePhotoPost);

    mockIsPlatform.mockReturnValue(true);
    mockCamera.getPhoto.mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,test-image-data',
    });

    renderPhotoCapture();

    // Capture photo
    const takePhotoButton = screen.getByRole('button', { name: /Take Photo/ });
    fireEvent.click(takePhotoButton);

    await waitFor(() => {
      // Add caption
      const captionInput = screen.getByPlaceholderText('Add a caption (optional)');
      fireEvent.change(captionInput, { target: { value: 'Great view!' } });

      // Share photo
      const shareButton = screen.getByRole('button', { name: /Share/ });
      fireEvent.click(shareButton);
    });

    await waitFor(() => {
      expect(mockUploadPhoto).toHaveBeenCalledWith({
        gameId: mockGameId,
        playerId: mockPlayerId,
        url: 'data:image/jpeg;base64,test-image-data',
        caption: 'Great view!',
        holeNumber: 7,
      });

      expect(mockCreatePhotoPost).toHaveBeenCalledWith({
        gameId: mockGameId,
        playerId: mockPlayerId,
        photoId: mockPhotoId,
        caption: 'Great view!',
      });

      expect(mockOnPhotoShared).toHaveBeenCalledWith(mockPhotoId);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('allows retaking photo', async () => {
    mockIsPlatform.mockReturnValue(true);
    mockCamera.getPhoto.mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,test-image-data',
    });

    renderPhotoCapture();

    // Capture photo
    const takePhotoButton = screen.getByRole('button', { name: /Take Photo/ });
    fireEvent.click(takePhotoButton);

    await waitFor(() => {
      // Click retake
      const retakeButton = screen.getByRole('button', { name: /Retake/ });
      fireEvent.click(retakeButton);

      // Should return to initial state
      expect(screen.getByText('Capture Moment')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Take Photo/ })).toBeInTheDocument();
    });
  });

  it('handles close button', () => {
    renderPhotoCapture();

    const closeButton = screen.getByRole('button').querySelector('[class*="X"]')?.parentElement;
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('shows loading state during photo sharing', async () => {
    const mockUploadPhoto = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockPhotoId), 100))
    );
    
    mockUseMutation.mockReturnValue(mockUploadPhoto);

    mockIsPlatform.mockReturnValue(true);
    mockCamera.getPhoto.mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,test-image-data',
    });

    renderPhotoCapture();

    // Capture photo
    const takePhotoButton = screen.getByRole('button', { name: /Take Photo/ });
    fireEvent.click(takePhotoButton);

    await waitFor(() => {
      const shareButton = screen.getByRole('button', { name: /Share/ });
      fireEvent.click(shareButton);

      // Should show loading spinner
      expect(shareButton.querySelector('[class*="animate-spin"]')).toBeInTheDocument();
      expect(shareButton).toBeDisabled();
    });
  });

  it('handles camera capture errors gracefully', async () => {
    mockIsPlatform.mockReturnValue(true);
    mockCamera.getPhoto.mockRejectedValue(new Error('Camera access denied'));

    // Mock alert
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderPhotoCapture();

    const takePhotoButton = screen.getByRole('button', { name: /Take Photo/ });
    fireEvent.click(takePhotoButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Failed to capture photo. Please try again.');
    });

    mockAlert.mockRestore();
  });

  it('handles photo sharing errors gracefully', async () => {
    const mockUploadPhoto = vi.fn().mockRejectedValue(new Error('Upload failed'));
    mockUseMutation.mockReturnValue(mockUploadPhoto);

    // Mock alert
    const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    mockIsPlatform.mockReturnValue(true);
    mockCamera.getPhoto.mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,test-image-data',
    });

    renderPhotoCapture();

    // Capture and try to share photo
    const takePhotoButton = screen.getByRole('button', { name: /Take Photo/ });
    fireEvent.click(takePhotoButton);

    await waitFor(() => {
      const shareButton = screen.getByRole('button', { name: /Share/ });
      fireEvent.click(shareButton);
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Failed to share photo. Please try again.');
    });

    mockAlert.mockRestore();
  });

  it('validates caption length', async () => {
    mockIsPlatform.mockReturnValue(true);
    mockCamera.getPhoto.mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,test-image-data',
    });

    renderPhotoCapture();

    // Capture photo
    const takePhotoButton = screen.getByRole('button', { name: /Take Photo/ });
    fireEvent.click(takePhotoButton);

    await waitFor(() => {
      const captionInput = screen.getByPlaceholderText('Add a caption (optional)');
      
      // Test max length
      expect(captionInput).toHaveAttribute('maxLength', '200');
    });
  });
});