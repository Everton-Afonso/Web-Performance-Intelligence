Quero fazer um redesign completo do dashboard do meu projeto **Performance Auditor**.

O objetivo NÃO é apenas deixar a interface mais bonita. Quero transformar o dashboard atual em uma **plataforma profissional de análise de performance web**, com aparência de produto SaaS moderno, confiável, técnico e pronto para apresentação a clientes, equipes de desenvolvimento e agências.

Use o projeto e os componentes existentes como base e preserve a lógica de negócio, APIs, integrações e funcionalidades já implementadas. O trabalho principal é melhorar a **UX/UI, arquitetura visual, hierarquia das informações, visualização de dados, comparações, gráficos e geração de relatórios**.

Não remova funcionalidades existentes sem necessidade.

---

# 1. CONTEXTO DO PRODUTO

O Performance Auditor analisa websites usando principalmente:

- Google PageSpeed Insights / Lighthouse
- CrUX, quando disponível
- WebPageTest para análise técnica avançada
- Performance Engine para normalização, scoring, classificação e priorização
- IA para interpretação e recomendações
- Histórico de análises
- Comparação antes/depois
- Monitoramento
- Regressões
- Alertas
- Metas de performance
- Relatórios HTML/PDF

O produto precisa responder visualmente:

> “Meu site está ruim? Por quê? O que devo corrigir primeiro? Como corrijo? E a correção realmente melhorou a performance?”

A interface deve transformar dados técnicos em informação fácil de interpretar.

---

# 2. DIREÇÃO VISUAL

Crie uma interface com estética de:

- SaaS premium
- ferramenta de observabilidade
- plataforma de performance
- dashboard executivo + técnico
- visual moderno e sofisticado
- clean
- profissional
- alta densidade de informação sem parecer poluído

Evite:

- aparência de template genérico
- excesso de cards iguais
- excesso de bordas
- gráficos pequenos
- informações espalhadas
- visual infantil
- excesso de cores
- gradientes exagerados
- elementos decorativos sem função
- dashboard que pareça apenas um clone do PageSpeed Insights

Quero uma identidade visual própria para o Performance Auditor.

A interface deve transmitir:

**Precisão + Performance + Tecnologia + Confiança**

---

# 3. ESTRUTURA GERAL DA APLICAÇÃO

Crie uma estrutura de aplicação com:

## Sidebar

Menu lateral profissional contendo:

- Overview
- Analyze
- Sites
- Projects
- History
- Comparisons
- Monitoring
- Alerts
- Reports
- Goals
- Settings

A sidebar deve ser compacta e elegante, com ícones consistentes.

No topo:

- nome/logo Performance Auditor
- workspace/projeto atual
- usuário

---

# 4. DASHBOARD OVERVIEW

O Overview deve ser o centro operacional da plataforma.

Criar uma visão executiva que mostre rapidamente:

### Header

Nome do site:

`Samsung Argentina`

URL:

`https://shop.samsung.com/ar`

Informações:

- última análise
- dispositivo
- estratégia
- status
- período analisado

Botões:

- Run analysis
- Compare
- Generate report

---

# 5. PERFORMANCE SCORE

Criar um bloco visual de destaque para o Performance Score.

Exemplo:

```text
Performance Score

       78
    / 100

↑ 12 points
vs previous analysis
```

O score deve possuir uma visualização realmente profissional.

Pode usar:

- gauge
- radial chart
- semicircle
- circular progress

Mas não faça um gráfico exageradamente grande.

Ao lado do score mostrar:

- melhoria/regressão
- score anterior
- objetivo
- status da meta

Exemplo:

```text
Previous       66
Current        78
Goal           85

+12 points
+18.2%
```

---

# 6. CORE WEB VITALS

Criar uma seção extremamente bem visualizada para:

- LCP
- INP
- CLS

E também:

- FCP
- TTFB

Cada métrica deve mostrar:

```text
LCP

2.1 s

GOOD

Goal
≤ 2.5 s

Previous
3.8 s

Improvement
↓ 44%
```

Não quero apenas cards estáticos.

