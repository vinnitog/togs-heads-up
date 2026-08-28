# Política de Privacidade — Togs Heads Up

> **MINUTA v1.0 — NÃO PUBLICAR.** Exige identificação do controlador, canal privado, remediação dos terceiros reprovados, definição dos papéis nos fluxos internacionais e revisão jurídica.

**Versão**: v1.0-draft

**Data da minuta**: 23/08/2026

**Vigência**: não iniciada

## Resumo

- O app não possui conta, banco, backend próprio, analytics, anúncios ou cookies de rastreamento.
- Ao abrir o dashboard, seu navegador consulta fontes públicas; esses provedores recebem metadados técnicos, como IP.
- A geolocalização é opcional. Se ativada, coordenadas exatas são enviadas ao Open-Meteo e BigDataCloud, mas não ficam no cache do app.
- O navegador guarda temporariamente dados públicos de clima e o shell da PWA para desempenho/offline.
- Não vendemos dados. Alguns provedores atuais ainda precisam ser removidos ou regularizados antes desta política ser publicada.

## 1. Controlador e contato

- **Controlador**: `{NOME COMPLETO OU RAZÃO SOCIAL}`
- **CPF/CNPJ, se aplicável**: `{...}`
- **Endereço/país**: `{...}`
- **Site**: <https://vinnitog.github.io/togs-heads-up/>
- **Canal privado de direitos e privacidade**: `{EMAIL_PRIVACIDADE}`
- **Encarregado**: pendente de decisão conforme porte/risco; quando aplicável, `{NOME/CONTATO}`.

Sem esses campos, esta política não atende à identificação e ao contato exigidos pela LGPD, art. 9º.

## 2. Dados, finalidades e bases legais

### 2.1 Geolocalização opcional

- **Dados**: latitude/longitude exatas, cidade/região derivadas e metadados técnicos recebidos pelos provedores.
- **Finalidade**: mostrar clima correspondente à posição escolhida.
- **Base pretendida**: consentimento (LGPD, art. 7º, I).
- **Como funciona**: somente após clicar em “Localização” e permitir no navegador.
- **Se recusar/revogar**: o app continua com Marília-SP e busca manual; desativar elimina as coordenadas do estado ativo.
- **Destinatários atuais**: Open-Meteo e BigDataCloud. BigDataCloud deve ser removido/regularizado antes da publicação desta política.

### 2.2 Busca de cidade e previsão

- **Dados**: texto pesquisado, cidade selecionada, coordenadas públicas da cidade e metadados técnicos.
- **Finalidade**: localizar a cidade solicitada e exibir previsão.
- **Base pretendida**: legítimo interesse (LGPD, arts. 7º, IX, e 10), conforme teste de balanceamento.
- **Destinatários atuais**: Open-Meteo; CPTEC/INPE por meio do AllOrigins quando aplicável.

### 2.3 Clima, notícias, alertas e eventos espaciais

- **Dados**: solicitações técnicas e conteúdo público retornado pelas fontes.
- **Finalidade**: compor as seções do dashboard.
- **Base pretendida**: legítimo interesse (LGPD, arts. 7º, IX, e 10) quando houver dado pessoal no contexto do controlador.
- **Destinatários/fontes atuais**: Open-Meteo, INMET, RSS2JSON, AllOrigins, CPTEC/INPE e NASA/JPL. G1 e Giro Marília fornecem feeds buscados pelo RSS2JSON.
- O app não cria perfis das pessoas eventualmente citadas nas notícias.

### 2.4 Cache funcional/PWA

- **Dados**: assets, timestamps, clima/localidade em nível de cidade, previsão CPTEC e eventos espaciais públicos.
- **Finalidade**: desempenho, redução de chamadas e shell offline.
- **Base pretendida**: legítimo interesse (LGPD, arts. 7º, IX, e 10).
- Coordenadas exatas da geolocalização opcional não são persistidas.

### 2.5 GitHub Pages e repositório

- **Dados**: GitHub registra IP de visitantes do Pages para segurança; contribuições podem conter nome, conta/e-mail e metadados Git.
- **Finalidade**: hospedagem, segurança, desenvolvimento e integridade do histórico.
- **Base pretendida pelo responsável pelo projeto**: legítimo interesse (LGPD, arts. 7º, IX, e 10).
- O GitHub determina finalidades próprias em suas políticas e pode atuar como controlador independente.

## 3. Forma e duração

| Dado | Onde | Duração no app |
|---|---|---|
| coordenadas opcionais | memória/estado do navegador | sessão ativa; eliminadas ao desativar/recarregar |
| clima de cidade | `localStorage` `togs-cache:v4:*` | fresco por 15 min; fallback até 24 h; remoção na primeira carga posterior |
| CPTEC/fireballs | `localStorage` `togs-cache:v4:*` | fresco por 3 h; fallback até 24 h; remoção na primeira carga posterior |
| shell PWA | Cache Storage `togs-heads-up-v14` | até atualização ou limpeza do navegador |
| shell PWA legado | Cache Storage `togs-heads-up-v12` | preservado durante a migração do endereço antigo; até limpeza/reinstalação |
| notícias/alertas | memória da sessão | até fechar/recarregar |

