# Política de retenção e eliminação — Togs Heads Up

**Versão**: v1.0-draft

**Data**: 11/09/2026 — adendo técnico OpenWeather

**Normas**: LGPD, arts. 6º, III, 15–16 e 18, VI; Res. CD/ANPD nº 15/2024, art. 10, para futuros registros de incidentes.

## Regras do runtime

| Dado/storage | Retenção | Término/eliminação | Base/finalidade |
|---|---|---|---|
| Coordenadas `geo-*` | somente sessão ativa | removidas do estado ao desativar/recarregar; nunca persistidas | consentimento; clima local |
| Clima de cidade — `togs-cache:v5:weather:*` | fresco por 15 min; fallback até 24 h | remoção física ao abrir/atualizar o dashboard após 24 h | legítimo interesse; desempenho/resiliência |
| CPTEC — `togs-cache:v5:cptec:*` | fresco por 3 h; fallback até 24 h | remoção física na primeira carga posterior a 24 h | legítimo interesse; desempenho/resiliência |
| Fireballs — `togs-cache:v5:fireballs:global` | fresco por 3 h; fallback até 24 h | remoção física na primeira carga posterior a 24 h | legítimo interesse; desempenho/resiliência |
| Namespaces antigos/malformados `togs-cache:*` | nenhum | removidos na próxima carga do dashboard | minimização e qualidade |
| Shell PWA `togs-heads-up-v17`, incluindo JavaScript com chave OpenWeather do projeto | até nova versão/limpeza | versão anterior removida após instalação segura da nova | funcionalidade offline |
| Shell legado `togs-heads-up-v12` | migração do antigo escopo `/Togs-heads-up/` | preservado até limpeza/reinstalação do navegador para não quebrar a PWA antiga | continuidade offline durante o rename |
| Notícias/alertas | sessão | descartados ao fechar/recarregar | exibição de fontes públicas |
| Chave OpenWeather do projeto — configuração local/GitHub Secret e JavaScript publicado | configuração até remoção/rotação; cópias no shell até atualização/limpeza | nova configuração requer novo build; chave publicada permanece nas cópias existentes até substituição/limpeza | integração automática; avaliação A004 pendente |
| Respostas/URLs OpenWeather em memória, inclusive coordenadas e chave | validade lógica de 10 min; máximo 80 entradas | descarte ao atualizar ou recarregar; substituição de entradas pelo limite. TTL não é cronômetro de eliminação física | consulta e redução de chamadas; revisão das LIAs pendente |
| Tiles OpenWeather/OpenStreetMap | carregados somente com mapa aberto | não entram no Cache Storage do app; cache HTTP normal segue navegador/headers dos provedores | visualização da região selecionada |

A chave local de desenvolvimento fica em `.env.development.local`, arquivo ignorado pelo Git, até remoção pelo desenvolvedor. A versão publicada recebe o GitHub Secret `OPENWEATHER_API_KEY` como `VITE_OPENWEATHER_API_KEY` no build; a chave fica visível no JavaScript/navegador e integra o cache do shell. Não há coleta ou armazenamento de chave fornecida pelo visitante. Valores da configuração antiga em `sessionStorage` são ignorados; o app não garante a eliminação dessas entradas legadas. A chave real não integra os arquivos versionados de configuração ou documentação.

O app não impõe obrigação fiscal, trabalhista, bancária ou contratual que justifique retenção adicional. A retenção técnica termina quando a finalidade expira (LGPD, art. 15); as exceções do art. 16 não foram identificadas no runtime.

## Dados fora do controle direto do app

- Open-Meteo declara logs individuais por 90 dias.
- BigDataCloud, RSS2JSON, AllOrigins e GitHub exigem remediações/validações descritas em `.lgpd/vendors/`.
- OpenWeather e OpenStreetMap: prazos dos logs, papéis e condições ainda não avaliados neste adendo. TTL do app não determina eliminação de dados nesses provedores.
- O titular deve ser orientado a contatar o terceiro quando o app não possui acesso ou poder de eliminação sobre seus logs. Isso não afasta o dever do controlador de encaminhar/auxiliar quando aplicável.

## Solicitação de eliminação

1. Confirmar se há dado no runtime do app. Sem conta/backend, normalmente não há registro central associado ao solicitante.
2. Orientar a limpeza dos dados do site no navegador ou disponibilizar controle equivalente antes da política final.
3. Se a solicitação envolver logs de terceiro, identificar destinatário e encaminhar/fornecer canal conforme papel apurado.
4. Registrar minimamente a solicitação e a resposta no canal escolhido, pelo prazo estritamente necessário à prestação de contas; essa retenção depende da definição do controlador/canal em L12.
5. Informar o que foi eliminado, o que não existia e eventual retenção independente de terceiros.

## Validação técnica

- Teste automatizado garante, durante a carga do dashboard, remoção de namespaces legados, JSON inválido e entradas acima de 24 horas.
- Teste existente garante que coordenadas exatas de `geo-current` não sejam gravadas.
- O cleanup preserva chaves de outros aplicativos no mesmo domínio.

## Revisão

Revisar anualmente e sempre que houver conta, backend, analytics, histórico, notificações, novo cache ou novo fornecedor.

> Política técnica em draft; retenções legais organizacionais devem ser confirmadas pelo controlador e por assessoria jurídica.
