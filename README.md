# Web Performance Intelligence -- Performance Auditor

Plataforma de auditoria técnica de performance web. O usuário informa uma URL e
um dispositivo; o sistema executa uma auditoria via **Google PageSpeed Insights /
Lighthouse**, apresenta as principais métricas (**LCP, INP, CLS, FCP, TTFB**),
classifica cada uma (Bom / Precisa melhorar / Ruim), lista os problemas
prioritários e, a partir da V3, **explica o porquê, o que corrigir primeiro,
como corrigir, e se a correção realmente melhorou** via um motor de diagnóstico
baseado em evidências (regras determinísticas, sem chaves de IA externas).

> Baseado na especificação consolidada `Performance_Auditor_Projeto_Completo`
> (V1 funcional + roadmap V2/V3/V4). Este repositório implementa **V1, V2 e V3**.
>
> **Princípio do produto:** não ser apenas um clone do PageSpeed Insights --
> transformar dados técnicos em um plano de ação.

---

## Visão geral das versões

| Versão | Objetivo                          | Status |
| ------ | --------------------------------- | ------ |
| V1     | Auditoria funcional               | ✅ Implementado |
| V2     | Histórico, CrUX, PostgreSQL       | ✅ Implementado |
| V3     | IA (causa provável, recomendações)| ✅ Implementado |
| V4     | Produto (monitoramento, alertas)  | ✅ Implementado |

A arquitetura já separa os serviços de evolução (`services/crux`, `services/ai`,
`services/reports`) para acomodar as próximas fases sem refatoração estrutural.

---

## Arquitetura (V1 + V2)

```
FRONTEND (React + Vite + TypeScript)  -- formulário, dashboard, histórico, gráficos
        │  POST /api/analyze · /api/sites · /api/analyses/:id/compare · /api/reports/:id
        ▼
BACKEND  (Node + Express + TypeScript)
        │  validação · PageSpeed client · CrUX client · normalização · persistência
        ▼
PERFORMANCE ENGINE
   - normalizer.ts  (unidades e display consistentes - RF-14/CA-05)
   - classifier.ts  (limites de Core Web Vitals - RF-15)
   - prioritizer.ts (ordena audits por severidade/impacto - RF-16/CA-06)
   - comparison.ts  (antes/depois - V2)
        │
        ├── PostgreSQL + Prisma (Site, Analysis, Metric, Audit, Comparison)
        └── CrUX API (dados reais de campo - V2)
```

- **Frontend/Backend desacoplados** (RNF-02): front consome REST, proxy Vite em dev.
- **Segredos só no backend** (RNF-03/CA-08): `PAGESPEED_API_KEY`/`CRUX_API_KEY` via
  variável de ambiente; jamais no bundle do frontend.
- **Validação independente no backend** (RNF-04/RF-11): URLs são validadas duas
  vezes, mas o backend é a fonte de verdade e não chama o serviço externo em
  entradas inválidas (CA-02).
- **Erro controlado e sem vazamento** (RNF-05/RNF-06): erros do PageSpeed viram
  respostas 4xx/5xx com mensagens compreensíveis.
- **Testabilidade isolada** (RNF-08): normalização/classificação/comparação são
  funções puras; repositório testado com SQLite em memória.
- **Preparado para i18n** (RNF-12): textos centralizados em `src/i18n` e números
  via `Intl`.

---

## Stack

| Camada    | Tecnologia                                |
| --------- | ----------------------------------------- |
| Frontend  | React 18 · Vite · TypeScript · CSS modules |
| Backend   | Node.js 20+ · Express · TypeScript        |
| Motores   | Google PageSpeed Insights v5 / Lighthouse · CrUX API |
| Persistência | PostgreSQL + Prisma (produção) · SQLite (testes) |
| Relatórios| HTML (estrutura pronta para PDF na fase 6) |
| Testes    | Vitest (backend + frontend) · Supertest   |
| Produção  | Docker · docker compose · nginx           |

---

## Configuração

### Backend

