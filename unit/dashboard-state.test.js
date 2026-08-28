import test from "node:test";
import assert from "node:assert/strict";

import {
  formatTimeInZone,
  getViewState,
  mergeLocalFeedResult,
  summarizeFireballs,
  summarizeHourlyWeather,
} from "../src/utils/dashboardState.js";

test("total source failure keeps the last valid local news only for the current session", () => {
  const previous = {
    incidents: [{ id: "last-good", title: "Alerta anterior" }],
    sources: [{ id: "g1", status: "conectado" }],
    warnings: [],
    fetchedAt: "2026-08-28T12:00:00.000Z",
    usingSessionFallback: false,
  };
  const failed = {
    incidents: [],
    sources: [
      { id: "g1", status: "erro" },
      { id: "inmet", status: "erro" },
    ],
    warnings: ["As fontes falharam."],
    fetchedAt: "2026-08-28T12:15:00.000Z",
  };

  assert.deepEqual(mergeLocalFeedResult(previous, failed), {
    ...failed,
    incidents: previous.incidents,
    fetchedAt: previous.fetchedAt,
    usingSessionFallback: true,
    warnings: ["As fontes falharam.", "Fontes indisponíveis; exibindo os últimos dados desta sessão."],
  });
});

test("a successful refresh replaces the session fallback", () => {
  const result = mergeLocalFeedResult(
    { incidents: [{ id: "old" }], fetchedAt: "2026-08-28T12:00:00.000Z" },
    {
      incidents: [{ id: "new" }],
      sources: [{ id: "g1", status: "online" }],
      warnings: [],
      fetchedAt: "2026-08-28T13:00:00.000Z",
    },
  );

  assert.deepEqual(result.incidents, [{ id: "new" }]);
  assert.equal(result.usingSessionFallback, false);
});

test("session fallback is not enabled for partial failure or without previous news", () => {
  const previous = {
    incidents: [{ id: "old" }],
    sources: [],
    warnings: [],
    fetchedAt: "2026-08-28T12:00:00.000Z",
  };
  const partialFailure = {
    incidents: [{ id: "fresh" }],
    sources: [
      { id: "g1", status: "erro" },
      { id: "inmet", status: "conectado" },
    ],
    warnings: ["Uma fonte falhou."],
    fetchedAt: "2026-08-28T12:15:00.000Z",
  };

  const partialResult = mergeLocalFeedResult(previous, partialFailure);
  assert.deepEqual(partialResult.incidents, [{ id: "fresh" }]);
  assert.equal(partialResult.usingSessionFallback, false);

  const noHistoryResult = mergeLocalFeedResult(
    { ...previous, incidents: [] },
    {
      ...partialFailure,
      incidents: [],
      sources: partialFailure.sources.map((source) => ({ ...source, status: "erro" })),
    },
  );
  assert.deepEqual(noHistoryResult.incidents, []);
  assert.equal(noHistoryResult.usingSessionFallback, false);
});

test("overview and sources expose combined loading, errors and warnings", () => {
  const base = {
    dashboard: { sources: [], warnings: [], fetchedAt: null },
    localFeed: { sources: [], warnings: [], fetchedAt: null },
    loadError: "",
    localError: "",
    isLoading: false,
    isLocalLoading: false,
  };

  assert.deepEqual(getViewState("overview", { ...base, isLoading: true }), {
    tone: "loading",
    message: "Atualizando painel...",
  });
  assert.deepEqual(getViewState("sources", { ...base, loadError: "Clima indisponível" }), {
    tone: "warning",
    message: "Clima indisponível",
  });
  assert.deepEqual(
    getViewState("overview", { ...base, loadError: "Clima indisponível", localError: "Notícias indisponíveis" }),
    {
      tone: "error",
      message: "Clima indisponível | Notícias indisponíveis",
    },
  );
  assert.deepEqual(
    getViewState("overview", {
      ...base,
      dashboard: { ...base.dashboard, warnings: ["Aviso climático", "Aviso secundário"] },
      localFeed: {
        ...base.localFeed,
        usingSessionFallback: true,
        warnings: ["Aviso local", "Fontes indisponíveis; exibindo os últimos dados desta sessão."],
      },
    }),
    {
      tone: "warning",
      message: "Fontes indisponíveis; exibindo os últimos dados desta sessão. | Aviso climático",
    },
  );
});

