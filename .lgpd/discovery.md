# Discovery LGPD — Togs Heads Up

Data: 22/08/2026.

## Escopo técnico

- SPA/PWA estática em React, publicada no GitHub Pages.
- Sem autenticação, contas, banco de dados, backend próprio ou formulários de cadastro.
- Sem analytics, pixels, cookies de rastreamento ou SDK de publicidade.
- Service worker ignora requisições externas e armazena apenas o shell estático do app.
- Cache local do dashboard armazena respostas públicas; coordenadas obtidas por geolocalização foram excluídas desse cache.

## Fluxos observados

### Localização digitada

O usuário pode buscar uma cidade. O texto e as coordenadas do resultado são enviados ao Open-Meteo para geocodificação e previsão. Uma cidade, isoladamente, não identifica necessariamente uma pessoa, mas os metadados da requisição, como IP, são recebidos pelo provedor externo.

### Geolocalização opcional

Após ação explícita e permissão do navegador, latitude e longitude são mantidas apenas no estado da sessão e enviadas ao BigDataCloud para nomear o local e ao Open-Meteo para consultar o clima. O app não envia as coordenadas a servidor próprio e não as persiste no `localStorage`.

### Fontes públicas

- Open-Meteo: clima e geocodificação.
- BigDataCloud: geocodificação reversa.
- CPTEC/INPE e NASA/JPL CNEOS: consulta por meio do proxy público AllOrigins por ausência de CORS.
- INMET, G1 Bauru e Marília e Giro Marília: alertas/notícias regionais.
- RSS2JSON: conversão de feeds RSS em JSON.

## Superfícies e permissões

- Permissão do navegador: geolocalização, somente quando o usuário aciona o botão.
- Armazenamento local: cache técnico de respostas públicas com TTL; nenhum identificador de conta.
- Rede: somente HTTPS.
- Mobile nativo: não aplicável.

## Controles encontrados

- Estado offline e falha isolada por fonte.
- Links externos usam `rel="noreferrer"`.
- Não há chave privada no código, no workflow ou na configuração de exemplo.
- O app informa, junto ao controle, quais provedores recebem a localização.
- Coordenadas exatas não aparecem em IDs persistidos.

## Itens não encontrados

- inventário formal das atividades de tratamento;
- base legal documentada;
- avaliação e termos dos operadores/provedores;
- política de privacidade publicada;
- canal público para solicitações de titulares;
- política formal de retenção;
- runbook e registro de incidentes;
- decisão documentada sobre regime ATPP e necessidade de Encarregado.

## Histórico e incidentes

Nenhum registro de incidente ou post-mortem foi encontrado no repositório. Isso não comprova ausência de incidentes fora do código.