Crie `backend/.env` a partir de `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

| Variável             | Descrição                                            |
| -------------------- | ---------------------------------------------------- |
| `PORT`               | Porta do servidor (padrão `3000`)                    |
| `PAGESPEED_API_KEY`  | Chave opcional do PageSpeed API (nunca no frontend)  |
| `PAGESPEED_API_URL`  | Endpoint v5 (padrão já configurado)                  |
| `PAGESPEED_TIMEOUT_MS` | Timeout da chamada externa (padrão `60000`)        |
| `CRUX_API_KEY`       | Chave para dados reais (usa a mesma da PageSpeed se vazio) |
| `CRUX_API_URL`       | Endpoint CrUX v1 (padrão já configurado)             |
| `DATABASE_URL`       | PostgreSQL usado pelo Prisma (V2)                    |
| `CORS_ORIGIN`        | Origens permitidas (`*` para todas)                  |

Sem chave, o PageSpeed ainda funciona com limites anônimos mais baixos (o CrUX
fica desativado sem chave).

### Migrações de banco (V2)

Com o PostgreSQL rodando (ver Docker abaixo):

```bash
cd backend
yarn prisma generate          # gera o Prisma Client
yarn prisma:deploy            # aplica as migrations
yarn dev
```

### Frontend

Crie `frontend/.env` a partir de `frontend/.env.example`:

```bash
cp frontend/.env.example frontend/.env
```

`VITE_API_URL` aponta para `/api` em dev (proxy do Vite → `localhost:3000`).

---

## Execução local

### Terminais separados

```bash
# Backend  (http://localhost:3000) -- requer Postgres (ver Docker) para V2
cd backend
yarn install
yarn dev

