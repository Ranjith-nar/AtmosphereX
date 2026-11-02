import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Camera,
  LocateFixed,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  GeoLocationInfo,
  SavedLocationRecord,
} from '../types/atmosphere';
import { WorkspaceSection } from './Navbar';

interface LocationCommandBarProps {
  currentLocation: GeoLocationInfo;
  onSelectLocation: (loc: GeoLocationInfo) => void;
  tempUnit: 'C' | 'F';
  onToggleUnit: (unit: 'C' | 'F') => void;
  savedLocations: SavedLocationRecord[];
  onSaveCurrentLocation: () => Promise<void>;
  onDeleteSavedLocation: (id: number) => Promise<void>;
  onRecordSnapshot: () => Promise<void>;
  onRefresh: () => void;
  isRefreshing: boolean;
  isSavingSnapshot: boolean;
  activeSection: WorkspaceSection;
  onSelectSection: (section: WorkspaceSection) => void;
}

const PRESET_CITIES: GeoLocationInfo[] = [
  { name: 'San Francisco', admin1: 'California', country: 'United States', latitude: 37.7749, longitude: -122.4194 },
  { name: 'Tokyo', admin1: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
  { name: 'Zurich', admin1: 'Zurich', country: 'Switzerland', latitude: 47.3769, longitude: 8.5417 },
  { name: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198 },
  { name: 'New Delhi', admin1: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209 },
];

export const LocationCommandBar: React.FC<LocationCommandBarProps> = ({
  currentLocation,
  onSelectLocation,
  tempUnit,
  onToggleUnit,
  savedLocations,
  onSaveCurrentLocation,
  onDeleteSavedLocation,
  onRecordSnapshot,
  onRefresh,
  isRefreshing,
  isSavingSnapshot,
  activeSection,
  onSelectSection,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoLocationInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/locations/search?q=${encodeURIComponent(trimmed)}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 240);

    return () => clearTimeout(handle);
  }, [query]);

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsStatusMsg('Geolocation is not supported by this browser.');
      return;
    }
    setLocatingGps(true);
    setGpsStatusMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        onSelectLocation({
          name: 'Local GPS Coordinates',
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
        });
      },
      () => {
        setLocatingGps(false);
        setGpsStatusMsg(
          'Location permission denied or unavailable. Search a city directly.'
        );
      },
      { timeout: 8000 }
    );
  };

  const isAlreadySaved = savedLocations.some(
    (s) =>
      Math.abs(s.latitude - currentLocation.latitude) < 0.015 &&
      Math.abs(s.longitude - currentLocation.longitude) < 0.015
  );

  return (
    <section className="border-b border-slate-800/80 bg-[#0A101E]/75 backdrop-blur-sm">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-3.5 space-y-3">
        {/* Mobile Workspace Nav Strip */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto pb-1">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'atmosphere', label: 'Gas & AQI' },
              { id: 'map', label: 'Spatial Map' },
              { id: 'analytics', label: 'ML Analytics' },
              { id: 'iot', label: 'ESP32 IoT' },
            ] as Array<{ id: WorkspaceSection; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectSection(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === tab.id
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input + Locate Me */}
          <div className="flex items-center gap-2.5 flex-1 max-w-xl" ref={searchBoxRef}>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onFocus={() => setDropdownOpen(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                placeholder="Search city, observatory, or region (Open-Meteo Geocoding)..."
                aria-label="Search location"
                className="w-full pl-10 pr-4 py-2 text-sm bg-[#070B14] border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />

              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl bg-[#0D1424] border border-slate-800 shadow-2xl overflow-hidden z-50">
                  {query.trim().length < 2 ? (
                    <div className="p-3">
                      <p className="text-[11px] font-medium text-slate-400 mb-2">
                        Global Reference Stations
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {PRESET_CITIES.map((city) => (
                          <button
                            key={city.name}
                            type="button"
                            onClick={() => {
                              onSelectLocation(city);
                              setDropdownOpen(false);
                              setQuery('');
                            }}
                            className="flex items-center justify-between px-2.5 py-2 text-left text-xs rounded-lg hover:bg-slate-800/70 text-slate-200 transition-colors cursor-pointer"
                          >
                            <span className="truncate font-medium">
                              {city.name}
                              {city.country ? `, ${city.country}` : ''}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 tabular-nums ml-2 shrink-0">
                              {city.latitude.toFixed(1)}°, {city.longitude.toFixed(1)}°
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : searching ? (
                    <div className="px-4 py-3 text-xs text-slate-400">
                      Querying Open-Meteo global gazetteer...
                    </div>
                  ) : results.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-400">
                      No matching locations found for "{query}".
                    </div>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto divide-y divide-slate-800/70">
                      {results.map((loc, idx) => (
                        <li key={`${loc.latitude}-${loc.longitude}-${idx}`}>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectLocation(loc);
                              setDropdownOpen(false);
                              setQuery('');
                            }}
                            className="w-full flex items-center justify-between gap-4 px-4 py-2.5 text-left hover:bg-slate-800/70 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-100 truncate">
                                {loc.name}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {[loc.admin1, loc.country].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                            <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
                              {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleUseGps}
              disabled={locatingGps}
              title="Use current device GPS coordinates"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#0D1424] hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <LocateFixed className="w-3.5 h-3.5 text-cyan-400" />
              <span>{locatingGps ? 'Locating...' : 'GPS'}</span>
            </button>
          </div>

          {/* Right Toolbar Controls: Save Station, Snapshot, Refresh, Temp Unit */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSaveCurrentLocation}
              disabled={isAlreadySaved}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#0D1424] hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${
                  isAlreadySaved ? 'text-cyan-400 fill-cyan-400' : 'text-slate-400'
                }`}
              />
              <span>{isAlreadySaved ? 'Station Saved' : 'Save Station'}</span>
            </button>

            <button
              type="button"
              onClick={onRecordSnapshot}
              disabled={isSavingSnapshot}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#0D1424] hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isSavingSnapshot ? 'Logging...' : 'Log Snapshot'}</span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#0D1424] hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-400 ${
                  isRefreshing ? 'animate-spin text-cyan-400' : ''
                }`}
              />
              <span>Refresh</span>
            </button>

            {/* Segmented Unit Control */}
            <div className="flex items-center p-0.5 bg-[#070B14] border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => onToggleUnit('C')}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tempUnit === 'C'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                °C
              </button>
              <button
                type="button"
                onClick={() => onToggleUnit('F')}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tempUnit === 'F'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                °F
              </button>
            </div>
          </div>
        </div>

        {gpsStatusMsg && (
          <p className="text-xs text-amber-400">{gpsStatusMsg}</p>
        )}

        {/* Saved Cloud SQL Monitoring Stations Bar */}
        {savedLocations.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1">
            <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
              Saved Stations:
            </span>
            {savedLocations.map((loc) => {
              const active =
                Math.abs(loc.latitude - currentLocation.latitude) < 0.015 &&
                Math.abs(loc.longitude - currentLocation.longitude) < 0.015;
              return (
                <div
                  key={loc.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                      : 'bg-[#070B14] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onSelectLocation({
                        name: loc.name,
                        country: loc.country ?? undefined,
                        admin1: loc.admin1 ?? undefined,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        elevation: loc.elevation ?? undefined,
                      })
                    }
                    className="cursor-pointer font-medium"
                  >
                    {loc.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSavedLocation(loc.id)}
                    title={`Remove ${loc.name}`}
                    className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
