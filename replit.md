# HA-RATE - Loyalty & Mining Platform

## Overview

HA-RATE is a blockchain-based loyalty and rewards platform built on the TON blockchain. Users can earn HA-RATE tokens through mining, completing tasks, referrals, and subscriptions. The application features a persistent mining system with auto-mining capabilities, task completion tracking, leaderboard rankings, and withdrawal functionality.

The platform uses TonConnect for wallet authentication and integrates with TON blockchain for payment verification and token distribution.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite as build tool and dev server
- Wouter for client-side routing
- TanStack Query (React Query) for server state management
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with custom theming

**Key Design Patterns:**
- Context-based wallet management (`WalletContext`) for global authentication state
- Component composition with shadcn/ui for consistent UI patterns
- Client-side routing with bottom tab navigation (Mining, Referral, Tasks, Subscription, Leaderboard)
- Persistent sessions using localStorage flags (e.g., intro screen visibility keyed by user wallet)
- Credential-inclusive fetch requests for cookie-based authentication

**State Management Strategy:**
- TonConnect UI React hooks manage blockchain wallet connection
- WalletContext provides centralized wallet address and connection state
- React Query handles all API data fetching, caching, and invalidation
- Session persistence via httpOnly cookies with server-side validation

### Backend Architecture

**Technology Stack:**
- Express.js server with TypeScript
- Dual database support: PostgreSQL (Drizzle ORM) and MongoDB (Mongoose)
- Session management with express-session and MongoStore
- TonWeb and @ton/core for TON blockchain interactions

**Current Database Strategy:**
The application is configured to use **MongoDB** as the primary data store (via `storage-mongodb.ts`), despite having Drizzle/PostgreSQL configuration present. All active business logic routes through MongoDB models.

**Authentication & Session:**
- TON wallet-based authentication using TonConnect proof verification
- Ed25519 signature verification against wallet public keys
- Persistent sessions stored in MongoDB (365-day TTL)
- HttpOnly, Secure cookies with SameSite configuration for cross-origin support
- Admin panel uses separate username/password authentication with bcrypt hashing
- Nonce-based replay attack prevention for wallet signatures

**Core Services:**
- `ton-auth-service.ts`: Handles TonConnect proof verification and nonce generation
- `payment-service.ts`: Manages USDT Jetton transfer verification for subscriptions
- `withdrawal-service.ts`: Coordinates withdrawal requests and fee payments
- `auto-mining-worker.ts`: Background worker that processes auto-mining rewards at intervals
- `blockchain-monitor.ts`: Monitors TON blockchain for withdrawal fee payments
- `bittnexis-sender.ts`: Sends HA-RATE tokens to users after successful withdrawals
- `admin-auth-service.ts`: Separate authentication flow for admin panel access

**Mining System:**
- 6-hour mining cycles with configurable base rewards
- Mining power multipliers (1x, 2x, 3x, 4x) based on active subscriptions
- Auto-mining for premium users (continues even when offline)
- Pending rewards system with claim mechanism
- Server-side mining state prevents client manipulation

**Subscription Model:**
- Four subscription tiers: auto_mine ($15), 2x_power ($10), 3x_power ($18), 4x_power ($23)
- USDT Jetton payment verification via TON blockchain
- Time-based subscription expiry with auto-renewal capability
- Mining power and auto-mine flags stored per user with expiration timestamps

**Task & Referral Systems:**
- Task definitions with progress tracking and completion rewards
- Referral code generation (format: "Bittnexis" + 8 random alphanumeric chars)
- Referral earnings tracked separately from mining rewards
- Leaderboard ranking by total HA-RATE balance

### External Dependencies

**TON Blockchain Integration:**
- **TonConnect**: Wallet connection protocol for TON wallets (Tonkeeper, MyTonWallet, etc.)
- **TonWeb**: JavaScript library for TON blockchain interactions and transaction verification
- **@ton/core & @ton/crypto**: Core TON primitives for address parsing, cell manipulation, and cryptographic operations
- **@neondatabase/serverless**: PostgreSQL connection via Neon (configured but not actively used)

**Payment & Token Infrastructure:**
- USDT Jetton contract verification for subscription payments
- TON merchant wallet for receiving withdrawal fees (0.50 TON)
- Project wallet for sending HA-RATE tokens (configured via PROJECT_WALLET_KEY)
- TonCenter API for blockchain data queries

**Database Services:**
- **MongoDB Atlas**: Primary production database (connection via MONGODB_URI)
- **PostgreSQL**: Alternative database configured via Drizzle (schema defined, not actively used)
- **MongoStore**: Session persistence in MongoDB with automatic TTL cleanup

**Development & Deployment:**
- **Replit**: Primary deployment platform (configured with trust proxy and HTTPS enforcement)
- **Vercel**: Alternative deployment configuration present (vercel.json)
- **Environment-specific CORS**: Supports both same-origin (Replit) and cross-origin (separate frontend) deployments

**Critical Environment Variables:**
- `MONGODB_URI`: MongoDB connection string (required)
- `MAIN_WALLET`: TON merchant wallet for receiving payments (required)
- `SESSION_SECRET`: Session encryption key (required)
- `ADMIN_USERNAME` & `ADMIN_PASSWORD_HASH`: Admin panel credentials
- `PROJECT_WALLET_KEY`: Private key for sending HA-RATE tokens
- `FRONTEND_ORIGIN`: Frontend URL for CORS (optional, defaults to same-origin)
- `TONCENTER_API_KEY`: API key for TonCenter blockchain queries

**Session & Security Configuration:**
- HttpOnly cookies prevent XSS attacks
- Secure flag enforced in production/Replit (HTTPS required)
- SameSite='none' for cross-origin or 'lax' for same-origin based on FRONTEND_ORIGIN presence
- Trust proxy enabled for X-Forwarded-* headers in reverse proxy environments
- 365-day session duration with lazy updates (24-hour touch interval)