Cada métrica deve possuir uma pequena visualização de tendência:

- sparkline
- mini line chart
- indicador antes/depois

Quando existir histórico, mostrar evolução.

---

# 7. GRÁFICO COMPLETO DE EVOLUÇÃO

Criar uma seção:

## Performance over time

Gráfico grande ocupando boa parte da largura.

Permitir alternar entre:

- Performance Score
- LCP
- INP
- CLS
- FCP
- TTFB

Permitir:

- 7 days
- 30 days
- 90 days
- 6 months
- 1 year
- custom

Mostrar:

- valor atual
- valor anterior
- melhor valor
- pior valor
- média
- objetivo

Adicionar linha de objetivo quando existir uma meta.

Exemplo:

```text
Performance Score

100 ┤
 90 ┤                         ●
 80 ┤                    ●────●
 70 ┤             ●──────●
 60 ┤       ●─────●
 50 ┤  ●────●
    └────────────────────────────
      Jun   Jul   Aug   Sep

      Current: 82
      Goal: 85
```

O gráfico deve permitir hover com tooltip detalhado.

---

# 8. COMPARAÇÃO MOBILE VS DESKTOP

Como Mobile e Desktop são estratégias independentes, criar uma área dedicada:

## Mobile vs Desktop

Comparar lado a lado:

| Metric | Mobile | Desktop | Difference |
|---|---:|---:|---:|
| Performance | 67 | 91 | +24 |
| LCP | 3.8s | 1.8s | -53% |
| INP | 280ms | 120ms | -57% |
| CLS | 0.31 | 0.08 | -74% |
| FCP | 2.1s | 1.2s | -43% |

Também criar gráficos comparativos.

Não limitar a tabela.

Utilizar:

- grouped bar chart
- comparison cards
- delta indicators

Permitir selecionar a métrica.

---

# 9. ANTES VS DEPOIS

Criar uma área muito importante:

## Before vs After

Essa seção deve ser visualmente impactante.

Exemplo:

```text
Optimization impact

             Before       After       Improvement

Performance    67          84           +25%
LCP            3.8s        2.1s         ↓44%
CLS            0.31        0.06         ↓81%
INP            280ms       145ms        ↓48%
TTFB           1.2s        0.7s         ↓42%
```

Criar também gráficos comparativos.

Exemplo:

```text
LCP

Before   ████████████████████ 3.8s
After    ███████████          2.1s
Goal     ████████████         2.5s
```

Mostrar claramente:

- melhoria
- regressão
- percentual
- diferença absoluta
- cumprimento da meta

---

# 10. STATUS GERAL DAS MÉTRICAS

Criar uma visualização consolidada:

```text
Core Web Vitals

LCP     ● Good
INP     ● Good
CLS     ● Poor

2 / 3 Core Web Vitals passing
```

Adicionar uma visualização tipo:

- donut
- progress
- segmented status bar

Exemplo:

```text
GOOD              NEEDS IMPROVEMENT       POOR

██████████        ███                     ██
   8                     3                  2
```

---

# 11. PROBLEMAS PRIORITÁRIOS

Criar uma seção muito clara:

## Priority issues

Ordenar por:

1. impacto
2. severidade
3. score
4. potencial de melhoria

Exemplo:

```text
P0   CLS elevado
     Impact: HIGH

     0.31 → target ≤ 0.10

     Banner/carousel is causing layout shifts

     Estimated impact: HIGH

     [View details]
```

Usar níveis:

- P0 Critical
- P1 High
- P2 Medium
- P3 Low

Cada problema deve mostrar:

- métrica afetada
- valor
- objetivo
- impacto
- causa provável
- evidência
- recomendação
- ação

---

# 12. OPORTUNIDADES DE MELHORIA

Criar uma seção:

## Optimization opportunities

Agrupar problemas por categoria:

### Images
- oversized images
- unoptimized images
- missing dimensions

### JavaScript
- unused JavaScript
- blocking scripts
- excessive execution

### CSS
- render blocking CSS
- unused CSS

### Network
- slow requests
- high TTFB
- third-party requests

