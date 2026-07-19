# REGIX Bad Word Blocker — Project Analysis

## Overview

REGIX is a Discord moderation bot that filters inappropriate language using a hybrid approach: local word-list matching + AI-powered detection via OpenRouter. It runs on Bun runtime with TypeScript, uses Prisma v7 with Neon PostgreSQL for the auth system, and provides a decoupled auth validation API via Express.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Discord Bot (Bun)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Commands │  │ Handlers │  │ Services              │  │
│  │ (slash + │→ │ (command │  │ - moderation.ts       │  │
│  │  prefix) │  │  router) │  │ - openRouter.ts (AI)  │  │
│  └──────────┘  └──────────┘  │ - penalties.ts        │  │
│                              │ - permissions.ts      │  │
│                              │ - storage.ts (JSON)   │  │
│                              └──────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Auth Service Layer (src/lib/)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ jwt.ts   │  │ apiKey.ts│  │ tokenService.ts      │  │
│  │ (JWT     │  │ (API key │  │ (CRUD, rate limits,  │  │
│  │  gen/    │  │  gen/    │  │  IP whitelist,       │  │
│  │  verify) │  │  hash/   │  │  audit logging)      │  │
│  └────┬─────┘  │  verify) │  └──────────┬───────────┘  │
│       │        └────┬─────┘             │              │
│       └─────────────┼───────────────────┘              │
│                     │                                  │
│              ┌──────▼──────┐                           │
│              │ prisma.ts   │ (Prisma v7 + Neon adapter)│
│              └──────┬──────┘                           │
└─────────────────────┼──────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────┐
│              Neon PostgreSQL (Prisma v7)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ ApiKey   │  │JwtConfig │  │ RateLimitLog         │  │
│  │ (hashed  │  │(guild-   │  │ AuditLog             │  │
│  │  keys)   │  │ specific)│  │ (monitoring)         │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component      | Technology                               |
| -------------- | ---------------------------------------- |
| Runtime        | Bun (v1.x)                               |
| Language       | TypeScript (ESNext modules)              |
| Discord SDK    | discord.js v14                           |
| Database ORM   | Prisma v7 (prisma-client-js generator)   |
| Database       | Neon PostgreSQL (serverless)             |
| Driver Adapter | @prisma/adapter-neon                     |
| Auth           | JWT (jsonwebtoken), API Keys (argon2id)  |
| AI Moderation  | OpenRouter (OpenAI-compatible API)       |
| Auth Server    | Express (standalone validation endpoint) |
| Config         | prisma.config.ts + dotenv                |

## Project Structure

```
regix-badword-blocker/
├── prisma/
│   ├── schema.prisma          # Database schema (4 models)
│   └── migrations/            # Prisma migrations (auto-generated)
├── generated/
│   └── prisma/                # Prisma v7 generated client (gitignored)
├── src/
│   ├── index.ts               # Bot entry point (Prisma init on startup)
│   ├── auth-server.ts         # Express auth validation server (port 4000)
│   ├── types.ts               # TypeScript interfaces
│   ├── commands/              # Discord slash/prefix commands
│   │   ├── auth.ts            # /auth generate, reset, get, customize
│   │   ├── help.ts            # /help (detailed command descriptions)
│   │   ├── manage.ts          # /manage ignore, whitelist, blacklist
│   │   ├── reset.ts           # /reset strikes
│   │   ├── settings.ts        # /settings view, timeout, etc.
│   │   └── strikes.ts         # /strikes check
│   ├── handlers/
│   │   └── commandHandler.ts  # Hybrid command router
│   ├── lib/                   # Auth service layer
│   │   ├── prisma.ts          # Prisma client singleton (Neon adapter)
│   │   ├── jwt.ts             # JWT generation & verification
│   │   ├── apiKey.ts          # API key generation, hashing, validation
│   │   └── tokenService.ts    # Token management (CRUD, rate limits, audit)
│   └── services/              # Moderation services
│       ├── moderation.ts      # Pipeline: local check → AI check
│       ├── openRouter.ts      # OpenRouter AI integration
│       ├── penalties.ts       # Strike/ban enforcement
│       ├── permissions.ts     # Authorization checks
│       └── storage.ts         # JSON file storage (legacy)
├── data/                      # JSON data files (legacy, being phased out)
│   ├── config.json
│   ├── words.json
│   ├── violations.json
│   └── permissions.json
├── prisma.config.ts           # Prisma v7 configuration
├── .env                       # Environment variables (gitignored)
├── .env.example               # Environment variable template
├── AGENTS.md                  # This file — project analysis
├── README.md                  # Full documentation with integration examples
├── task-progress.md           # Task tracking
└── package.json
```

## Database Schema (Prisma v7)

### ApiKey

- Stores hashed API keys for external service authentication
- Fields: keyPrefix, keyHash (argon2id), name, description, ownerId, guildId
- Rate limiting: rateLimit (reqs/window), rateLimitWindow (ms)
- Security: ipWhitelist (comma-separated), permissions (read/write/admin)
- Status: isActive, lastUsedAt, expiresAt

### JwtConfig

