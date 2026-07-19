# 🔥 REGIX — Discord Bot & Central Auth System

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
  <strong>REGIX</strong> is a standalone Discord moderation bot that also serves as a secure <strong>Authentication & Token Management System</strong> for your entire application ecosystem.
  <br><br>
  <em>Discord Moderation</em> ⚡ + <em>AI Detection</em> 🧠 + <em>Central Auth</em> 🔐
</p>

---

## 📋 Architecture

```mermaid
sequenceDiagram
    participant Discord as Discord Bot
    participant Neon as Neon PostgreSQL
    participant AuthAPI as Auth Validation API
    participant WebApp as Web App (JS/TS)
    participant NativeApp as Native App (C#/Python)

    Note over Discord: Admin runs /auth generate

    Discord->>Discord: Generate Secret API Key (rgx_...)
    Discord->>Discord: Generate JWT (short-lived)
    Discord->>Neon: Store hashed API key + JWT config
    Discord-->>Discord: Show credentials (ephemeral, once)

    Note over WebApp: Use JWT for web sessions
    WebApp->>AuthAPI: POST /validate<br/>Authorization: Bearer <jwt>
    AuthAPI->>Neon: Fetch JWT config by guildId
    AuthAPI->>AuthAPI: Verify JWT signature + expiry
    AuthAPI-->>WebApp: { valid: true, payload: {...} }

    Note over NativeApp: Use API Key for long-lived access
    NativeApp->>AuthAPI: POST /validate<br/>Authorization: Bearer <api_key>
    AuthAPI->>Neon: Lookup key by prefix
    AuthAPI->>Neon: Check rate limit + IP whitelist
    AuthAPI->>AuthAPI: Verify argon2 hash
    AuthAPI-->>NativeApp: { valid: true, payload: {...}, rateLimit: {...} }
```

