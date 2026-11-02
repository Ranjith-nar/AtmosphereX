import {
  AirQualitySummary,
  AtmosphericBundleResponse,
  AtmosphericGasMetric,
  CurrentWeatherMetrics,
  DailyForecastPoint,
  DataProvenance,
  GeoLocationInfo,
  HourlyForecastPoint,
  RegionalGridNode,
} from '../types/atmosphere.ts';
import { runRidgeAtmosphericForecast } from './mlEngine.ts';

export function describeWmoCode(code: number): string {
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snowfall',
    73: 'Moderate snowfall',
    75: 'Heavy snowfall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return map[code] ?? 'Variable conditions';
}

function classifyAqi(usAqi: number | null): {
  category: string;
  severity: 'nominal' | 'moderate' | 'elevated' | 'unhealthy';
} {
  if (usAqi === null || !Number.isFinite(usAqi)) {
    return { category: 'Unavailable', severity: 'nominal' };
  }
  if (usAqi <= 50) return { category: 'Good', severity: 'nominal' };
  if (usAqi <= 100) return { category: 'Moderate', severity: 'moderate' };
  if (usAqi <= 150)
    return { category: 'Unhealthy for Sensitive Groups', severity: 'elevated' };
  return { category: 'Unhealthy', severity: 'unhealthy' };
}

export async function searchOpenMeteoLocations(
  query: string
): Promise<GeoLocationInfo[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmed
  )}&count=8&language=en&format=json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geocoding service returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    results?: Array<{
      id: number;
      name: string;
      country?: string;
      admin1?: string;
      latitude: number;
      longitude: number;
      elevation?: number;
      timezone?: string;
    }>;
  };

  return (data.results ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    country: item.country,
    admin1: item.admin1,
    latitude: item.latitude,
    longitude: item.longitude,
    elevation: item.elevation,
    timezone: item.timezone,
  }));
}

async function fetchRegionalMicroGrid(
  lat: number,
  lon: number
): Promise<RegionalGridNode[]> {
  const offsets = [
    { id: 'nw', label: 'NW Sector', dLat: 0.12, dLon: -0.14 },
    { id: 'n', label: 'North Sector', dLat: 0.14, dLon: 0 },
    { id: 'ne', label: 'NE Sector', dLat: 0.12, dLon: 0.14 },
    { id: 'w', label: 'West Sector', dLat: 0, dLon: -0.15 },
    { id: 'center', label: 'Primary Station', dLat: 0, dLon: 0 },
    { id: 'e', label: 'East Sector', dLat: 0, dLon: 0.15 },
    { id: 'sw', label: 'SW Sector', dLat: -0.12, dLon: -0.14 },
    { id: 's', label: 'South Sector', dLat: -0.14, dLon: 0 },
    { id: 'se', label: 'SE Sector', dLat: -0.12, dLon: 0.14 },
  ];

  const coords = offsets.map((o) => ({
    ...o,
    lat: Math.max(-85, Math.min(85, Number((lat + o.dLat).toFixed(4)))),
    lon: Number((((lon + o.dLon + 540) % 360) - 180).toFixed(4)),
  }));

  const latList = coords.map((c) => c.lat).join(',');
  const lonList = coords.map((c) => c.lon).join(',');

  try {
    const [wxRes, aqRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latList}&longitude=${lonList}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m`
      ),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latList}&longitude=${lonList}&current=us_aqi,pm2_5`
      ),
    ]);

    if (!wxRes.ok || !aqRes.ok) {
      return [];
    }

    const wxJson = await wxRes.json();
    const aqJson = await aqRes.json();
    const wxArr = Array.isArray(wxJson) ? wxJson : [wxJson];
    const aqArr = Array.isArray(aqJson) ? aqJson : [aqJson];

    return coords.map((c, idx) => {
      const wxCurr = wxArr[idx]?.current;
      const aqCurr = aqArr[idx]?.current;
      return {
        id: c.id,
        label: c.label,
        latitude: c.lat,
        longitude: c.lon,
        temperatureC:
          typeof wxCurr?.temperature_2m === 'number'
            ? Number(wxCurr.temperature_2m.toFixed(1))
            : null,
        windSpeedKmh:
          typeof wxCurr?.wind_speed_10m === 'number'
            ? Number(wxCurr.wind_speed_10m.toFixed(1))
            : null,
        windDirectionDeg:
          typeof wxCurr?.wind_direction_10m === 'number'
            ? Math.round(wxCurr.wind_direction_10m)
            : null,
        humidityPct:
          typeof wxCurr?.relative_humidity_2m === 'number'
            ? Math.round(wxCurr.relative_humidity_2m)
            : null,
        usAqi:
          typeof aqCurr?.us_aqi === 'number' ? Math.round(aqCurr.us_aqi) : null,
        pm25UgM3:
          typeof aqCurr?.pm2_5 === 'number'
            ? Number(aqCurr.pm2_5.toFixed(1))
            : null,
        provenance: 'estimated',
      };
    });
  } catch (err) {
    console.error('Regional micro-grid fetch failed:', err);
    return [];
  }
}

