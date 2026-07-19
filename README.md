# 🔥 REGIX Bad Word Blocker

<!-- markdownlint-disable MD033 -->

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-Bun-FF6A00?style=flat-square&logo=bun" alt="Bun Runtime">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Database-Neon_PostgreSQL-00E59B?style=flat-square&logo=postgresql" alt="Neon PostgreSQL">
  <img src="https://img.shields.io/badge/ORM-Prisma_v7-2D3748?style=flat-square&logo=prisma" alt="Prisma v7">
  <img src="https://img.shields.io/badge/Discord.js-v14-5865F2?style=flat-square&logo=discord" alt="discord.js v14">
  <img src="https://img.shields.io/badge/AI-OpenRouter-FF6A00?style=flat-square" alt="OpenRouter AI">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License">
</p>

<p align="center">
  <strong>REGIX</strong> is a Discord moderation bot that filters inappropriate language using a hybrid approach:
  <br><em>local word-list matching</em> ⚡ + <em>AI-powered detection via OpenRouter</em> 🧠
</p>

---

## 📋 Architecture

```mermaid
graph TB
    subgraph Discord["Discord Bot (Bun runtime)"]
        CMD["Commands<br/>(slash + prefix)"]
        HAND["Handlers<br/>(command router)"]
        SVC["Services<br/>• moderation.ts<br/>• openRouter.ts (AI)<br/>• penalties.ts<br/>• permissions.ts<br/>• storage.ts (JSON)"]
        CMD --> HAND --> SVC
    end

    subgraph AUTH["Auth Service Layer (src/lib/)"]
        JWT["jwt.ts<br/>JWT gen/verify"]
        AK["apiKey.ts<br/>API key gen/hash/verify"]
        TS["tokenService.ts<br/>CRUD, rate limits,<br/>IP whitelist, audit"]
        PRISMA["prisma.ts<br/>Prisma v7 + Neon adapter"]
        JWT --> PRISMA
        AK --> PRISMA
        TS --> PRISMA
    end

    subgraph DB["Neon PostgreSQL"]
        APIKEYS["ApiKey<br/>(hashed keys)"]
        JWTCFG["JwtConfig<br/>(guild-specific)"]
        RLLOG["RateLimitLog<br/>(monitoring)"]
        AULOG["AuditLog<br/>(security trail)"]
    end

    subgraph EXT["External Services"]
        OR["OpenRouter API<br/>(AI moderation)"]
        AUTHAPI["Auth Validation API<br/>(Express, port 4000)"]
    end

    SVC -- "AI check" --> OR
    SVC -- "local check" --> JSON[(JSON files)]
    Discord <--> AUTH
    PRISMA --> DB
    AUTHAPI -- "validates tokens" --> AUTH
    AUTHAPI -- "rate limit check" --> DB
```

---

## 🚀 Tech Stack

