import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  AuthRequest,
  optionalAuth,
  requireAuth,
} from './src/middleware/auth.ts';
import {
  createAtmosphericSnapshot,
  createSavedLocation,
  deleteUserIotDevice,
  findDeviceByApiKey,
  getNearbyActiveIotReading,
  listAtmosphericSnapshots,
  listRecentReadingsForUser,
  listSavedLocations,
  listUserIotDevices,
  recordIotReading,
  registerIotDevice,
  removeSavedLocation,
} from './src/db/repository.ts';
import {
  fetchCompleteAtmosphericIntelligence,
  searchOpenMeteoLocations,
} from './src/server/openMeteoService.ts';
import {
  askAtmosphericAssistant,
  generateAtmosphericBriefing,
} from './src/server/geminiService.ts';
import { AtmosphericBundleResponse } from './src/types/atmosphere.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // 1. Geolocation Search (Open-Meteo Geocoding API)
  app.get('/api/locations/search', async (req, res) => {
    try {
      const q = String(req.query.q ?? '').trim();
      if (q.length < 2) {
        return res.json({ results: [] });
      }
      const results = await searchOpenMeteoLocations(q);
      res.json({ results });
    } catch (error: any) {
      console.error('Location search failed:', error);
      res.status(502).json({
        error: error.message || 'Unable to search locations at this time.',
      });
    }
  });

  // 2. Complete Atmospheric Intelligence Bundle (Open-Meteo + CAMS + ML + Optional ESP32 Fusion)
  app.get('/api/atmosphere', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      const name = String(req.query.name || 'Selected Coordinates');
      const country = req.query.country ? String(req.query.country) : undefined;
      const admin1 = req.query.admin1 ? String(req.query.admin1) : undefined;

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return res.status(400).json({ error: 'Valid lat and lon are required.' });
      }

      let iotOverride = null;
      if (req.user?.uid) {
        try {
          iotOverride = await getNearbyActiveIotReading(req.user.uid, lat, lon);
        } catch (dbErr) {
          console.warn('Database not available for IoT override, continuing with telemetry:', dbErr);
        }
      }

      const bundle = await fetchCompleteAtmosphericIntelligence(
        {
          name,
          country,
          admin1,
          latitude: lat,
          longitude: lon,
        },
        iotOverride
      );

      res.json(bundle);
    } catch (error: any) {
      console.error('Atmospheric intelligence fetch failed:', error);
      res.status(502).json({
        error:
          error.message || 'Unable to retrieve atmospheric telemetry from Open-Meteo.',
      });
    }
  });

  // 3. Gemini AI Atmospheric Briefing & Contextual Q&A
  app.post('/api/ai/briefing', async (req, res) => {
    try {
      const bundle = req.body?.bundle as AtmosphericBundleResponse | undefined;
      if (!bundle || !bundle.currentWeather || !bundle.gases) {
        return res.status(400).json({ error: 'Atmospheric bundle is required.' });
      }
      const briefing = await generateAtmosphericBriefing(bundle);
      res.json(briefing);
    } catch (error: any) {
      console.error('Gemini briefing failed:', error);
      res.status(500).json({
        error: error.message || 'AI atmospheric briefing failed.',
      });
    }
  });

  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { bundle, question, history } = req.body ?? {};
      if (!bundle || !question || typeof question !== 'string') {
        return res
          .status(400)
          .json({ error: 'Atmospheric bundle and question are required.' });
      }
      const answer = await askAtmosphericAssistant(
        bundle,
        question.slice(0, 800),
        Array.isArray(history) ? history : []
      );
      res.json({ answer });
    } catch (error: any) {
      console.error('Gemini chat failed:', error);
      res.status(500).json({
        error: error.message || 'AI assistant encountered an error.',
      });
    }
  });

  // 4. Authenticated User Profile & Cloud SQL Saved Stations
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const [locations, devices, snapshots] = await Promise.all([
        listSavedLocations(uid),
        listUserIotDevices(uid),
        listAtmosphericSnapshots(uid, 5),
      ]);
      res.json({
        uid,
        email: req.user!.email ?? null,
        name: req.user!.name ?? null,
        picture: req.user!.picture ?? null,
        counts: {
          savedLocations: locations.length,
          iotDevices: devices.length,
          recentSnapshots: snapshots.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load profile.' });
    }
  });

  app.get('/api/user/locations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = await listSavedLocations(req.user!.uid);
      res.json({ locations: rows });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load locations.' });
    }
  });

  app.post('/api/user/locations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, country, admin1, latitude, longitude, elevation } =
        req.body ?? {};
      if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res
          .status(400)
          .json({ error: 'Name, latitude, and longitude are required.' });
      }
      const saved = await createSavedLocation(req.user!.uid, {
        name: String(name).slice(0, 120),
        country: country ? String(country).slice(0, 80) : null,
        admin1: admin1 ? String(admin1).slice(0, 80) : null,
        latitude: Number(latitude),
        longitude: Number(longitude),
        elevation: Number.isFinite(elevation) ? Number(elevation) : null,
      });
      res.status(201).json({ location: saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to save location.' });
    }
  });

  app.delete(
    '/api/user/locations/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
          return res.status(400).json({ error: 'Invalid location ID.' });
        }
        await removeSavedLocation(req.user!.uid, id);
        res.json({ deleted: true });
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error.message || 'Failed to remove location.' });
      }
    }
  );

  // 5. Cloud SQL Historical Atmospheric Snapshots
  app.get('/api/user/snapshots', requireAuth, async (req: AuthRequest, res) => {
    try {
      const snapshots = await listAtmosphericSnapshots(req.user!.uid, 30);
      res.json({ snapshots });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Failed to load snapshots.' });
    }
  });

  app.post('/api/user/snapshots', requireAuth, async (req: AuthRequest, res) => {
    try {
      const body = req.body ?? {};
      if (
        !body.locationName ||
        !Number.isFinite(body.latitude) ||
        !Number.isFinite(body.longitude)
      ) {
        return res.status(400).json({ error: 'Invalid snapshot payload.' });
      }
      const snapshot = await createAtmosphericSnapshot(req.user!.uid, {
        locationName: String(body.locationName).slice(0, 140),
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        temperatureC: Number.isFinite(body.temperatureC)
          ? Number(body.temperatureC)
          : null,
        humidityPct: Number.isFinite(body.humidityPct)
          ? Number(body.humidityPct)
          : null,
        pressureHpa: Number.isFinite(body.pressureHpa)
          ? Number(body.pressureHpa)
          : null,
        windSpeedKmh: Number.isFinite(body.windSpeedKmh)
          ? Number(body.windSpeedKmh)
          : null,
        usAqi: Number.isFinite(body.usAqi) ? Number(body.usAqi) : null,
        pm25UgM3: Number.isFinite(body.pm25UgM3) ? Number(body.pm25UgM3) : null,
        pm10UgM3: Number.isFinite(body.pm10UgM3) ? Number(body.pm10UgM3) : null,
        co2Ppm: Number.isFinite(body.co2Ppm) ? Number(body.co2Ppm) : null,
        no2UgM3: Number.isFinite(body.no2UgM3) ? Number(body.no2UgM3) : null,
        o3UgM3: Number.isFinite(body.o3UgM3) ? Number(body.o3UgM3) : null,
      });
      res.status(201).json({ snapshot });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Failed to save snapshot.' });
    }
  });

  // 6. ESP32 IoT Device Management & Hardware Ingestion Pipeline
  app.get('/api/iot/devices', requireAuth, async (req: AuthRequest, res) => {
    try {
      const [devices, readings] = await Promise.all([
        listUserIotDevices(req.user!.uid),
        listRecentReadingsForUser(req.user!.uid, 30),
      ]);
      res.json({ devices, readings });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Failed to load ESP32 devices.' });
    }
  });

  app.post('/api/iot/devices', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { deviceName, sensorModel, latitude, longitude, locationLabel } =
        req.body ?? {};
      if (
        !deviceName ||
        !sensorModel ||
        !locationLabel ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return res
          .status(400)
          .json({ error: 'All ESP32 node registration fields are required.' });
      }
      const device = await registerIotDevice(req.user!.uid, {
        deviceName: String(deviceName).slice(0, 80),
        sensorModel: String(sensorModel).slice(0, 120),
        latitude: Number(latitude),
        longitude: Number(longitude),
        locationLabel: String(locationLabel).slice(0, 120),
      });
      res.status(201).json({ device });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Failed to register ESP32 node.' });
    }
  });

  app.delete(
    '/api/iot/devices/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
          return res.status(400).json({ error: 'Invalid device ID.' });
        }
        await deleteUserIotDevice(req.user!.uid, id);
        res.json({ deleted: true });
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error.message || 'Failed to delete ESP32 node.' });
      }
    }
  );

  // Public Hardware Ingestion Endpoint authenticated via x-device-key header
  app.post('/api/iot/ingest', async (req, res) => {
    try {
      const apiKey = String(
        req.headers['x-device-key'] || req.body?.apiKey || ''
      ).trim();
      if (!apiKey) {
        return res
          .status(401)
          .json({ error: 'Missing x-device-key hardware authentication header.' });
      }

      const device = await findDeviceByApiKey(apiKey);
      if (!device) {
        return res.status(403).json({ error: 'Invalid ESP32 device API key.' });
      }

      const b = req.body ?? {};
      const numOrNull = (val: unknown) =>
        typeof val === 'number' && Number.isFinite(val) ? val : null;

      // Explicitly preserve simulated vs actual hardware measurement provenance
      const isSimulated = Boolean(b.isSimulated === true);

      const reading = await recordIotReading(device.id, {
        temperatureC: numOrNull(b.temperatureC),
        humidityPct: numOrNull(b.humidityPct),
        pressureHpa: numOrNull(b.pressureHpa),
        co2Ppm: numOrNull(b.co2Ppm),
        coUgM3: numOrNull(b.coUgM3),
        no2UgM3: numOrNull(b.no2UgM3),
        so2UgM3: numOrNull(b.so2UgM3),
        o3UgM3: numOrNull(b.o3UgM3),
        o2Pct: numOrNull(b.o2Pct),
        pm25UgM3: numOrNull(b.pm25UgM3),
        pm10UgM3: numOrNull(b.pm10UgM3),
        isSimulated,
      });

      res.status(201).json({
        status: 'ingested',
        provenance: isSimulated ? 'simulated' : 'measured',
        reading,
      });
    } catch (error: any) {
      console.error('ESP32 ingestion error:', error);
      res
        .status(500)
        .json({ error: error.message || 'Failed to ingest telemetry payload.' });
    }
  });

  // Vite middleware in dev; static SPA serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AtmosphereX server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
