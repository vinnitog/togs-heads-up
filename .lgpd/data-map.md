# Mapa de Dados — Togs Heads Up

**Versão**: v1.0-draft

**Data**: 23/08/2026

**Escopo**: aplicação pública, repositório e entrega no GitHub Pages
**Owner global**: responsável pelo repositório; canal público pendente de definição

## Premissas e classificação

- O app não possui contas, autenticação, banco de dados, backend próprio, analytics, pixels publicitários ou cookies de rastreamento.
- Latitude e longitude exatas, quando o usuário aciona a geolocalização, podem ser dados pessoais se relacionadas a pessoa identificada ou identificável (LGPD, art. 5º, I). Não são, por si só, dados pessoais sensíveis do rol do art. 5º, II.
- Endereço IP, user-agent e demais metadados de rede podem permitir identificação pelo provedor que recebe a requisição e foram considerados neste inventário.
- O app não recebe os logs de acesso mantidos pelos provedores externos. Os papéis e condições públicas de cada provedor foram avaliados preliminarmente em L4; há pendências em `.lgpd/vendors/`.
- Nenhuma atividade preenche, no escopo observado, a combinação de critérios gerais e específicos de alto risco da Res. CD/ANPD nº 2/2022, art. 4º.

## Atividades de tratamento

### A001 — Geolocalização opcional para clima local