### Fonts
- font loading
- blocking fonts

Cada categoria deve mostrar:

- quantidade
- impacto
- potencial de economia
- prioridade

---

# 13. WATERFALL DO WEBPAGETEST

Como o WebPageTest faz parte do produto, criar uma área técnica específica:

## Network Waterfall

Mostrar uma representação visual do waterfall.

Exemplo:

```text
Document       ███████
CSS               ████
JS                  ███████████
Images                 ███████████████
Fonts                     ███
Third-party                 ███████
```

Permitir:

- zoom
- hover
- filtros
- filtro por tipo
- filtro por domínio

Filtros:

- All
- HTML
- JS
- CSS
- Images
- Fonts
- Third-party

Mostrar:

- request
- domain
- size
- duration
- start time
- type
- status

---

# 14. DISTRIBUIÇÃO DE RECURSOS

Criar gráficos profissionais para WebPageTest:

### Page Weight

Donut chart:

```text
JavaScript      42%
Images          31%
CSS             12%
Fonts            8%
Other            7%
```

### Requests

Bar chart:

```text
JavaScript      42
Images          31
CSS             18
Fonts           12
Third-party     25
```

### Transfer Size

Mostrar:

- total transferred
- total resources
- JS
- CSS
- Images
- Fonts
- Third-party

---

# 15. THIRD-PARTY IMPACT

Criar seção:

## Third-party impact

Mostrar quais terceiros mais impactam a performance.

Exemplo:

```text
Google Analytics        420ms
Adobe                    310ms
Meta Pixel               280ms
Chat                     190ms
```

Usar:

- barras horizontais
- tempo
- requests
- transfer size

---

# 16. LAB VS FIELD

Quando CrUX estiver disponível, criar uma seção muito importante:

## Lab vs Real Users

Comparar:

### Laboratory

PageSpeed / Lighthouse

### Real users

CrUX

Exemplo:

```text
             Lab             Field

LCP          2.1s             2.8s
INP          145ms            210ms
CLS          0.06             0.12
```

Mostrar uma explicação:

```text
Your laboratory performance is better than
the experience observed from real users.
```

Usar indicadores visuais para destacar divergências.

---

# 17. INSIGHTS DA IA

Criar uma seção premium:

## Performance Intelligence

A IA deve interpretar os dados, mas sempre diferenciando:

- Evidence
- Probable cause
- Recommendation
- Estimated impact

Exemplo:

```text
High impact issue

CLS is above the recommended threshold.

Evidence
Lighthouse detected significant layout shifts.

Probable cause
A banner/carousel is loading without reserved space.

Recommendation
Reserve the element dimensions using width/height
or aspect-ratio.

Expected impact
HIGH
```

Adicionar botão:

`Generate action plan`

---

# 18. ACTION PLAN

Criar uma área:

## Recommended action plan

Lista priorizada:

```text
01  Fix CLS
    Priority P0
    Impact HIGH
    Effort LOW

02  Optimize hero image
    Priority P1
    Impact HIGH
    Effort MEDIUM

03  Reduce JavaScript
    Priority P1
    Impact MEDIUM
    Effort HIGH
```

Criar matriz:

```text
Impact
HIGH     ● ●
MEDIUM     ● ●
LOW          ●

         LOW     MEDIUM     HIGH
                 Effort
```

Isso deve ajudar o usuário a decidir o que corrigir primeiro.

---

# 19. PERFORMANCE GOALS

Criar uma seção:

## Performance goals

Exemplo:

```text
Performance Score
82 / 85
██████████████████░░

LCP
2.1s / 2.5s
✓ Target achieved

CLS
0.18 / 0.10
✕ Target not achieved
```

Mostrar:

- objetivo
- valor atual
- distância da meta
- tendência
- status

---

# 20. HISTÓRICO

Criar página completa de histórico.

Tabela:

```text
Date
Device
Score
LCP
INP
CLS
Status
Actions
```

Adicionar filtros:

- site
- project
- mobile/desktop
- date range
- score
- status

Permitir selecionar duas análises para comparação.

---

# 21. COMPARISON CENTER

