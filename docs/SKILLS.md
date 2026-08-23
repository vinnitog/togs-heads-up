# Skills locais do projeto

As skills em `.agents/skills/` são vendorizadas para que o fluxo de desenvolvimento seja reproduzível no repositório.

## Proveniência

Snapshot obtido em 22/08/2026 a partir da branch `main`:

| Coleção | Revisão vendorizada |
|---|---|
| `goul4rt/lgpd-skills` | `d85d79abeeb37cb99fc0785e735a9ca790698a77` |
| `pbakaus/impeccable` | `56f44523f76efdcec813e67b38ee550e49b16f48` |
| `phuryn/pm-skills` | `18468a95b427e70e258b51389796367c6f684e7d` |

Ao atualizar qualquer coleção, substitua a revisão correspondente, revise o diff das instruções e rode `test.cmd`.

## Adaptações ao Togs Heads Up

### `lgpd-audit`

- Classificar o projeto como aplicação web existente, sem autenticação ou banco de dados.
- Tratar geolocalização como dado pessoal potencial e mapear somente o fluxo iniciado pelo usuário.
- Não sugerir consent ledger, endpoint de exclusão de conta ou infraestrutura de backend sem uma nova atividade de tratamento que os justifique.
- Manter artefatos técnicos em `.lgpd/` e respeitar os checkpoints jurídicos do maestro.

### `impeccable`

- Usar o modo **Operate**: prioridade para leitura rápida, estados de fonte, teclado, toque e responsividade.
- Refinar a identidade visual existente; não transformar o dashboard em landing page.
- Evitar fontes, imagens e dependências externas adicionadas apenas por estética.
- Seguir a política do projeto: validação visual via browser local somente quando solicitada; no fluxo normal, usar detector estático, testes e build.

### `pricing-strategy` e `monetization-strategy`

- Tratar a versão atual como projeto de portfólio gratuito, sem paywall.
- Separar uma eventual oferta comercial das fontes públicas e de suas condições de uso.
- Validar disposição a pagar antes de implementar cobrança, backend, autenticação ou integrações pagas.
- Registrar recomendações em `docs/PRODUCT_STRATEGY.md`.

## Sequência sugerida

1. LGPD: descobrir fluxos e riscos de dados.
2. Impeccable: auditar e refinar a experiência existente.
3. Pricing/monetization: avaliar alternativas sem comprometer o objetivo de portfólio.

Fontes: [lgpd-skills](https://github.com/goul4rt/lgpd-skills), [Impeccable](https://github.com/pbakaus/impeccable) e [PM Skills](https://github.com/phuryn/pm-skills).

As licenças e os avisos exigidos para redistribuição estão preservados em [`THIRD_PARTY_LICENSES.md`](../THIRD_PARTY_LICENSES.md).
