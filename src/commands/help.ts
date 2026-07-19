import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../types";

const command: HybridCommand = {
  name: "help",
  description: "Show all available bot commands and their descriptions.",
  async execute(context) {
    const { reply } = context;
    const embed = new EmbedBuilder()
      .setTitle("📚 REGIX GOD MODE — Commands")
      .setDescription(
        "All commands work as both `/command` and `!command`.\n\n" +
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
          "**🛡️ Role Access:**\n" +
          "• 👤 **All** — Everyone can use\n" +
          "• 🔨 **Mod+** — Moderator role or higher\n" +
          "• ⚙️ **Admin+** — Admin role or higher\n" +
          "• 👑 **Owner** — Bot owner only",
      )
      .setColor("Blue")
      .addFields(
        {
          name: "━━━ 📖 General Commands ━━━",
          value: " Basic information and moderation actions",
          inline: false,
        },
        {
          name: "🔹 /help",
          value:
            "Show this interactive help menu with all available commands and their usage.",
          inline: false,
        },
        {
          name: "🔹 /strikes [user] — 🔨 Mod+",
          value:
            "Check a user's current violation strike count. Shows how many strikes they have out of the max limit before auto-ban.",
          inline: false,
        },
        {
          name: "🔹 /reset [user] — ⚙️ Admin+",
          value:
            "Reset all strikes for a specified user. Clears their violation history completely.",
          inline: false,
        },
        {
          name: "━━━ ⚙️ Moderation Management ━━━",
          value: " Configure how the bot handles moderation",
          inline: false,
        },
        {
          name: "🔹 /manage ignore add [channel]",
          value:
            "Add a channel to the ignore list. Messages in ignored channels will not be moderated.",
          inline: false,
        },
        {
          name: "🔹 /manage ignore remove [channel]",
          value:
            "Remove a channel from the ignore list. Messages will be moderated again.",
          inline: false,
        },
        {
          name: "🔹 /manage ignore list",
          value: "List all channels that are currently bypassing moderation.",
          inline: false,
        },
        {
          name: "🔹 /manage whitelist add [word]",
          value:
            "Add a word to the whitelist. Whitelisted words will bypass the bad-word filter entirely.",
          inline: false,
        },
        {
          name: "🔹 /manage whitelist remove [word]",
          value:
            "Remove a word from the whitelist. It will be subject to moderation again.",
          inline: false,
        },
        {
          name: "🔹 /manage whitelist list",
          value: "List all whitelisted words that bypass the bad-word filter.",
          inline: false,
        },
        {
          name: "🔹 /manage blacklist add [word]",
          value:
            "Add a word to the blacklist (bad words list). Messages containing this word will be flagged.",
          inline: false,
        },
        {
          name: "🔹 /manage blacklist remove [word]",
          value:
            "Remove a word from the blacklist. Messages containing this word will no longer be flagged.",
          inline: false,
        },
        {
          name: "🔹 /manage blacklist list",
          value:
            "List all blacklisted bad words (up to first 50). Shows total count.",
          inline: false,
        },
        {
          name: "━━━ 🔧 Bot Settings (👑 Owner) ━━━",
          value: " Configure bot behavior and embed customization",
          inline: false,
        },
        {
          name: "🔹 /settings view",
          value:
            "View all current bot settings including timeout duration, max strikes, notification channel, log channel, and all embed configurations.",
          inline: false,
        },
        {
          name: "🔹 /settings timeout [minutes]",
          value:
            "Set the timeout duration for flagged users in minutes. Default is 1 minute.",
          inline: false,
        },
        {
          name: "🔹 /settings max-strikes [count]",
          value:
            "Set the maximum number of strikes before a user is automatically banned. Default is 3 strikes.",
          inline: false,
        },
        {
          name: "🔹 /settings notification [channel]",
          value:
            "Set the notification channel where moderation alerts are sent.",
          inline: false,
        },
        {
          name: "🔹 /settings log-channel [channel]",
          value: "Set the log channel for detailed moderation action logs.",
          inline: false,
        },
        {
          name: "🔹 /settings dm-warning [title|desc|thumbnail|image]",
          value:
            "Customize the DM warning embed sent to flagged users. You can set title, description (supports {strikes}, {maxStrikes}, {reason}, {banWarning}), thumbnail URL, and image URL.",
          inline: false,
        },
        {
          name: "🔹 /settings log-embed [title|thumbnail|image]",
          value:
            "Customize the moderation log embed. Set title, thumbnail URL, or image URL.",
          inline: false,
        },
        {
          name: "🔹 /settings terms [title|desc|thumbnail|image]",
          value:
            "Customize the Terms & Conditions embed. Set title, description, thumbnail URL, or image URL.",
          inline: false,
        },
        {
          name: "🔹 /settings strike-embed [title|thumbnail|image]",
          value:
            "Customize the strike check embed displayed when checking a user's strikes. Set title, thumbnail URL, or image URL.",
          inline: false,
        },
        {
          name: "🔹 /settings reset-embed [title|thumbnail|image]",
          value:
            "Customize the strikes reset confirmation embed. Set title, thumbnail URL, or image URL.",
          inline: false,
        },
        {
          name: "━━━ 🔐 Auth System (⚙️ Admin+) ━━━",
          value:
            " Manage API keys, JWT tokens, and authentication for external service integration. All responses containing tokens are **ephemeral** (only you can see them).",
          inline: false,
        },
        {
          name: "🔹 /auth generate [name] [expires-in] [scopes]",
          value:
            "Generate a **Secret API Key** (long-lived, for native apps) and a **JWT** (short-lived, for web sessions). **Both shown only once!** Set name (required), optional expiration (e.g., 24h, 7d, 30m), and scopes (read/write/admin, comma-separated).",
          inline: false,
        },
        {
          name: "🔹 /auth reset",
          value:
            "Revoke ALL your current API keys and JWTs, immediately invalidating them in the database. Issues a fresh set of credentials automatically.",
          inline: false,
        },
        {
          name: "🔹 /auth get",
          value:
            "Securely display all your active API keys, JWT configuration, rate limits, IP whitelist, and remaining validity. Shows creation time, last usage, and expiry status.",
          inline: false,
        },
        {
          name: "🔹 /auth customize [rate-limit] [ip-whitelist]",
          value:
            "Customize security constraints for your tokens. Set requests-per-minute limit (1-10,000) and/or comma-separated IP whitelist (IPv4/CIDR). Leave IP whitelist empty to allow all IPs.",
          inline: false,
        },
      )
      .setFooter({ text: "REGIX Studio • GOD MODE" })
      .setTimestamp();
    await reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
