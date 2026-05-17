# shilpsmith Next.js Application

## Features
- Migrated from pure HTML to Next.js App Router
- Tailwind CSS support
- Backend API route for Pinterest product references
- Dynamic product grid
- WhatsApp ordering integration

## Setup

```bash
npm install
npm run dev
```

## Pinterest API
Create `.env.local` file:

```env
PINTEREST_ACCESS_TOKEN=your_token
NEXT_PUBLIC_WHATSAPP_NUMBER=919999999999
```

## API Endpoint
`/api/products`

This endpoint fetches Pinterest product references and falls back to local products if the Pinterest API fails.