```mermaid
graph TB
    subgraph DISCORD["Discord Bot (Bun runtime)"]
        CMD["Commands<br/>(slash + prefix)"]
        HAND["Handlers<br/>(command router)"]
        SVC["Services<br/>• moderation.ts<br/>• openRouter.ts (AI)<br/>• penalties.ts<br/>• permissions.ts"]
        AUTH_CMD["Auth Commands<br/>• /auth generate<br/>• /auth reset<br/>• /auth get<br/>• /auth customize"]
        CMD --> HAND --> SVC
        AUTH_CMD --> HAND
    end

    subgraph AUTH["Auth Service Layer (src/lib/)"]
        JWT["jwt.ts<br/>JWT gen/verify"]
        AK["apiKey.ts<br/>API key gen/hash/verify<br/>(argon2id)"]
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
        WEB["Web Applications<br/>(JS/TS, React, etc.)"]
        NATIVE["Native Applications<br/>(C#, Python, etc.)"]
    end

    SVC -- "AI check" --> OR
    SVC -- "local check" --> JSON[(JSON files)]
    DISCORD <--> AUTH
    PRISMA --> DB
    AUTHAPI -- "validates tokens" --> AUTH
    AUTHAPI -- "rate limit check" --> DB
    WEB -- "Bearer JWT" --> AUTHAPI
    NATIVE -- "Bearer API Key" --> AUTHAPI
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
| **Auth Tokens**    | JWT (jsonwebtoken), API Keys (argon2id)  |
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
│   ├── auth-server.ts         # Express auth validation server (port 4000)
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
├── data/                      # JSON data files (legacy, moderation data)
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
| `/auth generate`                    | Slash + Prefix | Admin+ | Generate API Key + JWT (ephemeral)        |
| `/auth reset`                       | Slash + Prefix | Admin+ | Revoke all keys, issue fresh set          |
| `/auth get`                         | Slash + Prefix | Admin+ | View active keys, JWT config, rate limits |
| `/auth customize`                   | Slash + Prefix | Admin+ | Set rate limits, IP whitelist             |

> **⚠️ Security:** All command responses containing tokens or keys are strictly **ephemeral** — only the user who ran the command can see the sensitive data.

---

## 🗄️ Database Schema

### ApiKey

Stores hashed API keys for external service authentication.

| Field             | Type      | Description                           |
| ----------------- | --------- | ------------------------------------- |
| `keyPrefix`       | String    | First 8 chars of the key for lookup   |
| `keyHash`         | String    | Argon2id hash of the full API key     |
| `name`            | String    | Human-readable name                   |
| `ownerId`         | String    | Discord user ID of the key owner      |
| `guildId`         | String?   | Discord guild ID (optional)           |
| `rateLimit`       | Int       | Max requests per window (default: 60) |
| `rateLimitWindow` | Int       | Window in ms (default: 60000 = 1 min) |
| `ipWhitelist`     | String    | Comma-separated IPs or CIDR ranges    |
| `permissions`     | String    | `read`, `write`, or `admin`           |
| `isActive`        | Boolean   | Whether the key is active             |
| `lastUsedAt`      | DateTime? | Last validation timestamp             |
| `expiresAt`       | DateTime? | Key expiration (null = long-lived)    |

### JwtConfig

Guild-specific JWT signing configuration.

| Field             | Type    | Description                          |
| ----------------- | ------- | ------------------------------------ |
| `guildId`         | String  | Unique per Discord guild             |
| `secret`          | String  | JWT signing secret                   |
| `expiresIn`       | String  | Token expiration (e.g., `24h`, `7d`) |
| `issuer`          | String  | JWT issuer claim                     |
| `audience`        | String? | Optional audience claim              |
| `rateLimit`       | Int     | Max validations per window           |
| `rateLimitWindow` | Int     | Window in ms                         |

### RateLimitLog

Tracks rate limit hits for monitoring.

| Field       | Type     | Description            |
| ----------- | -------- | ---------------------- |
| `keyId`     | String?  | FK to ApiKey           |
| `ip`        | String   | Client IP              |
| `endpoint`  | String   | Endpoint that was hit  |
| `timestamp` | DateTime | When the limit was hit |

### AuditLog

Security audit trail for all auth actions.

| Field       | Type     | Description                 |
| ----------- | -------- | --------------------------- |
| `action`    | String   | e.g., `auth.generate`       |
| `actorId`   | String   | Discord user ID             |
| `targetId`  | String?  | Target resource ID          |
| `details`   | String?  | JSON string with extra info |
| `ip`        | String?  | Client IP                   |
| `timestamp` | DateTime | When the action occurred    |

---

## 🔐 Auth System — Two Token Types

REGIX provides **two authentication methods** for external services:

### 1. Secret API Key (Long-Lived)

- **Purpose:** Persistent/native applications (C# WinForms, Console apps, Python scripts)
- **Format:** `rgx_<64-char-hex>` (e.g., `rgx_abcdef1234567890...`)
- **Storage:** Hashed with **argon2id** before database storage
- **Shown:** Only once on creation (ephemeral Discord response)
- **Validation:** Looked up by prefix, hash verified, rate limit + IP whitelist checked
- **Lifetime:** Configurable expiry or permanent (long-lived)

### 2. JWT Token (Short-Lived)

- **Purpose:** Web-based client-server architecture (SPAs, APIs, server-to-server)
- **Format:** Standard JWT with `sub`, `guildId`, `permissions`, `iat`, `exp`, `iss`, `aud`
- **Storage:** Guild-specific signing secret in database
- **Validation:** Signature verified against guild's stored secret
- **Lifetime:** Configurable (default: 24h)

---

## 🌐 Auth Validation API

The **standalone Express server** (port 4000) validates Bearer tokens for all external services.

### Endpoints

| Endpoint        | Method | Auth Required       | Description                |
| --------------- | ------ | ------------------- | -------------------------- |
| `/health`       | GET    | No                  | Health check               |
| `/`             | GET    | No                  | API documentation          |
| `/validate`     | POST   | Bearer token        | Validate JWT or API key    |
| `/keys/:prefix` | GET    | Admin-level API key | Get API key info by prefix |

### How to Pass Tokens

All external services must pass tokens in the HTTP `Authorization` header using the **Bearer** scheme:

```http
Authorization: Bearer <your_token_here>
```

#### For JWT validation (web apps):

```http
POST /validate HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "guildId": "123456789012345678",
  "endpoint": "/api/webhook"
}
```

#### For API Key validation (native apps):

```http
POST /validate HTTP/1.1
Host: localhost:4000
Authorization: Bearer rgx_abcdef1234567890abcdef1234567890
Content-Type: application/json

