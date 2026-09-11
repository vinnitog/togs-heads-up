# Togs Heads Up

Dashboard responsivo que reúne clima, risco meteorológico, avisos oficiais, notícias regionais de Marília-SP e registros públicos de bolas de fogo em uma única interface.

[Acessar demonstração](https://vinnitog.github.io/togs-heads-up/)

## Destaques

- clima atual, previsão horária e estimativa de risco para as próximas 24 horas pelo Open-Meteo;
- painel OpenWeather opcional com clima atual, previsão de cinco dias, qualidade do ar e mapas meteorológicos;
- busca de cidades e geolocalização opcional;
- previsão nacional complementar do CPTEC/INPE, distribuída pela BrasilAPI;
- avisos meteorológicos oficiais do INMET, quando o endpoint público responde;
- notícias e alertas de Marília-SP filtrados de fontes públicas;
- registros de bolas de fogo da NASA/JPL;
- funcionamento como PWA, com shell disponível offline;
- estados independentes de carregamento, erro, cache e indisponibilidade por fonte;
- interface responsiva e navegável por teclado.

## Tecnologias

- React 18 e Vite;
- Recharts para visualização de dados;
- Lucide React para ícones;
- Leaflet e OpenStreetMap para os mapas meteorológicos;
- Node Test Runner para testes automatizados;
- GitHub Actions e GitHub Pages.

## Executar localmente

Requisitos: Node.js 24 e npm 11.6.2.

```powershell
npm.cmd ci
npm.cmd run dev
```

O painel principal funciona sem chave. O arquivo `.env.example` documenta o proxy opcional NASA/JPL e a integração OpenWeather.

### OpenWeather opcional

No desenvolvimento local, configure `VITE_OPENWEATHER_API_KEY` em `.env.development.local`, arquivo ignorado pelo Git. Essa configuração é lida somente no modo de desenvolvimento e não deve ser movida para `.env.production` ou incluída em arquivos versionados.

Na versão publicada, abra **OpenWeather → Conectar OpenWeather** e informe sua própria chave. Ela fica no `sessionStorage` da aba e é removida pelo controle de desconexão; não é guardada no `localStorage`. A chave é enviada diretamente à OpenWeather nas consultas autenticadas e fica acessível ao próprio navegador, não a um proxy público.

Uma consulta completa usa cinco endpoints: clima atual, previsão de cinco dias a cada três horas, ar atual, previsão do ar e histórico das últimas 24 horas. Busca de cidades/CEP, geocodificação reversa e tiles do mapa geram consultas adicionais. O cache de respostas é somente em memória, com validade de dez minutos. Os mapas carregam somente ao abrir a aba correspondente. One Call e produtos pagos não são utilizados; disponibilidade e limites seguem a conta OpenWeather.

## Validar

```powershell
.\test.cmd
git diff --check
```

O comando executa testes unitários e o build de produção.

## Fontes de dados

| Fonte | Uso | Observação |
|---|---|---|
| Open-Meteo | clima, busca de cidades e risco estimado em 24 h | gratuita, sem chave e com CORS; não é aviso oficial |
| OpenWeather | clima, previsão 5 dias/3h, ar, geocodificação e cinco camadas de mapas | opcional, usa chave da sessão e produtos do plano gratuito |
| OpenStreetMap | mapa-base | tiles consultados somente ao abrir o mapa |
| BigDataCloud | nome do local após geolocalização sem chave OpenWeather | consulta pública, sem chave |
| CPTEC/INPE via BrasilAPI | previsão nacional complementar | gratuita, sem chave e com CORS; Marília usa o código 3159 |
| INMET | avisos meteorológicos oficiais | endpoint público instável; falha isolada do restante do painel |
| G1 Bauru e Marília / Giro Marília | notícias regionais | feeds RSS convertidos para JSON |
| NASA/JPL CNEOS | bolas de fogo | fonte pública acessada por proxy |

As integrações degradam de forma independente: a falha de uma fonte não bloqueia o restante do painel.

O painel diferencia procedência: **INMET** é a fonte de avisos oficiais; **Open-Meteo** produz somente uma estimativa baseada em previsão numérica. Métricas, limitações e fontes planejadas estão em [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## Privacidade

O projeto não possui login, banco de dados, analytics ou cookies de rastreamento. A localização é opcional e só é solicitada após ação do usuário. Quando ativada, as coordenadas são enviadas ao Open-Meteo e, com uma chave conectada, à OpenWeather; sem chave, o nome do local é obtido pelo BigDataCloud. Coordenadas exatas não são persistidas no armazenamento do app nem enviadas a servidor próprio. Ao abrir mapas, OpenWeather e OpenStreetMap recebem pedidos dos tiles da região visualizada e metadados de rede. A chave segue somente para os domínios OpenWeather.

O diagnóstico técnico de privacidade e as pendências de governança estão documentados em [`.lgpd/`](.lgpd/). Esses documentos são uma referência de engenharia e não substituem revisão jurídica.

## Estrutura

```text
src/
├── data/       # catálogo de fontes regionais
├── services/   # clientes e normalização das APIs públicas
├── utils/      # regras auxiliares de incidentes
├── App.jsx     # composição das telas
└── styles.css  # tokens e responsividade
unit/           # testes automatizados
public/         # manifest, ícone e service worker
```

## Skills de desenvolvimento

O repositório inclui skills locais em `.agents/skills/` para auditoria LGPD, qualidade de frontend e estratégia de precificação. As adaptações específicas do projeto estão descritas em [`docs/SKILLS.md`](docs/SKILLS.md).

## Licença e fontes das skills

O código do app ainda não declara uma licença própria. As skills vendorizadas mantêm as licenças de seus projetos de origem: [lgpd-skills](https://github.com/goul4rt/lgpd-skills) (MIT), [Impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0) e [PM Skills](https://github.com/phuryn/pm-skills) (MIT). Os textos integrais e avisos estão em [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).
