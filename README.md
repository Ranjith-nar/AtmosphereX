# AtmosphereX — Weather & Atmospheric Intelligence Platform

AtmosphereX is a full-stack atmospheric intelligence dashboard powered by **React 19**, **Vite**, **Tailwind CSS v4**, and **Express**. It assimilates real-time meteorology and air quality telemetry from Open-Meteo & Copernicus CAMS, runs local multivariate harmonic ML air quality forecasting, integrates ESP32 IoT environmental monitoring stations, and provides AI briefings with Gemini.

---

## 🚀 Features

- **Atmospheric Gas Intelligence**: Real-time breakdown of bulk atmospheric gases ($N_2$, $O_2$, $Ar$) and trace pollutants ($CO_2$, $CO$, $NO_2$, $SO_2$, $O_3$, $PM_{2.5}$, $PM_{10}$).
- **Interactive 3D Orbital Globe**: Spherical orthographic Earth visualization featuring real-time country boundary rendering, global city markers, adaptive level-of-detail zoom, mobile touch gestures (1-finger orbit, 2-finger pinch zoom, tap-to-probe), and raycasting spatial coordinate selection.
- **Global Meteorology & AQI**: Real-time weather assimilation, hourly forecasts, regional grid tracking, and EPA/WHO air quality categorization.
- **Harmonic ML Forecasting**: On-the-fly L2 Ridge multivariate harmonic regressor predicting next-24-hour $PM_{2.5}$ trends with holdout validation.
- **ESP32 IoT Node Fusion**: Ingestion endpoint (`/api/iot/telemetry`) to stream physical sensor readings with live provenance tracing.
- **AI Atmospheric Briefings**: Context-aware meteorological summaries and interactive Q&A powered by Google Gemini.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, Recharts, Motion (Framer Motion)
- **Backend**: Node.js, Express, TypeScript (TSX)
- **APIs & Telemetry**: Open-Meteo Geocoding, Forecast & Air Quality APIs, Copernicus CAMS
- **AI & ML**: Google GenAI SDK (`@google/genai`), custom harmonic regression engine
- **Database & Auth (Optional)**: Drizzle ORM, PostgreSQL (`pg`), Firebase Authentication

---

## 📦 Prerequisites

- **Node.js**: `v20.x` or higher (tested with `v24.x`)
- **npm**: `v10.x` or higher

---

## 💻 Quick Start (Run Locally)

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your optional keys (the core weather and air quality dashboard works immediately even without API keys):
- `GEMINI_API_KEY`: Required for Gemini AI briefings and assistant chat.
- `VITE_GOOGLE_MAPS_API_KEY`: For interactive Google Maps integration.
- `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`: For saving custom locations and snapshots to PostgreSQL.

### 3. Start Development Server
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs the Express API backend with integrated Vite middleware on port 3000 |
| `npm run build` | Compiles the React frontend into `dist/` |
| `npm run start` | Runs the production server serving built static assets |
| `npm run clean` | Deletes the `dist/` directory (cross-platform) |
| `npm run lint` | Runs TypeScript type checking without emitting files |

---

## 🐙 Step-by-Step GitHub Push Guide

To push your changes to GitHub step-by-step (one by one instead of everything at once):

1. **Check status of modified files:**
   ```bash
   git status
   ```

2. **Stage and commit one item at a time:**
   ```bash
   # Commit 1: Configuration & Build fixes
   git add package.json package-lock.json vite.config.ts
   git commit -m "fix(build): add react-is, update dev scripts and modernize vite config"

   # Commit 2: Server resiliency updates
   git add server.ts
   git commit -m "fix(server): add error resilience for database-optional fallback"

   # Commit 3: Documentation
   git add README.md
   git commit -m "docs: add comprehensive setup and run guide"
   ```

3. **Push each commit to GitHub:**
   ```bash
   git push origin main
   ```
