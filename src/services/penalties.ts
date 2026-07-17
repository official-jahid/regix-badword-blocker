import {
  EmbedBuilder,
  type GuildMember,
  type GuildTextBasedChannel,
  type TextChannel,
} from "discord.js";
import type { BotConfig } from "../types";
import { incrementStrike, loadBotConfig } from "./storage";

export async function applyPenalty(
  member: GuildMember,
  channel: TextChannel,
  messageId: string,
  reason: string,
  config: BotConfig,
  flaggedWords?: string[],
): Promise<number> {
  const userId = member.id;
  const bc = await loadBotConfig();
  let originalContent = "";

  try {
    const msg = await channel.messages.fetch(messageId);
    originalContent = msg.content;
    if (msg.deletable) await msg.delete();
  } catch {}

  const strikes = await incrementStrike(userId);

  const remaining = bc.maxStrikes - strikes;
  const banWarning =
    remaining <= 0 ?
      "🔴 **You have been permanently banned from the server.**"
    : `⚠️ **${remaining} more strike${remaining > 1 ? "s" : ""} and you will be permanently banned.**`;

  const dmDesc = bc.dmWarningDesc
    .replace(/{strikes}/g, String(strikes))
    .replace(/{maxStrikes}/g, String(bc.maxStrikes))
    .replace(/{reason}/g, reason)
    .replace(/{banWarning}/g, banWarning);

  try {
    const embed = new EmbedBuilder()
      .setTitle(bc.dmWarningTitle || "🚨 REGIX SECURITY WARNING")
      .setDescription(dmDesc)
      .setColor("Red")
      .setFooter({ text: "REGIX Studio • GOD MODE" })
      .setTimestamp();
    if (bc.dmWarningThumbnail) embed.setThumbnail(bc.dmWarningThumbnail);
    if (bc.dmWarningImage) embed.setImage(bc.dmWarningImage);
    await member.send({ embeds: [embed] });
  } catch {}

  try {
    if (member.moderatable) {
      await member.timeout(
        bc.timeoutDurationMs,
        `REGIX: ${reason} (strike ${strikes}/${bc.maxStrikes})`,
      );
    }
  } catch {}

  let finalStrikes = strikes;
  if (strikes >= bc.maxStrikes) {
    try {
      if (member.bannable) {
        await member.ban({
          reason: `REGIX: Reached ${bc.maxStrikes} strikes — auto-ban`,
        });
        finalStrikes = -1;
      }
    } catch {}
  }

  const logChId = bc.logChannelId || config.logChannelId;
  if (logChId) {
    try {
      const logChannel = member.guild.channels.cache.get(logChId) as
        | GuildTextBasedChannel
        | undefined;
      if (logChannel?.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle(bc.logTitle || "🚨 Moderation Action Taken")
          .setDescription(
            [
              `**User:** ${member.user.tag} (<@${member.id}>)`,
              `**User ID:** \`${member.id}\``,
              `**Reason:** ${reason}`,
              `**Strikes:** ${finalStrikes === -1 ? "BANNED" : `${finalStrikes}/${bc.maxStrikes}`}`,
              `**Flagged Content:**`,
              `\`\`\`${(originalContent || "(unavailable)").slice(0, 500)}\`\`\``,
            ].join("\n"),
          )
          .setColor(
            finalStrikes >= bc.maxStrikes || finalStrikes === -1 ?
              "DarkRed"
            : "Red",
          )
          .setFooter({ text: "REGIX Studio • GOD MODE" })
          .setTimestamp();
        if (bc.logThumbnail) logEmbed.setThumbnail(bc.logThumbnail);
        if (bc.logImage) logEmbed.setImage(bc.logImage);
        if (flaggedWords?.length) {
          logEmbed.addFields({
            name: "🔍 Flagged Words",
            value: flaggedWords.map((w) => `\`${w}\``).join(", "),
            inline: false,
          });
        }
        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch {}
  }

  const notifChId = bc.notificationChannelId;
  if (notifChId && notifChId !== logChId) {
    try {
      const notifChannel = member.guild.channels.cache.get(notifChId) as
        | GuildTextBasedChannel
        | undefined;
      if (notifChannel?.isTextBased()) {
        const notifEmbed = new EmbedBuilder()
          .setTitle("🚨 User Flagged")
          .setDescription(
            `**User:** ${member.user.tag} (<@${member.id}>)\n**Reason:** ${reason}\n**Strikes:** ${finalStrikes === -1 ? "BANNED" : `${finalStrikes}/${bc.maxStrikes}`}`,
          )
          .setColor("Orange")
          .setFooter({ text: "REGIX Studio • GOD MODE" })
          .setTimestamp();
        await notifChannel.send({ embeds: [notifEmbed] });
      }
    } catch {}
  }

  return finalStrikes;
}

export function getFlagReason(reason?: string): string {
  switch (reason) {
    case "local":
      return "Local bad-word filter match";
    case "ai":
      return "OpenRouter AI flagged content";
    default:
      return "Violation of server rules";
  }
}
