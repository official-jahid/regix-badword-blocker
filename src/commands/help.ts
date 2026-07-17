import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../types";

const command: HybridCommand = {
  name: "help",
  description: "Show all available bot commands and their descriptions.",
  async execute(context) {
    const { reply } = context;
    const embed = new EmbedBuilder()
      .setTitle("📚 REGIX GOD MODE — Commands")
      .setDescription("All commands work as both `/command` and `!command`.")
      .setColor("Blue")
      .addFields(
        { name: "🔹 /help", value: "Show this help menu.", inline: false },
        {
          name: "🔹 /strikes [user]",
          value: "Check a user's current violation strike count.",
          inline: false,
        },
        {
          name: "🔹 /reset [user]",
          value: "Reset a user's strikes (Admin only).",
          inline: false,
        },
        {
          name: "🔹 /manage ignore add/remove/list",
          value: "Manage channels that bypass moderation.",
          inline: false,
        },
        {
          name: "🔹 /manage whitelist add/remove/list",
          value: "Manage whitelisted words (bypass bad-word filter).",
          inline: false,
        },
        {
          name: "🔹 /manage blacklist add/remove/list",
          value: "Manage bad words (blacklist).",
          inline: false,
        },
        {
          name: "🔹 /settings view",
          value: "View all current bot settings.",
          inline: false,
        },
        {
          name: "🔹 /settings timeout [minutes]",
          value: "Set timeout duration for flagged users (default: 1 min).",
          inline: false,
        },
        {
          name: "🔹 /settings maxstrikes [count]",
          value: "Set max strikes before auto-ban (default: 3).",
          inline: false,
        },
        {
          name: "🔹 /settings notification [channel]",
          value: "Set the notification channel for moderation alerts.",
          inline: false,
        },
        {
          name: "🔹 /settings logchannel [channel]",
          value: "Set the log channel for detailed moderation logs.",
          inline: false,
        },
        {
          name: "🔹 /settings dmwarning [title|desc|thumbnail|image]",
          value: "Customize the DM warning embed content and images.",
          inline: false,
        },
        {
          name: "🔹 /settings log [title|thumbnail|image]",
          value: "Customize the log embed content and images.",
          inline: false,
        },
        {
          name: "🔹 /settings terms [title|desc|thumbnail|image]",
          value: "Customize the Terms & Conditions embed.",
          inline: false,
        },
        {
          name: "🔹 /settings strike [title|thumbnail|image]",
          value: "Customize the strike check embed.",
          inline: false,
        },
        {
          name: "🔹 /settings reset [title|thumbnail|image]",
          value: "Customize the strikes reset embed.",
          inline: false,
        },
      )
      .setFooter({ text: "REGIX Studio • GOD MODE" })
      .setTimestamp();
    await reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