{
  "endpoint": "/api/messages"
}
```

### Rate Limiting

- **Per IP:** 100 requests/minute (in-memory)
- **Per API Key:** Configurable per key (database-backed, default 60 req/min)
- **Per JWT Config:** Configurable per guild (database-backed, default 100 req/min)

---

## 🔌 Integration Examples

### JavaScript / TypeScript (Web Application)

```typescript
// Using a JWT (short-lived, for web sessions)
async function validateJwt(jwt: string, guildId: string) {
  const response = await fetch("http://localhost:4000/validate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ guildId, endpoint: "/api/web" }),
  });

  const data = await response.json();
  if (data.valid) {
    console.log(`✅ Authenticated as user: ${data.payload.userId}`);
    console.log(`   Permissions: ${data.payload.permissions}`);
    console.log(`   Expires: ${data.payload.expiresAt}`);
    return data.payload;
  } else {
    throw new Error(`Auth failed: ${data.error}`);
  }
}

// Using an API Key (long-lived, for server-to-server)
async function validateApiKey(apiKey: string) {
  const response = await fetch("http://localhost:4000/validate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint: "/api/data" }),
  });

  const data = await response.json();
  if (data.valid) {
    console.log(`✅ Authenticated as: ${data.payload.name}`);
    console.log(`   Permissions: ${data.payload.permissions}`);
    console.log(`   Rate limit remaining: ${data.rateLimit.remaining}`);
    return data.payload;
  } else {
    throw new Error(`Auth failed: ${data.error}`);
  }
}
```

### C# (Windows Forms / Console Application)

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class RegixAuthClient
{
    private readonly HttpClient _httpClient;
    private readonly string _authServerUrl;

    public RegixAuthClient(string authServerUrl = "http://localhost:4000")
    {
        _httpClient = new HttpClient();
        _authServerUrl = authServerUrl;
    }

    /// <summary>
    /// Validate an API Key (long-lived, for native apps)
    /// </summary>
    public async Task<AuthResult> ValidateApiKeyAsync(string apiKey)
    {
        var payload = JsonSerializer.Serialize(new
        {
            endpoint = "/api/native-app"
        });

        var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{_authServerUrl}/validate"
        )
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

        var response = await _httpClient.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<JsonElement>(json);

        if (data.GetProperty("valid").GetBoolean())
        {
            var type = data.GetProperty("type").GetString();
            var perms = data.GetProperty("payload").GetProperty("permissions").GetString();
            var remaining = data.GetProperty("rateLimit").GetProperty("remaining").GetInt32();

            Console.WriteLine($"✅ Authenticated via {type}, permissions: {perms}");
            Console.WriteLine($"   Rate limit remaining: {remaining}");

            return new AuthResult
            {
                Valid = true,
                Type = type,
                Permissions = perms,
                RateLimitRemaining = remaining
            };
        }

        var error = data.GetProperty("error").GetString();
        Console.WriteLine($"❌ Authentication failed: {error}");
        return new AuthResult { Valid = false, Error = error };
    }

    /// <summary>
    /// Validate a JWT (short-lived, for web sessions)
    /// </summary>
    public async Task<AuthResult> ValidateJwtAsync(string jwt, string guildId)
    {
        var payload = JsonSerializer.Serialize(new
        {
            guildId,
            endpoint = "/api/native-app"
        });

        var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{_authServerUrl}/validate"
        )
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", jwt);

        var response = await _httpClient.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<JsonElement>(json);

        if (data.GetProperty("valid").GetBoolean())
        {
            var userId = data.GetProperty("payload").GetProperty("userId").GetString();
            var perms = data.GetProperty("payload").GetProperty("permissions").GetString();
            var expiresAt = data.GetProperty("payload").GetProperty("expiresAt").GetString();

            Console.WriteLine($"✅ JWT valid for user: {userId}");
            Console.WriteLine($"   Permissions: {perms}");
            Console.WriteLine($"   Expires: {expiresAt}");

            return new AuthResult
            {
                Valid = true,
                Type = "jwt",
                Permissions = perms,
                UserId = userId
            };
        }

        var error = data.GetProperty("error").GetString();
        Console.WriteLine($"❌ Authentication failed: {error}");
        return new AuthResult { Valid = false, Error = error };
    }
}

public class AuthResult
{
    public bool Valid { get; set; }
    public string? Type { get; set; }
    public string? Permissions { get; set; }
    public string? UserId { get; set; }
    public int RateLimitRemaining { get; set; }
    public string? Error { get; set; }
}

// Usage example
class Program
{
    static async Task Main()
    {
        var client = new RegixAuthClient();

        // Validate an API Key
        var apiKeyResult = await client.ValidateApiKeyAsync(
            "rgx_abcdef1234567890abcdef1234567890"
        );

        // Validate a JWT
        var jwtResult = await client.ValidateJwtAsync(
            "eyJhbGciOiJIUzI1NiIs...",
            "123456789012345678"
        );
    }
}
```

