# PROJECT_CONTEXT.md - Togs-heads-up

Gerado em: 2026-06-26 12:33:09

## Descricao

Aplicacao de uso pessoal para acompanhar clima terrestre, noticias locais de Marilia-SP, previsao nacional brasileira e eventos astronomicos/espaciais publicos, com Marilia-SP como local padrao.

Atualizacao de integracoes: 11/09/2026. O painel OpenWeather opcional complementa o Open-Meteo com clima atual, previsao de cinco dias/3h, ar atual/previsto/historico de 24h, geocodificacao de cidade/CEP/reversa e cinco camadas Weather Maps 1.0 sobre OpenStreetMap via Leaflet. Mantida a stack React + Vite + Recharts; Leaflet cobre somente os mapas.

## Objetivo

Mostrar clima atual, noticias locais, previsao, complemento CPTEC/INPE e registros publicos de bolas de fogo NASA/JPL, permitindo buscar dinamicamente outros locais quando a API suportar.

## Publico Alvo

Nao definido

## Caracteristicas Informadas

- Interface visual: Sim
- Login/autenticacao: Nao
- Banco de dados: Nao
- Offline/PWA: Sim
- Mobile: Sim
- Dashboard/graficos: Sim
- API propria: Nao
- Integracoes externas: Sim
- Multiusuario: Nao

## Stack Escolhida

```text
React + Vite + Recharts
```

## Motivo Da Stack

Dashboards costumam ter componentes reutilizaveis, filtros, estados e graficos. React + Recharts cobre isso com baixo atrito.

## Alternativas Rejeitadas

HTML/CSS/JS vanilla: possivel, mas tende a ficar disperso com muitos widgets. Supabase: adiar ate existir necessidade clara de persistencia/autenticacao.

## Revisao Obrigatoria De Stack

Antes da primeira feature real, o `senior-dev` deve validar se a stack escolhida ainda faz sentido.

Se houver front-end, `ui-ux-expert` deve validar impacto visual e UX.

O `code-reviewer` deve apontar risco de stack inadequada, excesso de complexidade ou falta de base para evolucao.

## Workflow Padrao

1. `senior-dev`
2. `ui-ux-expert`, quando houver front-end
3. `code-reviewer`
4. `qa-senior`
5. `qa-automate`
6. Validacao final com testes e diff
7. Commit/push em `develop` e PR `develop -> main`

## Comandos De Validacao

```powershell
.\test.cmd
npm.cmd test
git diff --check
```

## Notas De Escopo

- Trabalhar sempre em `develop`.
- Nunca fazer push direto para `main`.
- Preservar alteracoes existentes do usuario.
- Fazer staging explicito por arquivo.
- Manter documentacao de contexto versionada neste arquivo.
- Escopo atual do app: "Clima da Terra + Noticias Locais + Monitor Espacial".
- OpenWeather usa apenas produtos gratuitos; nao usa One Call nem assinatura paga. Cinco consultas de dados por atualizacao completa; geocodificacao e mapas geram chamadas adicionais.
- Chave de desenvolvimento em `.env.development.local` (`VITE_OPENWEATHER_API_KEY`), sem versionamento nem inclusao no bundle publico. Producao usa chave individual em `sessionStorage`; respostas ficam em memoria com TTL de dez minutos.
- Mapas OpenWeather/OpenStreetMap carregam somente ao abrir a aba. Geolocalizacao com chave usa OpenWeather para nomear local e Open-Meteo para previsao; sem chave preserva BigDataCloud.
- Shell PWA atual: `togs-heads-up-v16`; `togs-heads-up-v12` legado preservado. APIs autenticadas e tiles externos nao entram no Cache Storage do app.
- Documentos `.lgpd/` incluem o delta tecnico OpenWeather/OpenStreetMap; avaliacao dos novos terceiros e revisao juridica continuam pendentes, com politica em draft nao publicado.

