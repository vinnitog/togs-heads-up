# Fontes meteorológicas e de risco

O Togs Heads Up é um dashboard informativo para o Brasil, com foco inicial em Marília-SP. Ele não substitui orientações da Defesa Civil, do INMET ou de outros órgãos públicos.

## Integrações ativas

| Fonte | Dados exibidos | Cobertura | Integração no navegador | Limitação conhecida |
|---|---|---|---|---|
| [Open-Meteo](https://open-meteo.com/en/docs) | temperatura, precipitação, probabilidade de chuva, rajadas, CAPE, visibilidade e código WMO | global, por coordenadas | direta, sem chave e com CORS | previsão por modelo; o risco calculado pelo app não é aviso oficial |
| [BrasilAPI / CPTEC](https://brasilapi.com.br/docs#tag/CPTEC) | previsão complementar de até seis dias | cidades brasileiras; Marília = 3159 | direta, sem chave e com CORS | atualização e variáveis dependem do produto publicado pelo CPTEC |
| [INMET](https://portal.inmet.gov.br/avisos) | avisos meteorológicos oficiais ativos | Brasil | tentativa direta no endpoint público | o endpoint pode ficar indisponível; a falha não bloqueia o app |
| G1 Bauru e Marília / Giro Marília | notícias regionais relacionadas a ocorrências | Marília e região | feeds RSS convertidos pelo RSS2JSON | classificação depende do texto publicado e não representa aviso oficial |
| NASA/JPL CNEOS | registros públicos de bolas de fogo | global | requer proxy CORS opcional | fica indisponível quando o proxy não está configurado ou não responde |

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

Fontes sem CORS, com autenticação ou sujeitas a limites sensíveis devem passar por um backend/adaptador controlado. Chaves nunca devem ser incluídas no bundle do Vite nem commitadas no repositório.