Criar uma página dedicada:

## Compare analyses

Selecionar:

```text
Baseline
vs
Current
```

Mostrar:

- score
- Core Web Vitals
- métricas
- audits
- resource size
- requests
- WebPageTest
- recommendations

Criar gráficos antes/depois.

Também identificar automaticamente:

### Improvements

```text
LCP
↓ 44%

CLS
↓ 81%

INP
↓ 48%
```

### Regressions

```text
JavaScript
↑ 18%

Requests
↑ 12
```

---

# 22. REPORT CENTER

Quero uma área profissional para geração de relatórios.

Criar página:

## Reports

Botão principal:

`Generate report`

Permitir selecionar:

- site
- período
- mobile
- desktop
- comparação
- incluir WebPageTest
- incluir CrUX
- incluir IA
- incluir recomendações

Tipos:

### Executive Report

Para clientes e gestores.

### Technical Report

Para desenvolvedores.

### Performance Comparison

Antes vs depois.

---

# 23. PREVIEW DO PDF

Antes de gerar o PDF, mostrar uma prévia profissional.

Criar layout semelhante a um relatório corporativo.

### Capa

```text
PERFORMANCE AUDITOR

Performance Report

Samsung Argentina

September 2026

Mobile + Desktop
```

### Página 2

Executive Summary

```text
Performance Score
84 / 100

+17% improvement
```

### Página 3

Core Web Vitals

Gráficos completos.

### Página 4

Before vs After

### Página 5

Problems & Opportunities

### Página 6

WebPageTest / Waterfall

### Página 7

AI Recommendations

### Página 8

Action Plan

---

# 24. PDF PROFISSIONAL

O PDF não deve ser simplesmente um print da tela.

Criar um verdadeiro relatório estruturado.

O relatório deve conter:

1. Cover
2. Executive Summary
3. Performance Score
4. Core Web Vitals
5. Complementary Metrics
6. Mobile vs Desktop
7. Before vs After
8. Performance Trends
9. Lighthouse Audits
10. WebPageTest Analysis
11. Waterfall
12. Resource Distribution
13. Third-party Impact
14. AI Insights
15. Recommendations
16. Action Plan
17. Goals
18. Conclusion

O documento deve ter:

- cabeçalho
- rodapé
- número de página
- data
- URL
- estratégia
- versão da análise
- gráficos
- tabelas
- indicadores
- resumo executivo

A estrutura do relatório deve seguir a visão já definida para o produto, incluindo resumo executivo, Core Web Vitals, métricas complementares, Lab × Field, problemas, recomendações, evidências, código, antes/depois e plano de ação.

---

# 25. GRÁFICOS

Não economize nos gráficos.

Quero gráficos profissionais e realmente úteis.

Utilizar quando aplicável:

- Line Chart
- Area Chart
- Bar Chart
- Horizontal Bar
- Grouped Bar
- Donut
- Gauge
- Radial Progress
- Sparkline
- Before/After comparison
- Timeline
- Waterfall

Todo gráfico deve responder uma pergunta.

Não adicionar gráfico apenas para decorar.

---

# 26. RESPONSIVIDADE

Desktop:

Aproveitar telas grandes.

Mobile:

Adaptar completamente.

Nunca simplesmente reduzir tudo.

Criar:

- cards empilhados
- gráficos com scroll horizontal quando necessário
- tabelas responsivas
- sidebar transformada em navigation drawer

---

# 27. DESIGN SYSTEM

Criar um pequeno design system consistente.

Definir:

- typography
- spacing
- border radius
- shadows
- cards
- buttons
- badges
- status
- charts
- tables
- tooltips
- dropdowns
- modals

Status:

- Good
- Needs Improvement
- Poor
- Critical

Prioridades:

- P0
- P1
- P2
- P3

Não utilizar uma cor diferente para cada elemento sem necessidade.

As cores devem possuir significado semântico.

---

# 28. UX

A interface deve seguir uma hierarquia clara:

```text
1. Como está o site?
        ↓
2. O que está errado?
        ↓
3. Qual o impacto?
        ↓
4. O que devo corrigir primeiro?
        ↓
5. Melhorou depois da correção?
```

