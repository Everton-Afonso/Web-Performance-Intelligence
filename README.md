# Web Performance Intelligence -- Performance Auditor

Plataforma de auditoria técnica de performance web. O usuário informa uma URL e
um dispositivo; o sistema executa uma auditoria via **Google PageSpeed Insights /
Lighthouse**, apresenta as principais métricas (**LCP, INP, CLS, FCP, TTFB**),
classifica cada uma (Bom / Precisa melhorar / Ruim) e lista os problemas
prioritários.

> Baseado na especificação consolidada `Performance_Auditor_Projeto_Completo`
> (V1 funcional + roadmap V2/V3/V4). Este repositório implementa a **V1**.
>
> **Princípio do produto:** não ser apenas um clone do PageSpeed Insights --
> transformar dados técnicos em um plano de ação.

---

## Visão geral das versões

| Versão | Objetivo                          | Status |
| ------ | --------------------------------- | ------ |
| V1     | Auditoria funcional               | ✅ Implementado |
| V2     | Histórico, CrUX, PostgreSQL       | 🔜 Evolução |
| V3     | IA (causa provável, recomendações)| 🔜 Evolução |
| V4/Final| Produto (monitoramento, alertas) | 🔜 Evolução |

A arquitetura já separa os serviços de evolução (`services/crux`, `services/ai`,
`services/reports`) para acomodar as próximas fases sem refatoração estrutural.

---

## Arquitetura (V1)

```
FRONTEND (React + Vite + TypeScript)  -- formulário, loading, cards, dashboard
        │  POST /api/analyze
        ▼
BACKEND  (Node + Express + TypeScript)
        │  validação · PageSpeed client · normalização · classificação · priorização
        ▼
PERFORMANCE ENGINE
   - normalizer.ts  (unidades e display consistentes - RF-14/CA-05)
   - classifier.ts  (limites de Core Web Vitals - RF-15)
   - prioritizer.ts (ordena audits por severidade/impacto - RF-16/CA-06)
```

- **Frontend/Backend desacoplados** (RNF-02): front consome REST, proxy Vite em dev.
- **Segredos só no backend** (RNF-03/CA-08): `PAGESPEED_API_KEY` via variável de
  ambiente; jamais no bundle do frontend.
- **Validação independente no backend** (RNF-04/RF-11): URLs são validadas duas
  vezes, mas o backend é a fonte de verdade e não chama o serviço externo em
  entradas inválidas (CA-02).
- **Erro controlado e sem vazamento** (RNF-05/RNF-06): erros do PageSpeed viram
  respostas 4xx/5xx com mensagens compreensíveis.
- **Testabilidade isolada** (RNF-08): normalização/classificação/validação são
  funções puras testadas em unidade.
- **Preparado para i18n** (RNF-12): textos centralizados em `src/i18n` e números
  via `Intl`.

---

## Stack

| Camada    | Tecnologia                                |
| --------- | ----------------------------------------- |
| Frontend  | React 18 · Vite · TypeScript · CSS modules |
| Backend   | Node.js 20+ · Express · TypeScript        |
| Motores   | Google PageSpeed Insights v5 / Lighthouse |
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
| `CORS_ORIGIN`        | Origens permitidas (`*` para todas)                  |

Sem chave, o PageSpeed ainda funciona com limites anônimos mais baixos.

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
# Backend  (http://localhost:3000)
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
cd backend   && yarn test      # 74 testes unitários + integração
cd frontend  && yarn test      # 18 testes de componentes e fluxos
```

### Typecheck e build

```bash
cd backend   && yarn typecheck && yarn build
cd frontend  && yarn typecheck && yarn build
```

---

## API (V1)

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
da API somente no servidor.

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

```bash
PAGESPEED_API_KEY=xxx docker compose -f docker/compose.yaml up --build
```

- Backend em `http://localhost:3000`
- Frontend em `http://localhost:8080` (nginx, proxy `/api` → backend)
- Healthchecks em ambos os serviços

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
│   │   │   ├── crux/  ai/  reports/  # pastas reservadas para V2/V3/V4
│   │   │   ├── analysis.service.ts
│   │   │   └── analysis-cache.ts
│   │   ├── validators/           # url.validator + schemas zod
│   │   ├── middleware/           # error-handler, rate-limit, async-handler
│   │   ├── types/
│   │   ├── app.ts                # fábrica da aplicação (testável)
│   │   └── index.ts              # bootstrap
│   └── tests/                    # 74 testes (vitest + supertest)
├── frontend/
│   ├── src/
│   │   ├── components/           # form, score, metric cards, audits, loading, error
│   │   ├── pages/                # AnalysisPage (dashboard V1)
│   │   ├── services/             # api.ts
│   │   ├── hooks/                # useAnalysis (estados + bloqueio de duplicados)
│   │   ├── i18n/                 # dicionários pt-BR/en-US
│   │   ├── types/
│   │   └── styles/
│   └── tests/                    # 18 testes (testing-library)
├── docker/compose.yaml
└── README.md
```

---

## Critérios de aceite da V1 (cobertura)

| Critério | Onde |
| -------- | ---- |
| CA-01 URL válida inicia análise | `tests/url.validator` + integração `POST /api/analyze` |
| CA-02 URL inválida sem chamada externa | benefício: teste conta chamadas externas |
| CA-03 Mobile/Desktop distintos | `strategy` no payload + testes |
| CA-04 Score e métricas | `AnalysisResultView` + integração |
| CA-05 CLS 2 casas, temporais em ms | `normalizer.test.ts` |
| CA-06 Audits ordenados por severidade | `prioritizer.test.ts` |
| CA-07 Falhas compreensíveis | `error-handler` + testes de API |
| CA-08 Chave fora do bundle | `grep` no `dist/` do frontend |

## Roadmap proposto (próximas fases)

- **V2**: PostgreSQL + Prisma (análises, métricas, audits), histórico por
  URL/data/estratégia, CrUX, comparação antes/depois, relatório HTML/PDF.
- **V3**: camada IA interpretando métricas e audits, agrupando problemas,
  causa provável, priorização por impacto e sugestões de código.
- **V4**: projetos/sites, monitoramento agendado, regressão, alertas e metas.

---

## Notas

- Integrações externas, limites de Core Web Vitals e detalhes das APIs devem ser
  revalidados contra as versões oficiais atuais antes de produção (seção 16 do
  documento).
- Política de retenção (RNF-13): na V1 nada é persistido; o cache em memória é
  apenas de curto prazo (5 min) para evitar análises duplicadas (RNF-14).