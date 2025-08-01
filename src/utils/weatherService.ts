import { logger } from './logger';
import type { WeatherData } from '@/types/weather';

interface OpenWeatherResponse {
  coord: {
    lon: number;
    lat: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
    sea_level?: number;
    grnd_level?: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type: number;
    id: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

// Re-export the WeatherData type
export type { WeatherData } from '@/types/weather';

interface WeatherServiceConfig {
  apiKey: string;
  units?: 'imperial' | 'metric';
  language?: string;
}

export class WeatherService {
  private apiKey: string;
  private units: 'imperial' | 'metric';
  private language: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  private cache = new Map<string, { data: WeatherData; expiry: number }>();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes

  constructor(config: WeatherServiceConfig) {
    this.apiKey = config.apiKey;
    this.units = config.units || 'imperial';
    this.language = config.language || 'en';
  }

  /**
   * Get weather data by coordinates
   */
  async getWeatherByCoordinates(lat: number, lon: number): Promise<WeatherData> {
    const cacheKey = `${lat},${lon}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      // Only log cache hits occasionally to reduce noise
      if (Math.random() < 0.1) { // 10% chance to log
        logger.debug('Returning cached weather data', {
          service: 'WeatherService',
          location: { lat, lon },
          cacheHit: true,
        });
      }
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${this.units}&lang=${this.language}`;
      
      logger.info('Fetching weather data', {
        service: 'WeatherService',
        location: { lat, lon },
        units: this.units,
      });

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }

      const data: OpenWeatherResponse = await response.json();
      const weatherData = this.transformWeatherData(data);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        expiry: Date.now() + this.cacheTimeout,
      });

      logger.info('Weather data fetched successfully', {
        service: 'WeatherService',
        location: weatherData.location,
        temperature: weatherData.temperature,
        conditions: weatherData.conditions,
      });

