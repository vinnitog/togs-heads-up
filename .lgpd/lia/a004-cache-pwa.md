# LIA — A004 Cache técnico e PWA

**Versão**: v1.0-draft

**Data**: 23/08/2026

**Controlador**: pendente de identificação
**Base avaliada**: LGPD, arts. 7º, IX, e 10

## 1. Finalidade

O interesse concreto é reduzir latência, chamadas repetidas e indisponibilidade, mantendo o shell estático acessível offline. O armazenamento ocorre no dispositivo do próprio visitante.

## 2. Necessidade

O cache é limitado a assets, respostas públicas e localidade em nível de cidade. Coordenadas exatas obtidas pela geolocalização são excluídas. Sem cache, o app aumentaria chamadas aos provedores e perderia a capacidade offline.

## 3. Balanceamento

| Fator | Avaliação |
|---|---|
| Expectativa razoável | Alta para cache funcional de uma PWA. |
| Impacto | Leve; dados ficam no dispositivo e não criam compartilhamento adicional. |
| Categoria | Dados técnicos e localidade pública/contextual. |
| Vulnerabilidade | Nenhuma identificada. |
| Coleta | Automática e funcional. |
| Salvaguardas | Namespaces próprios, TTL lógico, exclusão de `geo-*`, cache externo ignorado. |

**Conclusão**: o interesse prevalece, condicionado à transparência e à correção da retenção física das entradas expiradas.

## 4. Salvaguardas

- [x] Cache funcional sem tracking.
- [x] Coordenadas exatas não persistidas.
- [x] Remoção seletiva de versões antigas do Cache Storage.
- [x] TTL lógico e fallback máximo de 24 horas.
- [x] Remover fisicamente entradas expiradas na primeira carga após 24 horas.
- [ ] Oferecer instrução ou controle de limpeza ao titular.

## 5. RIPD

Não indicado no escopo atual.

## 6. Decisão

**Recomendação técnica**: aprovar; remediação de retenção implementada em L5.

**Aprovação jurídica/controlador**: pendente.
**Revisar se**: o cache passar a guardar histórico, conta, posição exata ou preferências comportamentais.
