<p align="center">
  <img src="assets/icon.png" width="96" height="96" alt="FlightOne app icon" />
</p>

<h1 align="center">FlightOne Mobile</h1>

<p align="center">
  The FlightOne travel app for iOS and Android: plan, book and manage trips by talking to <strong>Ava</strong>, your AI travel consultant.
</p>

<p align="center">
  <img alt="Expo SDK 58" src="https://img.shields.io/badge/Expo_SDK-58-000020?logo=expo&logoColor=white" />
  <img alt="React Native 0.88" src="https://img.shields.io/badge/React_Native-0.88-61DAFB?logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" />
  <img alt="Platforms" src="https://img.shields.io/badge/platforms-iOS_%7C_Android-0a86c0" />
</p>

---

## Overview

FlightOne Mobile is the native companion to the FlightOne web platform. It talks to the same
FlightOne Express API as the web app, so accounts, bookings, trips, rewards and saved chats are
shared across both. Everything in the web app is here except the marketing homepage, which is
replaced by a native, 3D home screen.

## Features

| Area | What it does |
| --- | --- |
| **Ava (AI consultant)** | Chat to search live flights, stays and cars. Animated progress while Ava searches, replies that type out, a results summary with **View results** (sort: Recommended / Cheapest / Quickest; filters: stops, airlines, departure time, price, bags, refundable). Editable trip chips (route, dates, travellers, cabin), saved chats, copy, retry and edit-last-question. |
| **Home** | Spinning 3D globe with flight arcs from your city, Ask Ava box, quick actions, next trip and a 3D trending-destinations carousel. |
| **Book** | Tap-only forms for flights, stays and cars: airport search, swap, native date pickers, travellers & cabin; Ava runs the live search. |
| **Checkout** | Boarding-pass summary with a live price-hold countdown, Traveller → Payment → Ticket steps, sectioned traveller form (auto-filled from your profile), rewards credit, card / bank transfer / company credit, pinned Pay bar. |
| **E-ticket** | "You're booked!" view, copyable PNR and ticket number, flight timeline, and a **downloadable / shareable / printable PDF e-ticket** (hotel voucher for stays). |
| **Trips** | Upcoming / Past / Cancelled, search, next-trip card with countdown, month-grouped list, trip page with live status timeline. |
| **Profile** | Settings-style hub: photo, readiness score with tap-to-fix items, preferences, passports & IDs (scan with OCR), companions, emergency contacts, loyalty, 2-step verification and devices. |
| **More** | Travel Vault, Visa (requirement verdicts and cases), Rewards (tiers, referrals, history), Concierge, Refunds, Support, Corporate travel, Group travel, Events & MICE. |
| **Platform** | Native Liquid Glass tab bar on iOS 26+, animated splash screen, secure sessions in the device keychain, haptics, light theme tuned to the FlightOne brand. |

## Tech stack

- **Expo SDK 58**, React Native 0.88, React 19, TypeScript (strict)
- **Expo Router** (file-based routing, typed routes, native tabs)
- **Redux Toolkit Query** for the API, **Zustand** for small app stores
- **React Hook Form + Zod** for forms and validation
- **react-native-svg** for the globe, gradients and illustrations
- Expo modules: Secure Store, Location, Image Picker / Manipulator, Document Picker, File System, Sharing, Print, Clipboard, Haptics, Splash Screen

## Project structure