O usuário não deve precisar interpretar dezenas de números para entender o resultado.

---

# 29. EMPTY STATES

Criar estados profissionais para:

- nenhum histórico
- nenhum projeto
- nenhum monitoramento
- nenhum relatório
- CrUX indisponível
- WebPageTest não executado
- nenhuma regressão
- nenhuma meta cadastrada

Não mostrar espaços vazios.

Explicar o que o usuário pode fazer.

---

# 30. LOADING STATES

Criar loading states profissionais.

Durante uma análise:

```text
Analyzing website

✓ Validating URL
✓ Running Lighthouse
● Collecting WebPageTest data
○ Processing metrics
○ Generating insights
```

Mostrar progresso por etapa.

---

# 31. ERROR STATES

Erros devem ser claros e acionáveis.

Exemplo:

```text
Analysis failed

We couldn't complete the WebPageTest analysis.

Reason:
API quota exceeded.

[Retry]
```

Nunca mostrar stack trace ou erro técnico bruto para o usuário final.

---

# 32. PRINCÍPIO IMPORTANTE

Não transformar tudo em cards.

Use diferentes estruturas visuais:

- cards
- charts
- tables
- sections
- timelines
- comparison panels
- insights
- matrices
- expandable details

O dashboard deve parecer uma aplicação profissional de observabilidade/performance, e não uma coleção de cards.

---

# 33. PERFORMANCE DO PRÓPRIO DASHBOARD

O redesign não pode deixar a aplicação pesada.

Priorizar:

- lazy loading de gráficos
- code splitting
- componentes reutilizáveis
- renderização eficiente
- evitar bibliotecas desnecessárias
- evitar múltiplos gráficos renderizando simultaneamente quando não necessários

O dashboard do Performance Auditor também precisa ser rápido.

---

# 34. ACESSIBILIDADE

Garantir:

- navegação por teclado
- contraste adequado
- labels
- aria
- foco visível
- tabelas acessíveis
- gráficos com informações alternativas
- sem depender apenas de cor para indicar status

---

# 35. IMPLEMENTAÇÃO

Antes de alterar o código:

1. Analise a estrutura atual.
2. Identifique os componentes existentes.
3. Identifique quais páginas já existem.
4. Identifique quais dados já estão disponíveis nas APIs.
5. Não recrie funcionalidades que já existem.
6. Não altere contratos de API sem necessidade.
7. Preserve TypeScript.
8. Reutilize componentes quando fizer sentido.
9. Crie componentes novos quando necessário.
10. Mantenha o código organizado.

Não remover funcionalidades existentes apenas para simplificar o redesign.

---

# 36. RESULTADO ESPERADO

Quero que, ao abrir o dashboard, a primeira impressão seja:

> “Isso parece uma ferramenta profissional de performance usada por uma empresa de tecnologia.”

E não:

> “Isso parece um projeto interno com alguns gráficos.”

O resultado precisa ser:

**Premium + Técnico + Executivo + Visual + Acionável**

O dashboard deve permitir que um desenvolvedor veja detalhes técnicos, enquanto um gestor ou cliente consiga entender rapidamente:

- se o site está saudável
- se melhorou
- onde estão os problemas
- qual o impacto
- o que deve ser corrigido
- se as metas estão sendo atingidas
- qual foi a evolução ao longo do tempo

---

# 37. REGRA FINAL

Não faça apenas um redesign visual.

Faça uma **reformulação completa da experiência do produto**, mantendo a funcionalidade existente.

Prioridades:

1. Hierarquia de informação
2. Visualização de dados
3. Comparações
4. Histórico
5. Insights
6. Ações recomendadas
7. Relatórios
8. UX
9. Design visual
10. Responsividade

Sempre que houver dados suficientes, prefira mostrar **tendência, comparação e contexto**, em vez de mostrar apenas um número isolado.

O produto final deve parecer uma plataforma de **Performance Intelligence / Web Performance Observability**, e não apenas uma tela de resultados do Lighthouse.