export interface NearbyIotOverride {
  device: {
    deviceName: string;
    sensorModel: string;
  };
  reading: {
    temperatureC: number | null;
    humidityPct: number | null;
    pressureHpa: number | null;
    co2Ppm: number | null;
    coUgM3: number | null;
    no2UgM3: number | null;
    so2UgM3: number | null;
    o3UgM3: number | null;
    o2Pct: number | null;
    pm25UgM3: number | null;
    pm10UgM3: number | null;
    isSimulated: boolean;
    recordedAt: Date;
  };
  distanceKm: number;
}

export async function fetchCompleteAtmosphericIntelligence(
  location: GeoLocationInfo,
  iotOverride: NearbyIotOverride | null = null
): Promise<AtmosphericBundleResponse> {
  const { latitude, longitude } = location;

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&past_days=14&forecast_days=7` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,surface_pressure,wind_speed_10m,uv_index` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max` +
    `&timezone=auto`;

  const airQualityUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
    `&past_days=14&forecast_days=5` +
    `&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,carbon_dioxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust` +
    `&hourly=us_aqi,pm2_5,pm10,carbon_monoxide,carbon_dioxide,nitrogen_dioxide,sulphur_dioxide,ozone` +
    `&timezone=auto`;

  const [wxRes, aqRes, regionalGrid] = await Promise.all([
    fetch(forecastUrl),
    fetch(airQualityUrl),
    fetchRegionalMicroGrid(latitude, longitude),
  ]);

  if (!wxRes.ok) {
    throw new Error(`Open-Meteo weather forecast request failed (${wxRes.status})`);
  }
  if (!aqRes.ok) {
    throw new Error(`Open-Meteo air quality request failed (${aqRes.status})`);
  }

  const wxData = await wxRes.json();
  const aqData = await aqRes.json();

  const resolvedLocation: GeoLocationInfo = {
    ...location,
    elevation:
      typeof wxData.elevation === 'number' ? wxData.elevation : location.elevation,
    timezone: wxData.timezone ?? location.timezone,
  };

  const iotProvenance: DataProvenance | null = iotOverride
    ? iotOverride.reading.isSimulated
      ? 'simulated'
      : 'measured'
    : null;
  const iotLabel = iotOverride
    ? iotOverride.reading.isSimulated
      ? `ESP32 Bench Simulator (${iotOverride.device.deviceName})`
      : `ESP32 Hardware (${iotOverride.device.deviceName})`
    : null;

  const currWx = wxData.current ?? {};
  const tempC =
    iotOverride?.reading.temperatureC ?? currWx.temperature_2m ?? 18;
  const humPct =
    iotOverride?.reading.humidityPct ?? currWx.relative_humidity_2m ?? 55;
  const surfacePressureHpa =
    iotOverride?.reading.pressureHpa ?? currWx.surface_pressure ?? 1013.25;

  const currentWeather: CurrentWeatherMetrics = {
    time: currWx.time ?? new Date().toISOString(),
    temperatureC: Number(tempC.toFixed(1)),
    apparentTemperatureC: Number(
      (currWx.apparent_temperature ?? tempC).toFixed(1)
    ),
    humidityPct: Math.round(humPct),
    precipitationMm: Number((currWx.precipitation ?? 0).toFixed(2)),
    rainMm: Number((currWx.rain ?? 0).toFixed(2)),
    weatherCode: currWx.weather_code ?? 0,
    weatherDescription: describeWmoCode(currWx.weather_code ?? 0),
    surfacePressureHpa: Number(surfacePressureHpa.toFixed(1)),
    seaLevelPressureHpa: Number(
      (currWx.pressure_msl ?? surfacePressureHpa).toFixed(1)
    ),
    windSpeedKmh: Number((currWx.wind_speed_10m ?? 0).toFixed(1)),
    windDirectionDeg: Math.round(currWx.wind_direction_10m ?? 0),
    windGustsKmh: Number((currWx.wind_gusts_10m ?? 0).toFixed(1)),
    uvIndex: Number((currWx.uv_index ?? 0).toFixed(1)),
    isDay: Boolean(currWx.is_day ?? 1),
    provenance:
      iotOverride?.reading.temperatureC != null && iotProvenance
        ? iotProvenance
        : 'estimated',
    sourceLabel:
      iotOverride?.reading.temperatureC != null && iotLabel
        ? iotLabel
        : 'Open-Meteo Meteorological Assimilation',
  };

  // Barometric Psychrometry for bulk gases (N2 and O2)
  // Magnus-Tetens / Alduchov-Eskridge saturation vapor pressure (hPa)
  const satVaporPressureHpa =
    6.1094 * Math.exp((17.625 * tempC) / (tempC + 243.04));
  const waterVaporPressureHpa =
    (Math.max(0, Math.min(100, humPct)) / 100) * satVaporPressureHpa;
  const dryAirPressureHpa = Math.max(
    100,
    surfacePressureHpa - waterVaporPressureHpa
  );

  // ISO 2533 standard dry-air volume fractions: N2 = 78.084%, O2 = 20.946%
  const partialPressureO2 = 0.20946 * dryAirPressureHpa;
  const partialPressureN2 = 0.78084 * dryAirPressureHpa;
  const humidMoleFractionO2Pct = (partialPressureO2 / surfacePressureHpa) * 100;
  const humidMoleFractionN2Pct = (partialPressureN2 / surfacePressureHpa) * 100;

  const currAq = aqData.current ?? {};
  const pm25Val =
    iotOverride?.reading.pm25UgM3 ??
    (typeof currAq.pm2_5 === 'number' ? currAq.pm2_5 : null);
  const pm10Val =
    iotOverride?.reading.pm10UgM3 ??
    (typeof currAq.pm10 === 'number' ? currAq.pm10 : null);
  const usAqiVal =
    typeof currAq.us_aqi === 'number' ? Math.round(currAq.us_aqi) : null;
  const euAqiVal =
    typeof currAq.european_aqi === 'number'
      ? Math.round(currAq.european_aqi)
      : null;

  const aqiMeta = classifyAqi(usAqiVal);
  const airQuality: AirQualitySummary = {
    usAqi: usAqiVal,
    europeanAqi: euAqiVal,
    pm25UgM3: pm25Val !== null ? Number(pm25Val.toFixed(1)) : null,
    pm10UgM3: pm10Val !== null ? Number(pm10Val.toFixed(1)) : null,
    dustUgM3:
      typeof currAq.dust === 'number' ? Number(currAq.dust.toFixed(1)) : null,
    category: aqiMeta.category,
    severity: aqiMeta.severity,
    provenance:
      iotOverride?.reading.pm25UgM3 != null && iotProvenance
        ? iotProvenance
        : 'estimated',
    sourceLabel:
      iotOverride?.reading.pm25UgM3 != null && iotLabel
        ? iotLabel
        : 'Copernicus CAMS / Open-Meteo AQI',
  };

  // Resolve trace gases with strict provenance separation
  const rawCamsCo2 =
    typeof currAq.carbon_dioxide === 'number' ? currAq.carbon_dioxide : null;
  const iotCo2 = iotOverride?.reading.co2Ppm ?? null;
  const co2Value = iotCo2 ?? rawCamsCo2 ?? 424.6;
  const co2Provenance: DataProvenance =
    iotCo2 !== null && iotProvenance
      ? iotProvenance
      : rawCamsCo2 !== null
      ? 'estimated'
      : 'reference';
  const co2SourceLabel =
    iotCo2 !== null && iotLabel
      ? iotLabel
      : rawCamsCo2 !== null
      ? 'Copernicus CAMS GHG Model'
      : 'NOAA Global Tropospheric Baseline';

  const coVal =
    iotOverride?.reading.coUgM3 ??
    (typeof currAq.carbon_monoxide === 'number' ? currAq.carbon_monoxide : null);
  const no2Val =
    iotOverride?.reading.no2UgM3 ??
    (typeof currAq.nitrogen_dioxide === 'number' ? currAq.nitrogen_dioxide : null);
  const so2Val =
    iotOverride?.reading.so2UgM3 ??
    (typeof currAq.sulphur_dioxide === 'number' ? currAq.sulphur_dioxide : null);
  const o3Val =
    iotOverride?.reading.o3UgM3 ??
    (typeof currAq.ozone === 'number' ? currAq.ozone : null);
  const iotO2Pct = iotOverride?.reading.o2Pct ?? null;

  const gases: AtmosphericGasMetric[] = [
    {
      id: 'n2',
      formula: 'N₂',
      name: 'Molecular Nitrogen',
      category: 'bulk',
      value: 78.084,
      unit: '% vol (dry)',
      secondaryValue: `${humidMoleFractionN2Pct.toFixed(2)}% humid · pN₂ ${partialPressureN2.toFixed(1)} hPa`,
      status: 'nominal',
      provenance: 'reference',
      sourceLabel: 'ISO 2533 Standard Dry Air + Psychrometric pN₂',
      scientificNote:
        'Well-mixed inert carrier gas; ambient partial pressure scales with barometric pressure and water vapor dilution.',
    },
    {
      id: 'o2',
      formula: 'O₂',
      name: 'Molecular Oxygen',
      category: 'bulk',
      value: iotO2Pct !== null ? Number(iotO2Pct.toFixed(3)) : 20.946,
      unit: iotO2Pct !== null ? '% vol' : '% vol (dry)',
      secondaryValue: `${humidMoleFractionO2Pct.toFixed(2)}% humid · pO₂ ${partialPressureO2.toFixed(1)} hPa`,
      safeLimit: 19.5,
      safeLimitLabel: 'OSHA Min 19.5% vol',
      status:
        iotO2Pct !== null && iotO2Pct < 19.5 ? 'high' : 'nominal',
      provenance:
        iotO2Pct !== null && iotProvenance ? iotProvenance : 'reference',
      sourceLabel:
        iotO2Pct !== null && iotLabel
          ? iotLabel
          : 'ISO 2533 Standard Dry Air + Barometric pO₂',
      scientificNote:
        'Constant 20.946% dry molar fraction; inspired oxygen availability depends on ambient pO₂ at station elevation.',
    },
    {
      id: 'co2',
      formula: 'CO₂',
      name: 'Carbon Dioxide',
      category: 'greenhouse',
      value: Number(co2Value.toFixed(1)),
      unit: 'ppm',
      safeLimit: 1000,
      safeLimitLabel: 'ASHRAE Indoor Ref 1000 ppm',
      status:
        co2Value > 1000 ? 'high' : co2Value > 460 ? 'elevated' : 'nominal',
      provenance: co2Provenance,
      sourceLabel: co2SourceLabel,
      scientificNote:
        'Long-lived greenhouse gas showing urban combustion domes and nocturnal boundary-layer accumulation.',
    },
    {
      id: 'co',
      formula: 'CO',
      name: 'Carbon Monoxide',
      category: 'trace_pollutant',
      value: coVal !== null ? Number(coVal.toFixed(1)) : null,
      unit: 'μg/m³',
      safeLimit: 4000,
      safeLimitLabel: 'WHO 24h Guideline 4000 μg/m³',
      status:
        coVal === null
          ? 'unavailable'
          : coVal > 4000
          ? 'high'
          : coVal > 1500
          ? 'elevated'
          : 'nominal',
      provenance:
        iotOverride?.reading.coUgM3 != null && iotProvenance
          ? iotProvenance
          : 'estimated',
      sourceLabel:
        iotOverride?.reading.coUgM3 != null && iotLabel
          ? iotLabel
          : 'Copernicus CAMS Chemical Transport',
      scientificNote:
        'Incomplete combustion tracer from vehicular traffic, biomass burning, and industrial boilers.',
    },
    {
      id: 'no2',
      formula: 'NO₂',
      name: 'Nitrogen Dioxide',
      category: 'trace_pollutant',
      value: no2Val !== null ? Number(no2Val.toFixed(2)) : null,
      unit: 'μg/m³',
      safeLimit: 25,
      safeLimitLabel: 'WHO 24h Guideline 25 μg/m³',
      status:
        no2Val === null
          ? 'unavailable'
          : no2Val > 50
          ? 'high'
          : no2Val > 25
          ? 'elevated'
          : 'nominal',
      provenance:
        iotOverride?.reading.no2UgM3 != null && iotProvenance
          ? iotProvenance
          : 'estimated',
      sourceLabel:
        iotOverride?.reading.no2UgM3 != null && iotLabel
          ? iotLabel
          : 'Copernicus CAMS Assimilation',
      scientificNote:
        'Reactive nitrogen oxide emitted by high-temperature combustion; key precursor to tropospheric ozone.',
    },
    {
      id: 'so2',
      formula: 'SO₂',
      name: 'Sulfur Dioxide',
      category: 'trace_pollutant',
      value: so2Val !== null ? Number(so2Val.toFixed(2)) : null,
      unit: 'μg/m³',
      safeLimit: 40,
      safeLimitLabel: 'WHO 24h Guideline 40 μg/m³',
      status:
        so2Val === null
          ? 'unavailable'
          : so2Val > 40
          ? 'high'
          : so2Val > 20
          ? 'elevated'
          : 'nominal',
      provenance:
        iotOverride?.reading.so2UgM3 != null && iotProvenance
          ? iotProvenance
          : 'estimated',
      sourceLabel:
        iotOverride?.reading.so2UgM3 != null && iotLabel
          ? iotLabel
          : 'Copernicus CAMS Assimilation',
      scientificNote:
        'Sulfur oxide linked to coal/heavy-fuel combustion, smelting, shipping plumes, and volcanic degassing.',
    },
    {
      id: 'o3',
      formula: 'O₃',
      name: 'Tropospheric Ozone',
      category: 'trace_pollutant',
      value: o3Val !== null ? Number(o3Val.toFixed(1)) : null,
      unit: 'μg/m³',
      safeLimit: 100,
      safeLimitLabel: 'WHO 8h Peak 100 μg/m³',
      status:
        o3Val === null
          ? 'unavailable'
          : o3Val > 120
          ? 'high'
          : o3Val > 85
          ? 'elevated'
          : 'nominal',
      provenance:
        iotOverride?.reading.o3UgM3 != null && iotProvenance
          ? iotProvenance
          : 'estimated',
      sourceLabel:
        iotOverride?.reading.o3UgM3 != null && iotLabel
          ? iotLabel
          : 'Copernicus CAMS Photochemical Model',
      scientificNote:
        'Secondary photochemical oxidant formed under solar UV irradiance from NOₓ and VOC precursors.',
    },
  ];

  // Align hourly weather and hourly air quality by ISO timestamp
  const aqHourlyMap = new Map<
    string,
    {
      usAqi: number | null;
      pm25: number | null;
      pm10: number | null;
      no2: number | null;
      o3: number | null;
      co: number | null;
      so2: number | null;
    }
  >();

  const aqTimes: string[] = aqData.hourly?.time ?? [];
  for (let i = 0; i < aqTimes.length; i++) {
    aqHourlyMap.set(aqTimes[i], {
      usAqi: aqData.hourly?.us_aqi?.[i] ?? null,
      pm25: aqData.hourly?.pm2_5?.[i] ?? null,
      pm10: aqData.hourly?.pm10?.[i] ?? null,
      no2: aqData.hourly?.nitrogen_dioxide?.[i] ?? null,
      o3: aqData.hourly?.ozone?.[i] ?? null,
      co: aqData.hourly?.carbon_monoxide?.[i] ?? null,
      so2: aqData.hourly?.sulphur_dioxide?.[i] ?? null,
    });
  }

  const wxTimes: string[] = wxData.hourly?.time ?? [];
  const currentTs = new Date(currentWeather.time).getTime();

  // Extract next 48 hours for the Hourly Forecast view
  const hourlyForecast: HourlyForecastPoint[] = [];
  const alignedPm25ForMl: (number | null)[] = [];

  for (let i = 0; i < wxTimes.length; i++) {
    const t = wxTimes[i];
    const aqPoint = aqHourlyMap.get(t);
    alignedPm25ForMl.push(aqPoint?.pm25 ?? null);

    const ts = new Date(t).getTime();
    if (ts >= currentTs - 3600 * 1000 && hourlyForecast.length < 48) {
      hourlyForecast.push({
        time: t,
        temperatureC: Number((wxData.hourly?.temperature_2m?.[i] ?? 0).toFixed(1)),
        humidityPct: Math.round(wxData.hourly?.relative_humidity_2m?.[i] ?? 0),
        precipitationProbPct: Math.round(
          wxData.hourly?.precipitation_probability?.[i] ?? 0
        ),
        precipitationMm: Number(
          (wxData.hourly?.precipitation?.[i] ?? 0).toFixed(2)
        ),
        surfacePressureHpa: Number(
          (wxData.hourly?.surface_pressure?.[i] ?? 1013).toFixed(1)
        ),
        windSpeedKmh: Number((wxData.hourly?.wind_speed_10m?.[i] ?? 0).toFixed(1)),
        uvIndex: Number((wxData.hourly?.uv_index?.[i] ?? 0).toFixed(1)),
        usAqi: aqPoint?.usAqi != null ? Math.round(aqPoint.usAqi) : null,
        pm25UgM3: aqPoint?.pm25 != null ? Number(aqPoint.pm25.toFixed(1)) : null,
        pm10UgM3: aqPoint?.pm10 != null ? Number(aqPoint.pm10.toFixed(1)) : null,
        no2UgM3: aqPoint?.no2 != null ? Number(aqPoint.no2.toFixed(1)) : null,
        o3UgM3: aqPoint?.o3 != null ? Number(aqPoint.o3.toFixed(1)) : null,
        coUgM3: aqPoint?.co != null ? Number(aqPoint.co.toFixed(0)) : null,
        so2UgM3: aqPoint?.so2 != null ? Number(aqPoint.so2.toFixed(1)) : null,
      });
    }
  }

  // Extract 7-day forecast starting from today
  const dailyTimes: string[] = wxData.daily?.time ?? [];
  const todayDatePrefix = currentWeather.time.slice(0, 10);
  const dailyForecast: DailyForecastPoint[] = [];

  for (let i = 0; i < dailyTimes.length; i++) {
    if (dailyTimes[i] >= todayDatePrefix && dailyForecast.length < 7) {
      const code = wxData.daily?.weather_code?.[i] ?? 0;
      dailyForecast.push({
        date: dailyTimes[i],
        weatherCode: code,
        weatherDescription: describeWmoCode(code),
        tempMaxC: Number((wxData.daily?.temperature_2m_max?.[i] ?? 0).toFixed(1)),
        tempMinC: Number((wxData.daily?.temperature_2m_min?.[i] ?? 0).toFixed(1)),
        precipitationSumMm: Number(
          (wxData.daily?.precipitation_sum?.[i] ?? 0).toFixed(1)
        ),
        precipitationProbMaxPct: Math.round(
          wxData.daily?.precipitation_probability_max?.[i] ?? 0
        ),
        windSpeedMaxKmh: Number(
          (wxData.daily?.wind_speed_10m_max?.[i] ?? 0).toFixed(1)
        ),
        uvIndexMax: Number((wxData.daily?.uv_index_max?.[i] ?? 0).toFixed(1)),
        sunrise: wxData.daily?.sunrise?.[i] ?? '',
        sunset: wxData.daily?.sunset?.[i] ?? '',
      });
    }
  }

  // Run ML Ridge Regression Forecast on the full 14-day + forecast series
  const mlAnalytics = runRidgeAtmosphericForecast({
    times: wxTimes,
    temperatures: wxData.hourly?.temperature_2m ?? [],
    humidities: wxData.hourly?.relative_humidity_2m ?? [],
    windSpeeds: wxData.hourly?.wind_speed_10m ?? [],
    pressures: wxData.hourly?.surface_pressure ?? [],
    precipitations: wxData.hourly?.precipitation ?? [],
    pm25Values: alignedPm25ForMl,
    currentTimeIso: currentWeather.time,
  });

  return {
    location: resolvedLocation,
    fetchedAt: new Date().toISOString(),
    currentWeather,
    airQuality,
    gases,
    hourlyForecast,
    dailyForecast,
    regionalGrid,
    mlAnalytics,
    activeIotNode: iotOverride
      ? {
          deviceName: iotOverride.device.deviceName,
          sensorModel: iotOverride.device.sensorModel,
          isSimulated: iotOverride.reading.isSimulated,
          recordedAt: iotOverride.reading.recordedAt.toISOString(),
          distanceKm: iotOverride.distanceKm,
        }
      : null,
  };
}
