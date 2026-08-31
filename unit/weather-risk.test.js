import test from "node:test";
import assert from "node:assert/strict";

import { assessHourlyWeatherRisk } from "../src/utils/weatherRisk.js";

test("severe thunderstorm forecast produces a high estimated risk with peak time", () => {
  const risk = assessHourlyWeatherRisk([
    {
      time: "2026-08-30T16:00",
      hour: "16:00",
      rainProbability: 55,
      precipitation: 2,
      showers: 2,
      weatherCode: 80,
      cape: 900,
      visibility: 8000,
      gusts: 45,
    },
    {
      time: "2026-08-30T18:00",
      hour: "18:00",
      rainProbability: 90,
      precipitation: 12,
      showers: 9,
      weatherCode: 95,
      cape: 2300,
      visibility: 1500,
      gusts: 78,
    },
  ]);

  assert.equal(risk.level, "alto");
  assert.equal(risk.peakTime, "18:00");
  assert.equal(risk.maxRainProbability, 90);
  assert.equal(risk.totalPrecipitation, 14);
  assert.equal(risk.maxCape, 2300);
  assert.equal(risk.minVisibilityKm, 1.5);
  assert.match(risk.summary, /risco meteorológico estimado alto/i);
  assert.match(risk.reasons.join(" "), /tempestade|chuva intensa|rajadas/i);
});

test("calm or incomplete forecast remains explicit without inventing measurements", () => {
  assert.deepEqual(assessHourlyWeatherRisk([]), {
    level: "indisponivel",
    peakTime: null,
    maxRainProbability: null,
    totalPrecipitation: null,
    maxHourlyPrecipitation: null,
    maxCape: null,
    maxGusts: null,
    minVisibilityKm: null,
    reasons: [],
    summary: "Dados horários insuficientes para estimar risco meteorológico.",
  });

  const risk = assessHourlyWeatherRisk([
    { time: "2026-08-30T10:00", hour: "10:00", rainProbability: 5, precipitation: 0, weatherCode: 0 },
  ]);
  assert.equal(risk.level, "baixo");
  assert.equal(risk.totalPrecipitation, 0);
  assert.equal(risk.maxCape, null);
  assert.match(risk.summary, /baixo/i);
});

test("hours without risk measurements remain unavailable", () => {
  const risk = assessHourlyWeatherRisk([
    { time: "2026-08-30T10:00", hour: "10:00", temperature: 24 },
  ]);

  assert.equal(risk.level, "indisponivel");
  assert.equal(risk.peakTime, null);
  assert.match(risk.summary, /insuficientes/i);
});

test("moderate rain risk always explains the signal shown to the user", () => {
  const risk = assessHourlyWeatherRisk([
    {
      time: "2026-08-30T14:00",
      hour: "14:00",
      rainProbability: 70,
      precipitation: 6,
      weatherCode: 63,
      cape: 400,
      visibility: 8000,
      gusts: 30,
    },
  ]);

  assert.equal(risk.level, "moderado");
  assert.ok(risk.reasons.length > 0);
  assert.match(risk.reasons.join(" "), /chuva moderada|precipitação/i);
});

test("risk thresholds classify exact limits without rounding nearby values", () => {
  const levelFor = (overrides) => assessHourlyWeatherRisk([
    {
      time: "2026-08-30T14:00",
      hour: "14:00",
      weatherCode: 0,
      ...overrides,
    },
  ]).level;

  const boundaries = [
    [{ precipitation: 5 }, "moderado"],
    [{ precipitation: 4.9 }, "baixo"],
    [{ precipitation: 10 }, "alto"],
    [{ precipitation: 9.9 }, "moderado"],
    [{ gusts: 50 }, "moderado"],
    [{ gusts: 49.9 }, "baixo"],
    [{ gusts: 75 }, "alto"],
    [{ gusts: 74.9 }, "moderado"],
    [{ cape: 1000, rainProbability: 40 }, "moderado"],
    [{ cape: 1000, rainProbability: 39 }, "baixo"],
    [{ cape: 2000, rainProbability: 50 }, "alto"],
    [{ cape: 1999, rainProbability: 50 }, "moderado"],
    [{ visibility: 1999 }, "moderado"],
    [{ visibility: 2000 }, "baixo"],
  ];

  for (const [measurements, expected] of boundaries) {
    assert.equal(levelFor(measurements), expected, JSON.stringify(measurements));
  }
});
