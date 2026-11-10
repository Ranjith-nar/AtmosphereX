import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AtmosphericBundleResponse,
  GeoLocationInfo,
  IotDeviceRecord,
} from '../types/atmosphere';
import {
  WORLD_COUNTRIES,
  WORLD_CITIES,
  WorldCity,
  WorldCountry,
  findCountryForCoord,
} from '../data/worldGeoData';
import { formatTemp } from './CurrentWeatherHero';
import {
  RotateCw,
  ZoomIn,
  ZoomOut,
  Crosshair,
  MapPin,
  Radio,
  Globe2,
  Compass,
} from 'lucide-react';

interface AtmosphereGlobeProps {
  bundle?: AtmosphericBundleResponse | null;
  tempUnit: 'C' | 'F';
  iotDevices?: IotDeviceRecord[];
  onSelectCoordinates: (loc: GeoLocationInfo) => void;
}

// Atmospheric Regional Presets for fast camera targeting
const REGION_PRESETS = [
  { name: 'North America', lat: 38.0, lon: -97.0 },
  { name: 'Europe', lat: 50.0, lon: 10.0 },
  { name: 'East Asia', lat: 35.0, lon: 120.0 },
  { name: 'South Asia', lat: 21.0, lon: 78.0 },
  { name: 'South America', lat: -15.0, lon: -60.0 },
  { name: 'Africa', lat: 5.0, lon: 20.0 },
  { name: 'Oceania', lat: -25.0, lon: 135.0 },
  { name: 'Polar Arctic', lat: 75.0, lon: 0.0 },
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

  // Hover coordinate & entity tracking
  const [hoverCoord, setHoverCoord] = useState<{
    lat: number;
    lon: number;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredCity, setHoveredCity] = useState<WorldCity | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<WorldCountry | null>(null);

  // Interaction tracking state
  const isDraggingRef = useRef(false);
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartTimeRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1.0);

  const animFrameIdRef = useRef<number | null>(null);
  const pulsePhaseRef = useRef<number>(0);

  // Cache rendered cities for hit-testing
  const visibleCitiesRef = useRef<
    Array<{ city: WorldCity; screenX: number; screenY: number }>
  >([]);

  // Update target when bundle location changes externally
  useEffect(() => {
    if (bundle?.location) {
      setTargetLat(bundle.location.latitude);
      setTargetLon(bundle.location.longitude);
      setTargetName(bundle.location.name);
    }
  }, [bundle?.location]);

  // Spherical projection math:
  // Converts lat, lon in degrees to canvas (x, y) coordinates relative to center (cx, cy) and radius R.
  // Returns { x, y, visible, cosC }
  const project = useCallback(
    (
      lat: number,
      lon: number,
      cx: number,
      cy: number,
      radius: number,
      cLat: number,
      cLon: number
    ): { x: number; y: number; visible: boolean; cosC: number } => {
      const phi = (lat * Math.PI) / 180;
      const lambda = (lon * Math.PI) / 180;
      const phi0 = (cLat * Math.PI) / 180;
      const lambda0 = (cLon * Math.PI) / 180;

      const cosC =
        Math.sin(phi0) * Math.sin(phi) +
        Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0);

      // Backside of the sphere
      if (cosC < 0) {
        return { x: 0, y: 0, visible: false, cosC };
      }

      const x = cx + radius * Math.cos(phi) * Math.sin(lambda - lambda0);
      const y =
        cy -
        radius *
          (Math.cos(phi0) * Math.sin(phi) -
            Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0));

      return { x, y, visible: true, cosC };
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

      // Draw subtle orbital background stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      const starSeed = [
        [0.1, 0.15], [0.85, 0.2], [0.2, 0.8], [0.88, 0.75],
        [0.08, 0.55], [0.92, 0.4], [0.45, 0.12], [0.6, 0.88],
        [0.18, 0.35], [0.75, 0.1], [0.35, 0.9], [0.82, 0.6],
        [0.28, 0.22], [0.68, 0.72], [0.52, 0.05], [0.14, 0.92]
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
      glowGrad.addColorStop(0, 'rgba(34, 211, 238, 0.25)');
      glowGrad.addColorStop(0.35, 'rgba(6, 182, 212, 0.12)');
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
        for (let lon = -180; lon <= 180; lon += 4) {
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
        for (let lat = -80; lat <= 80; lat += 4) {
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
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.38)';
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

      // 4. World Countries (Fills and Borders with Horizon Segment Interpolation)
      WORLD_COUNTRIES.forEach((country) => {
        const isHovered = hoveredCountry?.id === country.id;

        country.polygons.forEach((poly) => {
          ctx.beginPath();
          let pathActive = false;

          for (let i = 0; i < poly.length; i++) {
            const p1 = poly[i];
            const p2 = poly[(i + 1) % poly.length];

            const pt1 = project(p1[0], p1[1], cx, cy, radius, centerLat, centerLon);
            const pt2 = project(p2[0], p2[1], cx, cy, radius, centerLat, centerLon);

            if (pt1.visible && pt2.visible) {
              if (!pathActive) {
                ctx.moveTo(pt1.x, pt1.y);
                pathActive = true;
              }
              ctx.lineTo(pt2.x, pt2.y);
            } else if (pt1.visible && !pt2.visible) {
              // Interpolate smooth crossing to spherical horizon
              const t = Math.max(0, Math.min(1, pt1.cosC / (pt1.cosC - pt2.cosC || 0.001)));
              const midLat = p1[0] + t * (p2[0] - p1[0]);
              let midLon = p1[1] + t * (p2[1] - p1[1]);
              const limbPt = project(midLat, midLon, cx, cy, radius, centerLat, centerLon);
              if (pathActive) {
                ctx.lineTo(limbPt.x, limbPt.y);
              }
              pathActive = false;
            } else if (!pt1.visible && pt2.visible) {
              // Enter smoothly from horizon
              const t = Math.max(0, Math.min(1, -pt1.cosC / (pt2.cosC - pt1.cosC || 0.001)));
              const midLat = p1[0] + t * (p2[0] - p1[0]);
              let midLon = p1[1] + t * (p2[1] - p1[1]);
              const limbPt = project(midLat, midLon, cx, cy, radius, centerLat, centerLon);
              ctx.moveTo(limbPt.x, limbPt.y);
              ctx.lineTo(pt2.x, pt2.y);
              pathActive = true;
            } else {
              pathActive = false;
            }
          }

          // Landmass polygon fill
          ctx.fillStyle = isHovered
            ? 'rgba(34, 211, 238, 0.32)'
            : 'rgba(20, 184, 166, 0.22)';
          ctx.fill();

          // Country border line
          ctx.strokeStyle = isHovered
            ? 'rgba(34, 211, 238, 0.90)'
            : 'rgba(45, 212, 191, 0.65)';
          ctx.lineWidth = isHovered ? 1.8 : 1.2;
          ctx.stroke();
        });

        // 4b. Country Centroid Label (Adaptive visibility across zoom)
        const countryPt = project(
          country.lat,
          country.lon,
          cx,
          cy,
          radius,
          centerLat,
          centerLon
        );

        if (countryPt.visible && countryPt.cosC > 0.28) {
          const showCountryLabel = zoom >= 0.85 || country.continent !== 'Antarctica';
          if (showCountryLabel) {
            ctx.save();
            ctx.font = '600 9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillStyle = isHovered
              ? 'rgba(34, 211, 238, 0.95)'
              : 'rgba(148, 163, 184, 0.70)';
            ctx.fillText(country.name.toUpperCase(), countryPt.x, countryPt.y);
            ctx.restore();
          }
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

      // 8. World Cities Rendering (Markers, Glowing Nodes, and Collision-Avoided Labels)
      const renderedCityPositions: Array<{
        city: WorldCity;
        screenX: number;
        screenY: number;
      }> = [];

      const candidateCities = WORLD_CITIES.filter((city) => {
        if (city.tier === 1) return true;
        if (city.tier === 2) return zoom >= 0.95;
        return zoom >= 1.35;
      });

      // Render city markers
      candidateCities.forEach((city) => {
        const pt = project(city.lat, city.lon, cx, cy, radius, centerLat, centerLon);
        if (!pt.visible || pt.cosC <= 0.08) return;

        const isHovered = hoveredCity?.name === city.name;
        renderedCityPositions.push({ city, screenX: pt.x, screenY: pt.y });

        // Marker radius scaled smoothly with zoom
        const markerBaseRadius = city.tier === 1 ? 3.5 : 2.5;
        const markerRadius = Math.min(6, markerBaseRadius * Math.sqrt(zoom));

        // Pulsing glow for capitals or hovered city
        if (isHovered || city.isCapital) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, markerRadius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = city.isCapital
            ? 'rgba(251, 191, 36, 0.28)'
            : 'rgba(34, 211, 238, 0.35)';
          ctx.fill();
        }

        // Marker Outer Ring
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, markerRadius, 0, Math.PI * 2);
        ctx.fillStyle = city.isCapital ? '#F59E0B' : '#06B6D4';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Marker Center Core
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, markerRadius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // City Label (with high-contrast pill backdrop)
        const shouldShowLabel =
          isHovered ||
          city.tier === 1 ||
          (city.tier === 2 && zoom >= 1.25) ||
          zoom >= 1.6;

        if (shouldShowLabel) {
          ctx.save();
          ctx.font = isHovered
            ? '600 11px system-ui, sans-serif'
            : '500 10px system-ui, sans-serif';
          const labelText = city.name;
          const textMetrics = ctx.measureText(labelText);
          const textWidth = textMetrics.width;

          const pillX = pt.x + markerRadius + 4;
          const pillY = pt.y - 7;
          const pillWidth = textWidth + 8;
          const pillHeight = 16;

          // Draw dark frosted pill backdrop for maximum legibility
          ctx.fillStyle = isHovered
            ? 'rgba(7, 11, 20, 0.95)'
            : 'rgba(7, 11, 20, 0.82)';
          ctx.strokeStyle = isHovered
            ? 'rgba(34, 211, 238, 0.85)'
            : 'rgba(56, 189, 248, 0.35)';
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 4);
          ctx.fill();
          ctx.stroke();

          // City text label
          ctx.fillStyle = isHovered ? '#38BDF8' : '#F1F5F9';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, pillX + 4, pillY + pillHeight / 2);
          ctx.restore();
        }
      });

      visibleCitiesRef.current = renderedCityPositions;

      // 9. Active Target Marker (Probed Location)
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
          ctx.fillStyle = 'rgba(7, 11, 20, 0.90)';
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(tagX, tagY - 10, textWidth + 14, 18, 4);
          ctx.fill();
          ctx.stroke();

          // Callout pointer tick
          ctx.beginPath();
          ctx.moveTo(targetPt.x + 4, targetPt.y - 4);
          ctx.lineTo(tagX, tagY);
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)';
          ctx.stroke();

          // Callout text
          ctx.fillStyle = '#38BDF8';
          ctx.fillText(labelText, tagX + 7, tagY + 3);
        }
      }

      ctx.restore(); // Restore clip region

      // 10. Sharp Globe Rim Border
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 11. Auto-rotation step
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
    hoveredCity,
    hoveredCountry,
    iotDevices,
    project,
  ]);

  // Pointer interaction: drag to rotate
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
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

    // Check hit on visible cities (hit radius 14px)
    let matchedCity: WorldCity | null = null;
    for (const item of visibleCitiesRef.current) {
      const dx = item.screenX - px;
      const dy = item.screenY - py;
      if (Math.sqrt(dx * dx + dy * dy) <= 14) {
        matchedCity = item.city;
        break;
      }
    }
    setHoveredCity(matchedCity);

    // Update unprojected hover coordinates & country
    const unproj = unproject(px, py, cx, cy, radius, centerLat, centerLon);
    if (unproj) {
      setHoverCoord({ ...unproj, x: px, y: py });
      const matchedCountry = findCountryForCoord(unproj.lat, unproj.lon);
      setHoveredCountry(matchedCountry);
    } else {
      setHoverCoord(null);
      setHoveredCountry(null);
    }

    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastPointerPosRef.current.x;
    const dy = e.clientY - lastPointerPosRef.current.y;
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };

    const sensitivity = 0.45 / zoom;
    setCenterLon((prev) => {
      let next = prev - dx * sensitivity;
      if (next > 180) next -= 360;
      if (next < -180) next += 360;
      return next;
    });

    setCenterLat((prev) => {
      let next = prev + dy * sensitivity;
      return Math.max(-85, Math.min(85, next));
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Select location at (px, py)
  const probeLocationAt = useCallback(
    (px: number, py: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Check if clicking directly on a city
      for (const item of visibleCitiesRef.current) {
        const dx = item.screenX - px;
        const dy = item.screenY - py;
        if (Math.sqrt(dx * dx + dy * dy) <= 16) {
          setTargetLat(item.city.lat);
          setTargetLon(item.city.lon);
          setTargetName(item.city.name);

          onSelectCoordinates({
            name: item.city.name,
            country: item.city.country,
            latitude: item.city.lat,
            longitude: item.city.lon,
          });
          return;
        }
      }

      // Unproject to coordinates
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight / 2;
      const radius = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.42 * zoom;

      const coords = unproject(px, py, cx, cy, radius, centerLat, centerLon);
      if (coords) {
        const matchedCountry = findCountryForCoord(coords.lat, coords.lon);
        const generatedName = matchedCountry
          ? `${matchedCountry.name} (${coords.lat > 0 ? coords.lat + '°N' : Math.abs(coords.lat) + '°S'}, ${coords.lon > 0 ? coords.lon + '°E' : Math.abs(coords.lon) + '°W'})`
          : `Atmospheric Vector (${coords.lat > 0 ? coords.lat + '°N' : Math.abs(coords.lat) + '°S'}, ${coords.lon > 0 ? coords.lon + '°E' : Math.abs(coords.lon) + '°W'})`;

        setTargetLat(coords.lat);
        setTargetLon(coords.lon);
        setTargetName(generatedName);

        onSelectCoordinates({
          name: generatedName,
          country: matchedCountry?.name,
          latitude: coords.lat,
          longitude: coords.lon,
        });
      }
    },
    [centerLat, centerLon, zoom, unproject, onSelectCoordinates]
  );

  // Click on globe to probe/select coordinates or city
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    probeLocationAt(px, py);
  };

  // --- MOBILE TOUCH GESTURE HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      const t = e.touches[0];
      lastPointerPosRef.current = { x: t.clientX, y: t.clientY };
      touchStartPosRef.current = { x: t.clientX, y: t.clientY };
      touchStartTimeRef.current = Date.now();
      pinchStartDistRef.current = null;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchStartDistRef.current = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY
      );
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const t = e.touches[0];
      const dx = t.clientX - lastPointerPosRef.current.x;
      const dy = t.clientY - lastPointerPosRef.current.y;
      lastPointerPosRef.current = { x: t.clientX, y: t.clientY };

      const sensitivity = 0.55 / zoom;
      setCenterLon((prev) => {
        let next = prev - dx * sensitivity;
        if (next > 180) next -= 360;
        if (next < -180) next += 360;
        return next;
      });

      setCenterLat((prev) => {
        let next = prev + dy * sensitivity;
        return Math.max(-85, Math.min(85, next));
      });
    } else if (e.touches.length === 2 && pinchStartDistRef.current != null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currDist = Math.hypot(
        t2.clientX - t1.clientX,
        t2.clientY - t1.clientY
      );
      const ratio = currDist / (pinchStartDistRef.current || 1);
      setZoom(Math.max(0.65, Math.min(2.5, pinchStartZoomRef.current * ratio)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current && e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      const elapsed = Date.now() - touchStartTimeRef.current;
      const dist = Math.hypot(
        t.clientX - touchStartPosRef.current.x,
        t.clientY - touchStartPosRef.current.y
      );

      // Tap gesture detection (<300ms duration, <10px movement)
      if (elapsed < 300 && dist < 10) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const px = t.clientX - rect.left;
          const py = t.clientY - rect.top;
          probeLocationAt(px, py);
        }
      }
    }

    isDraggingRef.current = false;
    pinchStartDistRef.current = null;
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
    <div className="relative w-full h-[460px] sm:h-[520px] bg-[#060A12] select-none overflow-hidden rounded-xl touch-none">
      {/* 3D Canvas element with Mouse + Touch event support */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoverCoord(null);
          setHoveredCity(null);
          setHoveredCountry(null);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          isDraggingRef.current = false;
          pinchStartDistRef.current = null;
        }}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        className={`w-full h-full block touch-none ${
          hoveredCity ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Top Left: Target Lock HUD Readout */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 pointer-events-none">
        <div className="p-2.5 sm:p-3 rounded-lg border border-cyan-500/30 bg-[#070B14]/85 backdrop-blur-md shadow-lg shadow-cyan-950/40 max-w-[260px] sm:max-w-xs space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono font-semibold text-cyan-400">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>ORBITAL TELEMETRY PROBE</span>
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-100 truncate flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{targetName || 'Select an area on the globe'}</span>
          </div>
          {targetLat != null && targetLon != null && (
            <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 tabular-nums">
              LAT {targetLat.toFixed(4)}° · LON {targetLon.toFixed(4)}°
            </div>
          )}
          {bundle && (
            <div className="pt-1 mt-1 border-t border-slate-800 text-[10px] sm:text-[11px] font-mono flex items-center justify-between text-slate-300">
              <span>
                AQI: <span className="text-cyan-300 font-semibold">{bundle.airQuality.usAqi ?? '—'}</span>
              </span>
              <span>
                Temp:{' '}
                <span className="text-amber-300 font-semibold">
                  {formatTemp(bundle.currentWeather.temperatureC, tempUnit)}°{tempUnit}
                </span>
              </span>
              <span>
                Wind: <span className="text-teal-300 font-semibold">{bundle.currentWeather.windSpeedKmh} km/h</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Top Right: Navigation Controls Toolbar (Touch & Desktop friendly) */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setAutoRotate((prev) => !prev)}
          title={autoRotate ? 'Pause Auto Orbit' : 'Resume Auto Orbit'}
          className={`p-2.5 sm:p-2 rounded-lg border backdrop-blur-md transition-all cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 flex items-center justify-center ${
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
          className="p-2.5 sm:p-2 rounded-lg border border-slate-800 bg-[#0D1424]/85 text-slate-400 hover:text-slate-200 hover:border-slate-700 backdrop-blur-md transition-colors cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setZoom((prev) => Math.max(0.65, prev - 0.25))}
          title="Zoom Out"
          className="p-2.5 sm:p-2 rounded-lg border border-slate-800 bg-[#0D1424]/85 text-slate-400 hover:text-slate-200 hover:border-slate-700 backdrop-blur-md transition-colors cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleResetToTarget}
          title="Center on Target"
          className="p-2.5 sm:p-2 rounded-lg border border-slate-800 bg-[#0D1424]/85 text-slate-400 hover:text-slate-200 hover:border-slate-700 backdrop-blur-md transition-colors cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Center: Region Fast-Jump Preset Pills and Live Probe Indicator */}
      <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 pointer-events-auto scrollbar-none">
          <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider hidden md:inline mr-1 shrink-0">
            Presets:
          </span>
          {REGION_PRESETS.slice(0, 6).map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md border border-slate-800/80 bg-[#070B14]/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 backdrop-blur-md transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Live Hover Coordinate / City Readout */}
        <div className="pointer-events-none text-[10px] sm:text-[11px] font-mono text-slate-400 bg-[#070B14]/85 border border-slate-800/80 px-2.5 py-1 rounded-md backdrop-blur-md tabular-nums flex items-center gap-1.5 shrink-0 self-start sm:self-auto max-w-full truncate">
          {hoveredCity ? (
            <span className="text-cyan-300 flex items-center gap-1 font-semibold truncate">
              <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">{hoveredCity.name}, {hoveredCity.country}</span>
              <span className="text-slate-400 font-normal hidden sm:inline">(Tap/click to monitor)</span>
            </span>
          ) : hoveredCountry ? (
            <span className="text-teal-300 flex items-center gap-1 truncate">
              <Globe2 className="w-3 h-3 text-teal-400 shrink-0" />
              <span className="truncate">{hoveredCountry.name}</span>
              {hoverCoord && (
                <span className="text-slate-400 font-normal hidden sm:inline">
                  · {hoverCoord.lat > 0 ? hoverCoord.lat.toFixed(1) + '°N' : Math.abs(hoverCoord.lat).toFixed(1) + '°S'}, {hoverCoord.lon > 0 ? hoverCoord.lon.toFixed(1) + '°E' : Math.abs(hoverCoord.lon).toFixed(1) + '°W'}
                </span>
              )}
            </span>
          ) : hoverCoord ? (
            <span className="truncate">
              PROBE: {hoverCoord.lat > 0 ? hoverCoord.lat.toFixed(2) + '°N' : Math.abs(hoverCoord.lat).toFixed(2) + '°S'},{' '}
              {hoverCoord.lon > 0 ? hoverCoord.lon.toFixed(2) + '°E' : Math.abs(hoverCoord.lon).toFixed(2) + '°W'}
            </span>
          ) : (
            <span className="text-slate-500 flex items-center gap-1">
              <Compass className="w-3 h-3" />
              <span>Tap or click any country/city to probe</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
