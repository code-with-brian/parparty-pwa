import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { logger } from '@/utils/logger';

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    position: { lat: number; lng: number };
    title?: string;
    info?: string;
    icon?: string | {
      url: string;
      scaledSize?: { width: number; height: number };
    };
  }>;
  onMapClick?: (event: google.maps.MapMouseEvent) => void;
  onMarkerClick?: (marker: any, index: number) => void;
  className?: string;
  style?: React.CSSProperties;
  mapTypeId?: google.maps.MapTypeId;
  gestureHandling?: 'cooperative' | 'greedy' | 'none' | 'auto';
  disableDefaultUI?: boolean;
  zoomControl?: boolean;
  mapTypeControl?: boolean;
  scaleControl?: boolean;
  streetViewControl?: boolean;
  rotateControl?: boolean;
  fullscreenControl?: boolean;
}

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 }; // Center of USA
const DEFAULT_ZOOM = 10;

export const GoogleMap: React.FC<GoogleMapProps> = ({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  markers = [],
  onMapClick,
  onMarkerClick,
  className = '',
  style = { width: '100%', height: '400px' },
  mapTypeId = 'roadmap' as any,
  gestureHandling = 'auto',
  disableDefaultUI = false,
  zoomControl = true,
  mapTypeControl = true,
  scaleControl = true,
  streetViewControl = true,
  rotateControl = true,
  fullscreenControl = true,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('Google Maps API key not found');
        }

        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places', 'geometry'],
        });

        await loader.load();
        setIsLoaded(true);

        if (mapRef.current) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center,
            zoom,
            mapTypeId,
            gestureHandling,
            disableDefaultUI,
            zoomControl,
            mapTypeControl,
            scaleControl,
            streetViewControl,
            rotateControl,
            fullscreenControl,
          });

          setMap(mapInstance);

          // Add click listener
          if (onMapClick) {
            mapInstance.addListener('click', onMapClick);
          }

          logger.info('Google Map initialized successfully', {
            component: 'GoogleMap',
            center,
            zoom,
            markersCount: markers.length,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load Google Maps';
        setError(errorMessage);
        logger.error('Failed to initialize Google Map', err as Error, {
          component: 'GoogleMap',
          center,
          zoom,
        });
      }
    };

    initializeMap();
  }, [center.lat, center.lng, zoom, mapTypeId, gestureHandling]);

  // Update markers when props change
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    markers.forEach((markerData, index) => {
      let icon: any = markerData.icon;
      
      // Convert icon object to Google Maps icon format
      if (icon && typeof icon === 'object' && icon.scaledSize) {
        icon = {
          url: icon.url,
          scaledSize: new google.maps.Size(icon.scaledSize.width, icon.scaledSize.height),
        };
      }
      
      const marker = new google.maps.Marker({
        position: markerData.position,
        map,
        title: markerData.title,
        icon: icon,
      });

      // Add info window if info is provided
      if (markerData.info) {
        const infoWindow = new google.maps.InfoWindow({
          content: markerData.info,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
          onMarkerClick?.(marker, index);
        });
      } else if (onMarkerClick) {
        marker.addListener('click', () => {
          onMarkerClick(marker, index);
        });
      }

      markersRef.current.push(marker);
    });
  }, [map, markers, onMarkerClick]);

  // Update map center and zoom when props change
  useEffect(() => {
    if (map) {
      map.setCenter(center);
      map.setZoom(zoom);
    }
  }, [map, center.lat, center.lng, zoom]);

  if (error) {
    return (
      <div 
        className={`bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center ${className}`}
        style={style}
      >
        <div className="text-center p-4">
          <div className="text-red-600 font-medium mb-2">Map Error</div>
          <div className="text-gray-600 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={mapRef}
        style={style}
        className="rounded-lg overflow-hidden"
      />
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center"
          style={style}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
            <div className="text-gray-600">Loading Map...</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Hook for programmatic map interactions
export const useGoogleMap = () => {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const panTo = (location: { lat: number; lng: number }) => {
    if (map) {
      map.panTo(location);
    }
  };

  const setZoom = (zoom: number) => {
    if (map) {
      map.setZoom(zoom);
    }
  };

  const fitBounds = (bounds: google.maps.LatLngBounds) => {
    if (map) {
      map.fitBounds(bounds);
    }
  };

  const addMarker = (options: google.maps.MarkerOptions) => {
    if (map) {
      return new google.maps.Marker({
        ...options,
        map,
      });
    }
    return null;
  };

  return {
    map,
    setMap,
    panTo,
    setZoom,
    fitBounds,
    addMarker,
  };
};

export default GoogleMap;