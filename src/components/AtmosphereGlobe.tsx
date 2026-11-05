import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AtmosphericBundleResponse,
  GeoLocationInfo,
  IotDeviceRecord,
} from '../types/atmosphere';
import { formatTemp } from './CurrentWeatherHero';
import {
  Compass,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Crosshair,
  MapPin,
  Radio,
  Sparkles,
  Info,
} from 'lucide-react';

interface AtmosphereGlobeProps {
  bundle?: AtmosphericBundleResponse | null;
  tempUnit: 'C' | 'F';
  iotDevices?: IotDeviceRecord[];
  onSelectCoordinates: (loc: GeoLocationInfo) => void;
}

// Major continental landmass boundary polygons [lat, lon] in degrees
const WORLD_CONTINENTS: Array<{ name: string; polygon: [number, number][] }> = [
  // North America
  {
    name: 'North America',
    polygon: [
      [71, -156], [70, -130], [68, -100], [60, -75], [52, -56],
      [47, -53], [44, -66], [41, -70], [30, -81], [25, -80],
      [22, -97], [16, -93], [9, -79], [9, -83], [15, -88],
      [20, -105], [30, -115], [34, -120], [38, -123], [48, -125],
      [58, -136], [60, -145], [60, -165], [66, -168], [71, -156]
    ],
  },
  // South America
  {
    name: 'South America',
    polygon: [
      [12, -72], [10, -62], [6, -52], [-2, -44], [-8, -35],
      [-23, -42], [-35, -54], [-46, -65], [-55, -67], [-53, -71],
      [-42, -74], [-30, -71], [-18, -71], [-5, -81], [5, -77],
      [9, -77], [12, -72]
    ],
  },
  // Europe
  {
    name: 'Europe',
    polygon: [
      [71, 28], [68, 50], [60, 55], [52, 38], [45, 36],
      [40, 27], [36, 22], [36, -5], [43, -9], [48, -5],
      [54, 8], [58, 6], [62, 5], [70, 20], [71, 28]
    ],
  },
  // Scandinavia
  {
    name: 'Scandinavia',
    polygon: [
      [71, 26], [60, 30], [56, 12], [58, 6], [64, 11],
      [70, 20], [71, 26]
    ],
  },
  // Africa
  {
    name: 'Africa',
    polygon: [
      [37, 10], [32, 32], [28, 34], [12, 51], [2, 45],
      [-12, 40], [-26, 33], [-34, 26], [-34, 18], [-17, 12],
      [-5, 9], [5, 2], [5, 8], [4, 9], [5, -3],
      [15, -17], [21, -17], [32, -8], [36, -1], [37, 10]
    ],
  },
  // Asia
  {
    name: 'Asia',
    polygon: [
      [77, 104], [70, 160], [65, 179], [60, 165], [52, 142],
      [43, 132], [38, 120], [31, 122], [22, 114], [11, 108],
      [1, 104], [8, 98], [22, 90], [21, 70], [25, 62],
      [13, 48], [13, 44], [28, 34], [37, 36], [42, 50],
      [55, 60], [60, 70], [72, 75], [77, 104]
    ],
  },
  // Indian Subcontinent
  {
    name: 'Indian Subcontinent',
    polygon: [
      [30, 70], [31, 78], [27, 88], [22, 89], [16, 82],
      [8, 77], [13, 74], [21, 69], [25, 67], [30, 70]
    ],
  },
  // Australia
  {
    name: 'Australia',
    polygon: [
      [-12, 131], [-12, 136], [-17, 139], [-11, 142], [-22, 150],
      [-32, 152], [-38, 146], [-38, 140], [-35, 115], [-22, 114],
      [-15, 124], [-12, 131]
    ],
  },
  // Greenland
  {
    name: 'Greenland',
    polygon: [
      [83, -30], [76, -18], [65, -40], [60, -45], [70, -54],
      [78, -68], [82, -50], [83, -30]
    ],
  },
  // United Kingdom & Ireland
  {
    name: 'United Kingdom',
    polygon: [
      [58, -3], [58, -5], [55, -6], [50, -5], [51, 1],
      [53, 0], [55, -1], [58, -3]
    ],
  },
  // Japan
  {
    name: 'Japan',
    polygon: [
      [45, 142], [43, 145], [35, 140], [33, 130], [35, 133],
      [40, 140], [45, 142]
    ],
  },
  // Antarctica
  {
    name: 'Antarctica',
    polygon: [
      [-65, -64], [-68, -40], [-72, 0], [-66, 60], [-66, 100],
      [-66, 140], [-71, 170], [-74, -170], [-72, -120], [-65, -64]
    ],
  },
];

