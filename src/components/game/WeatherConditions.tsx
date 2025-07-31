import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wind, Thermometer, Droplets, Eye, Gauge, Sun, Cloud, CloudRain } from 'lucide-react';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGusts?: number;
  pressure: number;
  visibility: number;
  conditions: 'sunny' | 'partly-cloudy' | 'cloudy' | 'overcast' | 'light-rain' | 'rain';
  uvIndex: number;
  dewPoint: number;
}

interface WeatherConditionsProps {
  weather: WeatherData;
  compact?: boolean;
  showPlayabilityIndex?: boolean;
}

export function WeatherConditions({ weather, compact = false, showPlayabilityIndex = true }: WeatherConditionsProps) {
  const [playabilityIndex, setPlayabilityIndex] = useState(0);

  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const getWindIcon = () => {
    if (weather.windSpeed < 5) return '🟢'; // Calm
    if (weather.windSpeed < 15) return '🟡'; // Moderate 
    if (weather.windSpeed < 25) return '🟠'; // Strong
    return '🔴'; // Very Strong
  };

  const getConditionIcon = () => {
    switch (weather.conditions) {
      case 'sunny': return <Sun className="w-5 h-5 text-yellow-400" />;
      case 'partly-cloudy': return <Cloud className="w-5 h-5 text-slate-300" />;
      case 'cloudy': return <Cloud className="w-5 h-5 text-slate-400" />;
      case 'overcast': return <Cloud className="w-5 h-5 text-slate-500" />;
      case 'light-rain': 
      case 'rain': return <CloudRain className="w-5 h-5 text-blue-400" />;
      default: return <Sun className="w-5 h-5 text-yellow-400" />;
    }
  };

  const calculatePlayabilityIndex = () => {
    let score = 100;
    
    // Wind impact (most important for golf)
    if (weather.windSpeed > 20) score -= 30;
    else if (weather.windSpeed > 15) score -= 20;
    else if (weather.windSpeed > 10) score -= 10;
    
    // Rain impact
    if (weather.conditions.includes('rain')) score -= 25;
    
    // Temperature impact
    if (weather.temperature < 40 || weather.temperature > 95) score -= 15;
    else if (weather.temperature < 50 || weather.temperature > 85) score -= 10;
    
    // Humidity impact
    if (weather.humidity > 80) score -= 10;
    
    // Visibility impact
    if (weather.visibility < 5) score -= 15;
    else if (weather.visibility < 8) score -= 10;
    
    return Math.max(score, 0);
  };

  useEffect(() => {
    if (showPlayabilityIndex) {
      setPlayabilityIndex(calculatePlayabilityIndex());
    }
  }, [weather, showPlayabilityIndex]);

  const getPlayabilityColor = (index: number) => {
    if (index >= 80) return 'text-green-400';
    if (index >= 60) return 'text-yellow-400';
    if (index >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getPlayabilityText = (index: number) => {
    if (index >= 80) return 'Excellent';
    if (index >= 60) return 'Good';
    if (index >= 40) return 'Fair';
    return 'Poor';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4 px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-cyan-400" />
          <span className="text-white font-mono text-sm">{weather.temperature}°F</span>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-slate-400" />
          <span className="text-white font-mono text-sm">
            {weather.windSpeed}mph {getWindDirection(weather.windDirection)}
          </span>
          <span className="text-xs">{getWindIcon()}</span>
        </div>
        <div className="flex items-center gap-1">
          {getConditionIcon()}
          <span className="text-xs text-slate-400 capitalize">{weather.conditions.replace('-', ' ')}</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5" />
      
      <div className="relative p-4">
        {/* Weather Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg">
              {getConditionIcon()}
            </div>
            <div>
              <h3 className="text-lg font-light text-white tracking-tight">Course Conditions</h3>
              <p className="text-xs text-slate-400 capitalize">{weather.conditions.replace('-', ' ')}</p>
            </div>
          </div>
          
          {showPlayabilityIndex && (
            <div className="text-right">
              <div className={`text-2xl font-light ${getPlayabilityColor(playabilityIndex)}`}>
                {playabilityIndex}
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">
                {getPlayabilityText(playabilityIndex)}
              </div>
            </div>
          )}
        </div>

        {/* Primary Conditions */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/[0.02] rounded-2xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">Temperature</span>
            </div>
            <div className="text-2xl font-light text-white">{weather.temperature}°F</div>
            <div className="text-xs text-slate-500">
              Feels like {weather.temperature + (weather.humidity > 70 ? 5 : 0)}°F
            </div>
          </div>

          <div className="bg-white/[0.02] rounded-2xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Wind className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">Wind</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-light text-white">{weather.windSpeed}</div>
              <div className="text-sm text-slate-400">mph</div>
              <div className="text-sm font-mono text-cyan-400">
                {getWindDirection(weather.windDirection)}
              </div>
              <span className="text-lg">{getWindIcon()}</span>
            </div>
            {weather.windGusts && weather.windGusts > weather.windSpeed && (
              <div className="text-xs text-orange-400">
                Gusts to {weather.windGusts}mph
              </div>
            )}
          </div>
        </div>

        {/* Secondary Conditions */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5 text-center">
            <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <div className="text-white font-medium text-sm">{weather.humidity}%</div>
            <div className="text-xs text-slate-500">Humidity</div>
          </div>

          <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5 text-center">
            <Gauge className="w-4 h-4 text-slate-400 mx-auto mb-1" />
            <div className="text-white font-medium text-sm">{weather.pressure.toFixed(2)}</div>
            <div className="text-xs text-slate-500">inHg</div>
          </div>

          <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5 text-center">
            <Eye className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <div className="text-white font-medium text-sm">{weather.visibility}</div>
            <div className="text-xs text-slate-500">miles</div>
          </div>
        </div>

        {/* Golf Impact Analysis */}
        <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
          <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-400" />
            Playing Conditions Impact
          </h4>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Ball Flight:</span>
              <span className="text-white">
                {weather.windSpeed > 15 ? 'Significantly affected' : 
                 weather.windSpeed > 10 ? 'Moderately affected' : 
                 'Minimal impact'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Distance:</span>
              <span className="text-white">
                {weather.temperature < 50 ? '+5-10 yards' :
                 weather.temperature > 80 ? '-5-10 yards' :
                 'Normal'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Putting:</span>
              <span className="text-white">
                {weather.humidity > 80 ? 'Slower greens' :
                 weather.humidity < 40 ? 'Faster greens' :
                 'Normal speed'}
              </span>
            </div>

            {weather.conditions.includes('rain') && (
              <div className="flex justify-between">
                <span className="text-slate-400">Course:</span>
                <span className="text-orange-400">Soft conditions, check local rules</span>
              </div>
            )}
          </div>
        </div>

        {/* Data Timestamp */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-500">Updated: {new Date().toLocaleTimeString()}</span>
          <span className="text-slate-500">Local Conditions</span>
        </div>
      </div>

      {/* Subtle glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/5 to-transparent blur-2xl -z-10" />
    </motion.div>
  );
}