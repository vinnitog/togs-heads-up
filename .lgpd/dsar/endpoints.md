# Decisão de endpoints DSAR

**Data**: 23/08/2026

**Decisão**: não implementar API no escopo atual.

## Motivo

O app é uma SPA estática sem autenticação, backend ou banco. Endpoints de exportação, correção ou exclusão não teriam registro associado ao usuário e criariam nova superfície de segurança/coleta. A solução proporcional é:

- página/política estática com direitos, compartilhamentos e canal privado;
- controles locais para revogar geolocalização e limpar cache;
- fluxo manual descrito em [`workflow.md`](./workflow.md);
- cooperação com terceiros quando houver logs sob responsabilidade deles.

## Interface mínima pendente

Antes da política final, disponibilizar no app:

1. link “Privacidade” persistente;
2. identificação/controlador e `{EMAIL_PRIVACIDADE}`;
3. botão ou instrução clara para limpar dados locais;
4. lista de destinatários ativos após a remediação de L4;
5. explicação de que negar/revogar geolocalização não impede o uso principal.

## Gatilho para criar API

Reavaliar se forem adicionados conta, backend, histórico, preferências sincronizadas ou consent ledger. Nesse caso, os endpoints deverão ser autenticados, aplicar minimização, registrar fulfillment e cobrir confirmação, acesso, correção, portabilidade, eliminação e revogação conforme os arts. 18–19.
