# Mobile Nurse Care
A responsive nursing-service booking web app built with React, TypeScript,
Vinext and Tailwind CSS. Patients can browse services, choose a home visit or
online consultation, select an appointment time, enter their details and move
through a Paystack-ready checkout flow. A nurse dashboard is also included.

## Included features


- Responsive patient landing page
- Six nursing service cards with Nigerian naira pricing
- Home-visit and online-consultation options
- Three-step booking flow
- Date and time selection
- Patient details and home-address fields
- Paystack-ready payment screen (demo mode until API keys are connected)
- Booking confirmation view
- Nurse dashboard with appointments, availability, earnings and payments
- Desktop, tablet and mobile styling

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local address printed by the development server.

## Production build

```bash
npm run build
```

## Main project structure

```text
mobile-nurse-care/
├── app/
│   ├── page.tsx          # Patient website, booking flow and nurse dashboard
│   ├── globals.css       # Complete responsive design system and layouts
│   ├── layout.tsx        # App metadata, fonts and global layout
│   └── chatgpt-auth.ts   # Optional ChatGPT sign-in helper
├── public/               # Icons and static assets
├── db/                   # Optional D1/Drizzle database layer
├── examples/d1/          # Optional persistence example
├── scripts/              # Install, build and validation helpers
├── tests/                # Rendered-output validation
├── worker/               # Cloudflare worker entry
├── package.json          # Dependencies and commands
├── vite.config.ts        # Vinext/Vite configuration
├── tsconfig.json         # TypeScript configuration
└── README.md
```

## Paystack connection

The current `Pay securely` action demonstrates the completed booking UI. To
accept real payments, add server-side Paystack initialization and verification
routes, store the Paystack secret key as a server environment secret, and only
confirm a booking after Paystack verifies the transaction reference.

Never place a Paystack secret key in `app/page.tsx` or expose it to the browser.

## Where to customize

- Services and prices: `app/page.tsx`, inside the `services` array
- Available dates and times: `app/page.tsx`, inside `days` and `times`
- Nurse name and dashboard data: `app/page.tsx`, inside `Dashboard`
- Phone number and email: footer section in `app/page.tsx`
- Brand colors and layout: CSS variables and rules in `app/globals.css`
