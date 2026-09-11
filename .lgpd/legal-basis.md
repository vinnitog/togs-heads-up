# Bases Legais por Atividade de Tratamento

**Versão**: v1.0-draft

**Última atualização**: 11/09/2026 — adendo técnico OpenWeather; bases ainda em draft

**Controlador**: pendente de identificação nominal
**Referências**: LGPD, arts. 5º, I–II, 6º, 7º, I e IX, 8º, 9º e 10; Guia Orientativo da ANPD sobre Legítimo Interesse, versão 1.0/2024.

## Critério adotado

A geolocalização exata opcional usa consentimento porque é uma funcionalidade não essencial, acionada separadamente e com impacto maior sobre a privacidade. As operações técnicas restantes usam legítimo interesse apenas de forma condicional: o interesse deve ser concreto, o dado estritamente necessário, a expectativa do titular respeitada e as salvaguardas mantidas (LGPD, arts. 7º, IX, e 10).

A permissão de geolocalização do navegador é um controle técnico e não substitui, isoladamente, os requisitos jurídicos de consentimento livre, informado, inequívoco e para finalidade determinada (LGPD, arts. 5º, XII, 7º, I, e 8º). O app exibe a finalidade e os destinatários conforme a configuração OpenWeather junto ao controle, mas ainda precisa identificar o controlador e oferecer política/canal público antes de considerar o consentimento plenamente documentado.

## A001 — Geolocalização opcional para clima local

- **Finalidade**: nomear a posição atual e exibir previsão meteorológica correspondente.
- **Dados tratados**: latitude e longitude exatas, cidade/região derivadas e metadados de rede recebidos pelos provedores.
- **Sensíveis?**: não no escopo observado (LGPD, art. 5º, II).
- **Base legal pretendida**: **LGPD, art. 7º, I — consentimento do titular**.
- **Justificativa**: a função não é necessária para usar o dashboard, exige clique separado e pode ser desativada a qualquer momento. Consentimento é mais apropriado que legítimo interesse para a posição exata neste produto sem contrato ou conta.
- **Implementação atual**: parcial. Há aviso próximo ao botão, ação afirmativa e permissão nativa; faltam identificação do controlador, link para política/canal e versão do aviso.
- **Comprovação**: o código e a versão publicada demonstram o fluxo; não será criado ledger individual porque não há backend e registrar o titular aumentaria a coleta. Essa decisão deve ser validada juridicamente.
- **Revogação**: sim, pelo mesmo controle; desativar retorna a Marília-SP e elimina as coordenadas do estado ativo.
- **Consequência da recusa**: nenhuma perda do conteúdo principal; Marília-SP permanece como padrão e busca manual continua disponível.
- **Retenção**: sessão atual; sem `localStorage` para localizações `geo-*`.
- **Última revisão**: 23/08/2026.

## A002 — Busca manual de cidade e previsão

- **Finalidade**: localizar a cidade solicitada e exibir previsão pública.
- **Dados tratados**: texto pesquisado, localidade escolhida, coordenadas públicas da cidade e metadados de rede nos provedores.
- **Sensíveis?**: não.
- **Base legal**: **LGPD, art. 7º, IX — legítimo interesse**, sob os requisitos do art. 10.
- **Justificativa**: o interesse concreto é entregar a consulta solicitada pelo visitante; o tratamento é limitado ao texto/localidade necessários e está dentro da expectativa de quem envia uma busca meteorológica.
- **LIA**: [`.lgpd/lia/a002-busca-cidade-clima.md`](./lia/a002-busca-cidade-clima.md).
- **Oposição**: o visitante pode não pesquisar, trocar a localidade ou limpar os dados do site; L5 adicionou expiração física na primeira carga após 24 horas. Um controle explícito permanece como melhoria opcional.
- **Retenção**: estado da sessão; cache de clima por 15 minutos, CPTEC por 3 horas e fallback por até 24 horas.
- **Última revisão**: 23/08/2026.

## A003 — Consulta de fontes públicas

- **Finalidade**: compor o dashboard com clima, alertas, notícias regionais e eventos espaciais públicos.
- **Dados tratados**: conteúdo público e metadados de rede do visitante recebidos pelos endpoints. O controlador do app não recebe os logs brutos dos provedores.
- **Sensíveis?**: não são coletados ou inferidos pelo app.
- **Base legal**: **LGPD, art. 7º, IX — legítimo interesse**, quando houver dado pessoal no contexto do controlador, sob os requisitos do art. 10.
- **Justificativa**: o interesse concreto é operar a funcionalidade principal do dashboard. Não há rastreamento cruzado, perfilamento, conta ou enriquecimento de pessoas citadas nas fontes.
- **LIA**: [`.lgpd/lia/a003-fontes-publicas.md`](./lia/a003-fontes-publicas.md).
- **Oposição**: sair do site/usar modo offline impede novas consultas; uma política pública deve explicar os destinatários.
- **Retenção**: notícias/alertas somente na sessão; bolas de fogo por 3 horas, com fallback de até 24 horas.
- **Última revisão**: 23/08/2026.

## A004 — Cache técnico e PWA

