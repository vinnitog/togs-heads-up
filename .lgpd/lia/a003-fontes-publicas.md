# LIA — A003 Consulta de fontes públicas

**Versão**: v1.0-draft

**Data**: 23/08/2026

**Controlador**: pendente de identificação
**Base avaliada**: LGPD, arts. 7º, IX, e 10

## 1. Finalidade

O interesse concreto é operar o dashboard de clima, alertas regionais e eventos espaciais. O conteúdo consultado é público; o possível dado pessoal associado ao visitante limita-se aos metadados técnicos recebidos pelos provedores durante requisições diretas.

## 2. Necessidade

Cada fonte é consultada apenas para a seção correspondente. O app não cria identificador, não combina os metadados entre fontes e não recebe logs brutos. Um backend intermediário centralizaria mais dados e não seria, por si só, menos invasivo.

## 3. Balanceamento

| Fator | Avaliação |
|---|---|
| Expectativa razoável | Alta para chamadas necessárias a um dashboard de dados públicos, desde que informadas. |
| Impacto | Leve no app; L4 identificou retenções conhecidas e pendências por provedor. |
| Categoria | Metadados comuns de rede e conteúdo público. |
| Vulnerabilidade | Nenhuma identificada. |
| Coleta | Automática ao abrir o dashboard, hoje descrita no README, mas ainda sem política publicada. |
| Salvaguardas | Sem cookies/analytics, allowlist, HTTPS, falha isolada e service worker fora das APIs. |

**Conclusão**: o interesse prevalece condicionalmente porque as chamadas são necessárias à função esperada e o app não rastreia nem perfila visitantes. Transparência sobre os destinatários e vendor audit são condições de continuidade.

## 4. Salvaguardas

- [x] Sem conta, analytics, publicidade ou rastreamento cruzado.
- [x] Allowlist e HTTPS.
- [x] Dados dinâmicos externos fora do Cache Storage do service worker.
- [ ] Política pública com lista de categorias de destinatários.
- [x] Revisão preliminar de termos, retenção e fluxos internacionais em L4; bloqueios registrados em `.lgpd/vendors/`.

## 5. RIPD

Não indicado no escopo atual. Reavaliar se houver larga escala, perfilamento ou combinação de dados sobre titulares.

## 6. Decisão

**Recomendação técnica**: aprovar condicionalmente.

**Aprovação jurídica/controlador**: pendente.
**Revisar se**: qualquer fonte adicionar autenticação, tracking, chave privada, pagamento ou termos incompatíveis.
