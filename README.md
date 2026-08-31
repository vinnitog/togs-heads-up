# Togs Heads Up

Dashboard responsivo que reúne clima, risco meteorológico, avisos oficiais, notícias regionais de Marília-SP e registros públicos de bolas de fogo em uma única interface.

[Acessar demonstração](https://vinnitog.github.io/togs-heads-up/)

## Destaques

- clima atual, previsão horária e estimativa de risco para as próximas 24 horas pelo Open-Meteo;
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
- Node Test Runner para testes automatizados;
- GitHub Actions e GitHub Pages.

## Executar localmente

Requisitos: Node.js 24 e npm 11.6.2.

```powershell
npm.cmd ci
npm.cmd run dev
```

O app funciona sem chave privada. O arquivo `.env.example` documenta apenas o proxy opcional usado pela fonte NASA/JPL, que não oferece CORS ao navegador.

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
| BigDataCloud | nome do local após geolocalização | consulta pública, sem chave |
| CPTEC/INPE via BrasilAPI | previsão nacional complementar | gratuita, sem chave e com CORS; Marília usa o código 3159 |
| INMET | avisos meteorológicos oficiais | endpoint público instável; falha isolada do restante do painel |
| G1 Bauru e Marília / Giro Marília | notícias regionais | feeds RSS convertidos para JSON |
| NASA/JPL CNEOS | bolas de fogo | fonte pública acessada por proxy |

As integrações degradam de forma independente: a falha de uma fonte não bloqueia o restante do painel.

O painel diferencia procedência: **INMET** é a fonte de avisos oficiais; **Open-Meteo** produz somente uma estimativa baseada em previsão numérica. Métricas, limitações e fontes planejadas estão em [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## Privacidade

O projeto não possui login, banco de dados, analytics ou cookies de rastreamento. A localização é opcional e só é solicitada após ação do usuário. Quando ativada, as coordenadas são enviadas ao Open-Meteo e ao BigDataCloud para a consulta, mas não são persistidas no cache do app nem enviadas a servidor próprio.

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
