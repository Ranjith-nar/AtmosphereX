import React, { useState } from 'react';
import { Check, Copy, Cpu, Play, Plus, Trash2 } from 'lucide-react';
import {
  AtmosphericBundleResponse,
  IotDeviceRecord,
  IotReadingRecord,
} from '../types/atmosphere';
import { useAuth } from '../context/AuthContext';
import esp32SensorImg from '../assets/images/esp32_sensor_node_1793634552115.jpg';

interface Esp32IotPanelProps {
  bundle: AtmosphericBundleResponse;
  devices: IotDeviceRecord[];
  readings: IotReadingRecord[];
  onRegisterDevice: (payload: {
    deviceName: string;
    sensorModel: string;
    latitude: number;
    longitude: number;
    locationLabel: string;
  }) => Promise<void>;
  onDeleteDevice: (id: number) => Promise<void>;
  onSendBenchSimulatedReading: (device: IotDeviceRecord) => Promise<void>;
}

export const Esp32IotPanel: React.FC<Esp32IotPanelProps> = ({
  bundle,
  devices,
  readings,
  onRegisterDevice,
  onDeleteDevice,
  onSendBenchSimulatedReading,
}) => {
  const { user, signInWithGoogle } = useAuth();
  const [imgError, setImgError] = useState(false);

  const [deviceName, setDeviceName] = useState('Roof-Node-01');
  const [sensorModel, setSensorModel] = useState(
    'ESP32-S3 + PMS5003 + SCD41 + BME680 + MiCS-6814'
  );
  const [submitting, setSubmitting] = useState(false);
  const [simulatingDeviceId, setSimulatingDeviceId] = useState<number | null>(
    null
  );
  const [selectedDeviceForCode, setSelectedDeviceForCode] = useState<
    number | null
  >(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeDevice =
    devices.find((d) => d.id === selectedDeviceForCode) ?? devices[0] ?? null;

  const ingestEndpoint = `${window.location.origin}/api/iot/ingest`;

  const copyText = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onRegisterDevice({
        deviceName: deviceName.trim(),
        sensorModel: sensorModel.trim(),
        latitude: bundle.location.latitude,
        longitude: bundle.location.longitude,
        locationLabel: bundle.location.name,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const arduinoSketch = activeDevice
    ? `#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* INGEST_URL = "${ingestEndpoint}";
const char* DEVICE_KEY = "${activeDevice.apiKey}";

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
}

void loop() {
  // Replace variables below with actual I2C/UART reads from SCD41, PMS5003 & BME680
  float tempC = 21.4;
  float rhPct = 54.0;
  float pressHpa = 1012.8;
  float co2Ppm = 428.5;
  float pm25 = 8.4;
  float pm10 = 15.2;

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(INGEST_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-key", DEVICE_KEY);

    String payload = String("{\\"temperatureC\\":") + tempC +
                     ",\\"humidityPct\\":" + rhPct +
                     ",\\"pressureHpa\\":" + pressHpa +
                     ",\\"co2Ppm\\":" + co2Ppm +
                     ",\\"pm25UgM3\\":" + pm25 +
                     ",\\"pm10UgM3\\":" + pm10 +
                     ",\\"isSimulated\\":false}";

    int code = http.POST(payload);
    Serial.printf("AtmosphereX Ingest HTTP %d\\n", code);
    http.end();
  }
  delay(60000); // Push every 60s
}`
    : '';

  return (
    <div className="space-y-6">
      {/* Hardware Architecture & Registration Split */}
      <section className="rounded-xl border border-slate-800/80 bg-[#0D1424]/85 backdrop-blur-md p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Hardware Showcase Visual */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-display font-semibold text-slate-100">
                ESP32 IoT Atmospheric Sensor Integration
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect physical ESP32 microcontrollers equipped with NDIR CO₂ (SCD41), laser scattering particulate (PMS5003), barometric (BME680), and MOX trace gas (MiCS-6814) sensors. Hardware payloads post directly to `/api/iot/ingest` and are tagged as{' '}
                <strong className="font-mono text-emerald-400 font-medium">
                  Measured
                </strong>
                , while bench tests are strictly isolated as{' '}
                <strong className="font-mono text-amber-400 font-medium">
                  Simulated
                </strong>
                .
              </p>
            </div>

            <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#070B14] aspect-video">
              {!imgError ? (
                <img
                  src={esp32SensorImg}
                  alt="ESP32 environmental sensor node with PMS5003, SCD41, and BME680 inside anodized weatherproof enclosure"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-[#070B14] p-4 text-center">
                  <Cpu className="w-8 h-8 text-cyan-400 mb-2" />
                  <p className="text-xs font-mono text-slate-300">
                    ESP32 Environmental Telemetry Array (PMS5003 · SCD41 · BME680)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Provisioning & Registered Fleet */}
          <div className="lg:col-span-7 lg:border-l border-slate-800/80 lg:pl-8 flex flex-col justify-between space-y-6">
            {!user ? (
              <div className="my-auto py-8 text-center space-y-3">
                <p className="text-sm font-medium text-slate-200">
                  Google Authentication Required for Hardware Provisioning
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Sign in with Google to register ESP32 sensor nodes, generate unique `x-device-key` ingestion credentials, and persist live hardware readings.
                </p>
                <button
                  type="button"
                  onClick={() => signInWithGoogle()}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
                >
                  Sign in with Google
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-display font-semibold text-slate-100">
                      Provision New ESP32 Node at {bundle.location.name}
                    </h3>
                    <span className="text-xs font-mono text-slate-400 tabular-nums">
                      {bundle.location.latitude.toFixed(3)}°,{' '}
                      {bundle.location.longitude.toFixed(3)}°
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Node Identifier
                      </label>
                      <input
                        type="text"
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Sensor Bus Configuration
                      </label>
                      <input
                        type="text"
                        value={sensorModel}
                        onChange={(e) => setSensorModel(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {submitting ? 'Provisioning Key...' : 'Register ESP32 Node'}
                  </button>
                </form>

                {/* Fleet List */}
                <div className="pt-4 border-t border-slate-800/80 space-y-3">
                  <h3 className="text-sm font-display font-semibold text-slate-100">
                    Registered Sensor Nodes ({devices.length})
                  </h3>

                  {devices.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3">
                      No ESP32 nodes registered yet. Click "Register ESP32 Node" above to generate an ingestion key and firmware sketch.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-800/70">
                      {devices.map((dev) => {
                        const isSelected = activeDevice?.id === dev.id;
                        return (
                          <div
                            key={dev.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedDeviceForCode(dev.id)}
                                  className={`text-xs font-semibold truncate cursor-pointer ${
                                    isSelected
                                      ? 'text-cyan-400'
                                      : 'text-slate-100 hover:text-cyan-300'
                                  }`}
                                >
                                  {dev.deviceName}
                                </button>
                                <span className="text-xs text-slate-500">·</span>
                                <span className="text-xs text-slate-400 truncate">
                                  {dev.locationLabel}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                                Key: {dev.apiKey.slice(0, 14)}… ·{' '}
                                {dev.lastSeenAt
                                  ? `Last packet ${new Date(
                                      dev.lastSeenAt
                                    ).toLocaleTimeString()}`
                                  : 'Awaiting first packet'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => copyText(`key-${dev.id}`, dev.apiKey)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-mono bg-[#070B14] hover:bg-slate-800 border border-slate-800 rounded-md text-slate-300 transition-colors whitespace-nowrap cursor-pointer"
                              >
                                {copiedId === `key-${dev.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-400" />
                                )}
                                Copy Key
                              </button>

                              <button
                                type="button"
                                disabled={simulatingDeviceId === dev.id}
                                onClick={async () => {
                                  setSimulatingDeviceId(dev.id);
                                  try {
                                    await onSendBenchSimulatedReading(dev);
                                  } finally {
                                    setSimulatingDeviceId(null);
                                  }
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-md text-amber-300 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                              >
                                <Play className="w-3 h-3" />
                                {simulatingDeviceId === dev.id
                                  ? 'Sending...'
                                  : 'Send Simulated Bench Packet'}
                              </button>

                              <button
                                type="button"
                                onClick={() => onDeleteDevice(dev.id)}
                                title="Delete device"
                                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Firmware Sketch & Live Ingestion Log */}
      {user && activeDevice && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          <section className="xl:col-span-6 rounded-xl border border-slate-800/80 bg-[#0D1424]/85 backdrop-blur-md p-6 flex flex-col">
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-display font-semibold text-slate-100">
                  Arduino / PlatformIO Firmware ({activeDevice.deviceName})
                </h3>
                <p className="text-xs text-slate-400">
                  Posts real sensor values with `isSimulated: false` (`Measured` provenance)
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyText('sketch', arduinoSketch)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#070B14] hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedId === 'sketch' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                )}
                {copiedId === 'sketch' ? 'Copied' : 'Copy Sketch'}
              </button>
            </div>
            <pre className="flex-1 p-4 rounded-lg bg-[#070B14] border border-slate-800/90 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {arduinoSketch}
            </pre>
          </section>

          <section className="xl:col-span-6 rounded-xl border border-slate-800/80 bg-[#0D1424]/85 backdrop-blur-md p-6 flex flex-col">
            <div className="pb-3 mb-3 border-b border-slate-800/80">
              <h3 className="text-sm font-display font-semibold text-slate-100">
                Ingested ESP32 Sensor Packets ({readings.length})
              </h3>
              <p className="text-xs text-slate-400">
                Strictly distinguishes hardware-measured packets from bench-simulated packets
              </p>
            </div>

            {readings.length === 0 ? (
              <div className="my-auto py-8 text-center text-xs text-slate-400">
                No telemetry packets received yet. Flash the firmware sketch to an ESP32 or click "Send Simulated Bench Packet" to verify ingestion.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400">
                      <th className="py-2 pr-2 font-medium">Time</th>
                      <th className="py-2 px-2 font-medium">Provenance</th>
                      <th className="py-2 px-2 font-medium text-right">CO₂</th>
                      <th className="py-2 px-2 font-medium text-right">PM2.5</th>
                      <th className="py-2 pl-2 font-medium text-right">NO₂ / O₃</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs font-mono tabular-nums">
                    {readings.slice(0, 10).map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 pr-2 text-slate-400 whitespace-nowrap">
                          {new Date(r.recordedAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {r.isSimulated ? (
                            <span className="text-amber-400">
                              Simulated · Bench
                            </span>
                          ) : (
                            <span className="text-emerald-400">
                              Measured · ESP32
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-200 whitespace-nowrap">
                          {r.co2Ppm ?? '—'} ppm
                        </td>
                        <td className="py-2 px-2 text-right text-slate-200 whitespace-nowrap">
                          {r.pm25UgM3 ?? '—'} μg
                        </td>
                        <td className="py-2 pl-2 text-right text-slate-300 whitespace-nowrap">
                          {r.no2UgM3 ?? '—'} / {r.o3UgM3 ?? '—'} μg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
