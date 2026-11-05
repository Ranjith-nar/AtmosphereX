import React, { useEffect, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  MapMouseEvent,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  AtmosphericBundleResponse,
  GeoLocationInfo,
  IotDeviceRecord,
  RegionalGridNode,
} from '../types/atmosphere';
import { formatTemp } from './CurrentWeatherHero';
import { AtmosphereGlobe } from './AtmosphereGlobe';
import { Globe, Map as MapIcon } from 'lucide-react';

interface InteractiveEnvMapProps {
  bundle: AtmosphericBundleResponse;
  tempUnit: 'C' | 'F';
  iotDevices: IotDeviceRecord[];
  onProbeCoordinates: (loc: GeoLocationInfo) => void;
}

type MapOverlayLayer = 'aqi' | 'pm25' | 'temp' | 'wind';

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

const MapCameraUpdater: React.FC<{ lat: number; lng: number }> = ({
  lat,
  lng,
}) => {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo({ lat, lng });
    }
  }, [map, lat, lng]);
  return null;
};

export const InteractiveEnvMap: React.FC<InteractiveEnvMapProps> = ({
  bundle,
  tempUnit,
  iotDevices,
  onProbeCoordinates,
}) => {
  const [viewMode, setViewMode] = useState<'globe' | 'map'>('globe');
  const [activeLayer, setActiveLayer] = useState<MapOverlayLayer>('aqi');
  const [selectedGridNode, setSelectedGridNode] =
    useState<RegionalGridNode | null>(null);
  const [selectedIotNode, setSelectedIotNode] =
    useState<IotDeviceRecord | null>(null);

  const center = {
    lat: bundle.location.latitude,
    lng: bundle.location.longitude,
  };

  const handleMapClick = (e: MapMouseEvent) => {
    const latLng = e.detail?.latLng;
    if (!latLng) return;
    setSelectedGridNode(null);
    setSelectedIotNode(null);
    onProbeCoordinates({
      name: `Spatial Probe (${latLng.lat.toFixed(3)}°, ${latLng.lng.toFixed(3)}°)`,
      latitude: Number(latLng.lat.toFixed(4)),
      longitude: Number(latLng.lng.toFixed(4)),
    });
  };

  const formatNodeValue = (node: RegionalGridNode): string => {
    if (activeLayer === 'aqi') {
      return node.usAqi != null ? `AQI ${node.usAqi}` : 'AQI —';
    }
    if (activeLayer === 'pm25') {
      return node.pm25UgM3 != null ? `${node.pm25UgM3} μg` : '—';
    }
    if (activeLayer === 'temp') {
      return node.temperatureC != null
        ? `${formatTemp(node.temperatureC, tempUnit)}°${tempUnit}`
        : '—';
    }
    return node.windSpeedKmh != null ? `${node.windSpeedKmh} km/h` : '—';
  };

  const getNodeBorderClass = (node: RegionalGridNode, isCenter: boolean) => {
    if (isCenter) {
      return 'border-cyan-400 bg-[#070B14] text-cyan-200 shadow-lg shadow-cyan-500/20';
    }
    const aqi = node.usAqi ?? 35;
    if (aqi > 150) return 'border-rose-500/80 bg-[#0D1424]/95 text-rose-200';
    if (aqi > 100) return 'border-amber-400/80 bg-[#0D1424]/95 text-amber-200';
    return 'border-slate-700 bg-[#0D1424]/95 text-slate-200';
  };

  return (
    <section className="rounded-xl border border-slate-800/80 bg-[#0D1424]/85 backdrop-blur-md overflow-hidden">
      <div className="p-5 border-b border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-semibold text-slate-100">
            Interactive Spatial Atmospheric Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {viewMode === 'globe'
              ? '3D Orbital Globe · Drag to orbit, wheel to zoom, or click anywhere to probe atmospheric telemetry'
              : '2D Sector Grid · Showing live 9-sector Open-Meteo regional telemetry grid'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher: 3D Orbital Globe vs 2D Sector Grid */}
          <div className="flex items-center gap-1 p-1 bg-[#070B14] border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('globe')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === 'globe'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D Orbital Globe</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>2D Sector Grid</span>
            </button>
          </div>

          {/* Layer Switcher (for 2D Map) */}
          {viewMode === 'map' && (
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#070B14] border border-slate-800 rounded-lg">
              {(
                [
                  { id: 'aqi', label: 'US AQI' },
                  { id: 'pm25', label: 'PM2.5' },
                  { id: 'temp', label: 'Temperature' },
                  { id: 'wind', label: 'Wind Vector' },
                ] as Array<{ id: MapOverlayLayer; label: string }>
              ).map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setActiveLayer(layer.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeLayer === layer.id
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Container: 3D Globe or 2D Map */}
      <div className="relative w-full bg-[#070B14]">
        {viewMode === 'globe' ? (
          <AtmosphereGlobe
            bundle={bundle}
            tempUnit={tempUnit}
            iotDevices={iotDevices}
            onSelectCoordinates={onProbeCoordinates}
          />
        ) : !GOOGLE_MAPS_API_KEY ? (
          <div className="h-[500px] w-full flex items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-3">
              <p className="text-sm font-medium text-slate-200">
                Google Maps API Key Not Configured
              </p>
              <p className="text-xs text-slate-400">
                You can explore using the 3D Orbital Globe without any API key required, or configure VITE_GOOGLE_MAPS_API_KEY for 2D satellite street mapping.
              </p>
              <button
                type="button"
                onClick={() => setViewMode('globe')}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Return to 3D Orbital Globe</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative h-[500px] w-full">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
              <Map
                mapId="DEMO_MAP_ID"
                defaultCenter={center}
                defaultZoom={11}
                gestureHandling="cooperative"
                colorScheme="DARK"
                onClick={handleMapClick}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                className="w-full h-full"
              >
                <MapCameraUpdater lat={center.lat} lng={center.lng} />

                {/* Regional 9-Sector Open-Meteo Telemetry Grid */}
                {bundle.regionalGrid.map((node) => {
                  const isCenter = node.id === 'center';
                  return (
                    <AdvancedMarker
                      key={node.id}
                      position={{ lat: node.latitude, lng: node.longitude }}
                      onClick={() => {
                        setSelectedIotNode(null);
                        setSelectedGridNode(node);
                      }}
                      title={`${node.label}: AQI ${node.usAqi ?? '—'}`}
                    >
                      <div
                        className={`px-2.5 py-1 rounded-md border text-[11px] font-mono font-semibold tabular-nums transition-transform hover:scale-105 cursor-pointer ${getNodeBorderClass(
                          node,
                          isCenter
                        )}`}
                      >
                        {isCenter ? '⊕ ' : ''}
                        {formatNodeValue(node)}
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {/* Fallback Primary Marker if regional grid is empty */}
                {bundle.regionalGrid.length === 0 && (
                  <AdvancedMarker
                    position={center}
                    title={bundle.location.name}
                  >
                    <div className="px-3 py-1.5 rounded-md border border-cyan-400 bg-[#070B14] text-cyan-200 text-xs font-mono font-semibold tabular-nums shadow-lg">
                      ⊕ {bundle.location.name} · AQI {bundle.airQuality.usAqi ?? '—'}
                    </div>
                  </AdvancedMarker>
                )}

                {/* Registered ESP32 IoT Hardware Nodes */}
                {iotDevices.map((dev) => (
                  <AdvancedMarker
                    key={`iot-${dev.id}`}
                    position={{ lat: dev.latitude, lng: dev.longitude }}
                    onClick={() => {
                      setSelectedGridNode(null);
                      setSelectedIotNode(dev);
                    }}
                    title={`ESP32 Node: ${dev.deviceName}`}
                  >
                    <div className="px-2.5 py-1 rounded-md border border-emerald-400 bg-emerald-950/90 text-emerald-200 text-[11px] font-mono font-semibold whitespace-nowrap cursor-pointer">
                      ESP32 · {dev.deviceName}
                    </div>
                  </AdvancedMarker>
                ))}

                {/* InfoWindow for Regional Sector Node */}
                {selectedGridNode && (
                  <InfoWindow
                    position={{
                      lat: selectedGridNode.latitude,
                      lng: selectedGridNode.longitude,
                    }}
                    onCloseClick={() => setSelectedGridNode(null)}
                  >
                    <div className="text-slate-900 p-1 min-w-[190px] space-y-1.5 font-sans">
                      <p className="text-xs font-bold">
                        {selectedGridNode.label} (Estimated · Open-Meteo)
                      </p>
                      <div className="text-[11px] font-mono space-y-0.5 tabular-nums">
                        <p>
                          Coords: {selectedGridNode.latitude.toFixed(3)}°,{' '}
                          {selectedGridNode.longitude.toFixed(3)}°
                        </p>
                        <p>US AQI: {selectedGridNode.usAqi ?? '—'}</p>
                        <p>PM2.5: {selectedGridNode.pm25UgM3 ?? '—'} μg/m³</p>
                        <p>
                          Temp:{' '}
                          {selectedGridNode.temperatureC != null
                            ? `${formatTemp(selectedGridNode.temperatureC, tempUnit)} °${tempUnit}`
                            : '—'}
                        </p>
                        <p>Wind: {selectedGridNode.windSpeedKmh ?? '—'} km/h</p>
                      </div>
                      {selectedGridNode.id !== 'center' && (
                        <button
                          type="button"
                          onClick={() => {
                            onProbeCoordinates({
                              name: `${bundle.location.name} (${selectedGridNode.label})`,
                              country: bundle.location.country,
                              latitude: selectedGridNode.latitude,
                              longitude: selectedGridNode.longitude,
                            });
                            setSelectedGridNode(null);
                          }}
                          className="mt-1 w-full px-2.5 py-1 text-[11px] font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 cursor-pointer"
                        >
                          Load Full Station Telemetry
                        </button>
                      )}
                    </div>
                  </InfoWindow>
                )}

                {/* InfoWindow for ESP32 IoT Hardware Node */}
                {selectedIotNode && (
                  <InfoWindow
                    position={{
                      lat: selectedIotNode.latitude,
                      lng: selectedIotNode.longitude,
                    }}
                    onCloseClick={() => setSelectedIotNode(null)}
                  >
                    <div className="text-slate-900 p-1 min-w-[190px] space-y-1 font-sans">
                      <p className="text-xs font-bold">
                        ESP32 Node: {selectedIotNode.deviceName}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {selectedIotNode.sensorModel} · {selectedIotNode.locationLabel}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onProbeCoordinates({
                            name: selectedIotNode.locationLabel,
                            latitude: selectedIotNode.latitude,
                            longitude: selectedIotNode.longitude,
                          });
                          setSelectedIotNode(null);
                        }}
                        className="mt-1 w-full px-2.5 py-1 text-[11px] font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 cursor-pointer"
                      >
                        Inspect Node Atmosphere
                      </button>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          </div>
        )}
      </div>

      {/* Bottom Spatial Coordinate Readout Strip */}
      <div className="px-5 py-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400 tabular-nums">
        <span>
          Active Probe: {center.lat.toFixed(4)}°N, {center.lng.toFixed(4)}°E
        </span>
        <span>
          {viewMode === 'globe'
            ? 'Interactive Orthographic Projection · Real-Time Spherical Raycasting'
            : 'Grid Resolution: 3×3 Open-Meteo Spatial Array (~14 km sector spacing)'}
        </span>
      </div>
    </section>
  );
};
