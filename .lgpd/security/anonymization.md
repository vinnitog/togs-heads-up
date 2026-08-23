# Avaliação de anonimização e pseudonimização

**Versão**: v1.0

**Data**: 23/08/2026

**Normas**: LGPD, arts. 5º, XI, 12 e 13, § 4º.

## Resultado

Não existe pipeline de analytics, data warehouse, banco de titulares, telemetria comportamental, modelo de ML ou dataset interno a anonimizar/pseudonimizar. Portanto:

- datasets pseudonimizados: **0**;
- datasets declarados anonimizados: **0**;
- vault/tokens: **não aplicável**;
- testes de reidentificação: **não aplicáveis**, pois nenhum dataset foi declarado anônimo.

## Decisões por dado

| Dado | Decisão | Motivo |
|---|---|---|
| Coordenadas opcionais | minimização + memória de sessão + eliminação | generalizar antes da consulta impediria a previsão precisa; persistir token não traria benefício |
| Cidade pesquisada | cache local temporário | nível cidade não é usado para identificar/perfilar e não existe dataset agregado |
| IP/user-agent | tratados diretamente pelos terceiros | o app não recebe nem possui meios de pseudonimizá-los; risco tratado em vendor audit |
| Notícias públicas | exibição transitória da fonte | o app não cria dataset de pessoas citadas nem deve alegar anonimização editorial |
| Fireballs/clima | não pessoais no contexto observado | dados ambientais/astronômicos sem relação com pessoa natural |

## Anti-requisitos

Não adicionar hashing, IDs persistentes, device fingerprint ou “ID anônimo”: isso criaria um identificador pessoal/pseudônimo onde hoje não existe. Pseudonimização continua sob a LGPD e não justificaria coleta adicional.

## Gatilhos de reavaliação

Executar nova análise antes de incluir analytics, conta, histórico de localização, notificações personalizadas, publicidade, experimentos A/B, crash reporting com identificadores ou exportação de métricas. Qualquer dataset futuro só poderá ser chamado de anonimizado após testes de singling out, linkage e inferência considerando meios técnicos razoáveis.

> Conclusão técnica: a melhor salvaguarda para o escopo atual é não coletar e eliminar cedo, não pseudonimizar dados desnecessários.
