import crypto from 'crypto';
import { desc, eq, and } from 'drizzle-orm';
import { db } from './index.ts';
import {
  atmosphericSnapshots,
  iotDevices,
  iotReadings,
  savedLocations,
  users,
} from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName ?? null,
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Unable to synchronize user profile.', { cause: error });
  }
}

export async function listSavedLocations(userUid: string) {
  try {
    return await db
      .select()
      .from(savedLocations)
      .where(eq(savedLocations.userUid, userUid))
      .orderBy(desc(savedLocations.createdAt));
  } catch (error) {
    console.error('Database query failed in listSavedLocations:', error);
    throw new Error('Unable to retrieve saved locations.', { cause: error });
  }
}

export async function createSavedLocation(
  userUid: string,
  data: {
    name: string;
    country?: string | null;
    admin1?: string | null;
    latitude: number;
    longitude: number;
    elevation?: number | null;
  }
) {
  try {
    const existing = await db
      .select()
      .from(savedLocations)
      .where(eq(savedLocations.userUid, userUid));

    const duplicate = existing.find(
      (loc) =>
        Math.abs(loc.latitude - data.latitude) < 0.01 &&
        Math.abs(loc.longitude - data.longitude) < 0.01
    );
    if (duplicate) {
      return duplicate;
    }

    const inserted = await db
      .insert(savedLocations)
      .values({
        userUid,
        name: data.name,
        country: data.country ?? null,
        admin1: data.admin1 ?? null,
        latitude: data.latitude,
        longitude: data.longitude,
        elevation: data.elevation ?? null,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createSavedLocation:', error);
    throw new Error('Unable to save location.', { cause: error });
  }
}

export async function removeSavedLocation(userUid: string, locationId: number) {
  try {
    await db
      .delete(savedLocations)
      .where(
        and(
          eq(savedLocations.id, locationId),
          eq(savedLocations.userUid, userUid)
        )
      );
  } catch (error) {
    console.error('Database query failed in removeSavedLocation:', error);
    throw new Error('Unable to remove saved location.', { cause: error });
  }
}

export async function listUserIotDevices(userUid: string) {
  try {
    return await db
      .select()
      .from(iotDevices)
      .where(eq(iotDevices.userUid, userUid))
      .orderBy(desc(iotDevices.createdAt));
  } catch (error) {
    console.error('Database query failed in listUserIotDevices:', error);
    throw new Error('Unable to load ESP32 devices.', { cause: error });
  }
}

export async function registerIotDevice(
  userUid: string,
  payload: {
    deviceName: string;
    sensorModel: string;
    latitude: number;
    longitude: number;
    locationLabel: string;
  }
) {
  try {
    const apiKey = `atmx_${crypto.randomBytes(18).toString('hex')}`;
    const inserted = await db
      .insert(iotDevices)
      .values({
        userUid,
        deviceName: payload.deviceName,
        sensorModel: payload.sensorModel,
        apiKey,
        latitude: payload.latitude,
        longitude: payload.longitude,
        locationLabel: payload.locationLabel,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in registerIotDevice:', error);
    throw new Error('Unable to register ESP32 sensor node.', { cause: error });
  }
}

export async function deleteUserIotDevice(userUid: string, deviceId: number) {
  try {
    await db
      .delete(iotDevices)
      .where(and(eq(iotDevices.id, deviceId), eq(iotDevices.userUid, userUid)));
  } catch (error) {
    console.error('Database query failed in deleteUserIotDevice:', error);
    throw new Error('Unable to delete ESP32 sensor node.', { cause: error });
  }
}

export async function findDeviceByApiKey(apiKey: string) {
  try {
    const rows = await db
      .select()
      .from(iotDevices)
      .where(eq(iotDevices.apiKey, apiKey));
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in findDeviceByApiKey:', error);
    throw new Error('Unable to validate device API key.', { cause: error });
  }
}

export async function recordIotReading(
  deviceId: number,
  metrics: {
    temperatureC?: number | null;
    humidityPct?: number | null;
    pressureHpa?: number | null;
    co2Ppm?: number | null;
    coUgM3?: number | null;
    no2UgM3?: number | null;
    so2UgM3?: number | null;
    o3UgM3?: number | null;
    o2Pct?: number | null;
    pm25UgM3?: number | null;
    pm10UgM3?: number | null;
    isSimulated: boolean;
  }
) {
  try {
    const now = new Date();
    const inserted = await db
      .insert(iotReadings)
      .values({
        deviceId,
        temperatureC: metrics.temperatureC ?? null,
        humidityPct: metrics.humidityPct ?? null,
        pressureHpa: metrics.pressureHpa ?? null,
        co2Ppm: metrics.co2Ppm ?? null,
        coUgM3: metrics.coUgM3 ?? null,
        no2UgM3: metrics.no2UgM3 ?? null,
        so2UgM3: metrics.so2UgM3 ?? null,
        o3UgM3: metrics.o3UgM3 ?? null,
        o2Pct: metrics.o2Pct ?? null,
        pm25UgM3: metrics.pm25UgM3 ?? null,
        pm10UgM3: metrics.pm10UgM3 ?? null,
        isSimulated: metrics.isSimulated,
        recordedAt: now,
      })
      .returning();

    await db
      .update(iotDevices)
      .set({ lastSeenAt: now })
      .where(eq(iotDevices.id, deviceId));

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in recordIotReading:', error);
    throw new Error('Unable to persist sensor telemetry reading.', {
      cause: error,
    });
  }
}

export async function listRecentReadingsForUser(userUid: string, limit = 30) {
  try {
    const rows = await db
      .select({
        id: iotReadings.id,
        deviceId: iotReadings.deviceId,
        deviceName: iotDevices.deviceName,
        locationLabel: iotDevices.locationLabel,
        temperatureC: iotReadings.temperatureC,
        humidityPct: iotReadings.humidityPct,
        pressureHpa: iotReadings.pressureHpa,
        co2Ppm: iotReadings.co2Ppm,
        coUgM3: iotReadings.coUgM3,
        no2UgM3: iotReadings.no2UgM3,
        so2UgM3: iotReadings.so2UgM3,
        o3UgM3: iotReadings.o3UgM3,
        o2Pct: iotReadings.o2Pct,
        pm25UgM3: iotReadings.pm25UgM3,
        pm10UgM3: iotReadings.pm10UgM3,
        isSimulated: iotReadings.isSimulated,
        recordedAt: iotReadings.recordedAt,
      })
      .from(iotReadings)
      .innerJoin(iotDevices, eq(iotReadings.deviceId, iotDevices.id))
      .where(eq(iotDevices.userUid, userUid))
      .orderBy(desc(iotReadings.recordedAt))
      .limit(limit);
    return rows;
  } catch (error) {
    console.error('Database query failed in listRecentReadingsForUser:', error);
    throw new Error('Unable to load IoT sensor readings.', { cause: error });
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getNearbyActiveIotReading(
  userUid: string,
  latitude: number,
  longitude: number,
  maxRadiusKm = 30
) {
  try {
    const devices = await db
      .select()
      .from(iotDevices)
      .where(eq(iotDevices.userUid, userUid));

    let closest: { device: (typeof devices)[number]; distKm: number } | null =
      null;
    for (const dev of devices) {
      const distKm = haversineKm(latitude, longitude, dev.latitude, dev.longitude);
      if (distKm <= maxRadiusKm && (!closest || distKm < closest.distKm)) {
        closest = { device: dev, distKm };
      }
    }
    if (!closest) return null;

    const readings = await db
      .select()
      .from(iotReadings)
      .where(eq(iotReadings.deviceId, closest.device.id))
      .orderBy(desc(iotReadings.recordedAt))
      .limit(1);

    if (!readings.length) return null;
    const latest = readings[0];
    // Only treat as live active telemetry if recorded within the last 6 hours
    const ageMs = Date.now() - new Date(latest.recordedAt).getTime();
    if (ageMs > 6 * 3600 * 1000) return null;

    return {
      device: closest.device,
      reading: latest,
      distanceKm: Number(closest.distKm.toFixed(2)),
    };
  } catch (error) {
    console.error('Database query failed in getNearbyActiveIotReading:', error);
    return null;
  }
}

export async function createAtmosphericSnapshot(
  userUid: string,
  payload: {
    locationName: string;
    latitude: number;
    longitude: number;
    temperatureC?: number | null;
    humidityPct?: number | null;
    pressureHpa?: number | null;
    windSpeedKmh?: number | null;
    usAqi?: number | null;
    pm25UgM3?: number | null;
    pm10UgM3?: number | null;
    co2Ppm?: number | null;
    no2UgM3?: number | null;
    o3UgM3?: number | null;
  }
) {
  try {
    const inserted = await db
      .insert(atmosphericSnapshots)
      .values({
        userUid,
        locationName: payload.locationName,
        latitude: payload.latitude,
        longitude: payload.longitude,
        temperatureC: payload.temperatureC ?? null,
        humidityPct: payload.humidityPct ?? null,
        pressureHpa: payload.pressureHpa ?? null,
        windSpeedKmh: payload.windSpeedKmh ?? null,
        usAqi: payload.usAqi != null ? Math.round(payload.usAqi) : null,
        pm25UgM3: payload.pm25UgM3 ?? null,
        pm10UgM3: payload.pm10UgM3 ?? null,
        co2Ppm: payload.co2Ppm ?? null,
        no2UgM3: payload.no2UgM3 ?? null,
        o3UgM3: payload.o3UgM3 ?? null,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createAtmosphericSnapshot:', error);
    throw new Error('Unable to record atmospheric snapshot.', { cause: error });
  }
}

export async function listAtmosphericSnapshots(userUid: string, limit = 25) {
  try {
    return await db
      .select()
      .from(atmosphericSnapshots)
      .where(eq(atmosphericSnapshots.userUid, userUid))
      .orderBy(desc(atmosphericSnapshots.recordedAt))
      .limit(limit);
  } catch (error) {
    console.error('Database query failed in listAtmosphericSnapshots:', error);
    throw new Error('Unable to load recorded snapshots.', { cause: error });
  }
}
