import { GoogleGenAI, Type } from '@google/genai';
import {
  AiAtmosphericBriefing,
  AtmosphericBundleResponse,
} from '../types/atmosphere.ts';

function getGenAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildCompactContext(bundle: AtmosphericBundleResponse): string {
  const gasLines = bundle.gases
    .map(
      (g) =>
        `${g.formula} (${g.name}): ${g.value !== null ? `${g.value} ${g.unit}` : 'Unavailable'}${
          g.secondaryValue ? ` [${g.secondaryValue}]` : ''
        } | Provenance: ${g.provenance.toUpperCase()} (${g.sourceLabel})`
    )
    .join('\n');

  return `Location: ${bundle.location.name}${
    bundle.location.country ? `, ${bundle.location.country}` : ''
  } (${bundle.location.latitude.toFixed(3)}, ${bundle.location.longitude.toFixed(3)}, elev ${
    bundle.location.elevation ?? 0
  }m)
Current Meteorology (${bundle.currentWeather.provenance.toUpperCase()} - ${bundle.currentWeather.sourceLabel}):
- Condition: ${bundle.currentWeather.weatherDescription}
- Temperature: ${bundle.currentWeather.temperatureC} °C (Feels like ${bundle.currentWeather.apparentTemperatureC} °C)
- Humidity: ${bundle.currentWeather.humidityPct}%
- Wind: ${bundle.currentWeather.windSpeedKmh} km/h (${bundle.currentWeather.windDirectionDeg}°), Gusts ${bundle.currentWeather.windGustsKmh} km/h
- Surface Pressure: ${bundle.currentWeather.surfacePressureHpa} hPa
- Precipitation: ${bundle.currentWeather.precipitationMm} mm, UV Index: ${bundle.currentWeather.uvIndex}

Air Quality (${bundle.airQuality.provenance.toUpperCase()} - ${bundle.airQuality.sourceLabel}):
- US AQI: ${bundle.airQuality.usAqi ?? 'N/A'} (${bundle.airQuality.category}), EU AQI: ${bundle.airQuality.europeanAqi ?? 'N/A'}
- PM2.5: ${bundle.airQuality.pm25UgM3 ?? 'N/A'} μg/m³, PM10: ${bundle.airQuality.pm10UgM3 ?? 'N/A'} μg/m³

Atmospheric Gas Breakdown:
${gasLines}

ML Forecast (${bundle.mlAnalytics.modelName}, Holdout RMSE ${bundle.mlAnalytics.rmseUgM3} μg/m³, R² ${bundle.mlAnalytics.r2Score}):
- Next 24h Predicted PM2.5 range: ${Math.min(
    ...bundle.mlAnalytics.series.filter((s) => !s.isHistorical).slice(0, 24).map((s) => s.mlPredictedPm25)
  ).toFixed(1)} to ${Math.max(
    ...bundle.mlAnalytics.series.filter((s) => !s.isHistorical).slice(0, 24).map((s) => s.mlPredictedPm25)
  ).toFixed(1)} μg/m³`;
}

export async function generateAtmosphericBriefing(
  bundle: AtmosphericBundleResponse
): Promise<AiAtmosphericBriefing> {
  const ai = getGenAiClient();
  const context = buildCompactContext(bundle);

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Analyze the following environmental telemetry and produce a structured scientific briefing:\n\n${context}`,
    config: {
      systemInstruction:
        'You are an atmospheric chemist and meteorologist for AtmosphereX. ' +
        'Explain current weather, air quality, and trace gas conditions clearly with exact numbers and units from the provided telemetry. ' +
        'NEVER fabricate sensor measurements. Explicitly respect and mention data provenance (distinguishing Reference dry-air constants, Estimated CAMS/Open-Meteo model values, Measured ESP32 hardware values, or Simulated bench values). ' +
        'Keep each field concise (2-3 crisp sentences).',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headline: {
            type: Type.STRING,
            description: 'Concise 1-sentence scientific headline summarizing atmospheric state.',
          },
          riskLevel: {
            type: Type.STRING,
            enum: ['Nominal', 'Moderate', 'Elevated', 'High'],
            description: 'Overall environmental exposure risk classification.',
          },
          weatherAnalysis: {
            type: Type.STRING,
            description: 'Explanation of temperature, pressure, wind dispersion, and moisture.',
          },
          pollutionAndGasAnalysis: {
            type: Type.STRING,
            description: 'Analysis of PM2.5, PM10, AQI, and trace gases (CO, NO2, SO2, O3, CO2, O2/N2 partial pressure) compared against WHO guidelines.',
          },
          outdoorGuidance: {
            type: Type.STRING,
            description: 'Actionable health and outdoor activity guidance.',
          },
          provenanceSummary: {
            type: Type.STRING,
            description: '1-2 sentences clarifying which figures are model-estimated, standard reference constants, hardware-measured, or bench-simulated.',
          },
        },
        required: [
          'headline',
          'riskLevel',
          'weatherAnalysis',
          'pollutionAndGasAnalysis',
          'outdoorGuidance',
          'provenanceSummary',
        ],
      },
    },
  });

  const text = (response.text ?? '{}').trim();
  return JSON.parse(text) as AiAtmosphericBriefing;
}

export async function askAtmosphericAssistant(
  bundle: AtmosphericBundleResponse,
  question: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const ai = getGenAiClient();
  const context = buildCompactContext(bundle);
  const recentHistory = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Analyst'}: ${m.content}`)
    .join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: `Active Station Telemetry:\n${context}\n\nRecent Conversation:\n${recentHistory}\n\nUser Question: ${question}`,
    config: {
      systemInstruction:
        'You are the AtmosphereX Atmospheric & Air Quality Scientist. Answer user questions accurately using the Active Station Telemetry. ' +
        'Cite exact numeric concentrations, units (μg/m³, ppm, hPa, km/h), and WHO 2021 air quality guidelines where relevant. ' +
        'Never invent live gas readings, and always be transparent about whether a cited gas metric is Reference (ISO 2533), Estimated (CAMS / Barometric Psychrometry / Ridge ML), Measured (ESP32 Hardware), or Simulated (Bench Test). ' +
        'Respond in clear, readable paragraphs or concise bullet points under 180 words.',
    },
  });

  return response.text ?? 'Unable to generate an atmospheric explanation at this moment.';
}
