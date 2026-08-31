import { OPEN_METEO_SOURCE } from "../services/weatherSource.js";

const rss2json = (rssUrl) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

const G1_RSS_JSON_URL = rss2json("https://g1.globo.com/rss/g1/sp/bauru-marilia/");
const GIRO_MARILIA_RSS_JSON_URL = rss2json("https://www.giromarilia.com.br/feed/");

export const INCIDENT_API_SOURCES = [
  {
    id: "g1-bauru-marilia",
    name: "G1 Bauru e Marília",
    cadence: "30 min",
    url: G1_RSS_JSON_URL,
    parser: "rss2json",
    detail: "Feed regional real do G1 convertido para JSON, filtrado por ocorrências em Marília.",
  },
  {
    id: "giro-marilia",
    name: "Giro Marília",
    cadence: "30 min",
    url: GIRO_MARILIA_RSS_JSON_URL,
    parser: "rss2json",
    detail: "Portal local de Marília convertido para JSON, filtrado por ocorrências de segurança e trânsito.",
  },
  {
    id: "inmet-alertas",
    name: "INMET — avisos oficiais",
    cadence: "operacional",
    url: "https://apiprevmet3.inmet.gov.br/avisos/ativos",
    parser: "inmet",
    detail: "Avisos meteorológicos oficiais ativos filtrados pelo geocódigo de Marília.",
  },
  OPEN_METEO_SOURCE,
];
