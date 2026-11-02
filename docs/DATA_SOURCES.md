# Fontes de dados do painel

## News Brasil

O menu acompanha notícias sobre atos federais do Executivo, Legislativo e Judiciário desde **25/10/2026**, data da reeleição presidencial confirmada pela [Justiça Eleitoral / TRE-SP](https://www.tre-sp.jus.br/comunicacao/noticias/2026/Outubro/eleicoes-2026-lula-e-reeleito-presidente-da-republica-confira-resultado-do-2o-turno-em-sp). O recorte inclui o dia da eleição no fuso de Brasília; não corresponde ao início do mandato seguinte.

O catálogo de fontes fica em `src/services/brasilNews.js`. A seleção separa portais institucionais, imprensa pública e veículos de imprensa com redação identificável e feed próprio. Cada notícia precisa vir do feed cadastrado e ter URL HTTPS em um dos domínios exatos da respectiva fonte. Links de agregadores, domínios desconhecidos, credenciais em URLs e datas ausentes, anteriores ao recorte ou futuras além de cinco minutos de tolerância de relógio são rejeitados. A conferência é de **procedência**, não uma checagem independente de cada alegação.

| Fonte selecionada | Origem | Escopo do feed |
|---|---|---|
| [Agência Câmara](https://www.camara.leg.br/noticias/rss/) | portal oficial do Legislativo | últimas notícias da Câmara |
| [Agência Senado](https://www12.senado.leg.br/noticias/rss.xml) | portal oficial do Legislativo | notícias do Senado |
| [Agência Gov](https://agenciagov.ebc.com.br/@@RSS) | comunicação governamental / EBC | notícias do Executivo e ministérios |
| [STF](https://noticias.stf.jus.br/feed/?post_type=postsnoticias) | portal oficial do Judiciário | notícias do Supremo; o feed genérico contém páginas institucionais |
| [STJ](https://www.stj.jus.br/sites/portalp/Paginas/RSS.aspx) | portal oficial do Judiciário | notícias do Superior Tribunal de Justiça |
| [Agência Brasil](https://agenciabrasil.ebc.com.br/rss/politica/feed.xml) | imprensa pública / EBC | editoria Política |
| [g1](https://g1.globo.com/rss/g1/politica/) | imprensa / Grupo Globo | editoria Política |
| [Folha de S.Paulo](https://feeds.folha.uol.com.br/poder/rss091.xml) | imprensa / Grupo Folha | editoria Poder; colunas excluídas |

Os endpoints foram consultados com sucesso na coleta inicial. A disponibilidade futura é registrada a cada tentativa. A seleção de veículos identifica a redação responsável e usa o feed do próprio editor; não equivale a endosso editorial nem certificação de isenção.

As categorias “Proposta / tramitação”, “Ato noticiado”, “Decisão noticiada” e “Acompanhamento” são inferidas do título e podem conter erros. Aprovação em comissão ou em uma Casa não confirma sanção, publicação ou vigência. Confira o texto original, a tramitação e, quando aplicável, o [Diário Oficial da União](https://www.in.gov.br/consulta) e a [Legislação do Planalto](https://www.planalto.gov.br/ccivil_03/).

`node scripts/collect-brasil-news.mjs` consulta os feeds no Node, sem proxy público, e atualiza `public/data/news-brasil.json`. O navegador consulta somente esse JSON da própria hospedagem, ao abrir a tela, a cada cinco minutos enquanto ela estiver aberta e pelo botão “Atualizar painel”. O botão não dispara uma coleta nos portais. A rotina de publicação tem agenda de 30 minutos no GitHub Actions; agendas podem atrasar. A publicação agendada só entra em funcionamento depois do merge em `main` e exige Actions/Pages ativos e a configuração de build já existente.

O JSON registra a última tentativa de coleta e o último sucesso por fonte. Falhas isoladas preservam os registros anteriores, sem marcá-los como novos. A tela sinaliza falha total e coleta com mais de 90 minutos. O histórico é acumulado por URL canônica e restaurado pelo cache do Actions, separado por branch; a cópia versionada serve de ponto inicial. Expiração/remoção do cache pode perder registros acumulados após esse ponto. Não há garantia de cobertura completa: RSS costuma conter apenas notícias recentes, filtros por título podem omitir matérias e o histórico anterior à primeira coleta não é reconstruído automaticamente. Manchetes e metadados são exibidos com atribuição e link; o app não republica o texto integral.

O Togs Heads Up é um dashboard informativo para o Brasil, com foco inicial em Marília-SP. Ele não substitui orientações da Defesa Civil, do INMET ou de outros órgãos públicos.

## Integrações ativas

| Fonte | Dados exibidos | Cobertura | Integração no navegador | Limitação conhecida |
|---|---|---|---|---|
| [Open-Meteo](https://open-meteo.com/en/docs) | temperatura, precipitação, probabilidade de chuva, rajadas, CAPE, visibilidade e código WMO | global, por coordenadas | direta, sem chave e com CORS | previsão por modelo; o risco calculado pelo app não é aviso oficial |
| [OpenWeather](https://old.openweathermap.org/api) | clima atual, previsão 5 dias/3h, ar atual/previsto/histórico, geocodificação e mapas 1.0 | global, por coordenadas | direta e automática, com chave do projeto; sem proxy | limites dependem da conta compartilhada; sem One Call ou produtos pagos |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | mapa-base sob as camadas OpenWeather | global | tiles ao abrir o mapa, com atribuição visível | navegação gera novas requisições; não há download offline de mapas |
| [BrasilAPI / CPTEC](https://brasilapi.com.br/docs#tag/CPTEC) | previsão complementar de até seis dias | cidades brasileiras; Marília = 3159 | direta, sem chave e com CORS | atualização e variáveis dependem do produto publicado pelo CPTEC |
| [INMET](https://portal.inmet.gov.br/avisos) | avisos meteorológicos oficiais ativos | Brasil | tentativa direta no endpoint público | o endpoint pode ficar indisponível; a falha não bloqueia o app |
| G1 Bauru e Marília / Giro Marília | notícias regionais relacionadas a ocorrências | Marília e região | feeds RSS convertidos pelo RSS2JSON | classificação depende do texto publicado e não representa aviso oficial |
| NASA/JPL CNEOS | registros públicos de bolas de fogo | global | requer proxy CORS opcional | fica indisponível quando o proxy não está configurado ou não responde |

## Produtos OpenWeather integrados

- [Current Weather](https://old.openweathermap.org/current): temperatura/sensação, umidade, pressões, nuvens, visibilidade, vento/rajadas/direção, chuva/neve e nascer/pôr do sol conforme campos disponíveis.
- [5 Day / 3 Hour Forecast](https://old.openweathermap.org/forecast5): série de cinco dias em intervalos de três horas, com temperatura, chuva/neve acumulada, probabilidade e demais variáveis; horários usam o deslocamento UTC retornado pelo provedor.
- [Air Pollution](https://old.openweathermap.org/api/air-pollution): índice OpenWeather de 1 a 5, CO, NO, NO2, O3, SO2, PM2.5, PM10 e NH3 em µg/m³; condição atual, previsão de até quatro dias e histórico das últimas 24 horas. A escala não representa um aviso oficial brasileiro.
- [Geocoding](https://old.openweathermap.org/api/geocoding-api): cidade, geocodificação reversa e CEP acompanhado de código de país, por exemplo `17500-000,BR` ou `10001,US`. A geolocalização opcional preserva as coordenadas do navegador e continua consultando também o Open-Meteo; uma falha ao obter o nome do local não bloqueia a previsão pelas coordenadas.
- [Weather Maps 1.0](https://old.openweathermap.org/api/weathermaps): `clouds_new`, `precipitation_new`, `pressure_new`, `wind_new` e `temp_new`. Leaflet combina uma camada por vez com OpenStreetMap, carregando tiles somente quando o mapa está aberto.

Cada atualização completa consulta cinco endpoints de dados, com cache em memória de dez minutos e estados independentes de erro. Busca e tiles usam requisições adicionais. Erros de chave não ativada/inválida ou limite atingido não interrompem as outras fontes. Não são feitas consultas One Call, previsão diária de 16 dias ou histórico meteorológico pago. A lista descreve os produtos gratuitos integrados, sem garantir liberação antecipada de uma chave nova ou cota ilimitada.

## Como o risco de 24 horas é calculado

O app analisa as próximas 24 horas retornadas pelo Open-Meteo e classifica o risco como baixo, moderado ou alto. São considerados código meteorológico WMO, precipitação por hora, rajadas de vento, CAPE e visibilidade. A interface exibe os valores usados e a mensagem:

> Estimativa por modelo Open-Meteo; não substitui aviso oficial do INMET.

Os níveis são heurísticas internas do projeto, sem equivalência com as faixas de severidade do INMET. Cada hora recebe o maior nível aplicável, e o painel mostra o maior nível encontrado na janela:

| Nível | Critérios por hora |
|---|---|
| Alto | código WMO 65, 67, 82, 95, 96 ou 99; precipitação a partir de 10 mm; rajada a partir de 75 km/h; ou CAPE a partir de 2.000 J/kg junto de probabilidade de chuva a partir de 50% |
| Moderado | código WMO 63, 80 ou 81; precipitação a partir de 5 mm; rajada a partir de 50 km/h; CAPE a partir de 1.000 J/kg junto de probabilidade de chuva a partir de 40%; ou visibilidade abaixo de 2 km |
| Baixo | há dados meteorológicos válidos, mas nenhum critério moderado ou alto foi atingido |

Se nenhum dos indicadores necessários estiver disponível, o painel mostra **Indisponível** em vez de presumir risco baixo.

A classificação serve para organizar a leitura do dashboard. Em situação de emergência, a referência deve ser o aviso e a orientação do órgão público competente.

## Próximas fontes avaliadas

| Fonte | Potencial | Condição para integrar |
|---|---|---|
| [Cemaden](https://mapainterativo.cemaden.gov.br/) | pluviômetros, estações e monitoramento de risco | usar somente após existir endpoint estável e documentado, preferencialmente por adaptador próprio |
| [ANA / HidroWebservice](https://www.gov.br/ana/pt-br/assuntos/monitoramento-e-eventos-criticos/monitoramento-hidrologico/orientacoes-manuais/manuais-de-sistemas-e-servicos-de-disponibilizacao-de-dados-hidrologicos) | níveis, vazões e chuva de estações hidrológicas | selecionar estações relevantes para Marília e validar limites, formato e atualização |
| Defesa Civil | alertas e recomendações locais | integrar somente por feed/API oficial ou canal redistribuível documentado |

Fontes sem CORS ou que exijam segredo inacessível ao navegador precisam de um backend/adaptador controlado. A integração OpenWeather deste app estático usa automaticamente a chave compartilhada do projeto, diretamente nos domínios oficiais, sem proxy público. No desenvolvimento, `.env.development.local` fornece `VITE_OPENWEATHER_API_KEY`. No GitHub Pages, o secret `OPENWEATHER_API_KEY` é injetado como `VITE_OPENWEATHER_API_KEY` no build. A chave real não é versionada, mas integra o JavaScript público e o cache do shell PWA `togs-heads-up-v18`; fica visível no navegador. O visitante não informa chave e o app ignora a configuração antiga em `sessionStorage`. As requisições à OpenStreetMap não recebem a chave. Respostas autenticadas e tiles externos continuam fora do Cache Storage do app.
