# LOOP – AI Customer Feedback Intelligence Platform

LOOP is a multi-tenant web application that ingests customer feedback, uses AI (Claude) to classify, cluster, and trend it, and provides a dashboard with charts and a natural-language Q&A interface.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Auth | NextAuth.js v4 (credentials) |
| AI | Anthropic Claude API |
| Charts | Recharts |
| Validation | Zod |

## 📋 Features

### Core
- **Multi-tenant workspaces** — Sign up creates a workspace; all data is scoped per workspace
- **Role-Based Access Control** — ADMIN, ANALYST, VIEWER with server-side enforcement
- **Feedback Ingestion** — Manual entry, CSV bulk upload, channel simulation
- **Feedback Inbox** — Paginated, filtered, searchable with status workflow

### AI-Powered
- **Auto-classification** — Claude classifies sentiment, themes, and feature area on ingest
- **Theme Clustering** — AI-driven theme detection with trend/spike analysis
- **Ask LOOP (RAG Q&A)** — Semantic search + Claude for grounded Q&A with citations
- **VoC Reports** — AI-generated executive Voice-of-Customer reports

### Analytics
- Volume over time charts
- Sentiment breakdown (pie chart)
- Top themes bar chart
- Stat cards with KPIs

## 🔧 Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Anthropic API key

### Environment Variables

Create a `.env` file:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
NEXTAUTH_SECRET=your-super-secret-key
NEXTAUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...
```

### Installation

```bash
# Install dependencies
npm install --legacy-peer-deps

# Push database schema
npx drizzle-kit push

# Seed with demo data
npm run seed

# Start development server
npm run dev
```

### Windows Setup
Run `scripts/setup.bat` for automated setup.

## 👤 Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@acme.com | password123 | ADMIN |
| analyst@acme.com | password123 | ANALYST |
| viewer@acme.com | password123 | VIEWER |

## 🏗️ Architecture

```
src/
├── app/
│   ├── (auth)/           # Login, Signup pages
│   ├── dashboard/        # Main app pages
│   │   ├── page.tsx      # Analytics dashboard
│   │   ├── feedback/     # Feedback inbox + CRUD
│   │   ├── themes/       # Theme clusters + trends
│   │   ├── ask/          # Ask LOOP Q&A
│   │   ├── reports/      # VoC reports
│   │   └── settings/     # Team management (Admin)
│   └── api/              # REST API routes
├── components/
│   ├── charts/           # Recharts wrappers
│   ├── layout/           # Sidebar, Header
│   └── ai/               # AI components
├── lib/
│   ├── auth.ts           # NextAuth config
│   ├── session.ts        # Auth helpers
│   └── ai/               # Claude, embeddings, RAG
├── db/
│   ├── schema.ts         # Drizzle schema
│   ├── index.ts          # DB client
│   └── seed.ts           # Demo data
└── utils/                # Helpers, CSV parser
```

## 🤖 AI Implementation

### Classification
- On feedback ingest, Claude classifies: sentiment (POS/NEU/NEG), sentiment score (-1 to 1), themes, feature area
- Uses existing theme names as context to maintain consistency
- Validated with Zod; retries once on failure; falls back to neutral classification

### Ask LOOP (RAG)
- Each feedback gets a simple hash-based embedding
- User question is embedded, cosine similarity computed against all feedback embeddings
- Top 10 relevant items retrieved and passed to Claude as context
- Claude answers based ONLY on the retrieved context with numbered citations

### VoC Reports
- Stats pre-computed: total feedback, sentiment counts, top themes, quotes
- Only narrative writing delegated to Claude (no hallucination of numbers)
- Saved to database for future viewing and print/PDF export

## 📊 Data Model

- **Workspace** — Multi-tenant container
- **User** — With role (ADMIN/ANALYST/VIEWER) and workspace association
- **Feedback** — Content, channel, AI-classified fields, status workflow
- **Theme** — Auto-created from classification, colored
- **FeedbackTheme** — Many-to-many with confidence scores
- **Embedding** — Vector stored as JSON for semantic search
- **Report** — Saved VoC reports with full JSON content

## 🚀 Deployment

Deploy to Vercel:
1. Push to GitHub
2. Connect repo in Vercel dashboard
3. Set environment variables
4. Deploy!

Or use Railway/Render for the PostgreSQL database.
