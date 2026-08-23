# LIA — A005 GitHub Pages, repositório e CI

**Versão**: v1.0-draft

**Data**: 23/08/2026

**Controlador**: pendente de identificação
**Base avaliada**: LGPD, arts. 7º, IX, e 10

## 1. Finalidade

Os interesses concretos são hospedar o site, proteger e validar a entrega, manter histórico técnico e atribuir contribuições. Beneficiam o responsável, colaboradores e visitantes.

## 2. Necessidade

Qualquer hospedagem pública processa metadados mínimos de rede. O Git registra autoria para integridade e colaboração. O responsável pelo app não recebe logs brutos de visitantes e não deve exportar dados do GitHub para finalidades adicionais.

## 3. Balanceamento

| Fator | Avaliação |
|---|---|
| Expectativa razoável | Alta para logs técnicos de hospedagem e autoria em repositório público. |
| Impacto | Leve a moderado: histórico Git é duradouro e e-mail público pode ser indexado. |
| Categoria | Identidade profissional/técnica e metadados de acesso. |
| Vulnerabilidade | Nenhuma identificada. |
| Coleta | Observada pelo GitHub e fornecida pelo contribuidor. |
| Salvaguardas | HTTPS, CI sem segredos do app, staging explícito e opção de e-mail privado do GitHub. |

**Conclusão**: o interesse prevalece condicionalmente para operação e integridade do projeto. L4 separou a coleta direta de logs do Pages da possível transferência de dados de contribuidores, cujo papel/plano e retenção permanecem pendentes. Colaboradores devem ser informados da publicidade e permanência do histórico.

## 4. Salvaguardas

- [x] Repositório sem segredos conhecidos.
- [x] CI sem chaves privadas do app.
- [x] Controle de alterações via `develop → main`.
- [ ] Informar contribuidores sobre autoria/e-mail público.
- [ ] Documentar termos, papéis, retenção e transferência do GitHub.

## 5. RIPD

Não indicado no escopo atual.

## 6. Decisão

**Recomendação técnica**: aprovar condicionalmente.

**Aprovação jurídica/controlador**: pendente.
**Revisar se**: houver equipe, dados de candidatos/empregados, repositório privado com clientes ou exportação de métricas de visitantes.
