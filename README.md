# REGIX Bad Word Blocker — GOD MODE

> **Advanced Discord Moderation Bot** built with [Bun](https://bun.sh) + [TypeScript](https://www.typescriptlang.org/) + [discord.js v14](https://discord.js.org/)

A powerful, dual-pipeline moderation bot that scans messages using both a local bad-word list and an AI-powered moderation layer via OpenRouter. Automatically issues strikes, timeouts, and bans based on configurable thresholds.

---

## Features

- **Dual Moderation Pipeline**
  - **Local filter** — Regex-based matching against a configurable bad-word list with whitelist support
  - **AI filter** — OpenRouter-powered semantic analysis for context-aware moderation
- **Strike System** — Configurable max strikes; automatic timeout escalation and ban on limit reached
- **Slash & Prefix Commands** — Hybrid command system supporting both `!` prefix and Discord slash commands
- **Role-Based Authorization** — Granular access control via Owner, Admin, and Mod roles
- **Configurable Embeds** — Fully customizable DM warnings, log messages, terms & conditions, and strike notifications
- **Persistent Storage** — JSON-based data store for words, permissions, violations, and bot configuration
- **Ignored Channels & Allowed Users** — Bypass moderation for specific channels or users

---

## Prerequisites

- [Bun](https://bun.sh) v1.1+
- A [Discord Application](https://discord.com/developers/applications) with Bot token
- An [OpenRouter](https://openrouter.ai/) API key (for AI moderation)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/regix-badword-blocker.git
cd regix-badword-blocker

# Install dependencies
bun install
```

---

## Configuration

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

### Environment Variables

| Variable             | Description                                 | Required |
| -------------------- | ------------------------------------------- | -------- |
| `TOKEN`              | Discord bot token                           | ✅       |
| `CLIENT_ID`          | Discord application ID                      | ✅       |
| `GUILD_ID`           | Guild ID (for instant slash command deploy) | ❌       |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI moderation        | ❌       |
| `PREFIX`             | Bot command prefix (default: `!`)           | ❌       |
| `OWNER_ID`           | Discord user ID of the bot owner            | ❌       |
| `OWNER_ROLE_ID`      | Role ID with owner-level access             | ❌       |
| `MOD_ROLE_ID`        | Role ID with moderator access               | ❌       |
| `ADMIN_ROLE_ID`      | Role ID with admin access                   | ❌       |
| `LOG_CHANNEL_ID`     | Channel ID for moderation action logs       | ❌       |

### Data Files

The bot stores its configuration and data in the `data/` directory:

| File                    | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `data/words.json`       | Bad words list and whitelist              |
| `data/config.json`      | Bot behavior settings and embed templates |
| `data/permissions.json` | Ignored channels and allowed users        |
| `data/violations.json`  | Per-user strike counts                    |

---

## Usage

### Development

```bash
bun run dev
```

Starts the bot with file watching (auto-restart on changes).

### Production

```bash
bun run start
```

### Build

```bash
bun run build
```

Compiles the bot to a standalone executable in `dist/`.

---

## Commands

| Command     | Description                               | Access    |
| ----------- | ----------------------------------------- | --------- |
| `!help`     | Show available commands                   | All roles |
| `!strikes`  | Check strike count for a user             | Mod+      |
| `!reset`    | Reset strikes for a user                  | Admin+    |
| `!manage`   | Add/remove bad words or whitelist entries | Admin+    |
| `!settings` | View or update bot configuration          | Owner     |

All commands are also available as Discord slash commands.

---

## Moderation Pipeline

1. **Message received** — Bot checks if the author is a bot or in an ignored channel
2. **Prefix command check** — If the message starts with the configured prefix, it's handled as a command
3. **Local filter** — Message content is checked against the bad-word list (with whitelist exclusions)
4. **AI filter** — If OpenRouter is configured, the message is analyzed for context-aware moderation
5. **Penalty application** — If flagged, the message is deleted and a strike is issued
6. **Escalation** — At `maxStrikes` strikes, the user is banned; otherwise they receive a timeout

---

## Project Structure

```
regix-badword-blocker/
├── data/                    # Persistent JSON storage
│   ├── config.json          # Bot configuration & embed templates
│   ├── permissions.json     # Ignored channels & allowed users
│   ├── violations.json      # User strike counts
│   └── words.json           # Bad words & whitelist
├── src/
│   ├── index.ts             # Entry point & client setup
│   ├── types.ts             # TypeScript type definitions
│   ├── commands/            # Command implementations
│   │   ├── help.ts
│   │   ├── manage.ts
│   │   ├── reset.ts
│   │   ├── settings.ts
│   │   └── strikes.ts
│   ├── handlers/
│   │   └── commandHandler.ts # Prefix & slash command routing
│   └── services/
│       ├── moderation.ts    # Dual pipeline (local + AI) moderation
│       ├── openRouter.ts    # OpenRouter AI client
│       ├── penalties.ts     # Strike, timeout & ban logic
│       ├── permissions.ts   # Authorization & terms embeds
│       └── storage.ts       # JSON file read/write utilities
├── .env.example             # Environment variable template
├── .gitignore
├── bun.lock                 # Bun lockfile
├── package.json
├── tsconfig.json
└── README.md
```

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Disclaimer

REGIX GOD MODE is a private moderation system. Only authorized server staff members are permitted to use bot commands. Message content is scanned for moderation purposes only. Violation data is stored locally as strike counts.
