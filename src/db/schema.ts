import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const savedLocations = pgTable('saved_locations', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  country: text('country'),
  admin1: text('admin1'),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  elevation: doublePrecision('elevation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const iotDevices = pgTable('iot_devices', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  deviceName: text('device_name').notNull(),
  sensorModel: text('sensor_model').notNull(),
  apiKey: text('api_key').notNull().unique(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  locationLabel: text('location_label').notNull(),
  lastSeenAt: timestamp('last_seen_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const iotReadings = pgTable('iot_readings', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id')
    .references(() => iotDevices.id, { onDelete: 'cascade' })
    .notNull(),
  temperatureC: doublePrecision('temperature_c'),
  humidityPct: doublePrecision('humidity_pct'),
  pressureHpa: doublePrecision('pressure_hpa'),
  co2Ppm: doublePrecision('co2_ppm'),
  coUgM3: doublePrecision('co_ug_m3'),
  no2UgM3: doublePrecision('no2_ug_m3'),
  so2UgM3: doublePrecision('so2_ug_m3'),
  o3UgM3: doublePrecision('o3_ug_m3'),
  o2Pct: doublePrecision('o2_pct'),
  pm25UgM3: doublePrecision('pm25_ug_m3'),
  pm10UgM3: doublePrecision('pm10_ug_m3'),
  isSimulated: boolean('is_simulated').default(false).notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

export const atmosphericSnapshots = pgTable('atmospheric_snapshots', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  locationName: text('location_name').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  temperatureC: doublePrecision('temperature_c'),
  humidityPct: doublePrecision('humidity_pct'),
  pressureHpa: doublePrecision('pressure_hpa'),
  windSpeedKmh: doublePrecision('wind_speed_kmh'),
  usAqi: integer('us_aqi'),
  pm25UgM3: doublePrecision('pm25_ug_m3'),
  pm10UgM3: doublePrecision('pm10_ug_m3'),
  co2Ppm: doublePrecision('co2_ppm'),
  no2UgM3: doublePrecision('no2_ug_m3'),
  o3UgM3: doublePrecision('o3_ug_m3'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  savedLocations: many(savedLocations),
  iotDevices: many(iotDevices),
  atmosphericSnapshots: many(atmosphericSnapshots),
}));

export const savedLocationsRelations = relations(savedLocations, ({ one }) => ({
  user: one(users, {
    fields: [savedLocations.userUid],
    references: [users.uid],
  }),
}));

export const iotDevicesRelations = relations(iotDevices, ({ one, many }) => ({
  user: one(users, {
    fields: [iotDevices.userUid],
    references: [users.uid],
  }),
  readings: many(iotReadings),
}));

export const iotReadingsRelations = relations(iotReadings, ({ one }) => ({
  device: one(iotDevices, {
    fields: [iotReadings.deviceId],
    references: [iotDevices.id],
  }),
}));

export const atmosphericSnapshotsRelations = relations(
  atmosphericSnapshots,
  ({ one }) => ({
    user: one(users, {
      fields: [atmosphericSnapshots.userUid],
      references: [users.uid],
    }),
  })
);