### Python (Scripts / Applications)

```python
import requests
from typing import Optional, Dict, Any


class RegixAuthClient:
    """Client for REGIX Auth Validation Server"""

    def __init__(self, auth_server_url: str = "http://localhost:4000"):
        self.auth_server_url = auth_server_url

    def validate_api_key(self, api_key: str) -> Dict[str, Any]:
        """
        Validate a long-lived Secret API Key.
        Use this for Python scripts, bots, and native applications.
        """
        response = requests.post(
            f"{self.auth_server_url}/validate",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={"endpoint": "/api/python-app"},
        )

        data = response.json()

        if data.get("valid"):
            print(f"✅ Authenticated as: {data['payload']['name']}")
            print(f"   Permissions: {data['payload']['permissions']}")
            print(f"   Rate limit remaining: {data['rateLimit']['remaining']}")
            return data["payload"]
        else:
            raise PermissionError(f"Auth failed: {data.get('error')}")

    def validate_jwt(self, jwt: str, guild_id: str) -> Dict[str, Any]:
        """
        Validate a short-lived JWT.
        Use this for web session validation.
        """
        response = requests.post(
            f"{self.auth_server_url}/validate",
            headers={
                "Authorization": f"Bearer {jwt}",
                "Content-Type": "application/json",
            },
            json={"guildId": guild_id, "endpoint": "/api/python-web"},
        )

        data = response.json()

        if data.get("valid"):
            print(f"✅ JWT valid for user: {data['payload']['userId']}")
            print(f"   Permissions: {data['payload']['permissions']}")
            print(f"   Expires: {data['payload']['expiresAt']}")
            return data["payload"]
        else:
            raise PermissionError(f"Auth failed: {data.get('error')}")


# Usage
client = RegixAuthClient()

# Validate an API Key
try:
    payload = client.validate_api_key("rgx_abcdef1234567890abcdef1234567890")
    print(f"Welcome {payload['name']}!")
except PermissionError as e:
    print(f"Access denied: {e}")

# Validate a JWT
try:
    payload = client.validate_jwt(
        "eyJhbGciOiJIUzI1NiIs...",
        "123456789012345678"
    )
    print(f"User {payload['userId']} authenticated!")
except PermissionError as e:
    print(f"Access denied: {e}")
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

| Script                    | Description                     |
| ------------------------- | ------------------------------- |
| `bun run start`           | Start the Discord bot           |
| `bun run dev`             | Start bot in watch mode         |
| `bun run auth-server`     | Start auth validation server    |
| `bun run auth-server:dev` | Start auth server in watch mode |
| `bun run db:generate`     | Generate Prisma client          |
| `bun run db:push`         | Push schema to database         |
| `bun run db:migrate`      | Run Prisma migrations           |
| `bun run db:studio`       | Open Prisma Studio (GUI)        |

---

## 🤖 How Moderation Works

1. **Message received** → Bot checks if user/channel is bypassed
2. **Local word-list check** → Fast regex matching against known bad words
3. **AI check** (if enabled) → Sends message to OpenRouter for contextual analysis
4. **Word discovery** → AI identifies new bad words and automatically adds them
5. **Penalty enforcement** → Strike count incremented, timeout applied, auto-ban at max strikes

---

## 🔐 How Auth Works (End-to-End Flow)

1. **Admin runs `/auth generate`** in Discord
2. Bot generates a **Secret API Key** (argon2id hashed, stored in Neon) and a **JWT** (signed with guild-specific secret)
3. Both tokens are displayed **once** in an ephemeral Discord message
4. **External applications** use these tokens in `Authorization: Bearer <token>` headers
5. The **Auth Validation Server** (Express, port 4000) validates tokens against the database
6. For API Keys: prefix lookup → hash verification → rate limit check → IP whitelist check
7. For JWTs: guild config lookup → signature verification → expiry check
8. Successful validation returns the token payload with permissions, rate limits, and metadata

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>REGIX Studio</strong> — <em>GOD MODE Active</em> 💀
</p>