# Frontend (http://localhost:5173)
cd frontend
yarn install
yarn dev
```

### Testes

```bash
cd backend   && yarn test      # 119 testes unitários + integração (inclui V3/V4)
cd frontend  && yarn test      # 24 testes de componentes e fluxos
```

### Typecheck e build

```bash
cd backend   && yarn typecheck && yarn build
cd frontend  && yarn typecheck && yarn build
```

---

## API

### `GET /api/health` (RF-10)

```json
{ "status": "ok", "uptimeSec": 12, "timestamp": "2026-09-11T00:00:00Z", "version": "1.0.0" }
```

### `POST /api/analyze` (RF-01..RF-08)

**Corpo:**

```json
{ "url": "https://meusite.com", "strategy": "mobile" }
```

`strategy`: `mobile` (padrão) ou `desktop`.

**Resposta 200** (trecho):

```json
{
  "id": "https://meusite.com::mobile::...",
  "requestedUrl": "https://meusite.com",
  "finalUrl": "https://meusite.com/pt-br",
  "strategy": "mobile",
  "analyzedAt": "2026-09-10T12:00:00Z",
  "performanceScore": 67,
  "metrics": [
    { "id": "performance-score", "name": "Performance Score", "value": 67, "unit": "score", "status": "needs-improvement", "displayValue": "67" },
    { "id": "LCP", "name": "Largest Contentful Paint", "value": 3800, "unit": "ms", "status": "needs-improvement", "displayValue": "3.8 s" }
  ],
  "audits": [
    { "auditId": "unsized-images", "title": "...", "severity": "P1", "impact": "high", "score": 0 }
  ],
  "failedAuditsCount": 5,
  "highImpactCount": 2,
  "warnings": []
}
```

**Erros (todos com corpo `{ "error": "mensagem compreensível" }`):**

| Código | Cenário                                                        |
| ------ | -------------------------------------------------------------- |
| `400`  | URL inválida (nenhuma chamada externa)                         |
| `400`  | Corpo inválido                                                 |
| `429`  | Rate limit da nossa API                                        |
| `502`  | Falha da API PageSpeed (rede, HTTP, payload ou erro da API)    |
| `504`  | Timeout                                                         |
| `500`  | Erro interno (nunca expõe segredos/stack)                      |

Segurança: rate limiting em memória (20 análises/minuto), `Retry-After`, chave
da API somente no servidor. Na V2, `POST /api/analyze` também **persiste** a
análise (Site + Analysis + Metric + Audit) e mescla dados de **CrUX**
(`fieldData`) quando houver chave de API configurada.

### V2 — Sites e histórico

| Método | Rota                                   | Descrição                                |
| ------ | -------------------------------------- | ---------------------------------------- |
| GET    | `/api/sites`                           | Lista sites cadastrados                  |
| POST   | `/api/sites`                           | Cadastra site `{ name, url }`            |
| GET    | `/api/sites/:id`                       | Detalhe do site                          |
| GET    | `/api/sites/:id/analyses`              | Histórico (`?strategy=&from=&to=&limit=`)|
| GET    | `/api/analyses/:id`                    | Análise completa (métricas, audits, field)|

### V2 — Comparação e relatório

| Método | Rota                             | Descrição                                    |
| ------ | -------------------------------- | -------------------------------------------- |
| POST   | `/api/analyses/:id/compare`      | `{ baselineAnalysisId }` → antes/depois      |
| POST   | `/api/reports/:id`               | Gera relatório HTML (opcional `baselineAnalysisId`) |

Exemplo de comparação (resposta 201):

```json
{
  "scoreBefore": 50, "scoreAfter": 85, "scoreDelta": 35, "scorePct": 70,
  "scoreDirection": "improved",
  "metrics": [
    { "metricId": "LCP", "before": {...}, "after": {...},
      "delta": -1700, "pctChange": -44.7, "direction": "improved" }
  ]
}
```

Limites de Core Web Vitals aplicados (seção 2 do documento):

| Métrica | Bom            | Precisa melhorar | Ruim      |
| ------- | -------------- | ---------------- | --------- |
| LCP     | ≤ 2.5 s        | 2.5–4 s          | > 4 s     |
| INP     | ≤ 200 ms       | 200–500 ms       | > 500 ms  |
| CLS     | ≤ 0.1          | 0.1–0.25         | > 0.25    |
| FCP     | ≤ 1.8 s        | 1.8–3 s          | > 3 s     |
| TTFB    | ≤ 0.8 s        | 0.8–1.8 s        | > 1.8 s   |

*(Limites FCP/TTFB são convenções web-vitals; revisar contra versões oficiais
antes de produção, conforme nota do documento.)*

---

## Docker

O compose sobe **PostgreSQL**, **backend** e **frontend**; o backend aplica as
migrations automaticamente na subida (`prisma migrate deploy`):

```bash
PAGESPEED_API_KEY=xxx CRUX_API_KEY=xxx docker compose -f docker/compose.yaml up --build
```

- Postgres em `localhost:5433` (wpintel/wpintel) — volume persistente `pgdata`
- Backend em `http://localhost:3000`
- Frontend em `http://localhost:8080` (nginx, proxy `/api` → backend)
- Healthchecks em todos os serviços

---

## Estrutura do projeto

```
├── backend/
│   ├── src/
│   │   ├── controllers/          # health, analyze
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── pagespeed/        # client.ts + parser.ts (PSI/Lighthouse)
│   │   │   ├── performance/      # normalizer, classifier, prioritizer
│   │   │   ├── ai/               # motor de diagnóstico (V3)
│   │   ├── crux/ ai/  reports/  # serviços de campo, inteligência e relatórios
│   │   │   ├── analysis.service.ts
│   │   │   └── analysis-cache.ts
│   │   ├── validators/           # url.validator + schemas zod
│   │   ├── middleware/           # error-handler, rate-limit, async-handler
│   │   ├── types/
│   │   ├── app.ts                # fábrica da aplicação (testável)
│   │   └── index.ts              # bootstrap (Prisma, CrUX, repositories)
│   ├── prisma/
│   │   ├── schema.prisma         # PostgreSQL (produção)
│   │   ├── schema.test.prisma    # SQLite (testes)
│   │   └── migrations/
│   └── tests/                    # 119 testes (vitest + supertest + SQLite)
├── frontend/
│   ├── src/
│   │   ├── components/           # form, score, metric cards, audits, sites, histórico, gráficos, recomendações
│   │   ├── pages/                # AnalysisPage (Nova análise)
│   │   ├── services/             # api.ts (V1 + V2)
│   │   ├── hooks/                # useAnalysis (estados + bloqueio de duplicados)
│   │   ├── i18n/                 # dicionários pt-BR/en-US
│   │   ├── types/
│   │   └── styles/
│   └── tests/                    # 24 testes (testing-library)
├── docker/compose.yaml
└── README.md
```