- **Finalidade**: reduzir latência e chamadas externas e disponibilizar o shell estático offline.
- **Dados tratados**: assets; timestamps; resposta pública de clima/localidade pesquisada; previsão CPTEC e eventos espaciais. Coordenadas da geolocalização opcional são excluídas.
- **Sensíveis?**: não.
- **Base legal**: **LGPD, art. 7º, IX — legítimo interesse**, sob os requisitos do art. 10.
- **Justificativa**: armazenamento estritamente funcional no próprio dispositivo, sem rastreamento ou compartilhamento adicional, necessário para desempenho e resiliência.
- **LIA**: [`.lgpd/lia/a004-cache-pwa.md`](./lia/a004-cache-pwa.md).
- **Oposição**: limpeza dos dados do site pelo navegador; L5 adicionou expiração física na primeira carga após 24 horas. Um controle explícito permanece como melhoria opcional.
- **Retenção**: TTL lógico de 15 minutos/3 horas e fallback de 24 horas; shell até atualização/limpeza.
- **Última revisão**: 23/08/2026.

## A005 — GitHub Pages, repositório e CI

- **Finalidade**: desenvolver, validar, versionar e disponibilizar publicamente o app.
- **Dados tratados**: metadados técnicos de acesso tratados pelo GitHub e identidade/e-mail de contribuidores registrados no histórico Git/GitHub.
- **Sensíveis?**: não no escopo observado.
- **Base legal do responsável pelo projeto**: **LGPD, art. 7º, IX — legítimo interesse**, sob os requisitos do art. 10. Eventual relação contratual futura com colaboradores deverá ser avaliada separadamente sob o art. 7º, V.
- **Justificativa**: hospedagem, segurança, auditoria do código e atribuição de autoria são atividades concretas e esperadas para manter o projeto. O GitHub pode determinar finalidades próprias; seus papéis e bases não são definidos por este documento.
- **LIA**: [`.lgpd/lia/a005-github.md`](./lia/a005-github.md).
- **Oposição**: visitantes podem deixar de acessar; contribuidores devem configurar e-mail privado quando apropriado e tratar remoções possíveis com o owner/GitHub, observadas limitações do histórico distribuído.
- **Retenção**: conforme histórico Git e políticas do GitHub; L4/L5 não identificaram garantia adicional para o plano atual, portanto a validação permanece pendente.
- **Última revisão**: 23/08/2026.

## Adendo técnico — OpenWeather e mapas, 11/09/2026

Este adendo registra a implementação sem aprovar novas bases nem encerrar as pendências anteriores:

- **A001, base pretendida art. 7º, I**: com a chave do projeto configurada, a OpenWeather recebe coordenadas exatas para geocodificação reversa, clima e ar; Open-Meteo continua recebendo a posição para previsão. Em ambientes sem chave permanece o fluxo BigDataCloud/Open-Meteo. Identificadores `geo-*` não são persistidos; desligar a localização retorna ao local padrão e limpa o cache OpenWeather.
- **A002, enquadramento anterior art. 7º, IX, condicionado ao art. 10**: busca OpenWeather envia cidade ou CEP/país e chave compartilhada do projeto ao provedor. Retorna até cinco cidades ou um resultado postal. Não há coleta de chave do visitante. A atualização da LIA A002 para esse destinatário e para a busca por CEP permanece pendente.
- **A003, enquadramento anterior art. 7º, IX, condicionado ao art. 10**: a integração automática adiciona cinco consultas de dados (clima, previsão 5 dias/3h, ar atual/previsto/histórico de 24h). Abrir o mapa adiciona tiles OpenWeather e OpenStreetMap, que revelam a região visualizada e metadados de rede; as chamadas autenticadas enviam a chave somente à OpenWeather. A LIA A003 e a avaliação de ambos os terceiros precisam de atualização.
- **A004, enquadramento anterior art. 7º, IX, condicionado ao art. 10**: chave do projeto configurada via GitHub Secret `OPENWEATHER_API_KEY`, injetada como `VITE_OPENWEATHER_API_KEY` no build. A chave fica visível no JavaScript público e integra o cache do shell PWA `togs-heads-up-v17`; não é solicitada ao visitante nem lida do `sessionStorage` antigo. Respostas autenticadas e coordenadas ficam em memória, com TTL lógico de dez minutos, sem `localStorage` nem Cache Storage do app. Cache limitado a 80 entradas, limpo ao atualizar e descartado ao recarregar. Atualização da LIA A004 pendente.

Papéis, termos, retenção de logs, países e eventuais garantias de OpenWeather/OpenStreetMap não foram aprovados neste adendo. Não há decisão nova sobre transferência internacional, alto risco ou validade jurídica do consentimento. A política permanece não vigente, e nenhuma chave real faz parte destes artefatos.

## Resumo e condições de validade

| Base | Atividades | Condição pendente |
|---|---|---|
| Consentimento — art. 7º, I | A001 | identificar controlador, publicar política/canal e versionar aviso |
| Legítimo interesse — art. 7º, IX | A002–A005 | aprovar LIAs, manter minimização/transparência e concluir vendor audit |
| Dados sensíveis — art. 11 | Nenhuma | reavaliar se o produto mudar |

Alteração de finalidade exige nova avaliação da base e informação prévia ao titular, quando aplicável (LGPD, art. 9º, § 2º). Login, histórico de localização, analytics, publicidade, notificações personalizadas, perfilamento ou backend próprio invalidam as conclusões automáticas deste documento e exigem nova revisão.

> Minuta de engenharia e governança. A aprovação das bases legais e a identificação formal do controlador devem ser realizadas com apoio jurídico especializado.