// Atmospheric Hotspot Presets for quick regional targeting
const REGION_PRESETS = [
  { name: 'North America', lat: 38.0, lon: -97.0, desc: 'Continental Weather Systems' },
  { name: 'Europe', lat: 50.0, lon: 10.0, desc: 'Atlantic Jet Stream & Alpine Basins' },
  { name: 'East Asia', lat: 35.0, lon: 120.0, desc: 'Pacific Monsoon & Aerosols' },
  { name: 'South Asia', lat: 21.0, lon: 78.0, desc: 'Tropical Troposphere' },
  { name: 'South America', lat: -15.0, lon: -60.0, desc: 'Amazon Basin Carbon Sink' },
  { name: 'Africa', lat: 5.0, lon: 20.0, desc: 'Saharan Dust & Equator' },
  { name: 'Oceania', lat: -25.0, lon: 135.0, desc: 'Southern Ocean Atmosphere' },
  { name: 'Polar Arctic', lat: 75.0, lon: 0.0, desc: 'Ozone & Vortex Studies' },
];

export const AtmosphereGlobe: React.FC<AtmosphereGlobeProps> = ({
  bundle,
  tempUnit,
  iotDevices = [],
  onSelectCoordinates,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Rotation angles (in degrees): center of orthographic view
  const [centerLon, setCenterLon] = useState<number>(
    bundle ? bundle.location.longitude : -95
  );
  const [centerLat, setCenterLat] = useState<number>(
    bundle ? bundle.location.latitude : 35
  );

  // Zoom scale multiplier (1.0 = normal fit)
  const [zoom, setZoom] = useState<number>(1.0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // Current probed target
  const [targetLat, setTargetLat] = useState<number | null>(
    bundle ? bundle.location.latitude : 37.7749
  );
  const [targetLon, setTargetLon] = useState<number | null>(
    bundle ? bundle.location.longitude : -122.4194
  );
  const [targetName, setTargetName] = useState<string>(
    bundle ? bundle.location.name : 'San Francisco'
  );

  // Hover coordinate tracking
  const [hoverCoord, setHoverCoord] = useState<{
    lat: number;
    lon: number;
    x: number;
    y: number;
  } | null>(null);

  // Mouse drag interaction state
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameIdRef = useRef<number | null>(null);
  const pulsePhaseRef = useRef<number>(0);

  // Update center when bundle location changes externally
  useEffect(() => {
    if (bundle?.location) {
      setTargetLat(bundle.location.latitude);
      setTargetLon(bundle.location.longitude);
      setTargetName(bundle.location.name);
    }
  }, [bundle?.location]);

  // Spherical projection math:
  // Converts lat, lon in degrees to canvas (x, y) coordinates relative to center (cx, cy) and radius R.
  // Returns { x, y, visible } where visible is false if point is on opposite hemisphere.
  const project = useCallback(
    (
      lat: number,
      lon: number,
      cx: number,
      cy: number,
      radius: number,
      cLat: number,
      cLon: number
    ): { x: number; y: number; visible: boolean } => {
      const phi = (lat * Math.PI) / 180;
      const lambda = (lon * Math.PI) / 180;
      const phi0 = (cLat * Math.PI) / 180;
      const lambda0 = (cLon * Math.PI) / 180;

      const cosC =
        Math.sin(phi0) * Math.sin(phi) +
        Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0);

      // Backside of the sphere
      if (cosC < 0) {
        return { x: 0, y: 0, visible: false };
      }

      const x = cx + radius * Math.cos(phi) * Math.sin(lambda - lambda0);
      const y =
        cy -
        radius *
          (Math.cos(phi0) * Math.sin(phi) -
            Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0));

      return { x, y, visible: true };
    },
    []
  );

  // Inverse spherical projection: converts canvas (px, py) to (lat, lon) in degrees
  const unproject = useCallback(
    (
      px: number,
      py: number,
      cx: number,
      cy: number,
      radius: number,
      cLat: number,
      cLon: number
    ): { lat: number; lon: number } | null => {
      const dx = (px - cx) / radius;
      const dy = -(py - cy) / radius; // Invert Y because canvas Y points downwards
      const rho = Math.sqrt(dx * dx + dy * dy);

      if (rho > 1.0) {
        return null; // Click is outside the globe boundary
      }

      const phi0 = (cLat * Math.PI) / 180;
      const lambda0 = (cLon * Math.PI) / 180;

      if (rho === 0) {
        return { lat: cLat, lon: cLon };
      }

      const c = Math.asin(rho);
      const sinC = rho;
      const cosC = Math.sqrt(Math.max(0, 1 - rho * rho));

      const sinLat = cosC * Math.sin(phi0) + (dy * sinC * Math.cos(phi0)) / rho;
      const clampedSinLat = Math.max(-1, Math.min(1, sinLat));
      const lat = Math.asin(clampedSinLat);

      const yPrime = rho * Math.cos(phi0) * cosC - dy * Math.sin(phi0) * sinC;
      const xPrime = dx * sinC;
      const deltaLambda = Math.atan2(xPrime, yPrime);

      let lon = lambda0 + deltaLambda;
      // Normalize to [-PI, PI]
      lon = ((((lon + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;

      return {
        lat: Number(((lat * 180) / Math.PI).toFixed(4)),
        lon: Number(((lon * 180) / Math.PI).toFixed(4)),
      };
    },
    []
  );

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;

    const render = () => {
      if (!isMounted) return;

      // Handle high-DPI crisp rendering
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear with cosmic dark void
      ctx.fillStyle = '#060A12';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle orbital stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      const starSeed = [
        [0.1, 0.15], [0.85, 0.2], [0.2, 0.8], [0.88, 0.75],
        [0.08, 0.55], [0.92, 0.4], [0.45, 0.12], [0.6, 0.88]
      ];
      starSeed.forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(rx * width, ry * height, 1, 0, Math.PI * 2);
        ctx.fill();
      });

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.42;
      const radius = baseRadius * zoom;

      // 1. Atmosphere Halo / Outer Glow (Sci-Fi orbital corona)
      const glowGrad = ctx.createRadialGradient(
        cx, cy, radius * 0.95,
        cx, cy, radius * 1.25
      );
      glowGrad.addColorStop(0, 'rgba(34, 211, 238, 0.22)');
      glowGrad.addColorStop(0.4, 'rgba(6, 182, 212, 0.10)');
      glowGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // 2. Earth Ocean Base (Deep midnight aquatic sphere)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      const oceanGrad = ctx.createRadialGradient(
        cx - radius * 0.35,
        cy - radius * 0.35,
        radius * 0.1,
        cx,
        cy,
        radius
      );
      oceanGrad.addColorStop(0, '#0F2642');
      oceanGrad.addColorStop(0.65, '#091527');
      oceanGrad.addColorStop(1, '#040913');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      // 3. Graticule Grid (Parallels & Meridians)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;

      // Parallels (Latitudes)
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 5) {
          const pt = project(lat, lon, cx, cy, radius, centerLat, centerLon);
          if (pt.visible) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // Meridians (Longitudes)
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -80; lat <= 80; lat += 5) {
          const pt = project(lat, lon, cx, cy, radius, centerLat, centerLon);
          if (pt.visible) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // Equator Accent Line
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let eqStarted = false;
      for (let lon = -180; lon <= 180; lon += 4) {
        const pt = project(0, lon, cx, cy, radius, centerLat, centerLon);
        if (pt.visible) {
          if (!eqStarted) {
            ctx.moveTo(pt.x, pt.y);
            eqStarted = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        } else {
          eqStarted = false;
        }
      }
      ctx.stroke();

      // 4. World Continental Landmasses
      WORLD_CONTINENTS.forEach((continent) => {
        ctx.beginPath();
        let contStarted = false;
        for (const [lat, lon] of continent.polygon) {
          const pt = project(lat, lon, cx, cy, radius, centerLat, centerLon);
          if (pt.visible) {
            if (!contStarted) {
              ctx.moveTo(pt.x, pt.y);
              contStarted = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
        }
        if (contStarted) {
          ctx.closePath();
          // Landmass fill
          ctx.fillStyle = 'rgba(20, 184, 166, 0.22)';
          ctx.fill();
          // Coastline glow
          ctx.strokeStyle = 'rgba(45, 212, 191, 0.65)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });

      // 5. Atmospheric Shading (Curvature Limb Darkening)
      const limbGrad = ctx.createRadialGradient(
        cx, cy, radius * 0.75,
        cx, cy, radius
      );
      limbGrad.addColorStop(0, 'rgba(4, 9, 19, 0)');
      limbGrad.addColorStop(0.85, 'rgba(4, 9, 19, 0.45)');
      limbGrad.addColorStop(1, 'rgba(4, 9, 19, 0.85)');
      ctx.fillStyle = limbGrad;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      // 6. Registered IoT Sensors Nodes
      iotDevices.forEach((device) => {
        // If IoT device has coordinates or mock coordinate
        const devLat = 37.77;
        const devLon = -122.42;
        const pt = project(devLat, devLon, cx, cy, radius, centerLat, centerLon);
        if (pt.visible) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#10B981';
          ctx.fill();
          ctx.strokeStyle = '#34D399';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // 7. Regional Grid Nodes (from Open-Meteo bundle)
      if (bundle?.regionalGrid) {
        bundle.regionalGrid.forEach((node) => {
          if (node.id === 'center') return;
          const pt = project(
            node.latitude,
            node.longitude,
            cx,
            cy,
            radius,
            centerLat,
            centerLon
          );
          if (pt.visible) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
            ctx.fill();
          }
        });
      }

      // 8. Active Target Marker (Probed Location)
      if (targetLat != null && targetLon != null) {
        const targetPt = project(
          targetLat,
          targetLon,
          cx,
          cy,
          radius,
          centerLat,
          centerLon
        );

        if (targetPt.visible) {
          pulsePhaseRef.current = (pulsePhaseRef.current + 0.04) % (Math.PI * 2);
          const pulseScale = Math.sin(pulsePhaseRef.current) * 4 + 10;
          const pulseAlpha = Math.max(0, 0.7 - (pulseScale - 6) / 10);

          // Animated sonar ripple wave
          ctx.beginPath();
          ctx.arc(targetPt.x, targetPt.y, pulseScale, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(34, 211, 238, ${pulseAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Outer targeting reticle ring
          ctx.beginPath();
          ctx.arc(targetPt.x, targetPt.y, 6, 0, Math.PI * 2);
          ctx.strokeStyle = '#22D3EE';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Center target point
          ctx.beginPath();
          ctx.arc(targetPt.x, targetPt.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();

          // Target coordinate label HUD callout
          const tagX = targetPt.x + 10;
          const tagY = targetPt.y - 12;

          ctx.font = '600 10px monospace';
          const labelText = `${targetName || 'Probe'} (${targetLat.toFixed(2)}°, ${targetLon.toFixed(2)}°)`;
          const textWidth = ctx.measureText(labelText).width;

          // Callout backdrop
          ctx.fillStyle = 'rgba(7, 11, 20, 0.88)';
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(tagX, tagY - 10, textWidth + 14, 18, 4);
          ctx.fill();
          ctx.stroke();

          // Callout pointer tick
          ctx.beginPath();
          ctx.moveTo(targetPt.x + 4, targetPt.y - 4);
          ctx.lineTo(tagX, tagY);
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
          ctx.stroke();

          // Callout text
          ctx.fillStyle = '#38BDF8';
          ctx.fillText(labelText, tagX + 7, tagY + 3);
        }
      }

      ctx.restore(); // Restore clip region

      // 9. Sharp Globe Rim Border
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 10. Auto-rotation step
      if (autoRotate && !isDraggingRef.current) {
        setCenterLon((prev) => {
          let next = prev + 0.15;
          if (next > 180) next -= 360;
          return next;
        });
      }

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    bundle,
    centerLat,
    centerLon,
    zoom,
    autoRotate,
    targetLat,
    targetLon,
    targetName,
    iotDevices,
    project,
  ]);

  // Pointer interaction: drag to rotate
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;
    const radius = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.42 * zoom;

    // Update hover coordinates
    const unproj = unproject(px, py, cx, cy, radius, centerLat, centerLon);
    if (unproj) {
      setHoverCoord({ ...unproj, x: px, y: py });
    } else {
      setHoverCoord(null);
    }

    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    // Sensitivity factor
    const sensitivity = 0.45 / zoom;
    setCenterLon((prev) => {
      let next = prev - dx * sensitivity;
      if (next > 180) next -= 360;
      if (next < -180) next += 360;
      return next;
    });

    setCenterLat((prev) => {
      let next = prev + dy * sensitivity;
      // Clamp pitch to [-85, 85] degrees to prevent flip
      return Math.max(-85, Math.min(85, next));
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Click on globe to probe/select coordinates
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;
    const radius = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.42 * zoom;

    const coords = unproject(px, py, cx, cy, radius, centerLat, centerLon);
    if (coords) {
      const generatedName = `Orbital Vector (${coords.lat > 0 ? coords.lat + '°N' : Math.abs(coords.lat) + '°S'}, ${coords.lon > 0 ? coords.lon + '°E' : Math.abs(coords.lon) + '°W'})`;
      setTargetLat(coords.lat);
      setTargetLon(coords.lon);
      setTargetName(generatedName);

      onSelectCoordinates({
        name: generatedName,
        latitude: coords.lat,
        longitude: coords.lon,
      });
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((prev) => Math.max(0.65, Math.min(2.5, prev + delta)));
  };

  // Jump to specific preset location
  const handleSelectPreset = (preset: (typeof REGION_PRESETS)[0]) => {
    setCenterLat(preset.lat);
    setCenterLon(preset.lon);
    setTargetLat(preset.lat);
    setTargetLon(preset.lon);
    setTargetName(preset.name);

    onSelectCoordinates({
      name: preset.name,
      latitude: preset.lat,
      longitude: preset.lon,
    });
  };

  // Reset view to currently active bundle location
  const handleResetToTarget = () => {
    if (targetLat != null && targetLon != null) {
      setCenterLat(targetLat);
      setCenterLon(targetLon);
      setZoom(1.0);
    }
  };

  return (
    <div className="relative w-full h-[520px] bg-[#060A12] select-none overflow-hidden rounded-xl">
      {/* 3D Canvas element */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoverCoord(null);
        }}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Top Left: Target Lock HUD Readout */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="p-3 rounded-lg border border-cyan-500/30 bg-[#070B14]/85 backdrop-blur-md shadow-lg shadow-cyan-950/40 max-w-xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-400">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>ORBITAL TELEMETRY PROBE</span>
          </div>
          <div className="text-sm font-semibold text-slate-100 truncate">
            {targetName || 'Select an area on the globe'}
          </div>
          {targetLat != null && targetLon != null && (
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              LAT {targetLat.toFixed(4)}° · LON {targetLon.toFixed(4)}°
            </div>
          )}
          {bundle && (
            <div className="pt-1 mt-1 border-t border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-300">
              <span>AQI: <span className="text-cyan-300 font-semibold">{bundle.airQuality.usAqi ?? '—'}</span></span>
              <span>Temp: <span className="text-amber-300 font-semibold">{formatTemp(bundle.currentWeather.temperatureC, tempUnit)}°{tempUnit}</span></span>
              <span>Wind: <span className="text-teal-300 font-semibold">{bundle.currentWeather.windSpeedKmh} km/h</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Top Right: Navigation Controls Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setAutoRotate((prev) => !prev)}
          title={autoRotate ? 'Pause Auto Orbit' : 'Resume Auto Orbit'}
          className={`p-2 rounded-lg border backdrop-blur-md transition-all cursor-pointer ${
            autoRotate
              ? 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300 shadow-md shadow-cyan-900/30'
              : 'border-slate-800 bg-[#0D1424]/85 text-slate-400 hover:text-slate-200'
          }`}
        >
          <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin-slow' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => setZoom((prev) => Math.min(2.5, prev + 0.25))}
          title="Zoom In"
          className="p-2 rounded-lg border border-slate-800 bg-[#0D1424]/85 text-slate-400 hover:text-slate-200 hover:border-slate-700 backdrop-blur-md transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setZoom((prev) => Math.max(0.65, prev - 0.25))}
          title="Zoom Out"
          className="p-2 rounded-lg border border-slate-800 bg-[#0D1424]/85 text-slate-400 hover:text-slate-200 hover:border-slate-700 backdrop-blur-md transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleResetToTarget}
          title="Center on Target"
          className="p-2 rounded-lg border border-slate-800 bg-[#0D1424]/85 text-slate-400 hover:text-slate-200 hover:border-slate-700 backdrop-blur-md transition-colors cursor-pointer"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Center: Region Fast-Jump Preset Pills */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider hidden sm:inline mr-1">
            Regions:
          </span>
          {REGION_PRESETS.slice(0, 5).map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-800/80 bg-[#070B14]/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 backdrop-blur-md transition-all cursor-pointer whitespace-nowrap"
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Live Hover Coordinate Readout */}
        <div className="pointer-events-none text-[11px] font-mono text-slate-400 bg-[#070B14]/80 border border-slate-800/80 px-2.5 py-1 rounded-md backdrop-blur-md tabular-nums">
          {hoverCoord ? (
            <span>
              PROBE: {hoverCoord.lat > 0 ? hoverCoord.lat.toFixed(2) + '°N' : Math.abs(hoverCoord.lat).toFixed(2) + '°S'},{' '}
              {hoverCoord.lon > 0 ? hoverCoord.lon.toFixed(2) + '°E' : Math.abs(hoverCoord.lon).toFixed(2) + '°W'}
            </span>
          ) : (
            <span className="text-slate-500">Click anywhere on globe to probe</span>
          )}
        </div>
      </div>
    </div>
  );
};