---

## Critérios de aceite — V1 (cobertura)

| Critério | Onde |
| -------- | ---- |
| CA-01 URL válida inicia análise | `tests/url.validator` + integração `POST /api/analyze` |
| CA-02 URL inválida sem chamada externa | teste conta chamadas externas |
| CA-03 Mobile/Desktop distintos | `strategy` no payload + testes |
| CA-04 Score e métricas | `AnalysisResultView` + integração |
| CA-05 CLS 2 casas, temporais em ms | `normalizer.test.ts` |
| CA-06 Audits ordenados por severidade | `prioritizer.test.ts` |
| CA-07 Falhas compreensíveis | `error-handler` + testes de API |
| CA-08 Chave fora do bundle | `grep` no `dist/` do frontend |

## Entregas da V2 (cobertura)

| Capacidade | Onde |
| ---------- | ---- |
| Postgres + Prisma (Site/Analysis/Metric/Audit/Comparison) | `prisma/schema.prisma` + `prisma.repository.ts` |
| Histórico por URL, data e estratégia | `GET /api/sites/:id/analyses` + testes SQLite |
| CrUX (dados reais) | `crux.service.ts` + `parseCruxRecord` + testes |
| Comparação antes/depois | `comparison.ts` + `POST /api/analyses/:id/compare` |
| Relatório HTML | `report.service.ts` + `POST /api/reports/:id` + testes |
| Dashboard com histórico e gráficos | `SitesPage` + `SiteDetailPage` + `MetricChart` |

## Entregas da V3 (cobertura)

| Capacidade | Onde |
| ---------- | ---- |
| Motor de diagnóstico (regras baseadas em evidência) | `services/ai/diagnostic.ts` + `diagnostic.test.ts` |
| Causa provável marcada como hipótese (não fato) | `diagnostic.ts` (campo `cause` explícito) |
| Sugestões de código apenas com evidência suficiente | `suggestedFix` preenchido apenas para audits com dados |
| Prioridade P0/P1/P2 e impacto esperado | `priority` + `expectedImpact` no domínio e DB |
| Recomendações persistidas e exibidas no detalhe | `Recommendation` model + `RecommendationsPanel` |
| Relatório com causa provável, recomendação, evidência, código e plano de ação | `report.service.ts` + `POST /api/reports/:id` |

## Entregas da V4 (cobertura)

| Capacidade | Onde |
| ---------- | ---- |
| Projetos (agrupar sites) | `Project` model + `GET/POST /api/projects` |
| Monitoramento agendado | `Monitor` model + `MonitoringScheduler` + `POST /api/monitoring` |
| Execução manual de monitor | `POST /api/monitoring/:id/run` |
| Detecção de regressões | `services/performance/regression.ts` (status downgrade + numérico +15%) |
| Alertas | `Alert` model + `GET/POST /api/alerts` + contador de não lidos |
| Metas por site | `Goal` model + `GET/POST /api/sites/:id/goals` + avaliação na execução |
| Relatório recorrente | análises automáticas alimentam relatórios antes/depois on-demand |

## Roadmap proposto (plataforma final)

- **Final**: autenticação/usuários, observabilidade avançada, CI/CD completo,
  retenção configurável e integração de todas as capacidades.

---

## Notas

- Integrações externas, limites de Core Web Vitals e detalhes das APIs devem ser
  revalidados contra as versões oficiais atuais antes de produção (seção 16 do
  documento).
- Política de retenção (RNF-13): o cache em memória (5 min) evita análises
  duplicadas (RNF-14); o histórico é persistido no PostgreSQL e seu período de
  retenção é configurável no chão de dados.