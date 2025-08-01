export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGusts?: number;
  pressure: number;
  visibility: number;
  conditions: 'sunny' | 'partly-cloudy' | 'cloudy' | 'overcast' | 'light-rain' | 'rain' | 'thunderstorm' | 'snow' | 'mist';
  uvIndex: number;
  dewPoint: number;
  description: string;
  icon: string;
  location: string;
  lastUpdated: Date;
}