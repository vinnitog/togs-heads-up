# LGPD Audit Status

**Projeto**: Togs Heads Up

**Cenário**: B — sistema existente em retrofit

**Início**: 22/08/2026

**Última atualização**: 11/09/2026 — adendo técnico OpenWeather

**Encarregado**: pendente de avaliação de aplicabilidade

## Pipeline atual

- [x] L0 — Setup
- [x] L1 — Legacy retrofit e gap analysis
- [x] L2 — Data mapping
- [x] L3 — Base legal
- [x] L4 — Vendor audit
- [x] L5 — Retenção e eliminação
- [x] L6 — Anonimização
- [x] L7 — Direitos do titular
- [x] L8 — Resposta a incidentes
- [x] L9 — Política de privacidade (draft; não publicada)
- [ ] L10 — ECA Digital, se aplicável
- [ ] L11 — RIPD, se aplicável
- [ ] L12 — Encarregado/canal
- [ ] L13 — Relatório final

## Artefatos gerados

- `.lgpd/discovery.md` — descoberta técnica, 22/08/2026
- `.lgpd/gaps.md` — gap analysis e plano priorizado, 22/08/2026
- `.lgpd/data-map.md` — v1.0-draft, 23/08/2026; 5 atividades, 0 sensíveis, 0 alto risco
- `.lgpd/legal-basis.md` — v1.0-draft, 23/08/2026; 1 consentimento e 4 legítimos interesses
- `.lgpd/lia/` — 4 testes de balanceamento em draft, 23/08/2026
- `.lgpd/vendors/` — auditoria de 8 terceiros + minuta de DPA, 23/08/2026
- `.lgpd/transfers/` — 5 avaliações de transferência potencial, 23/08/2026
- `.lgpd/retention.md` — v1.0-draft + cleanup técnico de cache, 23/08/2026
- `.lgpd/security/anonymization.md` — avaliação concluída; 0 pipelines/datasets, 23/08/2026
- `.lgpd/dsar/` — workflow e decisão sem endpoints, v1.0-draft, 23/08/2026
- `.lgpd/incidents/` — runbook, registro e templates, v1.0-draft, 23/08/2026
- `.lgpd/policies/privacy-policy-v1.0-draft.md` — minuta não vigente, 23/08/2026

## Gaps abertos

Ver `.lgpd/gaps.md`.

## Adendo técnico — OpenWeather/OpenStreetMap

Em 11/09/2026, atualizados inventário, bases pretendidas, retenção e minuta para refletir a integração automática OpenWeather com chave do projeto, busca por cidade/CEP, geocodificação reversa e mapas. Mantidas as cinco atividades existentes; A001 conserva consentimento pretendido, A002–A005 conservam o enquadramento condicional anterior. Nenhuma base foi aprovada por este adendo.

- Respostas OpenWeather em memória com validade de dez minutos. A chave compartilhada é configurada no GitHub Secret `OPENWEATHER_API_KEY` e injetada como `VITE_OPENWEATHER_API_KEY` no build; integra o JavaScript público e o cache do shell. Não há coleta de chave do visitante; valores antigos em `sessionStorage` são ignorados.
- Tiles OpenWeather/OpenStreetMap somente ao abrir mapas; posição opcional continua sem persistência no armazenamento do app.
- Shell atualizado para `togs-heads-up-v17`, com v12 legado preservado. Respostas autenticadas e tiles externos continuam fora do Cache Storage do app.
- Pendente: atualizar LIAs A002–A004 e auditar termos, papéis, retenção e países dos novos destinatários. Os artefatos históricos L4 não cobrem automaticamente esses terceiros.
- Minuta de privacidade continua não publicada; permanecem as pendências anteriores de controlador, canal e revisão jurídica. Este delta não declara conformidade.

## Próximo passo

⏸ Checkpoint L9: revisar `.lgpd/policies/privacy-policy-v1.0-draft.md`. Não publicar nem iniciar L10 sem aprovação explícita.

> Este diagnóstico é uma referência de engenharia e não substitui revisão jurídica especializada.