      return weatherData;
    } catch (error) {
      logger.error('Failed to fetch weather data', error as Error, {
        service: 'WeatherService',
        location: { lat, lon },
      });
      throw error;
    }
  }

  /**
   * Get weather data by city name
   */
  async getWeatherByCity(cityName: string, stateCode?: string, countryCode?: string): Promise<WeatherData> {
    let query = cityName;
    if (stateCode) query += `,${stateCode}`;
    if (countryCode) query += `,${countryCode}`;

    const cacheKey = `city:${query}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      logger.debug('Returning cached weather data', {
        service: 'WeatherService',
        city: query,
        cacheHit: true,
      });
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/weather?q=${encodeURIComponent(query)}&appid=${this.apiKey}&units=${this.units}&lang=${this.language}`;
      
      logger.info('Fetching weather data by city', {
        service: 'WeatherService',
        city: query,
        units: this.units,
      });

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }

      const data: OpenWeatherResponse = await response.json();
      const weatherData = this.transformWeatherData(data);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        expiry: Date.now() + this.cacheTimeout,
      });

      logger.info('Weather data fetched successfully by city', {
        service: 'WeatherService',
        location: weatherData.location,
        temperature: weatherData.temperature,
        conditions: weatherData.conditions,
      });

      return weatherData;
    } catch (error) {
      logger.error('Failed to fetch weather data by city', error as Error, {
        service: 'WeatherService',
        city: query,
      });
      throw error;
    }
  }

  /**
   * Get weather data for golf course location (with fallback)
   */
  async getGolfCourseWeather(
    golfCourseName: string, 
    coordinates?: { lat: number; lon: number }
  ): Promise<WeatherData> {
    try {
      // Try coordinates first if available
      if (coordinates) {
        return await this.getWeatherByCoordinates(coordinates.lat, coordinates.lon);
      }

      // Fallback to city search
      return await this.getWeatherByCity(golfCourseName);
    } catch (error) {
      logger.error('Failed to get golf course weather', error as Error, {
        service: 'WeatherService',
        golfCourseName,
        coordinates,
      });

      // Return mock data as final fallback
      return this.getMockWeatherData(golfCourseName);
    }
  }

  /**
   * Transform OpenWeather API response to our WeatherData format
   */
  private transformWeatherData(data: OpenWeatherResponse): WeatherData {
    const weatherCondition = this.mapWeatherCondition(data.weather[0].id, data.weather[0].main);
    const dewPoint = this.calculateDewPoint(data.main.temp, data.main.humidity);
    const uvIndex = this.estimateUVIndex(data.coord.lat, data.coord.lon);

    return {
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed),
      windDirection: data.wind.deg || 0,
      windGusts: data.wind.gust ? Math.round(data.wind.gust) : undefined,
      pressure: this.units === 'imperial' ? data.main.pressure * 0.02953 : data.main.pressure, // Convert to inHg for imperial
      visibility: Math.round((data.visibility || 10000) / (this.units === 'imperial' ? 1609.34 : 1000)), // Convert to miles for imperial, km for metric
      conditions: weatherCondition,
      uvIndex,
      dewPoint: Math.round(dewPoint),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      location: `${data.name}, ${data.sys.country}`,
      lastUpdated: new Date(data.dt * 1000),
    };
  }

  /**
   * Map OpenWeather condition codes to our condition types
   */
  private mapWeatherCondition(
    weatherId: number, 
    main: string
  ): WeatherData['conditions'] {
    // Thunderstorm
    if (weatherId >= 200 && weatherId < 300) return 'thunderstorm';
    
    // Drizzle and Rain
    if (weatherId >= 300 && weatherId < 400) return 'light-rain';
    if (weatherId >= 500 && weatherId < 600) {
      return weatherId < 520 ? 'light-rain' : 'rain';
    }
    
    // Snow
    if (weatherId >= 600 && weatherId < 700) return 'snow';
    
    // Atmosphere (mist, fog, etc.)
    if (weatherId >= 700 && weatherId < 800) return 'mist';
    
    // Clear
    if (weatherId === 800) return 'sunny';
    
    // Clouds
    if (weatherId > 800) {
      if (weatherId === 801) return 'partly-cloudy';
      if (weatherId === 802) return 'cloudy';
      return 'overcast';
    }

    // Fallback based on main category
    switch (main.toLowerCase()) {
      case 'clear': return 'sunny';
      case 'clouds': return 'cloudy';
      case 'rain': return 'rain';
      case 'drizzle': return 'light-rain';
      case 'thunderstorm': return 'thunderstorm';
      case 'snow': return 'snow';
      case 'mist':
      case 'fog': return 'mist';
      default: return 'partly-cloudy';
    }
  }

  /**
   * Calculate dew point using temperature and humidity
   */
  private calculateDewPoint(temperature: number, humidity: number): number {
    const tempC = this.units === 'imperial' ? (temperature - 32) * 5/9 : temperature;
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100);
    const dewPointC = (b * alpha) / (a - alpha);
    
    return this.units === 'imperial' ? (dewPointC * 9/5) + 32 : dewPointC;
  }

  /**
   * Estimate UV index based on location and time (simplified)
   */
  private estimateUVIndex(lat: number, lon: number): number {
    const now = new Date();
    const hour = now.getHours();
    
    // Simple estimation based on time of day and latitude
    if (hour < 6 || hour > 20) return 0; // Night
    if (hour < 9 || hour > 17) return Math.max(1, 3 - Math.abs(lat) / 30);
    
    // Peak hours estimation
    const latitudeFactor = Math.max(0, 1 - Math.abs(lat) / 90);
    const baseUV = 8 * latitudeFactor;
    
    return Math.round(Math.max(1, Math.min(11, baseUV)));
  }

  /**
   * Get mock weather data as fallback
   */
  private getMockWeatherData(location: string): WeatherData {
    logger.warn('Using mock weather data as fallback', {
      service: 'WeatherService',
      location,
    });

    return {
      temperature: 72,
      humidity: 65,
      windSpeed: 8,
      windDirection: 225,
      windGusts: 12,
      pressure: 30.15,
      visibility: 10,
      conditions: 'partly-cloudy',
      uvIndex: 6,
      dewPoint: 58,
      description: 'partly cloudy',
      icon: '02d',
      location,
      lastUpdated: new Date(),
    };
  }

  /**
   * Clear the weather cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Weather cache cleared', {
      service: 'WeatherService',
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create and export a default weather service instance
const weatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

if (!weatherApiKey) {
  logger.warn('OpenWeather API key not found in environment variables', {
    service: 'WeatherService',
    envVar: 'VITE_OPENWEATHER_API_KEY',
  });
}

export const weatherService = new WeatherService({
  apiKey: weatherApiKey || '',
  units: 'imperial', // Default to Fahrenheit for golf in US
  language: 'en',
});

// Hook for using weather data in React components
export const useWeatherData = () => {
  return {
    getWeatherByCoordinates: weatherService.getWeatherByCoordinates.bind(weatherService),
    getWeatherByCity: weatherService.getWeatherByCity.bind(weatherService),
    getGolfCourseWeather: weatherService.getGolfCourseWeather.bind(weatherService),
    clearCache: weatherService.clearCache.bind(weatherService),
    getCacheStats: weatherService.getCacheStats.bind(weatherService),
  };
};

export default weatherService;