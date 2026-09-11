# Fontes meteorológicas e de risco

O Togs Heads Up é um dashboard informativo para o Brasil, com foco inicial em Marília-SP. Ele não substitui orientações da Defesa Civil, do INMET ou de outros órgãos públicos.

## Integrações ativas

| Fonte | Dados exibidos | Cobertura | Integração no navegador | Limitação conhecida |
|---|---|---|---|---|
| [Open-Meteo](https://open-meteo.com/en/docs) | temperatura, precipitação, probabilidade de chuva, rajadas, CAPE, visibilidade e código WMO | global, por coordenadas | direta, sem chave e com CORS | previsão por modelo; o risco calculado pelo app não é aviso oficial |
| [OpenWeather](https://old.openweathermap.org/api) | clima atual, previsão 5 dias/3h, ar atual/previsto/histórico, geocodificação e mapas 1.0 | global, por coordenadas | direta, com chave da sessão; sem proxy | opcional; limites e ativação dependem da conta; sem One Call ou produtos pagos |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | mapa-base sob as camadas OpenWeather | global | tiles ao abrir o mapa, com atribuição visível | navegação gera novas requisições; não há download offline de mapas |
| [BrasilAPI / CPTEC](https://brasilapi.com.br/docs#tag/CPTEC) | previsão complementar de até seis dias | cidades brasileiras; Marília = 3159 | direta, sem chave e com CORS | atualização e variáveis dependem do produto publicado pelo CPTEC |
| [INMET](https://portal.inmet.gov.br/avisos) | avisos meteorológicos oficiais ativos | Brasil | tentativa direta no endpoint público | o endpoint pode ficar indisponível; a falha não bloqueia o app |
| G1 Bauru e Marília / Giro Marília | notícias regionais relacionadas a ocorrências | Marília e região | feeds RSS convertidos pelo RSS2JSON | classificação depende do texto publicado e não representa aviso oficial |
| NASA/JPL CNEOS | registros públicos de bolas de fogo | global | requer proxy CORS opcional | fica indisponível quando o proxy não está configurado ou não responde |

## Produtos OpenWeather integrados

- [Current Weather](https://old.openweathermap.org/current): temperatura/sensação, umidade, pressões, nuvens, visibilidade, vento/rajadas/direção, chuva/neve e nascer/pôr do sol conforme campos disponíveis.
- [5 Day / 3 Hour Forecast](https://old.openweathermap.org/forecast5): série de cinco dias em intervalos de três horas, com temperatura, chuva/neve acumulada, probabilidade e demais variáveis; horários usam o deslocamento UTC retornado pelo provedor.
- [Air Pollution](https://old.openweathermap.org/api/air-pollution): índice OpenWeather de 1 a 5, CO, NO, NO2, O3, SO2, PM2.5, PM10 e NH3 em µg/m³; condição atual, previsão de até quatro dias e histórico das últimas 24 horas. A escala não representa um aviso oficial brasileiro.
- [Geocoding](https://old.openweathermap.org/api/geocoding-api): cidade, geocodificação reversa e CEP acompanhado de código de país, por exemplo `17500-000,BR` ou `10001,US`. A geolocalização conectada preserva as coordenadas do navegador e continua consultando também o Open-Meteo; uma falha ao obter o nome do local não bloqueia a previsão pelas coordenadas.
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

Fontes sem CORS ou que exijam segredo compartilhado devem usar um backend/adaptador controlado. A OpenWeather usa a chave individual informada pelo visitante, diretamente nos domínios oficiais, sem proxy público. No desenvolvimento, `.env.development.local` pode fornecer `VITE_OPENWEATHER_API_KEY`; o build público não incorpora essa configuração. Chaves reais não devem ser commitadas, embutidas no bundle público ou enviadas à OpenStreetMap.