| Component          | Technology                               |
| ------------------ | ---------------------------------------- |
| **Runtime**        | [Bun](https://bun.sh) v1.x               |
| **Language**       | TypeScript (ESNext modules)              |
| **Discord SDK**    | [discord.js](https://discord.js.org) v14 |
| **Database ORM**   | [Prisma](https://prisma.io) v7           |
| **Database**       | [Neon PostgreSQL](https://neon.tech)     |
| **Driver Adapter** | `@prisma/adapter-neon`                   |
| **Auth**           | JWT (jsonwebtoken), API Keys (argon2id)  |
| **AI Moderation**  | [OpenRouter](https://openrouter.ai)      |
| **Auth Server**    | Express (standalone validation endpoint) |
| **Config**         | `prisma.config.ts` + `dotenv`            |

---

## 📦 Project Structure

```
regix-badword-blocker/
├── prisma/
│   ├── schema.prisma          # Database schema (4 models)
│   └── migrations/            # Prisma migrations (auto-generated)
├── generated/
│   └── prisma/                # Prisma v7 generated client (gitignored)
├── src/
│   ├── index.ts               # Bot entry point
│   ├── auth-server.ts         # Express auth validation server
│   ├── types.ts               # TypeScript interfaces
│   ├── commands/              # Discord slash/prefix commands
│   │   ├── auth.ts            # /auth generate, reset, get, customize
│   │   ├── help.ts            # /help
│   │   ├── manage.ts          # /manage ignore, whitelist, blacklist
│   │   ├── reset.ts           # /reset strikes
│   │   ├── settings.ts        # /settings view, timeout, etc.
│   │   └── strikes.ts         # /strikes check
│   ├── handlers/
│   │   └── commandHandler.ts  # Hybrid command router
│   ├── lib/                   # Auth service layer
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── jwt.ts             # JWT generation & verification
│   │   ├── apiKey.ts          # API key generation, hashing, validation
│   │   └── tokenService.ts    # Token management (CRUD, rate limits, audit)
│   └── services/              # Moderation services
│       ├── moderation.ts      # Pipeline: local check → AI check
│       ├── openRouter.ts      # OpenRouter AI integration
│       ├── penalties.ts       # Strike/ban enforcement
│       ├── permissions.ts     # Authorization checks
│       └── storage.ts         # JSON file storage (legacy)
├── data/                      # JSON data files (legacy phase-out)
│   ├── config.json
│   ├── words.json
│   ├── violations.json
│   └── permissions.json
├── prisma.config.ts           # Prisma v7 configuration
├── .env                       # Environment variables (gitignored)
├── .env.example               # Environment template
├── AGENTS.md                  # Project analysis for AI agents
└── package.json
```

---

## 🔑 Commands

| Command                 | Type           | Access | Description                       |
| ----------------------- | -------------- | ------ | --------------------------------- |
| `/help`                 | Slash + Prefix | All    | Show available commands           |
| `/strikes [user]`       | Slash + Prefix | Mod+   | Check strike count for a user     |
| `/reset [user]`         | Slash + Prefix | Admin+ | Reset strikes for a user          |
| `/manage ignore`        | Slash + Prefix | Admin+ | Add/remove/list ignored channels  |
| `/manage whitelist`     | Slash + Prefix | Admin+ | Add/remove/list whitelisted words |
| `/manage blacklist`     | Slash + Prefix | Admin+ | Add/remove/list bad words         |
| `/settings view`        | Slash + Prefix | Owner  | View current bot configuration    |
| `/settings timeout`     | Slash + Prefix | Owner  | Set timeout duration              |
| `/settings max-strikes` | Slash + Prefix | Owner  | Set max strikes before auto-ban   |
| `/settings dm-warning`  | Slash + Prefix | Owner  | Customize DM warning embed        |
| `/auth generate`        | Slash + Prefix | Admin+ | Generate new API key              |
| `/auth reset`           | Slash + Prefix | Admin+ | Revoke an API key                 |
| `/auth get`             | Slash + Prefix | Admin+ | List API keys / view key details  |
| `/auth customize jwt`   | Slash + Prefix | Admin+ | Configure JWT settings            |
| `/auth customize view`  | Slash + Prefix | Admin+ | View current JWT configuration    |

---

## 🗄️ Database Schema

### ApiKey

Stores hashed API keys for external service authentication.

- `keyPrefix` — First 8 chars of the key for identification
- `keyHash` — Argon2id hash of the full API key
- Rate limiting: `rateLimit` (reqs/window), `rateLimitWindow` (ms)
- Security: `ipWhitelist` (comma-separated), `permissions` (read/write/admin)
- Status: `isActive`, `lastUsedAt`, `expiresAt`

### JwtConfig

Guild-specific JWT signing configuration.

- `guildId` (unique), `secret`, `expiresIn`, `issuer`, `audience`
- Rate limiting for validation endpoint

### RateLimitLog

Tracks rate limit hits for monitoring.

- `keyId` (FK to ApiKey), `ip`, `endpoint`, `timestamp`

### AuditLog

Security audit trail for all auth actions.

- `action`, `actorId`, `targetId`, `details` (JSON), `ip`, `timestamp`

---

## 🔐 Auth System

The auth system provides **two authentication methods** for external services:

### API Keys

- Generated via `/auth generate` command in Discord
- Prefixed with `rgx_` for easy identification
- Hashed with **argon2id** before storage
- Full key shown **only once** on creation
- Configurable: rate limits, IP whitelist, permissions, expiry
- Validated via the Express Auth Validation Server

### JWT Tokens

- Guild-specific signing configuration (stored in database)
- Configured via `/auth customize jwt` command
- Standard JWT claims: `sub`, `guildId`, `permissions`, `iat`, `exp`, `iss`, `aud`
- Validated against the guild's stored secret

---

## 🌐 Auth Validation API

The **standalone Express server** validates Bearer tokens for external services.

### Endpoints

| Endpoint        | Method | Auth Required       | Description                |
| --------------- | ------ | ------------------- | -------------------------- |
| `/health`       | GET    | No                  | Health check               |
| `/`             | GET    | No                  | API documentation          |
| `/validate`     | POST   | Bearer token        | Validate JWT or API key    |
| `/keys/:prefix` | GET    | Admin-level API key | Get API key info by prefix |

### Rate Limiting

- **Per IP**: 100 requests/minute (in-memory)
- **Per API Key**: Configurable per key (database-backed, default 60 req/min)

---

## 🔌 Integration Examples

### JavaScript / TypeScript (Node.js)

```javascript
// Using an API Key
const response = await fetch("http://localhost:4000/validate", {
  method: "POST",
  headers: {
    Authorization: "Bearer rgx_abcdef1234567890abcdef1234567890",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    endpoint: "/api/messages",
  }),
});

const data = await response.json();
console.log(data);
// {
//   valid: true,
//   type: "api_key",
//   payload: {
//     keyId: "uuid",
//     name: "My Key",
//     ownerId: "discord_user_id",
//     guildId: "discord_guild_id",
//     permissions: "read"
//   },
//   rateLimit: {
//     remaining: 59,
//     limit: 60,
//     windowMs: 60000
//   }
// }
```

```javascript
// Using a JWT
const response = await fetch("http://localhost:4000/validate", {
  method: "POST",
  headers: {
    Authorization: "Bearer eyJhbGciOiJIUzI1NiIs...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    guildId: "123456789012345678",
    endpoint: "/api/webhook",
  }),
});

const data = await response.json();
console.log(data);
// {
//   valid: true,
//   type: "jwt",
//   payload: {
//     userId: "discord_user_id",
//     guildId: "discord_guild_id",
//     permissions: "read",
//     issuedAt: "2024-01-01T00:00:00.000Z",
//     expiresAt: "2024-01-02T00:00:00.000Z"
//   }
// }
```

### Python

```python
import requests

# Validate an API key
response = requests.post(
    'http://localhost:4000/validate',
    headers={
        'Authorization': 'Bearer rgx_abcdef1234567890abcdef1234567890',
        'Content-Type': 'application/json'
    },
    json={'endpoint': '/api/bot/data'}
)

data = response.json()
if data.get('valid'):
    print(f"✅ Authenticated as: {data['payload']['name']}")
    print(f"   Permissions: {data['payload']['permissions']}")
    if 'rateLimit' in data:
        print(f"   Rate limit remaining: {data['rateLimit']['remaining']}")
else:
    print(f"❌ Authentication failed: {data.get('error')}")
```

```python
# Validate a JWT
response = requests.post(
    'http://localhost:4000/validate',
    headers={
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...',
        'Content-Type': 'application/json'
    },
    json={
        'guildId': '123456789012345678',
        'endpoint': '/api/webhook'
    }
)

data = response.json()
if data.get('valid'):
    print(f"✅ JWT valid for user: {data['payload']['userId']}")
    print(f"   Expires: {data['payload']['expiresAt']}")
```

### C#

```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;

var client = new HttpClient();
var payload = JsonSerializer.Serialize(new
{
    guildId = "123456789012345678",
    endpoint = "/api/messages"
});

var request = new HttpRequestMessage(HttpMethod.Post, "http://localhost:4000/validate")
{
    Content = new StringContent(payload, Encoding.UTF8, "application/json")
};
request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
    "Bearer", "rgx_abcdef1234567890abcdef1234567890"
);

var response = await client.SendAsync(request);
var json = await response.Content.ReadAsStringAsync();
var data = JsonSerializer.Deserialize<JsonElement>(json);

if (data.GetProperty("valid").GetBoolean())
{
    var type = data.GetProperty("type").GetString();
    var perms = data.GetProperty("payload").GetProperty("permissions").GetString();
    Console.WriteLine($"✅ Authenticated via {type}, permissions: {perms}");
}
else
{
    var error = data.GetProperty("error").GetString();
    Console.WriteLine($"❌ Authentication failed: {error}");
}
```

### Discord Bot (Generating a Token)

```javascript
// src/services/my-service.ts
import { generateToken } from "./lib/jwt";

async function authenticateUser(guildId, userId) {
  const result = await generateToken(guildId, userId, "read");
  if (result.success) {
    console.log(`Token: ${result.token}`);
    // Send this token to your external service
  }
}
```

---

## 🔧 Development

### Prerequisites

- [Bun](https://bun.sh) v1.x
- [Neon PostgreSQL](https://neon.tech) account (free tier works)
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))
- OpenRouter API Key ([OpenRouter](https://openrouter.ai))

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/regix-badword-blocker.git
cd regix-badword-blocker

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
bun run db:generate

# Push schema to database
bun run db:push

# Start the bot
bun run start
```

### Environment Variables

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

### Scripts

| Script                | Description                  |
| --------------------- | ---------------------------- |
| `bun run start`       | Start the Discord bot        |
| `bun run dev`         | Start bot in watch mode      |
| `bun run auth-server` | Start auth validation server |
| `bun run db:generate` | Generate Prisma client       |
| `bun run db:push`     | Push schema to database      |
| `bun run db:migrate`  | Run Prisma migrations        |
| `bun run db:studio`   | Open Prisma Studio (GUI)     |

---

## 🤖 How Moderation Works

1. **Message received** → Bot checks if user/channel is bypassed
2. **Local word-list check** → Fast regex matching against known bad words
3. **AI check** (if enabled) → Sends message to OpenRouter for contextual analysis
4. **Word discovery** → AI identifies new bad words and automatically adds them
5. **Penalty enforcement** → Strike count incremented, timeout applied, auto-ban at max strikes

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>REGIX Studio</strong> — <em>GOD MODE Active</em> 💀
</p>
