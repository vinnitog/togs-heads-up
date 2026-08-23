# Fluxo de direitos do titular — DSAR

**Versão**: v1.0-draft

**Data**: 23/08/2026

**Normas**: LGPD, arts. 6º, III e IV, 18 e 19, II.
**SLA interno adotado**: resposta completa em até 15 dias corridos. Eventual prazo diferenciado de ATPP não será usado para alongar o atendimento sem confirmação jurídica.

## Contexto

O Togs Heads Up não possui conta, autenticação, banco, backend, formulário ou identificador próprio. A resposta normal será: nenhum dado central associado ao titular; dados funcionais podem existir apenas no navegador; provedores externos podem manter logs próprios.

Criar endpoints `/api/me` ou coletar documento/e-mail somente para atender DSAR aumentaria a coleta sem necessidade (LGPD, art. 6º, III). Por isso, o fluxo é documental e usa um canal privado a ser definido antes da publicação.

## Canal obrigatório antes da publicação

- **Canal privado**: `{EMAIL_PRIVACIDADE}` — pendente de definição pelo controlador.
- Não usar issue pública do GitHub para pedidos com dados pessoais.
- A política deverá identificar o controlador e apresentar o canal em destaque.
- Se o projeto vier a usar formulário, ele deverá explicar finalidade, campos mínimos, retenção e segurança antes de coletar.

## Triagem

1. Registrar data/hora, direito solicitado e contato fornecido voluntariamente.
2. Responder confirmação simples imediatamente quando possível.
3. Não solicitar CPF, documento, selfie ou endereço, pois o app não possui esses dados para comparação.
4. Identificar o escopo:
   - cache/localização no navegador;
   - logs de provedor externo;
   - metadados de contribuição no GitHub;
   - conteúdo jornalístico de terceiro;
   - assunto fora do controle do projeto.
5. Encaminhar ao destinatário aplicável e acompanhar quando o papel/contrato exigir cooperação.
6. Entregar resposta completa em até 15 dias corridos, em linguagem simples.

## Atendimento dos direitos do art. 18

| Direito | Resposta no escopo atual |
|---|---|
| Confirmação | informar que não há cadastro/backend; listar cache local e terceiros aplicáveis |
| Acesso | orientar inspeção/limpeza do armazenamento do site e fornecer o mapa das atividades; não há bundle central |
| Correção | localidade pode ser trocada pelo próprio visitante; dados do GitHub/fonte devem ser corrigidos no controlador correspondente |
| Anonimização, bloqueio ou eliminação de dado excessivo | limpar cache local; acionar terceiro quando aplicável; não criar pseudônimo desnecessário |
| Portabilidade | não aplicável a cadastro inexistente; responder justificadamente e fornecer dados locais legíveis se houver |
| Eliminação de dado tratado com consentimento | desativar geolocalização encerra o tratamento no app; solicitar eliminação ao terceiro quando houver dado identificável |
| Informação sobre compartilhamento | fornecer destinatários, países e finalidades de `.lgpd/data-map.md`/política |
| Informação sobre negar consentimento | uso principal continua com Marília e busca manual; geolocalização é opcional |
| Revogação | mesmo botão desativa geolocalização e remove coordenadas do estado ativo |

## Verificação de identidade

- Para cache no dispositivo, nenhuma verificação é necessária: o próprio titular controla o navegador.
- Para logs de terceiros, seguir o procedimento do terceiro, sem coletar cópia adicional no projeto.
- Para commits/contribuições, comprovar controle da conta GitHub ou do e-mail já presente no commit, usando o mínimo necessário.
- Se não houver dado capaz de vincular o solicitante, explicar a impossibilidade de localizar registro sem coletar informação excessiva.

## Resposta padrão mínima

1. confirmação do recebimento e data limite;
2. atividades/dados encontrados ou confirmação de ausência;
3. ações executadas no app;
4. terceiros contatados ou canais fornecidos;
5. retenções/limitações justificadas;
6. informação sobre oposição, reclamação ao controlador e petição à ANPD.

## Registro e retenção do pedido

O registro deve ficar em sistema privado do controlador, nunca no repositório público, contendo apenas número, datas, tipo de direito, decisão e evidência mínima. A Res. 15/2024 exige cinco anos para **incidentes**, não foi usada aqui como prazo automático para DSAR. O prazo do registro DSAR permanece pendente de política organizacional e revisão jurídica, sem retenção indefinida.

## Escalonamento

- Dia 0: recebimento e confirmação.
- Dia 10: alerta interno.
- Dia 13: escalonamento ao responsável/controlador.
- Até dia 15: resposta completa (LGPD, art. 19, II).
- Incidente identificado durante o pedido: ativar imediatamente `.lgpd/incidents/runbook.md`.

## Backlog

Nenhum pedido conhecido no repositório em 23/08/2026. Isso não comprova ausência em canais externos.

> Fluxo draft. Canal, controlador e retenção do registro devem ser aprovados antes da publicação.
