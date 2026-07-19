import {
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Partials,
} from "discord.js";
import {
  deploySlashCommands,
  handlePrefixCommand,
  handleSlashCommand,
  registerCommands,
} from "./handlers/commandHandler";
import { initJsonDb } from "./lib/jsonDb";
import { runPipeline } from "./services/moderation";
import { applyPenalty, getFlagReason } from "./services/penalties";
import { buildTermsEmbed, isCommandAuthorized } from "./services/permissions";
import type { BotConfig } from "./types";

import authCommand from "./commands/auth";
import helpCommand from "./commands/help";
import manageCommand from "./commands/manage";
import resetCommand from "./commands/reset";
import settingsCommand from "./commands/settings";
import strikesCommand from "./commands/strikes";

const config: BotConfig = {
  token: process.env.TOKEN ?? "",
  clientId: process.env.CLIENT_ID ?? "",
  guildId: process.env.GUILD_ID ?? "",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  prefix: process.env.PREFIX ?? "!",
  ownerId: process.env.OWNER_ID ?? "",
  ownerRoleId: process.env.OWNER_ROLE_ID ?? "",
  modRoleId: process.env.MOD_ROLE_ID ?? "",
  adminRoleId: process.env.ADMIN_ROLE_ID ?? "",
  logChannelId: process.env.LOG_CHANNEL_ID ?? "",
};

if (!config.token) {
  console.error("[FATAL] Missing TOKEN");
  process.exit(1);
}
if (!config.clientId) {
  console.error("[FATAL] Missing CLIENT_ID");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

registerCommands([
  authCommand,
  helpCommand,
  strikesCommand,
  resetCommand,
  manageCommand,
  settingsCommand,
]);

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`💀 REGIX GOD MODE v2.0 READY — ${readyClient.user.tag}`);

  // Initialize JSON database for auth
  try {
    await initJsonDb();
    console.log("[Bot] Auth data store ready");
  } catch (err) {
    console.error("[Bot] Failed to initialize auth data store:", err);
  }

  await deploySlashCommands(config);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  const handled = await handlePrefixCommand(message, config);
  if (handled) return;
  try {
    const result = await runPipeline(
      message.content,
      message.author.id,
      message.channelId,
      config,
    );
    if (!result.flagged) return;
    if (!message.member) return;
    if (!message.channel || !message.channel.isTextBased()) return;
    const reason = getFlagReason(result.reason);
    const strikes = await applyPenalty(
      message.member,
      message.channel as any,
      message.id,
      reason,
      config,
      result.flaggedWords,
    );
    if (strikes === -1)
      console.log(`[Moderation] ${message.author.tag} BANNED (${reason})`);
    else
      console.log(
        `[Moderation] ${message.author.tag} — strike ${strikes} (${reason})`,
      );
  } catch (err) {
    console.error("[Moderation] Pipeline error:", err);
  }
});

// ─── Button Interaction Handler ──────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.inGuild() && interaction.member) {
      const authorized = isCommandAuthorized(interaction.member as any, config);
      if (!authorized) {
        await interaction.reply({
          content: "❌ You are not authorized.",
          flags: MessageFlags.Ephemeral,
        });
        try {
          const termsEmbed = await buildTermsEmbed();
          await (interaction.user as any).send({ embeds: [termsEmbed] });
        } catch {}
        return;
      }
    }
    await handleSlashCommand(interaction, config);
    return;
  }

  // Handle button interactions
  if (interaction.isButton()) {
    const customId = interaction.customId;

    // Help command buttons
    if (customId.startsWith("help_")) {
      const commandName = customId.replace("help_", "");
      const descriptions: Record<string, string> = {
        strikes: "**/strikes** `[user]` — Check a user's strike count (Mod+)",
        reset: "**/reset** `[user]` — Reset a user's strikes (Admin+)",
        manage:
          "**/manage** `ignore|whitelist|blacklist` — Manage moderation lists (Admin+)",
        settings:
          "**/settings** `view|timeout|max-strikes|...` — Configure bot settings (Owner)",
        auth: "**/auth** `generate|reset|get|customize` — Manage API keys & JWT (Admin+)",
      };

      const embed = new EmbedBuilder()
        .setTitle(`🔍 Command: ${commandName}`)
        .setDescription(
          descriptions[commandName] || `Quick access to **/${commandName}**`,
        )
        .setColor("Blue")
        .setFooter({
          text: "REGIX Studio • GOD MODE • Use /help for full menu",
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

process.on("unhandledRejection", (reason) =>
  console.error("[FATAL] Unhandled Rejection:", reason),
);
process.on("uncaughtException", (err) =>
  console.error("[FATAL] Uncaught Exception:", err),
);

client.login(config.token).catch((err) => {
  console.error("[FATAL] Login failed:", err);
  process.exit(1);
});