Open-Meteo declara logs individuais por 90 dias, que podem conter coordenadas. Os demais prazos de terceiros estão detalhados ou marcados como pendentes em `.lgpd/vendors/` e devem ser resolvidos antes da publicação.

## 4. Compartilhamento e responsabilidades

| Terceiro | Finalidade | País/local conhecido | Estado desta minuta |
|---|---|---|---|
| Open-Meteo | geocodificação/clima | Suíça | cidade com ressalvas; posição exata pendente |
| BigDataCloud | nomear posição exata | Austrália; dados também em EUA | reprovado/remover |
| AllOrigins | proxy CPTEC/JPL | não confirmado | reprovado/remover |
| RSS2JSON | converter feeds | não confirmado; política cita analytics nos EUA | reprovado/remover |
| GitHub | Pages, repositório e CI | EUA e subprocessadores globais | aprovado com ressalvas |
| INMET e CPTEC/INPE | dados meteorológicos públicos | Brasil | fontes públicas |
| NASA/JPL | eventos espaciais públicos | EUA | fonte pública via proxy |

O responsável pelo projeto escolhe fontes, limita finalidades, mantém o app seguro e atende os direitos relativos ao tratamento sob seu controle. Cada terceiro responde pelas operações que determina como controlador independente; quando atuar como operador, deverá seguir instruções e instrumento compatível com a LGPD (arts. 5º, VII, e 39).

## 5. Fluxos internacionais

Há coletas diretas por provedores na Suíça, Austrália, Estados Unidos e locais ainda não identificados. Nos fluxos atuais, o navegador envia os dados diretamente ao provedor; essa coleta internacional não caracteriza, por si só, transferência internacional segundo a Res. CD/ANPD nº 19/2024, art. 6º.

Se a arquitetura passar a enviar dados previamente coletados pelo controlador brasileiro a um importador estrangeiro, o mecanismo dos arts. 33–36 da LGPD e da Res. 19/2024 deverá ser definido. Antes de publicar: remover os fluxos reprovados ou formalizar papéis e garantias, atualizando esta seção com países, duração, responsabilidades, medidas e canal.

## 6. Direitos do titular

Nos termos da LGPD, art. 18, você pode solicitar:

- confirmação do tratamento e acesso;
- correção;
- anonimização, bloqueio ou eliminação de dados desnecessários/desconformes;
- portabilidade, quando aplicável;
- eliminação de dados tratados com consentimento, observadas exceções legais;
- informação sobre compartilhamentos e sobre a possibilidade de não consentir;
- revogação do consentimento e oposição quando cabível.

Canal: `{EMAIL_PRIVACIDADE}`. A resposta completa será fornecida em até 15 dias corridos (LGPD, art. 19, II). Como não há conta/backend, normalmente não existe registro central; o atendimento pode orientar limpeza local e contato/encaminhamento ao terceiro aplicável. Nunca publique dados pessoais em issues do GitHub.

Você também pode peticionar à ANPD: <https://www.gov.br/anpd/>.

## 7. Cookies e armazenamento local

O app não cria cookies de analytics, publicidade ou rastreamento. Usa `localStorage` e Cache Storage somente para as finalidades funcionais descritas. Provedores acessados e links externos possuem políticas próprias.

## 8. Crianças e adolescentes

O produto não é direcionado a crianças/adolescentes, não cria contas, não perfila e não exibe publicidade. Porém, é um site público e pode ser acessado por qualquer pessoa. A aplicabilidade detalhada da LGPD, art. 14, e da Lei nº 15.211/2025 será avaliada em L10 após o checkpoint desta minuta. Responsáveis podem usar `{EMAIL_PRIVACIDADE}`.

## 9. Segurança e incidentes

O app usa HTTPS, allowlist de hosts, não contém chaves privadas, não persiste coordenadas exatas e não inclui APIs externas no Cache Storage. Mudanças são testadas por CI. Existe runbook em `.lgpd/incidents/`.

Incidentes que atendam ao critério regulatório serão comunicados à ANPD e aos titulares em até 3 dias úteis do conhecimento de que dados pessoais foram afetados (LGPD, art. 48; Res. CD/ANPD nº 15/2024, arts. 5º, 6º e 9º).

## 10. Mudanças e versões

Mudanças materiais de finalidade, base, destinatário, país ou retenção geram nova versão. Versões anteriores deverão permanecer acessíveis. Como não há conta/e-mail, mudanças serão comunicadas em aviso destacado no app quando necessário.

**Histórico**:

- v1.0-draft — 23/08/2026: primeira minuta; não vigente.

## Pendências bloqueantes para v1.0

- [ ] identificar controlador e canal privado;
- [ ] remover/regularizar BigDataCloud, AllOrigins e RSS2JSON;
- [ ] decidir posição exata/Open-Meteo e garantias aplicáveis;
- [ ] confirmar papel/plano do GitHub por operação;
- [ ] concluir L10–L12 e revisão jurídica;
- [ ] ajustar texto ao runtime final e aprovar publicação.

> Esta minuta é informativa e não substitui aconselhamento jurídico. Não mover/renomear para versão vigente nem publicar no app sem aprovação explícita e revisão especializada.
