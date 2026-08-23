# LIA — A002 Busca manual de cidade e previsão

**Versão**: v1.0-draft

**Data**: 23/08/2026

**Controlador**: pendente de identificação
**Base avaliada**: LGPD, arts. 7º, IX, e 10

## 1. Finalidade

O interesse concreto é entregar a consulta meteorológica solicitada pelo visitante. A finalidade é lícita, específica e beneficia diretamente o titular. Sem enviar o texto e a localidade ao provedor meteorológico, o app não consegue resolver a cidade nem obter a previsão correspondente.

## 2. Necessidade

São usados apenas texto de busca, localidade/coordernadas públicas da cidade e parâmetros meteorológicos. Não há conta, histórico de pesquisa ou identificador criado pelo app. Auto-hospedar uma base global de geocodificação e previsão não é alternativa proporcional para este projeto; a busca permanece opcional.

## 3. Balanceamento

| Fator | Avaliação |
|---|---|
| Expectativa razoável | Alta: o visitante envia explicitamente uma cidade para receber previsão. |
| Impacto | Leve: localidade em nível de cidade, sem histórico central ou perfil. |
| Categoria | Dado comum/contextual; o texto livre pode ser usado indevidamente, por isso o campo não deve incentivar endereço pessoal. |
| Vulnerabilidade | Nenhuma identificada; menores não são segmentados. |
| Coleta | Transparente e iniciada pelo titular. |
| Salvaguardas | Sem conta, seis resultados, sem histórico, HTTPS, cache curto e allowlist de hosts. |

**Conclusão**: o interesse prevalece condicionalmente porque o tratamento é esperado, mínimo e beneficia o visitante, desde que a política identifique provedores e a busca não seja reutilizada para analytics, publicidade ou perfilamento.

## 4. Salvaguardas

- [x] Minimização e finalidade delimitada.
- [x] HTTPS e allowlist de hosts.
- [x] Ausência de analytics/histórico central.
- [x] Retenção lógica curta.
- [ ] Política/canal público.
- [x] Limpeza física de entradas expiradas na primeira carga após 24 horas.
- [ ] Controle explícito de limpeza no app (melhoria opcional; navegador já oferece a função).

## 5. RIPD

Não indicado no escopo atual: sem critérios de alto risco observados. A ANPD pode solicitá-lo quando o legítimo interesse for usado (LGPD, art. 10, § 3º).

## 6. Decisão

**Recomendação técnica**: aprovar condicionalmente.

**Aprovação jurídica/controlador**: pendente.
**Revisar se**: houver histórico, conta, endereço exato, analytics ou personalização.
