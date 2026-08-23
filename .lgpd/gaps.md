# Gap Analysis e Plano de Remediação — 22/08/2026

## Resumo executivo

- O risco técnico é limitado: não há contas, banco, analytics ou retenção de coordenadas exatas.
- O principal tratamento potencialmente pessoal é a geolocalização opcional enviada diretamente a provedores externos.
- As maiores lacunas restantes estão na identificação do controlador/canal, na transparência do consentimento e na regularização ou remoção de terceiros reprovados.

Após L9, inventário, bases legais, retenção, direitos, incidentes e política possuem drafts. A auditoria de terceiros mantém bloqueios. Foram rastreados **6 achados altos**, **4 médios**, **1 baixo** e **0 críticos**; G08 foi corrigido e G09 foi parcialmente corrigido, restando **6 altos, 3 médios e 1 baixo** abertos ou pendentes de validação.

## Achados adicionados em L4 — terceiros

| ID | Gap | Severidade | Estado |
|---|---|---:|---|
| G01 | Controlador e canal público ainda não identificados | alta | aberto |
| G02 | Consentimento de geolocalização não contém todos os elementos de transparência/prova | alta | aberto |
| G03 | BigDataCloud recebe posição exata com papel, necessidade e transparência insuficientes | alta | bloquear/remover |
| G04 | AllOrigins público não possui entidade, política, retenção ou DPA identificados | alta | bloquear/remover |
| G05 | RSS2JSON usa política antiga com analytics e sem governança contratual suficiente | alta | bloquear/remover |
| G06 | Open-Meteo registra logs por 90 dias; papel e garantias para posição exata pendentes | média | limitar/remediar |
| G07 | GitHub Pages/conta gratuita: papéis de visitante e contribuição pendentes | média | documentar/validar |
| G08 | Retenção física de entradas expiradas do `localStorage` | média | corrigido em L5; validar release |
| G09 | Runbook/registro de incidentes inexistente | média | corrigido em L8; contatos/tabletop pendentes |
| G10 | Política de privacidade ainda não publicada | baixa | draft criado em L9; publicação bloqueada |
| G11 | Canal privado de direitos `{EMAIL_PRIVACIDADE}` não definido | alta | definir antes de publicar política |

Detalhes: `.lgpd/vendors/audit-2026-08-23.md` e `.lgpd/transfers/`.

## Matriz de gaps

| Item | Status | Evidência | Severidade |
|---|---|---|---|
| Minimização de dados | GREEN | sem cadastro/analytics; coordenadas exatas não persistem | — |
| Segurança em trânsito | GREEN | endpoints e deploy usam HTTPS | — |
| Transparência imediata da geolocalização | GREEN | aviso junto ao controle informa Open-Meteo e BigDataCloud | — |
| Base legal/finalidade documentada | YELLOW | drafts em `.lgpd/legal-basis.md` e `.lgpd/lia/`; validar premissas | alta |
| Inventário/ROPA | YELLOW | mapa em `.lgpd/data-map.md`; ROPA ainda não consolidado | alta |
| Auditoria dos provedores e fluxos internacionais | RED | auditoria concluída; há terceiros reprovados e papéis pendentes | alta |
| Política de retenção | GREEN | política documentada; limpeza física na primeira carga após 24 h | — |
| Canal de direitos/contato | RED | nenhum canal público encontrado | alta |
| Runbook e registro de incidentes | YELLOW | artefatos criados; contatos e exercício tabletop pendentes | média |
| Política de privacidade | YELLOW | minuta v1.0 criada; publicação bloqueada | baixa |
| ECA Digital | YELLOW | indícios de baixo risco, mas avaliação formal fica para L10 | baixa |
| RIPD | GREEN no escopo atual | sem larga escala, dados sensíveis ou decisão automatizada observada | — |
| Regime ATPP/Encarregado | YELLOW | porte e exploração econômica não confirmados | baixa |

