import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import {
  deploySlashCommands,
  handlePrefixCommand,
  handleSlashCommand,
  registerCommands,
} from "./handlers/commandHandler";
import { runPipeline } from "./services/moderation";
import { applyPenalty, getFlagReason } from "./services/penalties";
import { buildTermsEmbed, isCommandAuthorized } from "./services/permissions";
import type { BotConfig } from "./types";

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
  helpCommand,
  strikesCommand,
  resetCommand,
  manageCommand,
  settingsCommand,
]);

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`💀 REGIX GOD MODE v2.0 READY — ${readyClient.user.tag}`);
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

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.inGuild() && interaction.member) {
    const authorized = isCommandAuthorized(interaction.member as any, config);
    if (!authorized) {
      await interaction.reply({
        content: "❌ You are not authorized.",
        ephemeral: true,
      });
      try {
        const termsEmbed = await buildTermsEmbed();
        await (interaction.user as any).send({ embeds: [termsEmbed] });
      } catch {}
      return;
    }
  }
  await handleSlashCommand(interaction, config);
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
