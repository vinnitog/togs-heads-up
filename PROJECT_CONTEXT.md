# PROJECT_CONTEXT.md - Togs-heads-up

Gerado em: 2026-06-26 12:33:09

## Descricao

Aplicacao de uso pessoal para acompanhar clima terrestre, noticias locais de Marilia-SP, noticias sobre atos federais, previsao nacional brasileira e eventos astronomicos/espaciais publicos, com Marilia-SP como local padrao.

Atualizacao de integracoes: 11/09/2026. O painel OpenWeather automatico complementa o Open-Meteo com clima atual, previsao de cinco dias/3h, ar atual/previsto/historico de 24h, geocodificacao de cidade/CEP/reversa e cinco camadas Weather Maps 1.0 sobre OpenStreetMap via Leaflet. Mantida a stack React + Vite + Recharts; Leaflet cobre somente os mapas.

## Objetivo

Paginacao do Glossario: 02/11/2026. Exibicao inicial de dez termos por pagina, com opcoes de 10, 20 ou 50, navegacao anterior/proxima e faixa de resultados. Busca, categoria e quantidade reiniciam a primeira pagina; limpar filtros preserva a quantidade escolhida. Sem nova dependencia ou API.

Atualizacao Glossario: 02/11/2026. Menu Glossario com catalogo local de siglas e unidades de governo/justica, clima/ar, espaco, tecnologia e localizacao; busca por sigla, significado e variantes, filtro por categoria e referencias externas. Sem nova API ou dependencia. Mantida a stack React + Vite + Recharts. O catalogo cobre os paineis e siglas conhecidas das noticias; siglas novas exigem revisao editorial e siglas ambiguas dependem do contexto.

Atualizacao News Brasil: 02/11/2026. Mantida a stack React + Vite + Recharts. Menu dedicado acompanha noticias sobre atos federais desde 25/10/2026, com marco eleitoral conferido no TRE-SP, fontes institucionais/imprensa selecionadas, filtros e links originais. Coletor Node de feeds publica JSON estatico na hospedagem; agenda de 30 minutos no workflow de Pages, sem commits automaticos. Historico incremental em cache do Actions sujeito a expiracao; feeds e filtros nao garantem cobertura total nem vigencia juridica. Navegador consulta apenas o JSON da hospedagem e verifica novidades a cada cinco minutos com a tela aberta.

Mostrar clima atual, noticias locais, noticias de atos federais desde a reeleicao de 2026, previsao, complemento CPTEC/INPE e registros publicos de bolas de fogo NASA/JPL, permitindo buscar dinamicamente outros locais quando a API suportar.

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
- Escopo atual do app: "Clima da Terra + Noticias Locais + News Brasil + Monitor Espacial".
- OpenWeather usa apenas produtos gratuitos; nao usa One Call nem assinatura paga. Cinco consultas de dados por atualizacao completa; geocodificacao e mapas geram chamadas adicionais.
- Chave de desenvolvimento em `.env.development.local` (`VITE_OPENWEATHER_API_KEY`), sem versionamento. Producao injeta GitHub Secret `OPENWEATHER_API_KEY` como `VITE_OPENWEATHER_API_KEY` no build; dados carregam automaticamente, sem solicitar chave ao visitante. A chave compartilhada fica visivel no JavaScript/navegador e integra o cache do shell. Valores antigos em `sessionStorage` sao ignorados. Respostas ficam em memoria com TTL de dez minutos.
- Mapas OpenWeather/OpenStreetMap carregam somente ao abrir a aba. Geolocalizacao com chave usa OpenWeather para nomear local e Open-Meteo para previsao; sem chave preserva BigDataCloud.
- Shell PWA atual: `togs-heads-up-v20`; `togs-heads-up-v12` legado preservado. O JavaScript com a chave integra o shell; respostas de APIs autenticadas e tiles externos nao entram no Cache Storage do app.
- Documentos `.lgpd/` incluem o delta tecnico OpenWeather/OpenStreetMap; avaliacao dos novos terceiros e revisao juridica continuam pendentes, com politica em draft nao publicado.