O `GREEN` de retenção cobre TTL, fallback e cleanup automático. A instrução ou o controle visível para limpeza pelo titular continua pendente na interface mínima de `.lgpd/dsar/endpoints.md` e integra os bloqueios de transparência/publicação, não uma falha do mecanismo de retenção.

## Ações imediatas — concluídas documentalmente

1. [x] **Mapear formalmente o fluxo de geolocalização e provedores** (`lgpd-data-mapping`).
   - Justificativa: os princípios de finalidade, necessidade, transparência e responsabilização exigem que o tratamento seja compreensível e demonstrável (LGPD, art. 6º).
   - Esforço: baixo.

2. [x] **Documentar finalidade e base legal de cada atividade** (`lgpd-legal-basis`).
   - Justificativa: tratamento de dados comuns deve se enquadrar em uma hipótese do art. 7º; legítimo interesse, se escolhido, exige avaliação dos requisitos do art. 10.
   - Esforço: baixo.

3. [x] **Inventariar terceiros e classificar fluxos internacionais** (`lgpd-vendor-audit`).
   - Escopo revisado: Open-Meteo, BigDataCloud, AllOrigins, RSS2JSON, GitHub Pages e demais fontes que recebem metadados de rede.
   - Resultado: chamadas diretas do navegador foram classificadas como coleta internacional, não transferência automática (Res. CD/ANPD nº 19/2024, art. 6º); papéis e bloqueios estão em `.lgpd/vendors/` e `.lgpd/transfers/`.
   - Esforço: médio.

## Próximas 2–4 semanas

4. [x] **Formalizar retenção e eliminação** (`lgpd-retention-erasure`).
   - Registrar TTLs e confirmar que geolocalização atual não é persistida.
   - Justificativa: necessidade, prevenção e responsabilização (LGPD, art. 6º) e direito de eliminação quando aplicável (art. 18, VI).

5. **Criar canal público mínimo de contato** após confirmar controlador/regime.
   - Justificativa: livre acesso e transparência (LGPD, arts. 6º e 9º); ATPP de baixo risco pode ser dispensado de Encarregado formal, mas deve manter canal de comunicação (Res. CD/ANPD nº 2/2022, art. 11).

6. [x] **Criar runbook de incidentes e registro** (`lgpd-incident-response`).
   - Justificativa: medidas de segurança e prevenção (LGPD, art. 46). Incidentes notificáveis devem ser comunicados à ANPD em 3 dias úteis, e todos os incidentes devem ser registrados por 5 anos (Res. CD/ANPD nº 15/2024, arts. 6º e 10).

## Depois da descoberta formal — estado atual

7. [x] Criar minuta de política de privacidade (`lgpd-privacy-policy`) conforme os elementos de transparência do art. 9º; publicação bloqueada.
8. [ ] Consolidar ROPA após mapa de dados e base legal (LGPD, art. 37).
9. [ ] Reavaliar RIPD em L11 e sempre que forem adicionados login, histórico de localização, notificações personalizadas, grande escala, dados sensíveis ou perfilamento (LGPD, art. 38; Res. CD/ANPD nº 2/2022, art. 4º).
10. [ ] Avaliar formalmente ECA Digital em L10 e reavaliar se o produto passar a ser direcionado a menores ou de acesso provável por esse público.

## Ações técnicas já concluídas nesta revisão

- removidas APIs que dependiam de chave privada/opcional;
- removidas integrações sem endpoint real ou comprovadamente indisponíveis;
- removido secret de build do GitHub Actions;
- impedida a persistência de coordenadas exatas no cache;
- adicionada transparência junto ao acionamento da localização;
- documentado no README que não há login, analytics ou servidor próprio.

## Checkpoint atual — L9

As etapas L2–L9 foram executadas. A minuta de política não está vigente e o maestro não deve iniciar L10 sem nova aprovação explícita.

> Material técnico informativo. Decisões jurídicas e contratos com operadores devem ser revisados por profissional especializado em proteção de dados.
