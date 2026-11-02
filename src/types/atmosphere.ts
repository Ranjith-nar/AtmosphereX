export type DataProvenance = 'measured' | 'estimated' | 'reference' | 'simulated';

export interface GeoLocationInfo {
  id?: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone?: string;
}

export interface CurrentWeatherMetrics {
  time: string;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPct: number;
  precipitationMm: number;
  rainMm: number;
  weatherCode: number;
  weatherDescription: string;
  surfacePressureHpa: number;
  seaLevelPressureHpa: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windGustsKmh: number;
  uvIndex: number;
  isDay: boolean;
  provenance: DataProvenance;
  sourceLabel: string;
}

export interface AtmosphericGasMetric {
  id: 'n2' | 'o2' | 'co2' | 'co' | 'no2' | 'so2' | 'o3';
  formula: string;
  name: string;
  category: 'bulk' | 'greenhouse' | 'trace_pollutant';
  value: number | null;
  unit: string;
  secondaryValue?: string;
  safeLimit?: number;
  safeLimitLabel?: string;
  status: 'nominal' | 'elevated' | 'high' | 'unavailable';
  provenance: DataProvenance;
  sourceLabel: string;
  scientificNote: string;
}

export interface AirQualitySummary {
  usAqi: number | null;
  europeanAqi: number | null;
  pm25UgM3: number | null;
  pm10UgM3: number | null;
  dustUgM3: number | null;
  category: string;
  severity: 'nominal' | 'moderate' | 'elevated' | 'unhealthy';
  provenance: DataProvenance;
  sourceLabel: string;
}

export interface HourlyForecastPoint {
  time: string;
  temperatureC: number;
  humidityPct: number;
  precipitationProbPct: number;
  precipitationMm: number;
  surfacePressureHpa: number;
  windSpeedKmh: number;
  uvIndex: number;
  usAqi: number | null;
  pm25UgM3: number | null;
  pm10UgM3: number | null;
  no2UgM3: number | null;
  o3UgM3: number | null;
  coUgM3: number | null;
  so2UgM3: number | null;
}

export interface DailyForecastPoint {
  date: string;
  weatherCode: number;
  weatherDescription: string;
  tempMaxC: number;
  tempMinC: number;
  precipitationSumMm: number;
  precipitationProbMaxPct: number;
  windSpeedMaxKmh: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
}

export interface RegionalGridNode {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  temperatureC: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  humidityPct: number | null;
  usAqi: number | null;
  pm25UgM3: number | null;
  provenance: DataProvenance;
}

export interface MlPredictionPoint {
  time: string;
  isHistorical: boolean;
  observedPm25: number | null;
  camsForecastPm25: number | null;
  mlPredictedPm25: number;
  mlLower95: number;
  mlUpper95: number;
  mlPredictedUsAqi: number;
  temperatureC: number;
  windSpeedKmh: number;
  humidityPct: number;
}

export interface MlFeatureWeight {
  feature: string;
  standardizedWeight: number;
  direction: 'dispersive' | 'accumulating';
  explanation: string;
}

export interface MlModelDiagnostics {
  modelName: string;
  trainingHours: number;
  holdoutHours: number;
  rmseUgM3: number;
  maeUgM3: number;
  r2Score: number;
  ridgeLambda: number;
  provenance: 'estimated';
  featureWeights: MlFeatureWeight[];
  series: MlPredictionPoint[];
}

export interface AtmosphericBundleResponse {
  location: GeoLocationInfo;
  fetchedAt: string;
  currentWeather: CurrentWeatherMetrics;
  airQuality: AirQualitySummary;
  gases: AtmosphericGasMetric[];
  hourlyForecast: HourlyForecastPoint[];
  dailyForecast: DailyForecastPoint[];
  regionalGrid: RegionalGridNode[];
  mlAnalytics: MlModelDiagnostics;
  activeIotNode?: {
    deviceName: string;
    sensorModel: string;
    isSimulated: boolean;
    recordedAt: string;
    distanceKm: number;
  } | null;
}

export interface AiAtmosphericBriefing {
  headline: string;
  riskLevel: 'Nominal' | 'Moderate' | 'Elevated' | 'High';
  weatherAnalysis: string;
  pollutionAndGasAnalysis: string;
  outdoorGuidance: string;
  provenanceSummary: string;
}

export interface SavedLocationRecord {
  id: number;
  name: string;
  country: string | null;
  admin1: string | null;
  latitude: number;
  longitude: number;
  elevation: number | null;
  createdAt: string;
}

export interface IotDeviceRecord {
  id: number;
  deviceName: string;
  sensorModel: string;
  apiKey: string;
  latitude: number;
  longitude: number;
  locationLabel: string;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface IotReadingRecord {
  id: number;
  deviceId: number;
  deviceName?: string;
  locationLabel?: string;
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
  recordedAt: string;
}

export interface AtmosphericSnapshotRecord {
  id: number;
  locationName: string;
  latitude: number;
  longitude: number;
  temperatureC: number | null;
  humidityPct: number | null;
  pressureHpa: number | null;
  windSpeedKmh: number | null;
  usAqi: number | null;
  pm25UgM3: number | null;
  pm10UgM3: number | null;
  co2Ppm: number | null;
  no2UgM3: number | null;
  o3UgM3: number | null;
  recordedAt: string;
}
