"use client";

import { useEffect, useState } from "react";
import { Wind, Droplets, Thermometer, Eye } from "lucide-react";

interface WeatherData {
  temp_c: number;
  feels_like_c: number;
  condition: string;
  icon: string;
  humidity: number;
  wind_kph: number;
  visibility_km: number;
  uv_index: number;
  location: string;
}

// Demo weather for Kathmandu / trekking regions
const DEMO_WEATHER: WeatherData = {
  temp_c: 18,
  feels_like_c: 16,
  condition: "Partly Cloudy",
  icon: "⛅",
  humidity: 62,
  wind_kph: 14,
  visibility_km: 12,
  uv_index: 6,
  location: "Kathmandu, Nepal",
};

const TREK_WEATHER: Record<string, WeatherData> = {
  Annapurna: { ...DEMO_WEATHER, temp_c: 8,  feels_like_c: 4,  condition: "Clear Skies",    icon: "☀️",  location: "Pokhara / Annapurna", wind_kph: 20, humidity: 45 },
  Khumbu:    { ...DEMO_WEATHER, temp_c: -2, feels_like_c: -8, condition: "Snow Possible",   icon: "🌨️", location: "Namche Bazaar / EBC", wind_kph: 35, humidity: 70 },
  Langtang:  { ...DEMO_WEATHER, temp_c: 12, feels_like_c: 9,  condition: "Mostly Sunny",   icon: "🌤️", location: "Langtang Valley",     wind_kph: 12, humidity: 55 },
  Gorkha:    { ...DEMO_WEATHER, temp_c: 6,  feels_like_c: 2,  condition: "Overcast",        icon: "☁️",  location: "Manaslu Region",      wind_kph: 18, humidity: 68 },
};

interface WeatherWidgetProps {
  region?: string;
  compact?: boolean;
}

export function WeatherWidget({ region, compact = false }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Use region-specific demo data or fetch from API
    const load = async () => {
      // Try OpenWeatherMap if key is configured
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
      const city = region === "Khumbu" ? "Namche Bazaar" : region === "Annapurna" ? "Pokhara" : "Kathmandu";

      if (apiKey) {
        try {
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},NP&appid=${apiKey}&units=metric`,
          );
          if (res.ok) {
            const data = await res.json();
            setWeather({
              temp_c: Math.round(data.main.temp),
              feels_like_c: Math.round(data.main.feels_like),
              condition: data.weather[0]?.description ?? "Clear",
              icon: getWeatherIcon(data.weather[0]?.id ?? 800),
              humidity: data.main.humidity,
              wind_kph: Math.round(data.wind.speed * 3.6),
              visibility_km: Math.round((data.visibility ?? 10000) / 1000),
              uv_index: 0,
              location: `${data.name}, Nepal`,
            });
            setLoaded(true);
            return;
          }
        } catch { /* fall through to demo */ }
      }

      // Demo fallback
      const demo = region ? (TREK_WEATHER[region] ?? DEMO_WEATHER) : DEMO_WEATHER;
      setWeather(demo);
      setLoaded(true);
    };
    void load();
  }, [region]);

  if (!loaded || !weather) {
    return (
      <div className={`rounded-2xl bg-white/60 animate-pulse ${compact ? "h-16" : "h-32"}`} />
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-white/80 border border-gray-100 rounded-2xl px-4 py-3">
        <span className="text-2xl">{weather.icon}</span>
        <div>
          <p className="font-bold text-gray-900 text-sm">{weather.temp_c}°C · {weather.condition}</p>
          <p className="text-gray-400 text-xs">{weather.location}</p>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Wind className="w-3 h-3" />{weather.wind_kph} km/h</span>
          <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />{weather.humidity}%</span>
        </div>
      </div>
    );
  }

  const tempColor = weather.temp_c < 0 ? "text-blue-600" : weather.temp_c < 10 ? "text-cyan-600" : weather.temp_c < 20 ? "text-green-600" : "text-orange-500";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/90 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Weather</p>
          <p className="text-sm font-semibold text-gray-600">{weather.location}</p>
        </div>
        <span className="text-4xl">{weather.icon}</span>
      </div>

      <div className="flex items-end gap-3">
        <p className={`text-5xl font-bold ${tempColor}`}>{weather.temp_c}°</p>
        <div className="pb-1">
          <p className="text-gray-700 font-semibold">{weather.condition}</p>
          <p className="text-gray-400 text-xs">Feels like {weather.feels_like_c}°C</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
          <Droplets className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-xs text-gray-400">Humidity</p>
            <p className="text-sm font-bold text-gray-700">{weather.humidity}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
          <Wind className="w-4 h-4 text-teal-400" />
          <div>
            <p className="text-xs text-gray-400">Wind</p>
            <p className="text-sm font-bold text-gray-700">{weather.wind_kph} km/h</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
          <Eye className="w-4 h-4 text-purple-400" />
          <div>
            <p className="text-xs text-gray-400">Visibility</p>
            <p className="text-sm font-bold text-gray-700">{weather.visibility_km} km</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
          <Thermometer className="w-4 h-4 text-orange-400" />
          <div>
            <p className="text-xs text-gray-400">UV Index</p>
            <p className="text-sm font-bold text-gray-700">{weather.uv_index > 0 ? weather.uv_index : "N/A"}</p>
          </div>
        </div>
      </div>

      {weather.temp_c < 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-blue-700 text-xs font-medium">
          ❄️ Freezing conditions — pack thermal layers and crampons
        </div>
      )}
      {weather.wind_kph > 40 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700 text-xs font-medium">
          💨 High winds — check with your guide before high passes
        </div>
      )}
    </div>
  );
}

function getWeatherIcon(weatherId: number): string {
  if (weatherId >= 200 && weatherId < 300) return "⛈️";
  if (weatherId >= 300 && weatherId < 400) return "🌦️";
  if (weatherId >= 500 && weatherId < 600) return "🌧️";
  if (weatherId >= 600 && weatherId < 700) return "🌨️";
  if (weatherId >= 700 && weatherId < 800) return "🌫️";
  if (weatherId === 800) return "☀️";
  if (weatherId === 801) return "🌤️";
  if (weatherId <= 804) return "⛅";
  return "🌡️";
}
