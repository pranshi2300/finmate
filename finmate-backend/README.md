# FinMate AI Backend

Node.js/Express API backed by Prisma and PostgreSQL. Routes are protected with JWT middleware and use the consistent flow **routes → controllers → services → Prisma**.

## Phase 9 analytics

Analytics remains fully rule-based and local; no LLM provider is required.

- `analyticsHelpers`: merchant normalization, UTC date buckets, mean/median/standard deviation.
- `analyticsService`: weekday/hour spending, income and savings trends, expense-to-income ratio, category growth, transaction size, and volatility.
- `merchantAnalyticsService`: receipt-vendor aggregation, rankings, frequency, comparison, and monthly merchant trends.
- `subscriptionService`: detects three or more consistent, roughly monthly expense-note patterns.
- `recommendationEngine`: turns forecasts, budget risk, trends, merchants, subscriptions, anomalies, and volatility into structured, confidence-scored recommendations.

## Analytics endpoints

All endpoints below require `Authorization: Bearer <accessToken>`.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/insights/summary` | Current-month summary, categories, anomaly data |
| GET | `/api/insights/spending-trends?weeks=8` | Weekly income/expense trend and month comparison |
| GET | `/api/insights/category-analysis?months=6` | Category totals and budget utilization |
| GET | `/api/insights/analytics?months=6&days=90` | Advanced trend, ratio, volatility, timing, and transaction-size data |
| GET | `/api/insights/merchant-analytics?months=12&limit=10` | Receipt merchant ranking and trends |
| GET | `/api/insights/subscriptions?months=12` | Detected monthly recurring expenses |
| GET | `/api/insights/recommendations` | Rule-based, structured recommendations |
| GET | `/api/predictions/month-end` | Month-end expense forecast |
| GET | `/api/predictions/category` | Category forecasts |
| GET | `/api/predictions/budget-risk` | Forecasted budget utilization |
| GET | `/api/predictions/cashflow` | Daily net cashflow forecast |

`months`, `days`, `weeks`, and `limit` are bounded by the controller to protect query cost. Controllers compose independent service calls with `Promise.all`; calculation stays in services and no analytics result is written to the database.

## Algorithms and limits

- Forecasts use moving average, weighted moving average, or linear trend.
- Subscription detection requires at least three records, a 25–35 day average interval, consistent intervals, and low amount variance.
- Merchant analytics is based on OCR receipt vendors; subscriptions are based on expense transaction notes. This preserves the data source rather than guessing a merchant when none exists.
- These are financial insights, not financial advice. Sparse histories produce lower-confidence guidance.

## Development

```bash
npm install
npx prisma generate
npm run dev
npm test
```

The test suite covers forecasting algorithms plus Phase 9 empty-user output, merchant normalization/grouping, monthly recurring patterns, trend buckets, and forecast-driven recommendations.

## Phase 10: AI Financial Advisor

`POST /api/ai/chat` accepts `{ message, conversationHistory? }` and returns a reply, suggested questions, confidence, and explainability sources. It requires the normal Bearer token.

The request flow is:

`aiController → financialAdvisor → contextBuilder → RuleBasedProvider → responseFormatter`

`contextBuilder` reuses the transaction, insights, prediction, merchant, subscription, analytics, anomaly, budget, and recommendation services to create one read-only financial context. The provider only answers from that context and returns which analytics, forecasts, budgets, and recommendation IDs informed the reply.

`llmAdapter` exposes the stable provider contract. `RuleBasedProvider` is the only active provider. `GeminiProvider`, `OpenAIProvider`, and `ClaudeProvider` are deliberately non-configured stubs, so a future provider can be enabled behind the adapter without changing controllers or API responses. No third-party model, prompt, or financial data leaves the application in Phase 10.

Advisor tests cover context composition with an empty user, prompts, provider responses, purchase affordability, subscription explanations, adapter defaults, and conversation-history trimming.

## Phase 11: Smart Notifications

Notifications use the same service architecture as the rest of FinMate:

`notificationRoutes → notificationController → notificationService → notificationRules → Prisma`

The notification rules consume the existing advisor context and create per-user deduplicated budget, forecast, anomaly, large-transaction, subscription, savings milestone, monthly summary, and high-confidence advisor notifications. `NotificationPreference` stores a per-user master switch and category preferences. The persisted `Notification` payload includes title, description, priority, type, read state, action JSON, and creation time.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/notifications` | Paginated notifications and unread count |
| GET | `/api/notifications/unread` | Unread notifications only |
| PATCH | `/api/notifications/:id/read` | Mark one notification read |
| PATCH | `/api/notifications/read-all` | Mark all notifications read |
| DELETE | `/api/notifications/:id` | Delete one notification |
| POST | `/api/notifications/test` | Create a test notification |
| GET/PATCH | `/api/notifications/preferences` | Read or update notification preferences |

`notificationScheduler` exposes `runDaily`, `runWeeklySummary`, and `runMonthlyReport`. It does not schedule processes itself; node-cron, BullMQ, or a cloud scheduler can invoke these jobs later without changing the notification rules. Future Firebase Cloud Messaging or Web Push support should be implemented as a delivery adapter after notifications are persisted, retaining the current generation and preference flow.

Notification tests cover generation, preference filtering, unread API responses, preference handling, and scheduler fan-out.
