// ═══════════════════════════════════════════════════════
//  Weather API Service — Open-Meteo (free, no key)
//  Fetches real weather + solar radiation data
//  for Thiruvananthapuram (8.5241°N, 76.9366°E)
// ═══════════════════════════════════════════════════════

const LAT = 8.8932;
const LON = 76.6141;
const TZ = "Asia/Kolkata";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

const CURRENT_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "wind_speed_10m",
  "weather_code",
  "cloud_cover",
  "apparent_temperature",
  "surface_pressure",
].join(",");

const HOURLY_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
  "shortwave_radiation",
  "direct_normal_irradiance",
  "diffuse_radiation",
].join(",");

const DAILY_PARAMS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "sunrise",
  "sunset",
  "weather_code",
  "shortwave_radiation_sum",
  "precipitation_sum",
  "wind_speed_10m_max",
].join(",");

export async function fetchWeatherData() {
  const url =
    `${BASE_URL}?latitude=${LAT}&longitude=${LON}` +
    `&current=${CURRENT_PARAMS}` +
    `&hourly=${HOURLY_PARAMS}` +
    `&daily=${DAILY_PARAMS}` +
    `&timezone=${encodeURIComponent(TZ)}` +
    `&forecast_days=7`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.current || !data.hourly || !data.daily) {
      throw new Error("Incomplete API response");
    }

    return {
      success: true,
      source: "Live — Open-Meteo API",
      data,
    };
  } catch (err) {
    clearTimeout(timeout);
    console.error("Weather API error:", err.message);
    return {
      success: false,
      source: "Failed",
      error: err.message,
      data: null,
    };
  }
}

// Weather code → description
export const weatherDescriptions = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight showers",
  81: "Moderate showers",
  82: "Violent showers",
  95: "Thunderstorm",
  96: "Thunderstorm w/ hail",
};

// Weather code → emoji
export function weatherEmoji(code) {
  if (code <= 1) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 75) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}