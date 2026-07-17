import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { getStrikes, loadBotConfig, resetStrikes } from "../services/storage";
import type { HybridCommand } from "../types";

const command: HybridCommand = {
  name: "reset",
  description: "Reset a user's violation strikes (Admin only).",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  options: [
    {
      name: "user",
      description: "The user to reset strikes for",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
  async execute(context) {
    const { args, reply } = context;
    let userId: string | undefined;
    if (typeof args.user === "string") userId = args.user;
    if (!userId && typeof args.user === "string") {
      const m = args.user.match(/^<@!?(\d+)>$/);
      if (m) userId = m[1];
    }
    if (!userId) {
      await reply({
        content: "❌ Please provide a valid user mention or ID.",
        ephemeral: true,
      });
      return;
    }

    const previousStrikes = await getStrikes(userId);
    if (previousStrikes === 0) {
      await reply({
        content: `ℹ️ <@${userId}> has no strikes to reset.`,
        ephemeral: true,
      });
      return;
    }

    await resetStrikes(userId);
    const bc = await loadBotConfig();

    const embed = new EmbedBuilder()
      .setTitle(bc.resetTitle || "✅ Strikes Reset")
      .setDescription(
        [
          `**User:** <@${userId}>`,
          `**User ID:** \`${userId}\``,
          `**Previous Strikes:** ${previousStrikes}/${bc.maxStrikes}`,
          `**Current Strikes:** 0/${bc.maxStrikes} ✅`,
        ].join("\n"),
      )
      .setColor("Green")
      .setFooter({ text: "REGIX Studio • GOD MODE" })
      .setTimestamp();
    if (bc.resetThumbnail) embed.setThumbnail(bc.resetThumbnail);
    if (bc.resetImage) embed.setImage(bc.resetImage);

    await reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
