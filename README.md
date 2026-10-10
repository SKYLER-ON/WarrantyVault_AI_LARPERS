# WarrantyVault

A local-first React + Vite demo for warranty registration, service claims, and repair scheduling.

## Run locally

```sh
npm install
npm run dev
```

## Demo workflows

- Sign in from the login screen. Use **Auto-fill** on either screen, or type the demo credentials:
  - Customer: `customer@demo.com` / `Demo@123`
  - Service team: `adjuster@warrantyvault.internal` / `Adjuster@123`, any service centre, verification code `123456`
- Service team members can toggle between Team Admin and Team Leader in the top bar. Use the sign-out icon to return to the login screens.
- Register and edit products, search and filter the product registry, and submit claims.
- Review claim timelines, move claims through their lifecycle, and schedule compatible service centers and available slots.
- Changes persist in this browser under `warrantyvault-demo-v1`. Invalid stored data falls back to the sample dataset.

Warranty eligibility uses purchase date and duration as a demo estimate only. The app does not verify coverage with manufacturers. Local browser storage is not shared or securely stored; the sign-in screens are a front-end demo gate, not real authentication or authorization. No external APIs are connected.

## Scripts

- `npm run dev` — start Vite
- `npm run lint` — run Oxlint
- `npm run build` — create a production build
- `npm run preview` — preview the production build
