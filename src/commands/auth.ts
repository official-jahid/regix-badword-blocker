import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { createApiKey, listApiKeys, revokeApiKey } from "../lib/apiKey";
import { getJwtConfig, logAudit, upsertJwtConfig } from "../lib/tokenService";
import type { HybridCommand } from "../types";

const command: HybridCommand = {
  name: "auth",
  description: "Manage API keys and JWT authentication configuration.",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  options: [
    {
      name: "generate",
      description:
        "Generate a new API key for external service authentication.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "name",
          description: "A human-readable name for this API key.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "description",
          description: "Optional description for this API key.",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "permissions",
          description: "Key permissions (read, write, admin). Default: read.",
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: "Read", value: "read" },
            { name: "Write", value: "write" },
            { name: "Admin", value: "admin" },
          ],
        },
        {
          name: "rate-limit",
          description: "Max requests per minute. Default: 60.",
          type: ApplicationCommandOptionType.Integer,
          required: false,
        },
      ],
    },
    {
      name: "reset",
      description: "Revoke an API key by its ID.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "key-id",
          description: "The ID of the API key to revoke.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "get",
      description: "List all your API keys or get details on a specific one.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "key-id",
          description: "Optional: Get details on a specific key by ID.",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: "customize",
      description: "Configure JWT settings for this guild.",
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: "jwt",
          description: "Configure JWT signing settings.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "secret",
              description:
                "JWT signing secret (min 32 chars). Leave empty to keep current.",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
            {
              name: "expires-in",
              description:
                "Token expiration (e.g., 24h, 7d, 30m). Default: 24h.",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
            {
              name: "issuer",
              description: "JWT issuer claim. Default: regix-auth.",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
            {
              name: "audience",
              description: "Optional JWT audience claim.",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
          ],
        },
        {
          name: "view",
          description: "View current JWT configuration.",
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    },
  ],

  async execute(context) {
    const { interaction, reply } = context;
    if (!interaction) return;

    const subcommandGroup = interaction.options.getSubcommandGroup();
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
    if (!subcommandGroup && subcommand === "generate") {
      const name = interaction.options.getString("name", true);
      const description =
        interaction.options.getString("description") ?? undefined;
      const permissions =
        interaction.options.getString("permissions") ?? "read";
      const rateLimit = interaction.options.getInteger("rate-limit") ?? 60;

      const result = await createApiKey({
        name,
        ownerId: userId,
        guildId,
        description,
        permissions,
        rateLimit,
        rateLimitWindow: 60000,
      });

      if (!result.success || !result.key) {
        await reply({
          content: `❌ Failed to generate API key: ${result.error}`,
          ephemeral: true,
        });
        return;
      }

      await logAudit({
        action: "api_key.created",
        actorId: userId,
        targetId: result.keyPrefix,
        details: JSON.stringify({ name, permissions }),
        ip: "discord",
      });

      const embed = new EmbedBuilder()
        .setTitle("🔑 API Key Generated")
        .setDescription(
          "⚠️ **This key will only be shown once!** Copy it now and store it securely.",
        )
        .setColor("Green")
        .addFields(
          { name: "Key", value: `\`${result.key}\``, inline: false },
          { name: "Prefix", value: `\`${result.keyPrefix}\``, inline: true },
          { name: "Name", value: name, inline: true },
          { name: "Permissions", value: permissions, inline: true },
          { name: "Rate Limit", value: `${rateLimit} req/min`, inline: true },
        )
        .setFooter({ text: "REGIX Studio • GOD MODE" })
        .setTimestamp();

      await reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ── /auth reset ───────────────────────────────────────────────────────
    if (!subcommandGroup && subcommand === "reset") {
      const keyId = interaction.options.getString("key-id", true);

      const success = await revokeApiKey(keyId);

      if (!success) {
        await reply({
          content: "❌ Failed to revoke API key. Check the ID and try again.",
          ephemeral: true,
        });
        return;
      }

      await logAudit({
        action: "api_key.revoked",
        actorId: userId,
        targetId: keyId,
        ip: "discord",
      });

      await reply({
        content: `✅ API key \`${keyId}\` has been revoked and is no longer active.`,
        ephemeral: true,
      });
      return;
    }

    // ── /auth get ─────────────────────────────────────────────────────────
    if (!subcommandGroup && subcommand === "get") {
      const keyId = interaction.options.getString("key-id");

      const keys = await listApiKeys(userId);

      if (keys.length === 0) {
        await reply({
          content:
            "ℹ️ You don't have any API keys yet. Use `/auth generate` to create one.",
          ephemeral: true,
        });
        return;
      }

      // If a specific key ID was requested, show details
      if (keyId) {
        const key = keys.find((k) => k.id === keyId);
        if (!key) {
          await reply({
            content: `❌ No API key found with ID \`${keyId}\`.`,
            ephemeral: true,
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle("🔑 API Key Details")
          .setColor("Blue")
          .addFields(
            { name: "ID", value: `\`${key.id}\``, inline: false },
            { name: "Name", value: key.name, inline: true },
            { name: "Prefix", value: `\`${key.keyPrefix}\``, inline: true },
            { name: "Permissions", value: key.permissions, inline: true },
            {
              name: "Status",
              value: key.isActive ? "✅ Active" : "❌ Revoked",
              inline: true,
            },
            {
              name: "Rate Limit",
              value: `${key.rateLimit} req/${key.rateLimitWindow / 1000}s`,
              inline: true,
            },
            {
              name: "IP Whitelist",
              value: key.ipWhitelist || "None",
              inline: true,
            },
            {
              name: "Created",
              value: `<t:${Math.floor(key.createdAt.getTime() / 1000)}:R>`,
              inline: true,
            },
            {
              name: "Last Used",
              value:
                key.lastUsedAt ?
                  `<t:${Math.floor(key.lastUsedAt.getTime() / 1000)}:R>`
                : "Never",
              inline: true,
            },
          )
          .setFooter({ text: "REGIX Studio • GOD MODE" })
          .setTimestamp();

        if (key.description) {
          embed.addFields({
            name: "Description",
            value: key.description,
            inline: false,
          });
        }

        await reply({ embeds: [embed], ephemeral: true });
        return;
      }

      // List all keys
      const embed = new EmbedBuilder()
        .setTitle("🔑 Your API Keys")
        .setColor("Blue")
        .setDescription(
          keys
            .map(
              (k) =>
                `**${k.name}** (\`${k.keyPrefix}...\`) — ${k.isActive ? "✅ Active" : "❌ Revoked"} — ${k.permissions}\nID: \`${k.id}\``,
            )
            .join("\n\n"),
        )
        .setFooter({ text: `Total: ${keys.length} key(s) • REGIX Studio` })
        .setTimestamp();

      await reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ── /auth customize ───────────────────────────────────────────────────
    if (subcommandGroup === "customize") {
      // ── /auth customize jwt ─────────────────────────────────────────────
      if (subcommand === "jwt") {
        const secret = interaction.options.getString("secret");
        const expiresIn = interaction.options.getString("expires-in");
        const issuer = interaction.options.getString("issuer");
        const audience = interaction.options.getString("audience");

        // Get existing config to merge
        const existing = await getJwtConfig(guildId);

        const updateData: {
          secret: string;
          expiresIn?: string;
          issuer?: string;
          audience?: string;
        } = {
          secret:
            secret || existing?.secret || "change-me-to-a-secure-random-string",
        };

        if (secret && secret.length < 32) {
          await reply({
            content:
              "❌ JWT secret must be at least 32 characters long for security.",
            ephemeral: true,
          });
          return;
        }

        if (expiresIn) updateData.expiresIn = expiresIn;
        if (issuer) updateData.issuer = issuer;
        if (audience !== null) updateData.audience = audience;

        const result = await upsertJwtConfig(guildId, updateData);

        if (!result.success) {
          await reply({
            content: `❌ Failed to update JWT configuration: ${result.error}`,
            ephemeral: true,
          });
          return;
        }

        await logAudit({
          action: "jwt_config.updated",
          actorId: userId,
          targetId: guildId,
          details: JSON.stringify({
            expiresIn: updateData.expiresIn,
            issuer: updateData.issuer,
            audience: updateData.audience,
          }),
          ip: "discord",
        });

        await reply({
          content: "✅ JWT configuration updated successfully.",
          ephemeral: true,
        });
        return;
      }

      // ── /auth customize view ────────────────────────────────────────────
      if (subcommand === "view") {
        const config = await getJwtConfig(guildId);

        if (!config) {
          await reply({
            content:
              "ℹ️ No JWT configuration exists for this guild yet. Use `/auth customize jwt` to set one up.",
            ephemeral: true,
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle("🔐 JWT Configuration")
          .setColor("Blue")
          .addFields(
            {
              name: "Status",
              value: config.isActive ? "✅ Active" : "❌ Inactive",
              inline: true,
            },
            { name: "Expires In", value: config.expiresIn, inline: true },
            { name: "Issuer", value: config.issuer, inline: true },
            {
              name: "Audience",
              value: config.audience || "Not set",
              inline: true,
            },
            {
              name: "Rate Limit",
              value: `${config.rateLimit} req/${config.rateLimitWindow / 1000}s`,
              inline: true,
            },
            {
              name: "Created",
              value: `<t:${Math.floor(config.createdAt.getTime() / 1000)}:R>`,
              inline: true,
            },
            {
              name: "Updated",
              value: `<t:${Math.floor(config.updatedAt.getTime() / 1000)}:R>`,
              inline: true,
            },
          )
          .setFooter({ text: "REGIX Studio • GOD MODE" })
          .setTimestamp();

        await reply({ embeds: [embed], ephemeral: true });
        return;
      }
    }

    await reply({ content: "❌ Unknown subcommand.", ephemeral: true });
  },
};

export default command;
