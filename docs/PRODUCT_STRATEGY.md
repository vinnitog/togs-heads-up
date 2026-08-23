# Estratégia de monetização e precificação

Data da análise: 22/08/2026.

## Recomendação

Manter o Togs Heads Up público e gratuito enquanto ele cumpre sua função de portfólio. Não adicionar anúncios, login, paywall ou integrações pagas antes de validar demanda.

As primeiras ofertas a testar devem ser:

1. **Template/licença para desenvolvedores** — menor esforço e não altera o app público.
2. **Piloto B2B local/white-label** — maior potencial de receita, mas somente após entrevistas e validação das condições de uso das fontes.

O mercado já oferece previsão, mapas, locais salvos e alertas em produtos gratuitos, como o [Weather & Radar](https://www.weatherandradar.com/apps/). Portanto, cobrar apenas pela previsão básica não cria diferenciação suficiente.

## Alternativas avaliadas

| Prioridade | Estratégia | Quem paga | Hipótese de preço | Fit | Risco principal | Experimento |
|---|---|---|---:|---|---|---|
| 1 | Template PWA + guia de implementação | desenvolvedores e estudantes | R$ 79–149, compra única | alto | suporte consumir mais tempo que a venda | landing page + lista de espera; avançar com 20 interessados ou 5 pré-vendas |
| 2 | Dashboard white-label local | condomínios, escolas e pequenas operações | R$ 1.500 de implantação + R$ 149/mês | médio/alto | licenças das fontes, suporte e baixa disposição a pagar | 8 entrevistas e 2 propostas; piloto se 1 cliente aceitar pagar |
| 3 | Apoio local discreto | comércio regional | R$ 300–800/mês por apoiador | médio | audiência insuficiente e perda de confiança | medir audiência por 60 dias sem rastreamento invasivo e entrevistar 5 anunciantes |
| 4 | Freemium consumidor | moradores e usuários com vários locais | R$ 9,90/mês ou R$ 99/ano | baixo no estágio atual | exige login, push, backend e cria mais tratamento de dados | teste de interesse em “alertas personalizados”; não implementar cobrança antes de 5% de intenção |

Estimativas são hipóteses de descoberta, não preços validados.

## Estrutura sugerida para um futuro produto pago

Modelo recomendado: **tiered**, com valor medido por unidade/local monitorado, não por acesso a dados públicos.

| Plano | Preço hipotético | Público | Entrega de valor | Posicionamento |
|---|---:|---|---|---|
| Público | grátis | moradores e portfólio | painel atual, uma localização por vez, fontes públicas | demonstração aberta |
| Pro | R$ 9,90/mês | usuário recorrente | locais salvos, preferências e alertas personalizados | conveniência, ainda não construir |
| Local | R$ 149/mês + implantação | organização pequena | identidade visual, locais/limiares configurados e suporte | piloto B2B |

Desconto anual hipotético do plano Pro: cerca de 17%. Não oferecer plano pago enquanto os experimentos de disposição a pagar não atingirem os critérios abaixo.

## Premissas a validar

- Usuários valorizam a combinação local de clima + alertas mais do que apps meteorológicos generalistas.
- Organizações locais têm um problema operacional que o painel reduz, e não apenas curiosidade.
- As fontes públicas permitem o uso pretendido em uma oferta comercial.
- O custo de suporte de um template ou white-label permanece menor que 25% da receita.
- É possível oferecer alertas personalizados sem ampliar desnecessariamente a coleta de dados.

## Métricas de decisão

| Experimento | Sinal para continuar | Sinal para parar/reformular |
|---|---|---|
| Template | 20 interessados ou 5 pré-vendas em 30 dias | menos de 5 interessados |
| Entrevistas B2B | 3 de 8 relatam problema frequente e 1 aceita piloto pago | interesse apenas elogioso, sem orçamento |
| CTA Pro sem cobrança | pelo menos 5% dos usuários ativos demonstram interesse | menos de 2% após volume mínimo de 200 usuários |
| Patrocínio | 2 empresas aceitam proposta sem exigir rastreamento comportamental | exigência de mídia invasiva ou exclusividade editorial |

## Roadmap de validação

1. Publicar o app e acompanhar estabilidade das fontes.
2. Criar uma landing page simples para o template, sem implementar checkout.
3. Entrevistar oito organizações de Marília que tomam decisões sensíveis a clima/alertas.
4. Revisar termos de uso e licenças das fontes antes de qualquer oferta comercial.
5. Somente após sinal pago, estimar backend, suporte, LGPD e margem por plano.

## Decisões atuais

- Sem anúncios no dashboard.
- Sem cobrança nesta versão.
- Sem dependência de API paga ou chave privada.
- Sem criar conta/banco de dados apenas para “preparar” monetização.