```
src/
├─ app/                     Routes only (Expo Router). Every file is a screen.
│  ├─ (auth)/               Sign in, sign up, forgot / reset password
│  └─ (app)/                Signed-in area
│     ├─ (tabs)/            Home · Ava · Book · Trips · More (native tab bar)
│     ├─ checkout/          Checkout and e-ticket
│     ├─ results/ trip/     Ava results page, trip detail
│     └─ …                  Profile, Vault, Visa, Rewards, Refunds, Support, …
├─ core/                    Shared, feature-agnostic code
│  ├─ api/                  RTK Query base API, headers, error formatting
│  ├─ auth/                 Session store, secure storage, token refresh
│  ├─ components/           UI kit: Screen, Card, ListRow, PageHeader, Segmented, …
│  ├─ lib/                  Airlines, places, geo, confirm dialogs
│  └─ theme/                Design tokens (colours, fonts, spacing)
└─ features/<feature>/      One folder per product area
   ├─ api/                  Endpoints and types for that area
   ├─ components/           Feature UI
   ├─ lib/                  Pure logic (unit-tested)
   └─ screens/              Screens that routes re-export
scripts/                    Asset generators (app icon, tab bar icons)
assets/                     Icons, splash logo, generated tab icons
```

Routes stay thin: each file in `src/app` re-exports a screen from `src/features`.

## Getting started

### Prerequisites

- Node.js 22 or newer (the tests run TypeScript directly)
- The FlightOne API server running (from the FlightOne web repository)
- **Expo Go** on your phone, or an iOS Simulator / Android Emulator

### Setup

```bash
npm install
cp .env.example .env.local
```

Set `EXPO_PUBLIC_API_URL` in `.env.local` to your API server:

| Running on | Value |
| --- | --- |
| Phone (same Wi-Fi as your computer) | `http://<your-computer's-LAN-IP>:8084/api/v1` |
| Android Emulator | `http://10.0.2.2:8084/api/v1` |
| iOS Simulator / web | `http://localhost:8084/api/v1` |

> Every `EXPO_PUBLIC_*` value is bundled into the app. Never put API keys or other secrets in `.env.local`.

### Run

```bash
npm start
```

Scan the QR code with the iPhone camera (or Expo Go on Android). If your computer's Wi-Fi
address changes, update `EXPO_PUBLIC_API_URL` and restart with `npm start -- --clear`.

> **Windows note:** the npm scripts call the Expo and TypeScript CLIs through `node` directly,
> so they work even when the project path contains characters like `&`. In PowerShell, use
> `npm.cmd` if script execution is restricted.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run ios` / `npm run android` | Start and open on a simulator / emulator |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm test` | Unit tests with Node's built-in test runner |
| `npm run lint` | ESLint (Expo config) |
| `npm run doctor` | Check installed packages match the Expo SDK |
| `node scripts/build-app-icon.mjs <web-repo>` | Rebuild the app icon set from the FlightOne logo |
| `node scripts/build-tab-icons.mjs <web-repo>` | Rebuild the tab bar icons (Lucide) |

Add packages with `npx expo install <package>` so versions match the SDK.

## Quality

- **TypeScript strict**, typed routes
- **Unit tests** for the pure logic: trip sorting and grouping, results filters, Ava trip plans,
  airport search, profile sections, globe maths, query builders and more (`src/**/*.test.ts`)
- Before committing: `npm run typecheck && npm test`, then bundle-check both platforms with
  `npx expo export --platform ios` and `--platform android`

## Building and releasing

The app uses Continuous Native Generation: there are no `ios/` or `android/` folders in the
repo. Native configuration lives in `app.json` and config plugins.

Store builds use [EAS](https://docs.expo.dev/eas/):

```bash
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios
```

Before the first store build, point `EXPO_PUBLIC_API_URL` at the hosted API (not a LAN address).

## Security

- Sessions: access and refresh tokens are kept in the device keychain / keystore (Expo Secure Store), never in plain storage.
- The app identifies itself to the API as a mobile client and receives its refresh token in the response body instead of a cookie.
- No secrets in the bundle: only the public API URL is configured through `EXPO_PUBLIC_*`.
- Prices always come from the server; the app never sends or trusts a client-side price.

## Roadmap

- Host the API and switch the app to the production URL
- EAS production builds, TestFlight and Google Play testing
- Fare alerts with push notifications
- Smarter Ava suggestions from upcoming trips and recent searches

## License

Proprietary. © FlightOne. All rights reserved. See [LICENSE](LICENSE).