test("local and source views expose deterministic loading, error and degraded states", () => {
  const base = {
    dashboard: { sources: [], warnings: [], fetchedAt: null },
    localFeed: { sources: [], warnings: [], fetchedAt: null },
    loadError: "",
    localError: "",
    isLoading: false,
    isLocalLoading: false,
  };

  assert.deepEqual(getViewState("local", { ...base, isLocalLoading: true }), {
    tone: "loading",
    message: "Atualizando notícias locais...",
  });
  assert.deepEqual(getViewState("local", { ...base, localError: "Falha local" }), {
    tone: "error",
    message: "Falha local",
  });
  assert.deepEqual(
    getViewState("local", { ...base, localFeed: { ...base.localFeed, warnings: ["Aviso A", "Aviso B", "Aviso C"] } }),
    { tone: "warning", message: "Aviso A | Aviso B" },
  );

  const expectedByState = {
    erro: { tone: "error", message: "Open-Meteo: falha ao consultar" },
    cache: { tone: "warning", message: "Open-Meteo: exibindo dados em cache" },
    indisponivel: { tone: "warning", message: "Open-Meteo: indisponível no navegador" },
    "sem-dados": { tone: "warning", message: "Open-Meteo: sem dados no recorte atual" },
  };
  for (const [state, expected] of Object.entries(expectedByState)) {
    assert.deepEqual(
      getViewState("weather", {
        ...base,
        dashboard: { ...base.dashboard, sources: [{ id: "weather", label: "Open-Meteo", state, detail: "" }] },
      }),
      expected,
    );
  }

  assert.equal(
    getViewState("weather", {
      ...base,
      dashboard: { ...base.dashboard, sources: [{ id: "weather", label: "Open-Meteo", state: "online" }] },
    }),
    null,
  );
});

test("time and chart summaries are textual and respect the requested timezone", () => {
  assert.equal(formatTimeInZone("2026-08-28T15:00:00.000Z", "America/Sao_Paulo"), "12:00");
  assert.equal(formatTimeInZone("2026-08-28T15:00:00.000Z", "America/Manaus"), "11:00");
  assert.equal(formatTimeInZone("invalid-date", "America/Sao_Paulo"), "pendente");
  assert.match(formatTimeInZone("2026-08-28T15:00:00.000Z", "auto"), /^\d{2}:\d{2}$/);
  assert.match(formatTimeInZone("2026-08-28T15:00:00.000Z", "invalid/timezone"), /^\d{2}:\d{2}$/);
  assert.match(
    summarizeHourlyWeather([
      { temperature: 18, rainProbability: 10 },
      { temperature: 27, rainProbability: 80 },
    ]),
    /18 °C a 27 °C.*80%/,
  );
  assert.match(summarizeFireballs([{ impactEnergyKt: 0.4 }, { impactEnergyKt: 1.8 }]), /2 registros.*1,8 kt/);
  assert.equal(
    summarizeHourlyWeather([{ temperature: null, rainProbability: "" }]),
    "Resumo horário indisponível.",
  );
  assert.equal(summarizeFireballs([{ impactEnergyKt: null }]), "1 registro sem energia de impacto informada.");
  assert.equal(
    summarizeHourlyWeather([
      { temperature: -2, rainProbability: 0 },
      { temperature: 0, rainProbability: 0 },
    ]),
    "Temperatura de -2 °C a 0 °C; maior probabilidade de chuva de 0%.",
  );
  assert.equal(summarizeFireballs([{ impactEnergyKt: 0 }]), "1 registro; maior energia estimada de 0 kt.");
});
