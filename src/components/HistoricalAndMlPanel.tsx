import React, { useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import {
  AtmosphericBundleResponse,
  AtmosphericSnapshotRecord,
} from '../types/atmosphere';
import { useAuth } from '../context/AuthContext';
import { formatTemp } from './CurrentWeatherHero';

interface HistoricalAndMlPanelProps {
  bundle: AtmosphericBundleResponse;
  tempUnit: 'C' | 'F';
  snapshots: AtmosphericSnapshotRecord[];
  onRecordSnapshot: () => Promise<void>;
  isSavingSnapshot: boolean;
}

export const HistoricalAndMlPanel: React.FC<HistoricalAndMlPanelProps> = ({
  bundle,
  tempUnit,
  snapshots,
  onRecordSnapshot,
  isSavingSnapshot,
}) => {
  const { user, signInWithGoogle } = useAuth();
  const [windowMode, setWindowMode] = useState<'full' | 'forecast48'>('full');

  const { mlAnalytics } = bundle;

  // Subsample full 216h window every 2 hours for ultra-crisp rendering, or show every hour in 48h forecast mode
  const filteredSeries =
    windowMode === 'forecast48'
      ? mlAnalytics.series.filter((pt, idx, arr) => {
          // Include last 24h historical + next 48h forecast
          const firstForecastIdx = arr.findIndex((x) => !x.isHistorical);
          if (firstForecastIdx === -1) return idx >= arr.length - 48;
          return idx >= Math.max(0, firstForecastIdx - 24);
        })
      : mlAnalytics.series.filter((_, idx) => idx % 2 === 0);

  const chartData = filteredSeries.map((pt) => {
    const d = new Date(pt.time);
    const label = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      hour12: false,
    });
    return {
      label,
      observedPm25: pt.observedPm25,
      camsForecastPm25: pt.camsForecastPm25,
      mlPredictedPm25: pt.mlPredictedPm25,
      mlUpper95: !pt.isHistorical ? pt.mlUpper95 : null,
      mlLower95: !pt.isHistorical ? pt.mlLower95 : null,
      mlAqi: pt.mlPredictedUsAqi,
    };
  });

  const maxAbsWeight = Math.max(
    ...mlAnalytics.featureWeights.map((w) => Math.abs(w.standardizedWeight)),
    0.1
  );

  const handleExportCsv = () => {
    if (!snapshots.length) return;
    const headers = [
      'Recorded At',
      'Location',
      'Latitude',
      'Longitude',
      'Temperature (C)',
      'Humidity (%)',
      'Pressure (hPa)',
      'Wind (km/h)',
      'US AQI',
      'PM2.5 (ug/m3)',
      'PM10 (ug/m3)',
      'CO2 (ppm)',
      'NO2 (ug/m3)',
      'O3 (ug/m3)',
    ];
    const rows = snapshots.map((s) =>
      [
        s.recordedAt,
        `"${s.locationName.replace(/"/g, '""')}"`,
        s.latitude,
        s.longitude,
        s.temperatureC ?? '',
        s.humidityPct ?? '',
        s.pressureHpa ?? '',
        s.windSpeedKmh ?? '',
        s.usAqi ?? '',
        s.pm25UgM3 ?? '',
        s.pm10UgM3 ?? '',
        s.co2Ppm ?? '',
        s.no2UgM3 ?? '',
        s.o3UgM3 ?? '',
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atmospherex_snapshots_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ML Pollution Prediction & Historical Analytics Chart */}
      <section className="rounded-xl border border-slate-800/80 bg-[#0D1424]/85 backdrop-blur-md p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-100">
              Historical Aerosol Analytics & Machine Learning PM2.5 Forecast
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              <span className="text-cyan-400">Estimated</span>
              {' · '}
              {mlAnalytics.modelName} trained live on {mlAnalytics.trainingHours}h Open-Meteo + CAMS observations
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#070B14] border border-slate-800 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setWindowMode('full')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                windowMode === 'full'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7-Day History + 48h Forecast
            </button>
            <button
              type="button"
              onClick={() => setWindowMode('forecast48')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                windowMode === 'forecast48'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24h Recent + 48h ML Horizon
            </button>
          </div>
        </div>

        {/* Model Validation Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-4 border-b border-slate-800/70">
          <div>
            <p className="text-xs text-slate-400">Training Horizon</p>
            <p className="mt-1 text-xl font-mono font-semibold text-slate-100 tabular-nums">
              {mlAnalytics.trainingHours}
              <span className="text-xs font-mono text-slate-400 ml-1">hrs</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">
              Holdout RMSE ({mlAnalytics.holdoutHours}h test)
            </p>
            <p className="mt-1 text-xl font-mono font-semibold text-cyan-400 tabular-nums">
              ±{mlAnalytics.rmseUgM3}
              <span className="text-xs font-mono text-slate-400 ml-1">μg/m³</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Holdout MAE</p>
            <p className="mt-1 text-xl font-mono font-semibold text-slate-100 tabular-nums">
              {mlAnalytics.maeUgM3}
              <span className="text-xs font-mono text-slate-400 ml-1">μg/m³</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Variance Explained (R²)</p>
            <p className="mt-1 text-xl font-mono font-semibold text-emerald-400 tabular-nums">
              {mlAnalytics.r2Score}
              <span className="text-xs font-mono text-slate-400 ml-1">
                (λ={mlAnalytics.ridgeLambda})
              </span>
            </p>
          </div>
        </div>

        <div className="h-[310px] w-full pt-5">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
            >
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748B"
                tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                minTickGap={34}
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
              <Area
                type="monotone"
                dataKey="mlUpper95"
                name="ML 95% Upper Bound"
                stroke="none"
                fill="#06B6D4"
                fillOpacity={0.1}
              />
              <Line
                type="monotone"
                dataKey="observedPm25"
                name="Historical CAMS PM2.5"
                stroke="#94A3B8"
                strokeWidth={1.75}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="camsForecastPm25"
                name="CAMS Physical Forecast"
                stroke="#3B82F6"
                strokeWidth={1.75}
                strokeDasharray="5 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="mlPredictedPm25"
                name="Ridge ML Prediction (μg/m³)"
                stroke="#06B6D4"
                strokeWidth={2.25}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Standardized Meteorological Feature Attribution */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <h3 className="text-sm font-display font-semibold text-slate-200 mb-3">
            Learned Meteorological & Diurnal Feature Attribution (Standardized β Weights)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
            {mlAnalytics.featureWeights.map((fw) => {
              const barPct = Math.min(
                100,
                Math.max(6, Math.round((Math.abs(fw.standardizedWeight) / maxAbsWeight) * 100))
              );
              const isDispersive = fw.direction === 'dispersive';
              return (
                <div key={fw.feature} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{fw.feature}</span>
                    <span
                      className={`font-mono tabular-nums ${
                        isDispersive ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {fw.standardizedWeight >= 0 ? '+' : ''}
                      {fw.standardizedWeight.toFixed(3)} ({isDispersive ? 'Dispersive' : 'Accumulating'})
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isDispersive ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">{fw.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PostgreSQL Recorded Atmospheric Snapshots Table */}
      <section className="rounded-xl border border-slate-800/80 bg-[#0D1424]/85 backdrop-blur-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-100">
              Recorded Station Snapshots
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Persistent environmental ledger synced to your Google account
            </p>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRecordSnapshot}
                disabled={isSavingSnapshot}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isSavingSnapshot ? 'Recording...' : 'Record Current Station'}
              </button>
              {snapshots.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#070B14] hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  Download CSV
                </button>
              )}
            </div>
          )}
        </div>

        {!user ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Sign in with Google to log timestamped atmospheric snapshots, persist multi-city comparisons, and export CSV datasets.
            </p>
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
            >
              Sign in with Google
            </button>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-slate-300">
              No atmospheric snapshots recorded yet. Capture your first station reading to start a time-series log.
            </p>
            <button
              type="button"
              onClick={onRecordSnapshot}
              disabled={isSavingSnapshot}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
            >
              Log First Entry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400">
                  <th className="py-2.5 pr-3 font-medium">Timestamp</th>
                  <th className="py-2.5 px-2 font-medium">Station</th>
                  <th className="py-2.5 px-2 font-medium text-right">Temp</th>
                  <th className="py-2.5 px-2 font-medium text-right">Pressure</th>
                  <th className="py-2.5 px-2 font-medium text-right">US AQI</th>
                  <th className="py-2.5 px-2 font-medium text-right">PM2.5</th>
                  <th className="py-2.5 pl-2 font-medium text-right">CO₂ / O₃</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-mono tabular-nums">
                {snapshots.map((snap) => (
                  <tr
                    key={snap.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-2.5 pr-3 text-slate-400 whitespace-nowrap">
                      {new Date(snap.recordedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-2 font-sans font-medium text-slate-200 truncate max-w-[180px]">
                      {snap.locationName}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-200 whitespace-nowrap">
                      {snap.temperatureC != null
                        ? `${formatTemp(snap.temperatureC, tempUnit)}°${tempUnit}`
                        : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-300 whitespace-nowrap">
                      {snap.pressureHpa ?? '—'} hPa
                    </td>
                    <td className="py-2.5 px-2 text-right text-cyan-400 whitespace-nowrap">
                      {snap.usAqi ?? '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-200 whitespace-nowrap">
                      {snap.pm25UgM3 ?? '—'} μg/m³
                    </td>
                    <td className="py-2.5 pl-2 text-right text-slate-300 whitespace-nowrap">
                      {snap.co2Ppm ?? '—'} ppm · {snap.o3UgM3 ?? '—'} μg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
