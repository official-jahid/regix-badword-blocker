import { randomBytes } from "crypto";
import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { createApiKey, listApiKeys, revokeApiKey } from "../lib/apiKey";
import { generateToken } from "../lib/jwt";
import {
  getJwtConfig,
  logAudit,
  updateApiKey,
  upsertJwtConfig,
} from "../lib/tokenService";
import type { HybridCommand } from "../types";

const command: HybridCommand = {
  name: "auth",
  description: "Manage API keys, JWT tokens, and authentication configuration.",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  options: [
    {
      name: "generate",
      description: "Generate a new Secret API key and corresponding JWT token.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "name",
          description: "A human-readable name for this API key.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "expires-in",
          description: "Token expiration (e.g., 24h, 7d, 30m). Default: 24h.",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "scopes",
          description:
            "Permission scopes (comma-separated). Default: read. Options: read, write, admin",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: "reset",
      description:
        "Revoke your current API key and JWT, then issue a fresh set.",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "get",
      description:
        "Securely display your active API key, JWT, rate limits, and remaining validity.",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "customize",
      description:
        "Customize security constraints for your tokens (rate limits, IP whitelist).",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "rate-limit",
          description: "Max requests per minute. Default: 60.",
          type: ApplicationCommandOptionType.Integer,
          required: false,
        },
        {
          name: "ip-whitelist",
          description:
            "Comma-separated IP addresses to whitelist. Leave empty to allow all.",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
  ],

  async execute(context) {
    const { interaction, reply } = context;
    if (!interaction) return;

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (!guildId) {
      await reply({
        content: "❌ This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    // ── /auth generate ────────────────────────────────────────────────────
    if (subcommand === "generate") {
      const name = interaction.options.getString("name", true);
      const expiresIn = interaction.options.getString("expires-in") ?? "24h";
      const scopes = interaction.options.getString("scopes") ?? "read";

      // Validate scopes
      const validScopes = ["read", "write", "admin"];
      const requestedScopes = scopes
        .split(",")
        .map((s) => s.trim().toLowerCase());
      const invalidScopes = requestedScopes.filter(
        (s) => !validScopes.includes(s),
      );
      if (invalidScopes.length > 0) {
        await reply({
          content: `❌ Invalid scope(s): ${invalidScopes.join(", ")}. Valid scopes: read, write, admin.`,
          ephemeral: true,
        });
        return;
      }

      // Use the primary scope for permissions
      const primaryScope = requestedScopes[0] ?? "read";

      // Step 1: Generate API Key
      const keyResult = await createApiKey({
        name,
        ownerId: userId,
        guildId,
        description: `Scopes: ${scopes}`,
        permissions: primaryScope,
        rateLimit: 60,
        rateLimitWindow: 60000,
      });

      if (!keyResult.success || !keyResult.key) {
        await reply({
          content: `❌ Failed to generate API key: ${keyResult.error}`,
          ephemeral: true,
        });
        return;
      }

      // Step 2: Ensure JWT config exists, then generate JWT
      const jwtConfig = await getJwtConfig(guildId);
      let jwtResult;
      if (!jwtConfig) {
        // Create a default JWT config for this guild
        const defaultSecret = `rgx-jwt-${randomBytes(32).toString("hex")}`;
        await upsertJwtConfig(guildId, {
          secret: defaultSecret,
          expiresIn,
          issuer: "regix-auth",
          audience: guildId,
        });
        jwtResult = await generateToken(guildId, userId, primaryScope);
      } else {
        jwtResult = await generateToken(guildId, userId, primaryScope);
      }

      if (!jwtResult.success || !jwtResult.token) {
        await reply({
          content: `❌ API key created but JWT generation failed: ${jwtResult.error}. Use \`/auth customize\` to set up JWT first.`,
          ephemeral: true,
        });
        return;
      }

      await logAudit({
        action: "auth.generate",
        actorId: userId,
        targetId: keyResult.keyPrefix,
        details: JSON.stringify({ name, scopes, expiresIn }),
        ip: "discord",
      });

      const embed = new EmbedBuilder()
        .setTitle("🔑 Tokens Generated Successfully")
        .setDescription(
          "⚠️ **These credentials will only be shown once!** Copy them now and store them securely.\n\n" +
            "**How to use:**\n" +
            "```\n" +
            "Authorization: Bearer <your_token>\n" +
            "```\n" +
            "Use the **API Key** for long-lived native apps (C#, Python, etc.).\n" +
            "Use the **JWT** for short-lived web sessions.",
        )
        .setColor("Green")
        .addFields(
          {
            name: "━━━ 🔑 Secret API Key (Long-Lived) ━━━",
            value: `\`\`\`\n${keyResult.key}\n\`\`\``,
            inline: false,
          },
          {
            name: "Prefix",
            value: `\`${keyResult.keyPrefix}\``,
            inline: true,
          },
          { name: "Name", value: name, inline: true },
          { name: "Scopes", value: scopes, inline: true },
          {
            name: "━━━ 🔐 JWT Token (Short-Lived) ━━━",
            value: `\`\`\`\n${jwtResult.token}\n\`\`\``,
            inline: false,
          },
          {
            name: "Expires In",
            value: expiresIn,
            inline: true,
          },
          {
            name: "Rate Limit",
            value: "60 req/min",
            inline: true,
          },
        )
        .setFooter({ text: "REGIX Studio • Auth System" })
        .setTimestamp();

      await reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ── /auth reset ───────────────────────────────────────────────────────
    if (subcommand === "reset") {
      // Find all active keys for this user
      const userKeys = await listApiKeys(userId);
      const activeKeys = userKeys.filter((k) => k.isActive);

      if (activeKeys.length === 0) {
        await reply({
          content: "ℹ️ You don't have any active API keys to revoke.",
          ephemeral: true,
        });
        return;
      }

      // Revoke all active keys
      let revokedCount = 0;
      for (const key of activeKeys) {
        const success = await revokeApiKey(key.id);
        if (success) revokedCount++;
      }

      // Generate fresh set
      const freshKeyResult = await createApiKey({
        name: `${interaction.user.username}-key-${Date.now()}`,
        ownerId: userId,
        guildId,
        description: "Auto-generated after reset",
        permissions: "read",
        rateLimit: 60,
        rateLimitWindow: 60000,
      });

      if (!freshKeyResult.success || !freshKeyResult.key) {
        await reply({
          content: `✅ Revoked ${revokedCount} key(s), but failed to generate new key: ${freshKeyResult.error}`,
          ephemeral: true,
        });
        return;
      }

      // Generate fresh JWT
      const jwtConfig = await getJwtConfig(guildId);
      let freshJwtResult;
      if (jwtConfig) {
        freshJwtResult = await generateToken(guildId, userId, "read");
      }

      await logAudit({
        action: "auth.reset",
        actorId: userId,
        targetId: freshKeyResult.keyPrefix,
        details: JSON.stringify({
          revokedCount,
          newKeyPrefix: freshKeyResult.keyPrefix,
        }),
        ip: "discord",
      });

      const embed = new EmbedBuilder()
        .setTitle("🔄 Tokens Reset Successfully")
        .setDescription(
          `✅ Revoked ${revokedCount} old key(s).\n` +
            "⚠️ **New credentials shown below — copy them now!**\n\n" +
            "**How to use:**\n" +
            "```\n" +
            "Authorization: Bearer <your_token>\n" +
            "```",
        )
        .setColor("Blue")
        .addFields(
          {
            name: "━━━ 🔑 New API Key ━━━",
            value: `\`\`\`\n${freshKeyResult.key}\n\`\`\``,
            inline: false,
          },
          {
            name: "Prefix",
            value: `\`${freshKeyResult.keyPrefix}\``,
            inline: true,
          },
          { name: "Rate Limit", value: "60 req/min", inline: true },
          ...(freshJwtResult?.token ?
            [
              {
                name: "━━━ 🔐 New JWT ━━━" as const,
                value: `\`\`\`\n${freshJwtResult.token}\n\`\`\``,
                inline: false,
              },
            ]
          : []),
        )
        .setFooter({ text: "REGIX Studio • Auth System" })
        .setTimestamp();

      await reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ── /auth get ─────────────────────────────────────────────────────────
    if (subcommand === "get") {
      const keys = await listApiKeys(userId);
      const activeKeys = keys.filter((k) => k.isActive);

      if (activeKeys.length === 0) {
        await reply({
          content:
            "ℹ️ You don't have any active API keys. Use `/auth generate` to create one.",
          ephemeral: true,
        });
        return;
      }

      // Get JWT config for this guild
      const jwtConfig = await getJwtConfig(guildId);

      const embed = new EmbedBuilder()
        .setTitle("🔐 Your Auth Credentials")
        .setDescription(
          "Below is a summary of your active authentication credentials and their current status.",
        )
        .setColor("Blue")
        .addFields(
          {
            name: "━━━ 🔑 Active API Keys ━━━",
            value: activeKeys
              .map(
                (k) =>
                  `**${k.name}** (\`${k.keyPrefix}...\`)\n` +
                  `• Permissions: \`${k.permissions}\`\n` +
                  `• Rate Limit: ${k.rateLimit} req/min\n` +
                  `• IP Whitelist: ${k.ipWhitelist || "None (all IPs allowed)"}\n` +
                  `• Created: <t:${Math.floor(k.createdAt.getTime() / 1000)}:R>\n` +
                  `• Last Used: ${k.lastUsedAt ? `<t:${Math.floor(k.lastUsedAt.getTime() / 1000)}:R>` : "Never"}\n` +
                  `• Expires: ${k.expiresAt ? `<t:${Math.floor(k.expiresAt.getTime() / 1000)}:R>` : "Never (long-lived)"}`,
              )
              .join("\n\n"),
            inline: false,
          },
          ...(jwtConfig ?
            [
              {
                name: "━━━ 🔐 JWT Configuration ━━━" as const,
                value:
                  `• Status: ${jwtConfig.isActive ? "✅ Active" : "❌ Inactive"}\n` +
                  `• Expires In: \`${jwtConfig.expiresIn}\`\n` +
                  `• Issuer: \`${jwtConfig.issuer}\`\n` +
                  `• Audience: \`${jwtConfig.audience || "Not set"}\`\n` +
                  `• Validation Rate Limit: ${jwtConfig.rateLimit} req/${jwtConfig.rateLimitWindow / 1000}s`,
                inline: false,
              },
            ]
          : []),
        )
        .setFooter({ text: "REGIX Studio • Auth System" })
        .setTimestamp();

      await reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ── /auth customize ───────────────────────────────────────────────────
    if (subcommand === "customize") {
      const rateLimit = interaction.options.getInteger("rate-limit");
      const ipWhitelist = interaction.options.getString("ip-whitelist");

      if (!rateLimit && ipWhitelist === null) {
        await reply({
          content:
            "ℹ️ Please specify at least one option to customize: `rate-limit` or `ip-whitelist`.",
          ephemeral: true,
        });
        return;
      }

      // Update the most recently created active key
      const keys = await listApiKeys(userId);
      const latestActiveKey = keys.find((k) => k.isActive);

      if (!latestActiveKey) {
        await reply({
          content:
            "❌ No active API key found. Use `/auth generate` to create one first.",
          ephemeral: true,
        });
        return;
      }

      const updateData: {
        rateLimit?: number;
        ipWhitelist?: string;
      } = {};

      if (rateLimit !== null && rateLimit !== undefined) {
        if (rateLimit < 1 || rateLimit > 10000) {
          await reply({
            content:
              "❌ Rate limit must be between 1 and 10,000 requests per minute.",
            ephemeral: true,
          });
          return;
        }
        updateData.rateLimit = rateLimit;
      }

      if (ipWhitelist !== null && ipWhitelist !== undefined) {
        if (ipWhitelist.trim() === "") {
          updateData.ipWhitelist = "";
        } else {
          // Validate IP format (basic check)
          const ips = ipWhitelist
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const ipRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(\/\d{1,2})?$/;
          const invalidIps = ips.filter((ip) => !ipRegex.test(ip));
          if (invalidIps.length > 0) {
            await reply({
              content: `❌ Invalid IP(s): ${invalidIps.join(", ")}. Use valid IPv4 addresses or CIDR notation (e.g., 192.168.1.1 or 10.0.0.0/24).`,
              ephemeral: true,
            });
            return;
          }
          updateData.ipWhitelist = ips.join(",");
        }
      }

      const result = await updateApiKey(latestActiveKey.id, updateData);

      if (!result.success) {
        await reply({
          content: `❌ Failed to update configuration: ${result.error}`,
          ephemeral: true,
        });
        return;
      }

      await logAudit({
        action: "auth.customize",
        actorId: userId,
        targetId: latestActiveKey.id,
        details: JSON.stringify(updateData),
        ip: "discord",
      });

      const changes = [];
      if (updateData.rateLimit !== undefined)
        changes.push(`• Rate Limit → ${updateData.rateLimit} req/min`);
      if (updateData.ipWhitelist !== undefined)
        changes.push(
          `• IP Whitelist → ${updateData.ipWhitelist || "All IPs allowed (disabled)"}`,
        );

      await reply({
        content:
          `✅ Security configuration updated successfully!\n\n` +
          changes.join("\n"),
        ephemeral: true,
      });
      return;
    }

    await reply({ content: "❌ Unknown subcommand.", ephemeral: true });
  },
};

export default command;
