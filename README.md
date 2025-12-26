# Blockchain Analyzer

A Next.js application for analyzing blockchain networks using CoinGecko API.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy the environment variables template:
```bash
cp .env.local.example .env.local
```

3. Update `.env.local` with your Redis URL:
```
REDIS_URL=redis://localhost:6379
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Features

- **Chains List Page**: Browse and select from available blockchain networks
- **Chain Detail Page**: View detailed JSON data for a selected chain
- **API Caching**: Chains data is cached in Redis for 24 hours

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- CoinGecko API
- Redis
