# Runbook de incidentes de segurança

**Versão**: v1.0-draft

**Data**: 23/08/2026

**Normas**: LGPD, arts. 46 e 48; Res. CD/ANPD nº 15/2024, arts. 4º–10.
**Modo atual**: preparação; nenhum incidente foi declarado pelo usuário.

## Contatos a preencher antes da publicação

- Controlador: `{CONTROLADOR}`
- Responsável pela resposta: `{RESPONSAVEL_INCIDENTE}`
- Canal privado: `{EMAIL_PRIVACIDADE}`
- Jurídico/assessoria: `{CONTATO_JURIDICO}`
- GitHub Security/Support e contatos dos terceiros: ver `.lgpd/vendors/`.

## Marco e prazo

Registrar separadamente a data do evento e o instante em que o controlador soube que dados pessoais foram afetados. Este segundo instante inicia o prazo de **3 dias úteis** para comunicação à ANPD e aos titulares quando o teste de notificabilidade for positivo (Res. 15/2024, arts. 6º e 9º). Informações faltantes podem ser complementadas, justificadamente, em até 20 dias úteis.

## 1. Detecção e abertura

1. Criar `INC-AAAA-NNN` em registro privado; não incluir evidências pessoais no repositório público.
2. Preservar aviso do titular/provedor, URL, commit, logs disponíveis, timestamps e hashes.
3. Registrar “conhecimento de afetação a dados pessoais” apenas quando houver fundamento factual; não atrasar artificialmente essa confirmação.
4. Acionar controlador/responsável/jurídico imediatamente.

Sinais relevantes: coordenadas no cache, segredo/PII commitido, dependência comprometida, alteração indevida do Pages, aviso de fornecedor, acesso não autorizado à conta GitHub ou exposição de metadados de contribuidores.

## 2. Contenção — primeiras 4 horas

- Suspender deploy ou fonte afetada; preservar a versão/evidência antes de corrigir.
- Revogar sessão, token ou credencial GitHub comprometida e exigir MFA.
- Remover integração de terceiro afetada e bloquear novas requisições.
- Se cache armazenou dado indevido, corrigir, incrementar namespaces/service worker e fornecer limpeza imediata.
- Não apagar logs/evidências necessários à investigação; armazená-los de forma privada e restrita.
- Solicitar ao fornecedor escopo, datas, dados, titulares, países, contenção e contato de segurança.

## 3. Avaliação — até 24 horas

Documentar:

- natureza/categoria dos dados;
- número estimado de titulares, distinguindo crianças, adolescentes e idosos quando aplicável;
- sistemas, versões, fornecedores e países envolvidos;
- medidas existentes e falhas;
- impacto material/moral possível;
- causa preliminar e período de exposição.

### Teste de notificabilidade

Comunicar quando houver, cumulativamente:

1. risco ou dano relevante capaz de afetar significativamente direitos/interesses; **e**
2. ao menos uma categoria do art. 5º da Res. 15/2024: sensíveis; crianças/adolescentes/idosos; financeiros; autenticação; sigilo legal/judicial/profissional; ou larga escala.

Se o teste for negativo, registrar a justificativa. Dúvida relevante deve ser escalada ao jurídico/encarregado; não classificar por conveniência.

## 4. Comunicação — até 3 dias úteis

- ANPD: usar o canal oficial em <https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis> e o [template](./templates/anpd.md).
- Titulares: comunicação direta/individual quando identificáveis, usando o [template](./templates/titular.md).
- Se não for possível identificar/contatar — cenário provável deste app sem contas — publicar comunicação destacada no site/canais capazes de amplo alcance por no mínimo 3 meses (Res. 15/2024, art. 9º, § 3º).
- Não publicar coordenadas, IPs, tokens, evidências forenses ou detalhes que aumentem o risco.
- Guardar protocolo, cópia, meios e declaração de comunicação.

## 5. Pós-incidente

1. Completar causa raiz e linha do tempo.
2. Corrigir com testes de regressão e revisar dependências/fornecedores.
3. Atualizar mapa, ROPA, política, retenção e riscos.
4. Complementar ANPD em até 20 dias úteis quando necessário.
5. Registrar lições e responsáveis/prazos.
6. Manter o registro por no mínimo 5 anos da data do registro, inclusive se não notificado (Res. 15/2024, art. 10).

## Cenários de tabletop

| Cenário | Ação inicial | Questão crítica |
|---|---|---|
| regressão persiste coordenadas exatas | interromper deploy, limpar cache, medir versões/titulares | houve categoria notificável/risco relevante? |
| BigDataCloud/provedor informa incidente | suspender fonte, obter relatório e escopo | quem comunica e quais países/papéis? |
| segredo ou e-mail pessoal no Git público | revogar segredo, preservar commit, avaliar histórico/forks | reescrita de histórico e comunicação são necessárias? |
| conta GitHub/Pages comprometida | revogar sessões/tokens, suspender Pages, restaurar commit confiável | visitantes receberam script malicioso? |
| pacote npm comprometido | bloquear build/deploy, gerar SBOM/diff e remover versão | houve exfiltração no browser? |

**Exercício**: agendar primeiro tabletop em até 90 dias após aprovação deste runbook e repetir anualmente. Responsável/data ainda pendentes; não registrar como executado antes de ocorrer.

> Em incidente real, obter assessoria jurídica especializada; este runbook não decide sozinho a notificabilidade.
