import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { AtmosphericBundleResponse } from '../types/atmosphere';
import orbitalHorizonImg from '../assets/images/orbital_atmosphere_horizon_1793634554679.jpg';

interface CurrentWeatherHeroProps {
  bundle: AtmosphericBundleResponse;
  tempUnit: 'C' | 'F';
}

export function formatTemp(tempC: number, unit: 'C' | 'F'): string {
  if (unit === 'F') {
    return `${((tempC * 9) / 5 + 32).toFixed(1)}`;
  }
  return `${tempC.toFixed(1)}`;
}

function compassDirection(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((deg % 360) / 45)) % 8;
  return dirs[idx];
}

function formatProvenanceLabel(p: string): string {
  if (p === 'measured') return 'Measured';
  if (p === 'estimated') return 'Estimated';
  if (p === 'reference') return 'Reference';
  return 'Simulated';
}

export const CurrentWeatherHero: React.FC<CurrentWeatherHeroProps> = ({
  bundle,
  tempUnit,
}) => {
  const [imgError, setImgError] = useState(false);
  const [hourlyMetric, setHourlyMetric] = useState<'temp' | 'precip' | 'wind'>(
    'temp'
  );

  const { location, currentWeather, airQuality, hourlyForecast, dailyForecast } =
    bundle;

  const next24h = hourlyForecast.slice(0, 24).map((pt) => {
    const hourStr = pt.time.slice(11, 16) || pt.time;
    return {
      hour: hourStr,
      tempDisplay:
        tempUnit === 'F'
          ? Number(((pt.temperatureC * 9) / 5 + 32).toFixed(1))
          : pt.temperatureC,
      humidity: pt.humidityPct,
      precipMm: pt.precipitationMm,
      precipProb: pt.precipitationProbPct,
      windKmh: pt.windSpeedKmh,
      pressureHpa: pt.surfacePressureHpa,
    };
  });

  const severityTone =
    airQuality.severity === 'nominal'
      ? 'text-emerald-400'
      : airQuality.severity === 'moderate'
      ? 'text-cyan-400'
      : airQuality.severity === 'elevated'
      ? 'text-amber-400'
      : 'text-rose-400';

  const severityGlyph =
    airQuality.severity === 'nominal'
      ? '●'
      : airQuality.severity === 'unhealthy'
      ? '✖'
      : '▲';

  return (
    <div className="space-y-6">
      {/* Primary Atmospheric Station Hero Panel */}
      <section className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-[#0D1424]">
        {/* Resilient Orbital Backdrop with Measured Scrim */}
        <div className="absolute inset-0 pointer-events-none">
          {!imgError ? (
            <img
              src={orbitalHorizonImg}
              alt="Earth tropospheric and stratospheric horizon from low orbit"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover opacity-35"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cyan-950/30 via-[#0D1424] to-blue-950/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070B14]/95 via-[#0D1424]/88 to-[#070B14]/80" />
        </div>

        <div className="relative p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            {/* Station Identity & Primary Temperature Anchor */}
            <div className="lg:col-span-6 space-y-3">
              {/* Unboxed Zero-Pill Metadata Kicker */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-slate-400 tabular-nums">
                <span className="text-cyan-400">
                  {formatProvenanceLabel(currentWeather.provenance)}
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentWeather.sourceLabel}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {location.latitude.toFixed(3)}°N, {location.longitude.toFixed(3)}°E
                </span>
                {location.elevation != null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Elev {Math.round(location.elevation)} m</span>
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-display font-bold tracking-tight text-slate-100 text-balance">
                {location.name}
                {location.country ? `, ${location.country}` : ''}
              </h1>

              <div className="flex flex-wrap items-baseline gap-4 pt-1">
                <div className="flex items-baseline">
                  <span className="text-5xl sm:text-6xl font-mono font-semibold tracking-tight text-slate-50 tabular-nums">
                    {formatTemp(currentWeather.temperatureC, tempUnit)}
                  </span>
                  <span className="text-xl font-mono text-cyan-400 ml-1.5">
                    °{tempUnit}
                  </span>
                </div>
                <div className="text-sm text-slate-300 space-y-0.5">
                  <p className="font-medium text-slate-100">
                    {currentWeather.weatherDescription}
                  </p>
                  <p className="text-xs font-mono text-slate-400 tabular-nums">
                    Apparent {formatTemp(currentWeather.apparentTemperatureC, tempUnit)} °{tempUnit}
                    {' · '}
                    US AQI{' '}
                    <span className={severityTone}>
                      {severityGlyph} {airQuality.usAqi ?? '—'} ({airQuality.category})
                    </span>
                  </p>
                </div>
              </div>

              {bundle.activeIotNode && (
                <p className="text-xs font-mono text-cyan-300 pt-1">
                  Active Local Node: {bundle.activeIotNode.deviceName} ({bundle.activeIotNode.sensorModel}) ·{' '}
                  {bundle.activeIotNode.isSimulated
                    ? 'Simulated Bench Telemetry'
                    : 'Hardware Measured Telemetry'}{' '}
                  · {bundle.activeIotNode.distanceKm} km from target
                </p>
              )}
            </div>

            {/* Key Meteorological Readout Grid (Hairline Separators, No Nested Cards) */}
            <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-6 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-800/80 lg:pl-8">
              <div>
                <p className="text-xs text-slate-400">Relative Humidity</p>
                <p className="mt-1 text-2xl font-mono font-semibold text-slate-100 tabular-nums">
                  {currentWeather.humidityPct}
                  <span className="text-xs font-mono text-slate-400 ml-1">%</span>
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Wind Vector (10m)</p>
                <p className="mt-1 text-2xl font-mono font-semibold text-slate-100 tabular-nums">
                  {currentWeather.windSpeedKmh}
                  <span className="text-xs font-mono text-slate-400 ml-1">km/h</span>
                </p>
                <p className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
                  {compassDirection(currentWeather.windDirectionDeg)} ({currentWeather.windDirectionDeg}°) · Gust {currentWeather.windGustsKmh}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Surface Pressure</p>
                <p className="mt-1 text-2xl font-mono font-semibold text-slate-100 tabular-nums">
                  {currentWeather.surfacePressureHpa}
                  <span className="text-xs font-mono text-slate-400 ml-1">hPa</span>
                </p>
                <p className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
                  MSL {currentWeather.seaLevelPressureHpa} hPa
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Rainfall / Precip</p>
                <p className="mt-1 text-2xl font-mono font-semibold text-slate-100 tabular-nums">
                  {currentWeather.precipitationMm}
                  <span className="text-xs font-mono text-slate-400 ml-1">mm</span>
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Solar UV Index</p>
                <p className="mt-1 text-2xl font-mono font-semibold text-slate-100 tabular-nums">
                  {currentWeather.uvIndex}
                  <span className="text-xs font-mono text-slate-400 ml-1">UVI</span>
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Fine Particulate PM2.5</p>
                <p className="mt-1 text-2xl font-mono font-semibold text-slate-100 tabular-nums">
                  {airQuality.pm25UgM3 ?? '—'}
                  <span className="text-xs font-mono text-slate-400 ml-1">μg/m³</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hourly 24h Forecast + 7-Day Synoptic Outlook Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* 24-Hour Meteorological Trajectory */}
        <section className="xl:col-span-7 rounded-xl border border-slate-800/80 bg-[#0D1424]/85 backdrop-blur-md p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-display font-semibold text-slate-100">
                  24-Hour Meteorological Forecast
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Estimated · Open-Meteo High-Resolution NWP Model
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#070B14] border border-slate-800 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setHourlyMetric('temp')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    hourlyMetric === 'temp'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Temp & Humidity
                </button>
                <button
                  type="button"
                  onClick={() => setHourlyMetric('precip')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    hourlyMetric === 'precip'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Rainfall
                </button>
                <button
                  type="button"
                  onClick={() => setHourlyMetric('wind')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    hourlyMetric === 'wind'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Wind & Pressure
                </button>
              </div>
            </div>

            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {hourlyMetric === 'temp' ? (
                  <AreaChart
                    data={next24h}
                    margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748B"
                      tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      interval={2}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#64748B"
                      tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      unit={`°`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#475569"
                      tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      domain={[0, 100]}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#070B14',
                        borderColor: '#1E293B',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono',
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="tempDisplay"
                      name={`Temp (°${tempUnit})`}
                      stroke="#06B6D4"
                      strokeWidth={2}
                      fill="url(#tempGrad)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="humidity"
                      name="Humidity (%)"
                      stroke="#3B82F6"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={0}
                    />
                  </AreaChart>
                ) : hourlyMetric === 'precip' ? (
                  <ComposedChart
                    data={next24h}
                    margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748B"
                      tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      interval={2}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#64748B"
                      tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      unit="mm"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#475569"
                      tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      domain={[0, 100]}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#070B14',
                        borderColor: '#1E293B',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono',
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="precipMm"
                      name="Precipitation (mm)"
                      fill="#06B6D4"
                      radius={[3, 3, 0, 0]}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="precipProb"
                      name="Rain Probability (%)"
                      stroke="#38BDF8"
                      strokeWidth={1.75}
                      fillOpacity={0.08}
                      fill="#38BDF8"
                    />
                  </ComposedChart>
                ) : (
                  <AreaChart
                    data={next24h}
                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748B"
                      tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      interval={2}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#64748B"
                      tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      unit=" km/h"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#475569"
                      tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#070B14',
                        borderColor: '#1E293B',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono',
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="windKmh"
                      name="Wind Speed (km/h)"
                      stroke="#06B6D4"
                      strokeWidth={2}
                      fillOpacity={0.14}
                      fill="#06B6D4"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="pressureHpa"
                      name="Surface Pressure (hPa)"
                      stroke="#60A5FA"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={0}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono tabular-nums">
            <span>24h Peak Wind: {Math.max(...next24h.map((d) => d.windKmh), 0).toFixed(1)} km/h</span>
            <span>24h Total Rain: {next24h.reduce((s, d) => s + d.precipMm, 0).toFixed(1)} mm</span>
            <span>Timezone: {location.timezone || 'UTC'}</span>
          </div>
        </section>

        {/* 7-Day Synoptic Forecast Table */}
        <section className="xl:col-span-5 rounded-xl border border-slate-800/80 bg-[#0D1424]/85 backdrop-blur-md p-6 flex flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-display font-semibold text-slate-100">
              7-Day Synoptic Outlook
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily thermal extrema, rainfall probability, and peak gusts
            </p>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400">
                  <th className="py-2 pr-3 font-medium">Day</th>
                  <th className="py-2 px-2 font-medium">Condition</th>
                  <th className="py-2 px-2 font-medium text-right">Rain</th>
                  <th className="py-2 pl-2 font-medium text-right">Min / Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {dailyForecast.map((day, idx) => {
                  const dateObj = new Date(`${day.date}T12:00:00`);
                  const dayLabel =
                    idx === 0
                      ? 'Today'
                      : dateObj.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        });
                  return (
                    <tr
                      key={day.date}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-2.5 pr-3 font-medium text-slate-200 whitespace-nowrap">
                        {dayLabel}
                      </td>
                      <td className="py-2.5 px-2 text-slate-300 truncate max-w-[130px]">
                        {day.weatherDescription}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-cyan-400 whitespace-nowrap">
                        {day.precipitationProbMaxPct}% · {day.precipitationSumMm}mm
                      </td>
                      <td className="py-2.5 pl-2 text-right font-mono tabular-nums whitespace-nowrap">
                        <span className="text-slate-400">
                          {formatTemp(day.tempMinC, tempUnit)}°
                        </span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-slate-100 font-semibold">
                          {formatTemp(day.tempMaxC, tempUnit)}°
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