| Campo | Valor |
|---|---|
| Slug | `a001-geolocalizacao-opcional` |
| Descrição | Usa coordenadas fornecidas pelo navegador, após clique e permissão, para nomear o local e consultar clima. |
| Finalidade | Exibir previsão meteorológica contextualizada para a posição escolhida pelo titular. |
| Base legal | Consentimento — LGPD, art. 7º, I ([detalhes](./legal-basis.md#a001--geolocalização-opcional-para-clima-local)). |
| Titulares | Visitantes que acionam voluntariamente o controle de localização; o app não verifica idade. |
| Dados | Latitude e longitude exatas; cidade/região derivadas; IP, user-agent e metadados de rede recebidos pelos provedores. |
| Sensíveis? | Não no escopo observado (LGPD, art. 5º, II). |
| Fonte | Coordenadas observadas pelo navegador com permissão; cidade/região derivadas pelo BigDataCloud. |
| Sistemas | Estado volátil do React e memória do navegador. O identificador persistível é fixo (`geo-current`) e não contém coordenadas. |
| Operadores/terceiros | BigDataCloud (geocodificação reversa) e Open-Meteo (previsão). CPTEC pode receber apenas o nome da cidade por meio do AllOrigins. |
| Coleta/transferência internacional | Coleta direta pelos provedores estrangeiros; a Res. 19/2024, art. 6º, afasta a classificação automática como transferência. Papéis e eventual fluxo controlador–importador foram avaliados em L4. |
| Retenção no app | Somente durante a sessão/estado atual. Entradas `geo-*` não são gravadas no `localStorage`. |
| Segurança/minimização | HTTPS; permissão acionada pelo titular; sem envio a backend próprio; sem persistência de coordenadas exatas; retorno para Marília ao desativar. |
| Alto risco? | Não, no escopo atual: sem larga escala demonstrada, perfilamento, vigilância pública, decisão automatizada ou dado sensível. |
| Owner | Responsável pelo repositório. |

### A002 — Busca manual de cidade e previsão

| Campo | Valor |
|---|---|
| Slug | `a002-busca-cidade-clima` |
| Descrição | Envia o texto pesquisado ao Open-Meteo, usa as coordenadas públicas da cidade selecionada e consulta previsão. |
| Finalidade | Permitir ao visitante consultar clima e previsão de uma localidade escolhida. |
| Base legal | Legítimo interesse — LGPD, arts. 7º, IX, e 10 ([detalhes](./legal-basis.md#a002--busca-manual-de-cidade-e-previsão)). |
| Titulares | Visitantes do site. |
| Dados | Texto de busca, cidade selecionada, coordenadas da cidade, IP, user-agent e metadados de rede. Não há campo destinado a nome, endereço residencial ou identificador pessoal. |
| Sensíveis? | Não. |
| Fonte | Digitado pelo visitante; dados geográficos retornados pelo Open-Meteo. |
| Sistemas | Estado do React; `localStorage` pode guardar resposta meteorológica e localidade selecionada sob prefixo `togs-cache:v4:`. |
| Operadores/terceiros | Open-Meteo; CPTEC/INPE por meio do AllOrigins quando a localidade é brasileira. |
| Coleta/transferência internacional | Coleta direta pelo Open-Meteo estrangeiro; não é transferência automática pelo app. Eventual fluxo controlador–importador depende dos papéis. |
| Retenção no app | Cache fresco por 15 minutos para clima e 3 horas para CPTEC; fallback expirado limitado a 24 horas; remoção física na primeira carga posterior. |
| Segurança/minimização | HTTPS; consulta limitada a seis resultados; nenhum histórico de pesquisas; cache restrito à resposta necessária. |
| Alto risco? | Não. |
| Owner | Responsável pelo repositório. |

### A003 — Consulta de fontes públicas de alertas, notícias e eventos espaciais

| Campo | Valor |
|---|---|
| Slug | `a003-fontes-publicas` |
| Descrição | Consulta dados públicos de clima, alertas, notícias regionais e bolas de fogo para compor o dashboard. |
| Finalidade | Apresentar informações públicas de interesse climático, regional e astronômico. |
| Base legal | Legítimo interesse — LGPD, arts. 7º, IX, e 10 ([detalhes](./legal-basis.md#a003--consulta-de-fontes-públicas)). |
| Titulares | Visitantes quanto aos metadados de rede; pessoas eventualmente citadas nas matérias pertencem às fontes jornalísticas, sem enriquecimento ou cadastro pelo app. |
| Dados | IP, user-agent e metadados de requisição recebidos pelos endpoints; conteúdo público retornado por INMET, G1, Giro Marília, CPTEC/INPE e NASA/JPL. |
| Sensíveis? | O app não busca nem classifica dados sensíveis. Matérias públicas podem conter dados de terceiros definidos editorialmente pela fonte. |
| Fonte | APIs e feeds públicos. |
| Sistemas | Estado do React; cache local de bolas de fogo por 3 horas, com fallback de até 24 horas. Notícias e alertas regionais não são persistidos pelo app. |
| Operadores/terceiros | Open-Meteo, INMET, RSS2JSON, G1, Giro Marília, AllOrigins, CPTEC/INPE e NASA/JPL. |
| Coleta/transferência internacional | Coleta direta pelos provedores estrangeiros; não é transferência automática pelo app. Eventuais fluxos entre terceiros/controladores permanecem pendentes. |
| Retenção no app | Conforme cache descrito; demais dados permanecem apenas durante a sessão. |
| Segurança/minimização | HTTPS; allowlist exata de hosts testada; falhas por fonte são isoladas; service worker ignora APIs externas. |
| Alto risco? | Não. |
| Owner | Responsável pelo repositório. |

### A004 — Cache técnico e funcionamento PWA

| Campo | Valor |
|---|---|
| Slug | `a004-cache-pwa` |
| Descrição | Mantém shell estático no Cache Storage e respostas públicas selecionadas no `localStorage` do próprio navegador. |
| Finalidade | Melhorar desempenho, reduzir chamadas e permitir acesso offline ao shell do app. |
| Base legal | Legítimo interesse — LGPD, arts. 7º, IX, e 10 ([detalhes](./legal-basis.md#a004--cache-técnico-e-pwa)). |
| Titulares | Visitantes do site. |
| Dados | Assets estáticos; timestamps técnicos; clima/localidade de cidade pesquisada; registros públicos de bolas de fogo. Coordenadas `geo-*` são excluídas do cache. |
| Sensíveis? | Não. |
| Fonte | Respostas públicas já processadas no navegador. |
| Sistemas | Cache Storage `togs-heads-up-v12`; `localStorage` sob `togs-cache:v4:`. |
| Operadores/terceiros | Nenhum novo compartilhamento; armazenamento fica no dispositivo do titular. |
| Transferência internacional | Não causada pelo armazenamento local. |
| Retenção no app | Cache Storage permanece até atualização/limpeza do navegador; caches antigos do app são removidos na ativação. `localStorage`: TTL operacional de 15 min/3 h, fallback de até 24 h e remoção física de entradas expiradas/legadas na próxima carga. |
| Segurança/minimização | Namespaces próprios; remoção restrita a caches do app; APIs externas não entram no service worker; geolocalização exata não é persistida. |
| Alto risco? | Não. |
| Owner | Responsável pelo repositório e titular pelo armazenamento no dispositivo. |

### A005 — Hospedagem pública, repositório e integração contínua

| Campo | Valor |
|---|---|
| Slug | `a005-github-pages-repositorio` |
| Descrição | GitHub hospeda o código, executa CI e entrega os arquivos estáticos do site. |
| Finalidade | Desenvolvimento, controle de versão, validação automatizada e disponibilização pública do app. |
| Base legal | Legítimo interesse — LGPD, arts. 7º, IX, e 10 ([detalhes](./legal-basis.md#a005--github-pages-repositório-e-ci)). |
| Titulares | Visitantes do site e contribuidores do repositório. |
| Dados | IP, user-agent e logs técnicos tratados pelo GitHub; nome, identificador de conta e e-mail presentes nos metadados de commits/contribuições. |
| Sensíveis? | Não no escopo observado. |
| Fonte | Observados pelo provedor durante acesso; fornecidos pelos contribuidores ao Git/GitHub. |
| Sistemas | GitHub repository, Actions e Pages. O app não recebe logs brutos de visitantes. |
| Operadores/terceiros | GitHub. A avaliação L4 separou sua atuação própria nos logs de visitantes da relação ainda pendente para dados de contribuição/plano. |
| Coleta/transferência internacional | Logs de visitantes são coleta direta do GitHub. Dados de contribuição podem envolver transferência, conforme papel e plano usados; confirmação pendente. |
| Retenção no app | Não controlada pelo runtime. Histórico Git é duradouro; logs e metadados seguem políticas do GitHub. |
| Segurança/minimização | Branch protegida pelo fluxo `develop → main`; CI sem segredos do app; deploy somente após build; HTTPS. |
| Alto risco? | Não. |
| Owner | Responsável pelo repositório. |

## Compartilhamentos externos consolidados

| Destinatário | Dados/atividade | Evidência técnica | Avaliação pendente |
|---|---|---|---|
| Open-Meteo | Busca, localidade, coordenadas e metadados de rede — A001/A002/A003 | `geocoding-api.open-meteo.com`, `api.open-meteo.com` | Papel, retenção, país e coleta direta internacional |
| BigDataCloud | Coordenadas exatas e metadados de rede — A001 | `api.bigdatacloud.net` | Papel, retenção, país e coleta direta internacional |
| AllOrigins | URL-alvo, cidade consultada e metadados de rede — A001/A002/A003 | `api.allorigins.win` | Controlador/operador a confirmar, retenção, disponibilidade e coleta direta |
| RSS2JSON | URLs dos feeds e metadados de rede — A003 | `api.rss2json.com` | Papel, retenção, país e coleta direta internacional |
| INMET | Metadados de rede — A003 | `apiprevmet3.inmet.gov.br` | Papel e logs públicos |
| CPTEC/INPE | Cidade consultada, via AllOrigins — A001/A002/A003 | `servicos.cptec.inpe.br` | Cadeia de compartilhamento |
| NASA/JPL | Consulta pública global, via AllOrigins — A003 | `ssd-api.jpl.nasa.gov` | Cadeia de compartilhamento/coleta entre terceiros |
| G1 e Giro Marília | Conteúdo público é lido pelo RSS2JSON — A003 | URLs RSS configuradas | Relação indireta via agregador |
| GitHub | Dados de visitantes e contribuidores — A005 | GitHub Pages/Actions/repositório | Papel, retenção e transferência |

## Inventário de armazenamento local

| Namespace | Conteúdo | Retenção lógica | Pode conter localização exata do navegador? |
|---|---|---|---|
| `togs-cache:v4:weather:{lat},{lng}` | Resposta de clima + localidade pesquisada | 15 min; fallback até 24 h; remoção na primeira carga posterior | Não para IDs `geo-*` |
| `togs-cache:v4:cptec:{lat},{lng}` | Previsão pública CPTEC | 3 h; fallback até 24 h; remoção na primeira carga posterior | Não para IDs `geo-*` |
| `togs-cache:v4:fireballs:global` | Eventos públicos NASA/JPL | 3 h; fallback até 24 h; remoção na primeira carga posterior | Não |
| `togs-heads-up-v12` | HTML, JS, CSS, manifest e ícone | Até atualização/limpeza do navegador | Não |

## Resultado do teste de alto risco

Não há evidência, no escopo atual, de larga escala, impacto significativo sobre direitos, tecnologia emergente aplicada a titulares, vigilância de áreas públicas, decisão automatizada/perfilamento ou tratamento intencional de dados sensíveis, crianças, adolescentes ou idosos. Portanto, nenhuma atividade foi marcada para RIPD neste momento. A conclusão deve ser revista se forem adicionados login, histórico de localização, notificações personalizadas, analytics, publicidade, perfilamento ou backend próprio.

## Pendências para as próximas etapas

- L3: concluído em `.lgpd/legal-basis.md`; aprovação jurídica/controlador permanece pendente.
- L4: concluído preliminarmente em `.lgpd/vendors/` e `.lgpd/transfers/`; os bloqueios identificados permanecem abertos.
- L5: concluído; retenção e eliminação descritas em `.lgpd/retention.md`.
- L7: workflow concluído em `.lgpd/dsar/`; o canal privado ainda precisa ser definido.

> Inventário técnico para apoio à governança. A qualificação jurídica dos papéis e bases legais deve ser validada por profissional especializado em proteção de dados.
