# Gap Analysis e Plano de Remediação — 22/08/2026

## Resumo executivo

- O risco técnico é limitado: não há contas, banco, analytics ou retenção de coordenadas exatas.
- O principal tratamento potencialmente pessoal é a geolocalização opcional enviada diretamente a provedores externos.
- A maior lacuna está na governança: finalidade/base legal, operadores, transferências, canal e resposta a incidentes ainda não foram formalizados.

Contagem: **2 gaps altos**, **4 médios**, **2 baixos** e **0 críticos** no escopo técnico atual.

## Matriz de gaps

| Item | Status | Evidência | Severidade |
|---|---|---|---|
| Minimização de dados | GREEN | sem cadastro/analytics; coordenadas exatas não persistem | — |
| Segurança em trânsito | GREEN | endpoints e deploy usam HTTPS | — |
| Transparência imediata da geolocalização | GREEN | aviso junto ao controle informa Open-Meteo e BigDataCloud | — |
| Base legal/finalidade documentada | RED | nenhum artefato formal | alta |
| Inventário/ROPA | RED | nenhum registro de operações | alta |
| Auditoria dos provedores e transferências | RED | termos, países e papéis não revisados | média |
| Política de retenção | YELLOW | TTL existe no código, mas não está formalizado | média |
| Canal de direitos/contato | RED | nenhum canal público encontrado | média |
| Runbook e registro de incidentes | RED | nenhum documento encontrado | média |
| Política de privacidade | YELLOW | README descreve fatos técnicos, mas não é política jurídica | baixa |
| ECA Digital | GREEN no escopo atual | app não é direcionado a menores e não possui conta/perfilamento | — |
| RIPD | GREEN no escopo atual | sem larga escala, dados sensíveis ou decisão automatizada observada | — |
| Regime ATPP/Encarregado | YELLOW | porte e exploração econômica não confirmados | baixa |

## Ações imediatas

1. **Mapear formalmente o fluxo de geolocalização e provedores** (`lgpd-data-mapping`).
   - Justificativa: os princípios de finalidade, necessidade, transparência e responsabilização exigem que o tratamento seja compreensível e demonstrável (LGPD, art. 6º).
   - Esforço: baixo.

2. **Documentar finalidade e base legal de cada atividade** (`lgpd-legal-basis`).
   - Justificativa: tratamento de dados comuns deve se enquadrar em uma hipótese do art. 7º; legítimo interesse, se escolhido, exige avaliação dos requisitos do art. 10.
   - Esforço: baixo.

3. **Inventariar operadores e transferências internacionais** (`lgpd-vendor-audit`).
   - Escopo mínimo: Open-Meteo, BigDataCloud, AllOrigins, RSS2JSON, GitHub Pages e demais fontes que recebem metadados de rede.
   - Justificativa: operador deve seguir instruções do controlador (LGPD, art. 39) e transferências internacionais devem observar uma hipótese dos arts. 33–36 e a Res. CD/ANPD nº 19/2024.
   - Esforço: médio.

## Próximas 2–4 semanas

4. **Formalizar retenção e eliminação** (`lgpd-retention-erasure`).
   - Registrar TTLs e confirmar que geolocalização atual não é persistida.
   - Justificativa: necessidade, prevenção e responsabilização (LGPD, art. 6º) e direito de eliminação quando aplicável (art. 18, VI).

5. **Criar canal público mínimo de contato** após confirmar controlador/regime.
   - Justificativa: livre acesso e transparência (LGPD, arts. 6º e 9º); ATPP de baixo risco pode ser dispensado de Encarregado formal, mas deve manter canal de comunicação (Res. CD/ANPD nº 2/2022, art. 11).

6. **Criar runbook de incidentes e registro** (`lgpd-incident-response`).
   - Justificativa: medidas de segurança e prevenção (LGPD, art. 46). Incidentes notificáveis devem ser comunicados à ANPD em 3 dias úteis, e todos os incidentes devem ser registrados por 5 anos (Res. CD/ANPD nº 15/2024, arts. 6º e 10).

## Depois da descoberta formal

7. Avaliar necessidade e conteúdo de política de privacidade (`lgpd-privacy-policy`) conforme os elementos de transparência do art. 9º.
8. Consolidar ROPA após mapa de dados e base legal (LGPD, art. 37).
9. Reavaliar RIPD se forem adicionados login, histórico de localização, notificações personalizadas, grande escala, dados sensíveis ou perfilamento (LGPD, art. 38; Res. CD/ANPD nº 2/2022, art. 4º).
10. Reavaliar ECA Digital se o produto passar a ser direcionado a menores ou de acesso provável por esse público.

## Ações técnicas já concluídas nesta revisão

- removidas APIs que dependiam de chave privada/opcional;
- removidas integrações sem endpoint real ou comprovadamente indisponíveis;
- removido secret de build do GitHub Actions;
- impedida a persistência de coordenadas exatas no cache;
- adicionada transparência junto ao acionamento da localização;
- documentado no README que não há login, analytics ou servidor próprio.

## Checkpoint L1

Este plano encerra a etapa `lgpd-legacy-retrofit`. O próximo passo do maestro é L2 (`lgpd-data-mapping`) e depende de aprovação explícita antes de gerar os próximos artefatos.

> Material técnico informativo. Decisões jurídicas e contratos com operadores devem ser revisados por profissional especializado em proteção de dados.
