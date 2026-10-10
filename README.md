# WarrantyVault

A local-first React + Vite demo for warranty registration, service claims, and repair scheduling.

## Run locally

```sh
npm install
npm run dev
```

## Demo workflows

- Switch between Customer, Team Admin, and Team Leader from the sidebar.
- Register and edit products, search and filter the product registry, and submit claims.
- Review claim timelines, move claims through their lifecycle, and schedule compatible service centers and available slots.
- Changes persist in this browser under `warrantyvault-demo-v1`. Invalid stored data falls back to the sample dataset.

Warranty eligibility uses purchase date and duration as a demo estimate only. The app does not verify coverage with manufacturers. Local browser storage is not shared or securely stored; the role switcher is not authorization. No external APIs or authentication are connected.

## Scripts

- `npm run dev` — start Vite
- `npm run lint` — run Oxlint
- `npm run build` — create a production build
- `npm run preview` — preview the production build
