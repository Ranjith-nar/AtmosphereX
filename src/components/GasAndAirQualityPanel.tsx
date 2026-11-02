import React, { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import {
  AtmosphericBundleResponse,
  DataProvenance,
} from '../types/atmosphere';

interface GasAndAirQualityPanelProps {
  bundle: AtmosphericBundleResponse;
}

const PROVENANCE_LABELS: Record<DataProvenance, string> = {
  measured: 'Measured',
  estimated: 'Estimated',
  reference: 'Reference',
  simulated: 'Simulated',
};

const PROVENANCE_TONES: Record<DataProvenance, string> = {
  measured: 'text-emerald-400',
  estimated: 'text-cyan-400',
  reference: 'text-blue-300',
  simulated: 'text-amber-400',
};

export const GasAndAirQualityPanel: React.FC<GasAndAirQualityPanelProps> = ({
  bundle,
}) => {
  const [filterProvenance, setFilterProvenance] = useState<'all' | DataProvenance>(
    'all'
  );

  const { airQuality, gases, hourlyForecast } = bundle;

  const filteredGases =
    filterProvenance === 'all'
      ? gases
      : gases.filter((g) => g.provenance === filterProvenance);

  const hourlyTraceData = hourlyForecast.slice(0, 36).map((pt) => ({
    hour: pt.time.slice(11, 16) || pt.time,
    pm25: pt.pm25UgM3,
    pm10: pt.pm10UgM3,
    no2: pt.no2UgM3,
    o3: pt.o3UgM3,
  }));

  const aqiStatusLabel =
    airQuality.severity === 'nominal'
      ? '● Good / Nominal'
      : airQuality.severity === 'moderate'
      ? '▲ Moderate'
      : airQuality.severity === 'elevated'
      ? '▲ Sensitive Groups'
      : '✖ Unhealthy';

  const aqiStatusColor =
    airQuality.severity === 'nominal'
      ? 'text-emerald-400'
      : airQuality.severity === 'moderate'
      ? 'text-cyan-400'
      : airQuality.severity === 'elevated'
      ? 'text-amber-400'
      : 'text-rose-400';

  return (
    <div className="space-y-6">
      {/* Air Quality Index & Particulate Matter Overview */}
      <section className="rounded-xl border border-slate-800/80 bg-[#0D1424]/85 backdrop-blur-md p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-100">
              Air Quality & Particulate Matter Telemetry
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              <span className={PROVENANCE_TONES[airQuality.provenance]}>
                {PROVENANCE_LABELS[airQuality.provenance]}
              </span>
              {' · '}
              {airQuality.sourceLabel}
              {' · '}
              Benchmarked against WHO 2021 24h Guidelines
            </p>
          </div>
          <div className={`text-sm font-mono font-semibold ${aqiStatusColor}`}>
            {aqiStatusLabel}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-5">
          {/* US AQI */}
          <div>
            <p className="text-xs text-slate-400">US EPA Air Quality Index</p>
            <p className="mt-1.5 text-3xl font-mono font-bold text-slate-50 tabular-nums">
              {airQuality.usAqi ?? '—'}
              <span className="text-xs font-mono font-normal text-slate-400 ml-1.5">
                US AQI
              </span>
            </p>
            <p className="text-xs text-slate-400 mt-1">{airQuality.category}</p>
          </div>

          {/* European AQI */}
          <div className="sm:border-l border-slate-800/80 sm:pl-6">
            <p className="text-xs text-slate-400">European EEA Air Index</p>
            <p className="mt-1.5 text-3xl font-mono font-bold text-slate-50 tabular-nums">
              {airQuality.europeanAqi ?? '—'}
              <span className="text-xs font-mono font-normal text-slate-400 ml-1.5">
                EAQI
              </span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              CAMS multi-pollutant composite
            </p>
          </div>

          {/* PM2.5 */}
          <div className="lg:border-l border-slate-800/80 lg:pl-6">
            <p className="text-xs text-slate-400">Fine Particulate Matter (PM2.5)</p>
            <p className="mt-1.5 text-3xl font-mono font-bold text-slate-50 tabular-nums">
              {airQuality.pm25UgM3 ?? '—'}
              <span className="text-xs font-mono font-normal text-slate-400 ml-1.5">
                μg/m³
              </span>
            </p>
            <p className="text-xs font-mono text-slate-400 mt-1 tabular-nums">
              WHO 24h Limit: 15.0 μg/m³
            </p>
          </div>

          {/* PM10 */}
          <div className="sm:border-l border-slate-800/80 sm:pl-6">
            <p className="text-xs text-slate-400">CoarseParticulate Matter (PM10)</p>
            <p className="mt-1.5 text-3xl font-mono font-bold text-slate-50 tabular-nums">
              {airQuality.pm10UgM3 ?? '—'}
              <span className="text-xs font-mono font-normal text-slate-400 ml-1.5">
                μg/m³
              </span>
            </p>
            <p className="text-xs font-mono text-slate-400 mt-1 tabular-nums">
              WHO 24h Limit: 45.0 μg/m³
            </p>
          </div>
        </div>
      </section>

      {/* Atmospheric Gas Composition Matrix (O2, N2, CO2, CO, NO2, SO2, O3) */}
      <section className="rounded-xl border border-slate-800/80 bg-[#0D1424]/85 backdrop-blur-md p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-100">
              Atmospheric Gas Composition & Trace Pollutants
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Zero fabricated gas readings — every value explicitly discloses Measured, Estimated, Reference, or Simulated provenance
            </p>
          </div>

          {/* Interactive Provenance Filter (Functional Segmented Control) */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#070B14] border border-slate-800 rounded-lg self-start">
            {(
              [
                { id: 'all', label: 'All Gases (7)' },
                { id: 'measured', label: 'Measured' },
                { id: 'estimated', label: 'Estimated' },
                { id: 'reference', label: 'Reference' },
                { id: 'simulated', label: 'Simulated' },
              ] as Array<{ id: 'all' | DataProvenance; label: string }>
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilterProvenance(btn.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filterProvenance === btn.id
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Provenance Legend Strip */}
        <div className="py-3 border-b border-slate-800/60 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-400">
          <span>
            <strong className="font-mono text-emerald-400 font-medium">Measured:</strong>{' '}
            Physical ESP32 sensor telemetry
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="font-mono text-cyan-400 font-medium">Estimated:</strong>{' '}
            Copernicus CAMS chemical assimilation / psychrometry
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="font-mono text-blue-300 font-medium">Reference:</strong>{' '}
            ISO 2533 dry-air / NOAA global baseline
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="font-mono text-amber-400 font-medium">Simulated:</strong>{' '}
            Explicit bench test injection
          </span>
        </div>

        {filteredGases.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <p className="text-sm text-slate-300">
              No gases currently carry the "{PROVENANCE_LABELS[filterProvenance as DataProvenance]}" provenance classification at this station.
            </p>
            <button
              type="button"
              onClick={() => setFilterProvenance('all')}
              className="px-3.5 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 rounded-lg transition-colors cursor-pointer"
            >
              Show All 7 Atmospheric Gases
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {filteredGases.map((gas) => {
              const statusText =
                gas.status === 'nominal'
                  ? '● Nominal'
                  : gas.status === 'elevated'
                  ? '▲ Elevated'
                  : gas.status === 'high'
                  ? '✖ Above Guideline'
                  : '— Unavailable';

              const statusColor =
                gas.status === 'nominal'
                  ? 'text-emerald-400'
                  : gas.status === 'elevated'
                  ? 'text-amber-400'
                  : gas.status === 'high'
                  ? 'text-rose-400'
                  : 'text-slate-500';

              const ratioPct =
                gas.safeLimit && gas.value !== null && gas.id !== 'o2'
                  ? Math.min(100, Math.round((gas.value / gas.safeLimit) * 100))
                  : null;

              return (
                <div
                  key={gas.id}
                  className="py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
                >
                  {/* Chemical Formula & Name */}
                  <div className="lg:col-span-3">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-xl font-mono font-bold text-cyan-400 tabular-nums">
                        {gas.formula}
                      </span>
                      <span className="text-sm font-semibold text-slate-100">
                        {gas.name}
                      </span>
                    </div>
                    <p className="text-xs font-mono mt-1">
                      <span className={PROVENANCE_TONES[gas.provenance]}>
                        {PROVENANCE_LABELS[gas.provenance]}
                      </span>
                      <span className="text-slate-500"> · {gas.sourceLabel}</span>
                    </p>
                  </div>

                  {/* Numeric Readout */}
                  <div className="lg:col-span-3">
                    <div className="flex items-baseline">
                      <span className="text-2xl font-mono font-semibold text-slate-50 tabular-nums">
                        {gas.value !== null ? gas.value : '—'}
                      </span>
                      <span className="text-xs font-mono text-slate-400 ml-1.5">
                        {gas.unit}
                      </span>
                    </div>
                    {gas.secondaryValue && (
                      <p className="text-xs font-mono text-slate-400 tabular-nums mt-0.5">
                        {gas.secondaryValue}
                      </p>
                    )}
                  </div>

                  {/* Scientific Explanation & Threshold Progress */}
                  <div className="lg:col-span-4 space-y-1.5">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {gas.scientificNote}
                    </p>
                    {gas.safeLimitLabel && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                          <span>{gas.safeLimitLabel}</span>
                          {ratioPct !== null && <span>{ratioPct}% of limit</span>}
                        </div>
                        {ratioPct !== null && (
                          <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                ratioPct > 90
                                  ? 'bg-rose-500'
                                  : ratioPct > 60
                                  ? 'bg-amber-400'
                                  : 'bg-cyan-400'
                              }`}
                              style={{ width: `${Math.max(3, ratioPct)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Non-Hue-Only Status */}
                  <div className="lg:col-span-2 lg:text-right">
                    <span className={`text-xs font-mono font-medium ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 36-Hour Trace Gas & Aerosol Trajectory Chart */}
      <section className="rounded-xl border border-slate-800/80 bg-[#0D1424]/85 backdrop-blur-md p-6">
        <div className="mb-4">
          <h2 className="text-lg font-display font-semibold text-slate-100">
            36-Hour Photochemical & Aerosol Trajectory (O₃, NO₂, PM2.5, PM10)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Estimated · Copernicus CAMS Hourly Chemical Forecast (μg/m³)
          </p>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={hourlyTraceData}
              margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
            >
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="#64748B"
                tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                interval={3}
              />
              <YAxis
                stroke="#64748B"
                tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                unit=" μg"
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
              <Legend
                wrapperStyle={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
              />
              <Line
                type="monotone"
                dataKey="o3"
                name="Ozone O₃ (μg/m³)"
                stroke="#06B6D4"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="pm10"
                name="PM10 (μg/m³)"
                stroke="#60A5FA"
                strokeWidth={1.75}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="pm25"
                name="PM2.5 (μg/m³)"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="no2"
                name="NO₂ (μg/m³)"
                stroke="#F43F5E"
                strokeWidth={1.75}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};