- Guild-specific JWT signing configuration
- Fields: guildId (unique), secret, expiresIn, issuer, audience
- Rate limiting for validation endpoint

### RateLimitLog

- Tracks rate limit hits for monitoring
- Fields: keyId (FK to ApiKey), ip, endpoint, timestamp

### AuditLog

- Security audit trail for all auth actions
- Fields: action, actorId, targetId, details (JSON), ip, timestamp

## Key Design Decisions

1. **Hybrid Moderation Pipeline**: Local word-list check first (fast, offline), then AI check via OpenRouter (accurate, adaptive). AI also discovers new bad words automatically.

2. **Decoupled Auth System**: Auth service layer (`src/lib/`) is independent of Discord. Can be used by external services via the Express validation server.

3. **Prisma v7 with Neon Adapter**: Uses `prisma-client-js` generator with `@prisma/adapter-neon` for serverless-compatible PostgreSQL connections. Connection URL configured in `prisma.config.ts`.

4. **API Key Security**: Keys are prefixed with `rgx_`, hashed with argon2id, and only the full key is shown once on creation. IP whitelisting adds an extra layer.

5. **Legacy JSON Storage**: The `data/` directory and `src/services/storage.ts` still use JSON files for moderation data (words, violations, config). These are being phased out in favor of the database.

## Environment Variables

| Variable             | Description                                 |
| -------------------- | ------------------------------------------- |
| `DATABASE_URL`       | Neon PostgreSQL connection string (pooled)  |
| `DIRECT_URL`         | Direct connection for Prisma CLI            |
| `TOKEN`              | Discord bot token                           |
| `CLIENT_ID`          | Discord application ID                      |
| `GUILD_ID`           | Discord guild ID (optional)                 |
| `OWNER_ID`           | Bot owner Discord user ID                   |
| `OWNER_ROLE_ID`      | Owner role ID                               |
| `MOD_ROLE_ID`        | Moderator role ID                           |
| `ADMIN_ROLE_ID`      | Admin role ID                               |
| `LOG_CHANNEL_ID`     | Moderation log channel ID                   |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI moderation        |
| `JWT_SECRET`         | JWT signing secret                          |
| `JWT_EXPIRES_IN`     | JWT token expiration (default: 24h)         |
| `AUTH_SERVER_PORT`   | Auth validation server port (default: 4000) |

## Commands

| Command                             | Type           | Access | Description                               |
| ----------------------------------- | -------------- | ------ | ----------------------------------------- |
| `/help`                             | Slash + Prefix | All    | Show detailed help menu with all commands |
| `/strikes [user]`                   | Slash + Prefix | Mod+   | Check strike count for a user             |
| `/reset [user]`                     | Slash + Prefix | Admin+ | Reset strikes for a user                  |
| `/manage ignore add/remove/list`    | Slash + Prefix | Admin+ | Manage channels that bypass moderation    |
| `/manage whitelist add/remove/list` | Slash + Prefix | Admin+ | Manage whitelisted words                  |
| `/manage blacklist add/remove/list` | Slash + Prefix | Admin+ | Manage bad words (blacklist)              |
| `/settings view`                    | Slash + Prefix | Owner  | View all current bot settings             |
| `/settings timeout`                 | Slash + Prefix | Owner  | Set timeout duration for flagged users    |
| `/settings max-strikes`             | Slash + Prefix | Owner  | Set max strikes before auto-ban           |
| `/settings notification`            | Slash + Prefix | Owner  | Set notification channel                  |
| `/settings log-channel`             | Slash + Prefix | Owner  | Set log channel                           |
| `/settings dm-warning`              | Slash + Prefix | Owner  | Customize DM warning embed                |
| `/settings log-embed`               | Slash + Prefix | Owner  | Customize log embed                       |
| `/settings terms`                   | Slash + Prefix | Owner  | Customize Terms & Conditions embed        |
| `/settings strike-embed`            | Slash + Prefix | Owner  | Customize strike check embed              |
| `/settings reset-embed`             | Slash + Prefix | Owner  | Customize strikes reset embed             |
| `/auth generate`                    | Slash + Prefix | Admin+ | Generate new API key (shown once)         |
| `/auth reset`                       | Slash + Prefix | Admin+ | Revoke an API key by ID                   |
| `/auth get`                         | Slash + Prefix | Admin+ | List API keys / view key details          |
| `/auth customize jwt`               | Slash + Prefix | Admin+ | Configure JWT settings                    |
| `/auth customize view`              | Slash + Prefix | Admin+ | View current JWT configuration            |

## Auth Validation API (Express, port 4000)

| Endpoint        | Method | Auth Required       | Description                |
| --------------- | ------ | ------------------- | -------------------------- |
| `/health`       | GET    | No                  | Health check               |
| `/`             | GET    | No                  | API documentation          |
| `/validate`     | POST   | Bearer token        | Validate JWT or API key    |
| `/keys/:prefix` | GET    | Admin-level API key | Get API key info by prefix |

## Development

```bash
# Install dependencies
bun install

# Generate Prisma client
bun run db:generate

# Push schema to database
bun run db:push

# Start bot
bun run start

# Start auth validation server
bun run auth-server
```
