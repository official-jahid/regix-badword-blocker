import { EmbedBuilder, type GuildMember } from "discord.js";
import type { BotConfig } from "../types";
import { loadBotConfig } from "./storage";

export function isCommandAuthorized(
  member: GuildMember | null,
  config: BotConfig,
): boolean {
  if (!member) return false;
  if (config.ownerId && member.id === config.ownerId) return true;
  const roleIds = member.roles.cache.map((r) => r.id);
  if (config.ownerRoleId && roleIds.includes(config.ownerRoleId)) return true;
  if (config.adminRoleId && roleIds.includes(config.adminRoleId)) return true;
  if (config.modRoleId && roleIds.includes(config.modRoleId)) return true;
  return false;
}

export async function buildTermsEmbed(): Promise<EmbedBuilder> {
  const bc = await loadBotConfig();
  const embed = new EmbedBuilder()
    .setTitle(bc.termsTitle || "📜 REGIX STUDIO — Bot Terms & Conditions")
    .setDescription(
      bc.termsDesc || "You are not authorized to use bot commands.",
    )
    .setColor("Blue")
    .setFooter({ text: "REGIX Studio • GOD MODE" })
    .setTimestamp();
  if (bc.termsThumbnail) embed.setThumbnail(bc.termsThumbnail);
  if (bc.termsImage) embed.setImage(bc.termsImage);
  return embed;
}
