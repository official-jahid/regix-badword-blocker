import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { getStrikes, loadBotConfig } from "../services/storage";
import type { HybridCommand } from "../types";

const command: HybridCommand = {
  name: "strikes",
  description: "Check a user's current violation strike count.",
  options: [
    {
      name: "user",
      description: "The user to check strikes for",
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
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const strikes = await getStrikes(userId);
    const bc = await loadBotConfig();

    const embed = new EmbedBuilder()
      .setTitle(bc.strikeTitle || "📊 **REGIX Strike Check**")
      .setDescription(
        [
          `**👤 User:** <@${userId}>`,
          `**🆔 User ID:** \`${userId}\``,
          `**🔨 Strikes:** ${strikes}/${bc.maxStrikes}`,
          strikes >= bc.maxStrikes ?
            "🔴 **This user has been banned.**"
          : `🟢 **${bc.maxStrikes - strikes}** strike${bc.maxStrikes - strikes !== 1 ? "s" : ""} remaining.`,
        ].join("\n"),
      )
      .setColor(
        strikes >= bc.maxStrikes ? "Red"
        : strikes >= bc.maxStrikes - 1 ? "Orange"
        : "Green",
      )
      .setFooter({ text: "REGIX Studio • GOD MODE" })
      .setTimestamp();
    if (bc.strikeThumbnail) embed.setThumbnail(bc.strikeThumbnail);
    if (bc.strikeImage) embed.setImage(bc.strikeImage);

    await reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
