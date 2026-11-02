/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, WorkspaceSection } from './components/Navbar';
import { LocationCommandBar } from './components/LocationCommandBar';
import { CurrentWeatherHero } from './components/CurrentWeatherHero';
import { GasAndAirQualityPanel } from './components/GasAndAirQualityPanel';
import { InteractiveEnvMap } from './components/InteractiveEnvMap';
import { HistoricalAndMlPanel } from './components/HistoricalAndMlPanel';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { Esp32IotPanel } from './components/Esp32IotPanel';
import {
  AtmosphericBundleResponse,
  AtmosphericSnapshotRecord,
  GeoLocationInfo,
  IotDeviceRecord,
  IotReadingRecord,
  SavedLocationRecord,
} from './types/atmosphere';

const DEFAULT_LOCATION: GeoLocationInfo = {
  name: 'San Francisco',
  admin1: 'California',
  country: 'United States',
  latitude: 37.7749,
  longitude: -122.4194,
};

function DashboardShell() {
  const { user, authError, clearAuthError, signInWithGoogle, getFreshToken } =
    useAuth();

  const [activeSection, setActiveSection] =
    useState<WorkspaceSection>('overview');
  const [currentLocation, setCurrentLocation] =
    useState<GeoLocationInfo>(DEFAULT_LOCATION);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');

  const [bundle, setBundle] = useState<AtmosphericBundleResponse | null>(null);
  const [loadingBundle, setLoadingBundle] = useState(true);
  const [bundleError, setBundleError] = useState<string | null>(null);

  const [savedLocations, setSavedLocations] = useState<SavedLocationRecord[]>(
    []
  );
  const [snapshots, setSnapshots] = useState<AtmosphericSnapshotRecord[]>([]);
  const [iotDevices, setIotDevices] = useState<IotDeviceRecord[]>([]);
  const [iotReadings, setIotReadings] = useState<IotReadingRecord[]>([]);

  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  const showNotice = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4000);
  }, []);

  const loadAtmosphericBundle = useCallback(
    async (loc: GeoLocationInfo) => {
      setLoadingBundle(true);
      setBundleError(null);
      try {
        const token = await getFreshToken();
        const params = new URLSearchParams({
          lat: String(loc.latitude),
          lon: String(loc.longitude),
          name: loc.name,
        });
        if (loc.country) params.set('country', loc.country);
        if (loc.admin1) params.set('admin1', loc.admin1);

        const res = await fetch(`/api/atmosphere?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            data.error || 'Failed to retrieve atmospheric intelligence.'
          );
        }
        setBundle(data);
      } catch (err: any) {
        setBundleError(
          err.message || 'Unable to connect to Open-Meteo telemetry services.'
        );
      } finally {
        setLoadingBundle(false);
      }
    },
    [getFreshToken]
  );

  useEffect(() => {
    loadAtmosphericBundle(currentLocation);
  }, [currentLocation, user?.uid, loadAtmosphericBundle]);

  const loadUserCloudData = useCallback(async () => {
    if (!user) {
      setSavedLocations([]);
      setSnapshots([]);
      setIotDevices([]);
      setIotReadings([]);
      return;
    }
    try {
      const token = await getFreshToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [locRes, snapRes, iotRes] = await Promise.all([
        fetch('/api/user/locations', { headers }),
        fetch('/api/user/snapshots', { headers }),
        fetch('/api/iot/devices', { headers }),
      ]);

      if (locRes.ok) {
        const d = await locRes.json();
        setSavedLocations(d.locations || []);
      }
      if (snapRes.ok) {
        const d = await snapRes.json();
        setSnapshots(d.snapshots || []);
      }
      if (iotRes.ok) {
        const d = await iotRes.json();
        setIotDevices(d.devices || []);
        setIotReadings(d.readings || []);
      }
    } catch (err) {
      console.error('Error loading user Cloud SQL records:', err);
    }
  }, [user, getFreshToken]);

  useEffect(() => {
    loadUserCloudData();
  }, [loadUserCloudData]);

  const handleSaveCurrentLocation = async () => {
    if (!user) {
      const signedIn = await signInWithGoogle();
      if (!signedIn) return;
    }
    try {
      const token = await getFreshToken();
      if (!token || !bundle) return;
      const res = await fetch('/api/user/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: bundle.location.name,
          country: bundle.location.country ?? null,
          admin1: bundle.location.admin1 ?? null,
          latitude: bundle.location.latitude,
          longitude: bundle.location.longitude,
          elevation: bundle.location.elevation ?? null,
        }),
      });
      if (res.ok) {
        await loadUserCloudData();
        showNotice(`Saved ${bundle.location.name} to your stations.`);
      }
    } catch {
      showNotice('Could not save station right now.');
    }
  };

  const handleDeleteSavedLocation = async (id: number) => {
    try {
      const token = await getFreshToken();
      if (!token) return;
      const res = await fetch(`/api/user/locations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSavedLocations((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      showNotice('Could not remove saved station.');
    }
  };

  const handleRecordSnapshot = async () => {
    if (!bundle) return;
    if (!user) {
      const signedIn = await signInWithGoogle();
      if (!signedIn) return;
    }
    setSavingSnapshot(true);
    try {
      const token = await getFreshToken();
      if (!token) return;
      const co2 = bundle.gases.find((g) => g.id === 'co2')?.value ?? null;
      const no2 = bundle.gases.find((g) => g.id === 'no2')?.value ?? null;
      const o3 = bundle.gases.find((g) => g.id === 'o3')?.value ?? null;

      const res = await fetch('/api/user/snapshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          locationName: bundle.location.name,
          latitude: bundle.location.latitude,
          longitude: bundle.location.longitude,
          temperatureC: bundle.currentWeather.temperatureC,
          humidityPct: bundle.currentWeather.humidityPct,
          pressureHpa: bundle.currentWeather.surfacePressureHpa,
          windSpeedKmh: bundle.currentWeather.windSpeedKmh,
          usAqi: bundle.airQuality.usAqi,
          pm25UgM3: bundle.airQuality.pm25UgM3,
          pm10UgM3: bundle.airQuality.pm10UgM3,
          co2Ppm: co2,
          no2UgM3: no2,
          o3UgM3: o3,
        }),
      });
      if (res.ok) {
        await loadUserCloudData();
        showNotice(`Recorded atmospheric snapshot for ${bundle.location.name}.`);
      }
    } catch {
      showNotice('Could not record snapshot.');
    } finally {
      setSavingSnapshot(false);
    }
  };

  const handleRegisterDevice = async (payload: {
    deviceName: string;
    sensorModel: string;
    latitude: number;
    longitude: number;
    locationLabel: string;
  }) => {
    const token = await getFreshToken();
    if (!token) return;
    const res = await fetch('/api/iot/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await loadUserCloudData();
      showNotice(`Registered ESP32 node "${payload.deviceName}".`);
    }
  };

  const handleDeleteDevice = async (id: number) => {
    const token = await getFreshToken();
    if (!token) return;
    const res = await fetch(`/api/iot/devices/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await loadUserCloudData();
      await loadAtmosphericBundle(currentLocation);
    }
  };

  const handleSendBenchSimulatedReading = async (device: IotDeviceRecord) => {
    if (!bundle) return;
    const baseTemp = bundle.currentWeather.temperatureC;
    const baseHum = bundle.currentWeather.humidityPct;
    const basePress = bundle.currentWeather.surfacePressureHpa;
    const basePm25 = bundle.airQuality.pm25UgM3 ?? 9.5;
    const basePm10 = bundle.airQuality.pm10UgM3 ?? 18.0;
    const baseNo2 = bundle.gases.find((g) => g.id === 'no2')?.value ?? 14.2;
    const baseO3 = bundle.gases.find((g) => g.id === 'o3')?.value ?? 62.0;
    const baseCo = bundle.gases.find((g) => g.id === 'co')?.value ?? 210.0;
    const baseSo2 = bundle.gases.find((g) => g.id === 'so2')?.value ?? 3.4;

    const res = await fetch('/api/iot/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-key': device.apiKey,
      },
      body: JSON.stringify({
        temperatureC: Number((baseTemp + 0.3).toFixed(1)),
        humidityPct: Math.min(100, Math.max(5, Math.round(baseHum + 1))),
        pressureHpa: Number((basePress - 0.2).toFixed(1)),
        co2Ppm: 432.4,
        coUgM3: Number((baseCo + 8.5).toFixed(1)),
        no2UgM3: Number((baseNo2 + 1.1).toFixed(2)),
        so2UgM3: Number((baseSo2 + 0.3).toFixed(2)),
        o3UgM3: Number((baseO3 + 2.4).toFixed(1)),
        o2Pct: 20.94,
        pm25UgM3: Number((basePm25 + 1.2).toFixed(1)),
        pm10UgM3: Number((basePm10 + 2.1).toFixed(1)),
        isSimulated: true, // Strictly marked as Simulated Bench Test
      }),
    });

    if (res.ok) {
      await loadUserCloudData();
      await loadAtmosphericBundle(currentLocation);
      showNotice(
        `Ingested Simulated Bench Packet for ${device.deviceName} (tagged Simulated).`
      );
    }
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#070B14] text-slate-100">
      {/* Required Google Maps Platform Demo Key Quota Banner */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Navbar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />

      <LocationCommandBar
        currentLocation={currentLocation}
        onSelectLocation={(loc) => setCurrentLocation(loc)}
        tempUnit={tempUnit}
        onToggleUnit={setTempUnit}
        savedLocations={savedLocations}
        onSaveCurrentLocation={handleSaveCurrentLocation}
        onDeleteSavedLocation={handleDeleteSavedLocation}
        onRecordSnapshot={handleRecordSnapshot}
        onRefresh={() => loadAtmosphericBundle(currentLocation)}
        isRefreshing={loadingBundle}
        isSavingSnapshot={savingSnapshot}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />

      {/* Action / Auth Feedback Banner */}
      {(toastMessage || authError) && (
        <div className="max-w-[1380px] w-full mx-auto px-4 sm:px-6 pt-4">
          {toastMessage && (
            <div className="px-4 py-2.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-xs text-cyan-200">
              {toastMessage}
            </div>
          )}
          {authError && (
            <div className="px-4 py-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between gap-4 mt-2">
              <span>{authError}</span>
              <button
                type="button"
                onClick={clearAuthError}
                className="text-rose-300 underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {loadingBundle && !bundle ? (
          <div className="space-y-6">
            <div className="h-56 rounded-xl bg-[#0D1424] border border-slate-800/80 animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 rounded-xl bg-[#0D1424] border border-slate-800/80 animate-pulse" />
              <div className="h-80 rounded-xl bg-[#0D1424] border border-slate-800/80 animate-pulse" />
            </div>
          </div>
        ) : bundleError && !bundle ? (
          <div className="rounded-xl border border-rose-800/60 bg-rose-950/20 p-8 text-center space-y-3">
            <p className="text-base font-display font-semibold text-rose-200">
              Atmospheric Telemetry Temporarily Unavailable
            </p>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              {bundleError}
            </p>
            <button
              type="button"
              onClick={() => loadAtmosphericBundle(currentLocation)}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
            >
              Retry Telemetry Fetch
            </button>
          </div>
        ) : bundle ? (
          <>
            {activeSection === 'overview' && (
              <div className="space-y-8">
                <CurrentWeatherHero bundle={bundle} tempUnit={tempUnit} />
                <AiAssistantPanel bundle={bundle} />
                <GasAndAirQualityPanel bundle={bundle} />
                <InteractiveEnvMap
                  bundle={bundle}
                  tempUnit={tempUnit}
                  iotDevices={iotDevices}
                  onProbeCoordinates={(loc) => setCurrentLocation(loc)}
                />
                <HistoricalAndMlPanel
                  bundle={bundle}
                  tempUnit={tempUnit}
                  snapshots={snapshots}
                  onRecordSnapshot={handleRecordSnapshot}
                  isSavingSnapshot={savingSnapshot}
                />
              </div>
            )}

            {activeSection === 'atmosphere' && (
              <div className="space-y-8">
                <GasAndAirQualityPanel bundle={bundle} />
                <AiAssistantPanel bundle={bundle} />
              </div>
            )}

            {activeSection === 'map' && (
              <div className="space-y-8">
                <InteractiveEnvMap
                  bundle={bundle}
                  tempUnit={tempUnit}
                  iotDevices={iotDevices}
                  onProbeCoordinates={(loc) => setCurrentLocation(loc)}
                />
                <CurrentWeatherHero bundle={bundle} tempUnit={tempUnit} />
              </div>
            )}

            {activeSection === 'analytics' && (
              <HistoricalAndMlPanel
                bundle={bundle}
                tempUnit={tempUnit}
                snapshots={snapshots}
                onRecordSnapshot={handleRecordSnapshot}
                isSavingSnapshot={savingSnapshot}
              />
            )}

            {activeSection === 'iot' && (
              <Esp32IotPanel
                bundle={bundle}
                devices={iotDevices}
                readings={iotReadings}
                onRegisterDevice={handleRegisterDevice}
                onDeleteDevice={handleDeleteDevice}
                onSendBenchSimulatedReading={handleSendBenchSimulatedReading}
              />
            )}
          </>
        ) : null}
      </main>

      {/* Quiet Scientific Attribution Footer */}
      <footer className="border-t border-slate-800/80 py-5 px-6 text-xs text-slate-500">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            AtmosphereX Environmental Intelligence · Meteorological & CAMS Air Quality data via Open-Meteo · Dry-air standards per ISO 2533
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSection('atmosphere')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Provenance Methodology
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('iot')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              ESP32 Ingestion API
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardShell />
    </AuthProvider>
  );
}
