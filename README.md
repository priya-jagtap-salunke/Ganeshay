# Bappaji Booking

Cross-platform booking app for Ganapati Murti stall. Replaces paper receipt books with digital bookings, PDF receipts, and payment tracking.

## Platforms

- Android
- iOS (iPhone)
- Web

## Tech Stack

- React Native + Expo SDK 52
- TypeScript
- Expo Router
- Supabase (Auth + Database)
- React Native Paper
- React Hook Form + Zod
- Zustand
- React Query
- Expo Print + Expo Sharing
- QR Code (qrcode + react-native-qrcode-svg)

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account ([supabase.com](https://supabase.com))
- Expo Go app (for mobile testing) or Android Studio / Xcode for native builds

## Installation

### 1. Install dependencies

```bash
cd bappaji-booking
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up Supabase database

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Paste and run the contents of `supabase/schema.sql`

### 4. Create admin user

1. Supabase Dashboard → **Authentication** → **Users**
2. Click **Add user** → create email + password
3. Use these credentials to log in to the app

### 5. Run the app

```bash
# Start development server
npm start

# Or platform-specific:
npm run android   # Android
npm run ios       # iOS (macOS only)
npm run web       # Web browser
```

## App Flow

```
Splash → Login → Dashboard → New Booking → Save → PDF Receipt → Share
                                    ↓
                              Search Booking → Details → Mark Delivered
```

## Features

| Feature | Description |
|---------|-------------|
| Admin Login | Supabase email/password auth with persistent session |
| Dashboard | Today's bookings, collection, pending amount, delivered count |
| New Booking | Auto booking number (BP000001), auto pending calculation |
| Search | Instant search by booking number, name, or phone |
| Booking Details | View all info, generate receipt, mark delivered |
| PDF Receipt | A5 cream/maroon themed receipt with QR code |
| Share | Share PDF via WhatsApp, SMS, Email, or any app |
| Settings | Business name, phone, address on every receipt |

## Project Structure

```
app/                    # Expo Router screens
src/
  components/           # Reusable UI components
  features/
    auth/               # Login
    bookings/           # CRUD, search, delivery
    dashboard/          # Stats
    receipt/            # PDF generation & sharing
    settings/           # Business info
  hooks/                # Shared hooks
  lib/                  # Supabase, React Query
  stores/               # Zustand stores
  theme/                # Colors, Paper theme
  types/                # TypeScript types
  utils/                # Helpers
supabase/
  schema.sql            # Database schema
```

## Booking Number Format

Auto-generated sequential numbers: `BP000001`, `BP000002`, etc.

## Status Colors

- **Pending** — Orange
- **Delivered** — Green

## Production Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure and build
eas build:configure
eas build --platform all
```

## License

Private — Bappaji.com
