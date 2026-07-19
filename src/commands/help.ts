import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import type { HybridCommand } from "../types";

const command: HybridCommand = {
  name: "help",
  description: "Show all available bot commands and their descriptions.",
  async execute(context) {
    const { reply } = context;

    // ── Command Buttons ──────────────────────────────────────────────────
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("help_strikes")
        .setLabel("/strikes")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🔨"),
      new ButtonBuilder()
        .setCustomId("help_reset")
        .setLabel("/reset")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔄"),
      new ButtonBuilder()
        .setCustomId("help_manage")
        .setLabel("/manage")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⚙️"),
      new ButtonBuilder()
        .setCustomId("help_settings")
        .setLabel("/settings")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🔧"),
      new ButtonBuilder()
        .setCustomId("help_auth")
        .setLabel("/auth")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🔐"),
    );

    const embed = new EmbedBuilder()
      .setTitle("📚 **REGIX GOD MODE — Command Center**")
      .setDescription(
        [
          "> *All commands work as both `/command` and `!command`*",
          "",
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          "",
          "**🛡️ Role Access:**",
          "• 👤 **All** — Everyone can use",
          "• 🔨 **Mod+** — Moderator role or higher",
          "• ⚙️ **Admin+** — Admin role or higher",
          "• 👑 **Owner** — Bot owner only",
          "",
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        ].join("\n"),
      )
      .setColor("Blue")
      .addFields(
        {
          name: "━━━ 📖 **General Commands** ━━━",
          value: "> Basic information and moderation actions",
          inline: false,
        },
        {
          name: "🔹 **/help** — 👤 All",
          value:
            "> Show this interactive help menu with all available commands and their usage.",
          inline: false,
        },
        {
          name: "🔹 **/strikes** `[user]` — 🔨 Mod+",
          value:
            "> Check a user's current violation strike count. Shows how many strikes they have out of the max limit before auto-ban.",
          inline: false,
        },
        {
          name: "🔹 **/reset** `[user]` — ⚙️ Admin+",
          value:
            "> Reset all strikes for a specified user. Clears their violation history completely.",
          inline: false,
        },
        {
          name: "━━━ ⚙️ **Moderation Management** ━━━",
          value: "> Configure how the bot handles moderation",
          inline: false,
        },
        {
          name: "🔹 **/manage ignore** `add|remove|list` `[channel]`",
          value:
            "> Add/remove/list channels that bypass moderation. Messages in ignored channels will not be moderated.",
          inline: false,
        },
        {
          name: "🔹 **/manage whitelist** `add|remove|list` `[word]`",
          value:
            "> Add/remove/list whitelisted words. Whitelisted words bypass the bad-word filter entirely.",
          inline: false,
        },
        {
          name: "🔹 **/manage blacklist** `add|remove|list` `[word]`",
          value:
            "> Add/remove/list blacklisted bad words. Messages containing these words will be flagged.",
          inline: false,
        },
        {
          name: "━━━ 🔧 **Bot Settings** (👑 Owner) ━━━",
          value: "> Configure bot behavior and embed customization",
          inline: false,
        },
        {
          name: "🔹 **/settings view**",
          value:
            "> View all current bot settings including timeout duration, max strikes, notification channel, log channel, and all embed configurations.",
          inline: false,
        },
        {
          name: "🔹 **/settings timeout** `[minutes]`",
          value:
            "> Set the timeout duration for flagged users in minutes. Default is 1 minute.",
          inline: false,
        },
        {
          name: "🔹 **/settings max-strikes** `[count]`",
          value:
            "> Set the maximum number of strikes before a user is automatically banned. Default is 3 strikes.",
          inline: false,
        },
        {
          name: "🔹 **/settings notification** `[channel]`",
          value:
            "> Set the notification channel where moderation alerts are sent.",
          inline: false,
        },
        {
          name: "🔹 **/settings log-channel** `[channel]`",
          value: "> Set the log channel for detailed moderation action logs.",
          inline: false,
        },
        {
          name: "🔹 **/settings dm-warning** `[title|desc|thumbnail|image]`",
          value:
            "> Customize the DM warning embed sent to flagged users. Supports variables: `{strikes}`, `{maxStrikes}`, `{reason}`, `{banWarning}`.",
          inline: false,
        },
        {
          name: "🔹 **/settings log-embed** `[title|thumbnail|image]`",
          value:
            "> Customize the moderation log embed. Set title, thumbnail URL, or image URL.",
          inline: false,
        },
        {
          name: "🔹 **/settings terms** `[title|desc|thumbnail|image]`",
          value:
            "> Customize the Terms & Conditions embed. Set title, description, thumbnail URL, or image URL.",
          inline: false,
        },
        {
          name: "🔹 **/settings strike-embed** `[title|thumbnail|image]`",
          value:
            "> Customize the strike check embed displayed when checking a user's strikes.",
          inline: false,
        },
        {
          name: "🔹 **/settings reset-embed** `[title|thumbnail|image]`",
          value: "> Customize the strikes reset confirmation embed.",
          inline: false,
        },
        {
          name: "━━━ 🔐 **Auth System** (⚙️ Admin+) ━━━",
          value:
            "> Manage API keys, JWT tokens, and authentication for external service integration. All responses containing tokens are **ephemeral** (only you can see them).",
          inline: false,
        },
        {
          name: "🔹 **/auth generate** `[name]` `[language]` `[expires-in]` `[scopes]`",
          value:
            "> Generate a **Secret API Key** (long-lived) and a **JWT** (short-lived). **Both shown only once!** Choose from 15+ languages/frameworks for a step-by-step integration guide with demo code. Scopes: `read`, `write`, `admin`.",
          inline: false,
        },
        {
          name: "🔹 **/auth reset**",
          value:
            "> Revoke ALL your current API keys and JWTs, immediately invalidating them. Issues a fresh set of credentials automatically.",
          inline: false,
        },
        {
          name: "🔹 **/auth get**",
          value:
            "> Securely display all your active API keys, JWT configuration, rate limits, IP whitelist, and remaining validity.",
          inline: false,
        },
        {
          name: "🔹 **/auth customize** `[rate-limit]` `[ip-whitelist]`",
          value:
            "> Customize security constraints for your tokens. Set requests-per-minute limit (1-10,000) and/or comma-separated IP whitelist.",
          inline: false,
        },
      )
      .setFooter({
        text: "REGIX Studio • GOD MODE • Click buttons below to use commands",
      })
      .setTimestamp();

    await reply({
      embeds: [embed],
      components: [row1],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
