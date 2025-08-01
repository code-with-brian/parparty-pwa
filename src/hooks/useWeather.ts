import { useState, useEffect, useCallback } from 'react';
import { weatherService } from '@/utils/weatherService';
import type { WeatherData } from '@/types/weather';
import { logger } from '@/utils/logger';

interface UseWeatherOptions {
  autoUpdate?: boolean;
  updateInterval?: number; // minutes
  enableGeolocation?: boolean;
}

interface UseWeatherReturn {
  weatherData: WeatherData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook to fetch and manage weather data
 */
export const useWeather = (
  golfCourseName?: string,
  coordinates?: { lat: number; lng: number },
  options: UseWeatherOptions = {}
): UseWeatherReturn => {
  const {
    autoUpdate = true,
    updateInterval = 10, // 10 minutes default
    enableGeolocation = true,
  } = options;

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's current location if enabled
  useEffect(() => {
    if (enableGeolocation && !coordinates && typeof navigator !== 'undefined') {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          
          logger.info('User location obtained for weather', {
            component: 'useWeather',
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
          });
        },
        (err) => {
          logger.warn('Failed to get user location for weather', {
            component: 'useWeather',
            error: err.message,
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 600000, // 10 minutes
        }
      );
    }
  }, [enableGeolocation, coordinates]);

  // Fetch weather data
  const fetchWeather = useCallback(async () => {
    if (!golfCourseName && !coordinates && !userLocation) {
      logger.debug('No location data available for weather fetch', {
        component: 'useWeather',
        golfCourseName,
        coordinates,
        userLocation,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let weather: WeatherData;

      if (coordinates) {
        // Use provided coordinates first
        weather = await weatherService.getWeatherByCoordinates(coordinates.lat, coordinates.lng);
      } else if (userLocation) {
        // Use user's current location
        weather = await weatherService.getWeatherByCoordinates(userLocation.lat, userLocation.lng);
      } else if (golfCourseName) {
        // Fallback to golf course name search
        weather = await weatherService.getWeatherByCity(golfCourseName);
      } else {
        throw new Error('No location data available');
      }

      setWeatherData(prevData => {
        // Only update if data has actually changed
        if (prevData && 
            prevData.temperature === weather.temperature &&
            prevData.conditions === weather.conditions &&
            prevData.location === weather.location) {
          return prevData; // Don't trigger re-render if nothing changed
        }
        return weather;
      });
      setLastUpdated(new Date());
      
      // Only log weather updates occasionally to reduce console noise
      logger.info('Weather data updated successfully', {
        component: 'useWeather',
        location: weather.location,
        temperature: weather.temperature,
        conditions: weather.conditions,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather data';
      setError(errorMessage);
      
      logger.error('Failed to fetch weather data in hook', err as Error, {
        component: 'useWeather',
        golfCourseName,
        coordinates,
        userLocation,
      });
    } finally {
      setLoading(false);
    }
  }, [golfCourseName, coordinates?.lat, coordinates?.lng, userLocation?.lat, userLocation?.lng]);

  // Initial fetch - only when location data becomes available
  useEffect(() => {
    if (golfCourseName || coordinates || userLocation) {
      fetchWeather();
    }
  }, [golfCourseName, coordinates?.lat, coordinates?.lng, userLocation?.lat, userLocation?.lng]);

  // Auto-update interval
  useEffect(() => {
    if (!autoUpdate || (!golfCourseName && !coordinates && !userLocation)) return;

    const intervalMs = updateInterval * 60 * 1000;
    const interval = setInterval(() => {
      fetchWeather();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [autoUpdate, updateInterval, fetchWeather]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refetch = useCallback(async () => {
    await fetchWeather();
  }, [fetchWeather]);

  return {
    weatherData,
    loading,
    error,
    lastUpdated,
    refetch,
    clearError,
  };
};

/**
 * Hook to get weather for a specific golf course
 */
export const useGolfCourseWeather = (
  golfCourseName: string,
  coordinates?: { lat: number; lng: number }
): UseWeatherReturn => {
  return useWeather(golfCourseName, coordinates, {
    autoUpdate: true,
    updateInterval: 15, // Update every 15 minutes for golf courses
    enableGeolocation: false, // Don't use user location for golf course weather
  });
};

/**
 * Hook to get weather for user's current location
 */
export const useCurrentLocationWeather = (): UseWeatherReturn => {
  return useWeather(undefined, undefined, {
    autoUpdate: true,
    updateInterval: 10,
    enableGeolocation: true,
  });
};

export default useWeather;