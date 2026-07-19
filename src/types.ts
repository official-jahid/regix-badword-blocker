import type {
  ChatInputCommandInteraction,
  Message,
  PermissionResolvable,
} from "discord.js";

export interface WordsData {
  badWords: string[];
  whiteListWords: string[];
}

export interface PermissionsData {
  ignoredChannels: string[];
  allowedUsers: string[];
}

export interface ViolationsData {
  [userId: string]: number;
}

export interface BotConfigData {
  timeoutDurationMs: number;
  maxStrikes: number;
  notificationChannelId: string;
  logChannelId: string;
  dmWarningTitle: string;
  dmWarningDesc: string;
  dmWarningThumbnail: string;
  dmWarningImage: string;
  logTitle: string;
  logThumbnail: string;
  logImage: string;
  termsTitle: string;
  termsDesc: string;
  termsThumbnail: string;
  termsImage: string;
  strikeTitle: string;
  strikeThumbnail: string;
  strikeImage: string;
  resetTitle: string;
  resetThumbnail: string;
  resetImage: string;
}

export type PipelineFlagReason = "local" | "ai";

export interface PipelineResult {
  flagged: boolean;
  reason?: PipelineFlagReason;
  flaggedWords?: string[];
}

export type CommandExecutor = (context: CommandContext) => Promise<void>;

export interface CommandContext {
  message?: Message;
  interaction?: ChatInputCommandInteraction;
  args: Record<string, string | number | boolean | undefined>;
  config: BotConfig;
  reply: (options: {
    content?: string;
    embeds?: any[];
    components?: any[];
    flags?: number;
    ephemeral?: boolean;
  }) => Promise<void>;
}

export interface HybridCommand {
  name: string;
  description: string;
  options?: any[];
  defaultMemberPermissions?: PermissionResolvable;
  execute: CommandExecutor;
}

export interface BotConfig {
  token: string;
  clientId: string;
  guildId: string;
  openRouterApiKey: string;
  prefix: string;
  ownerId: string;
  ownerRoleId: string;
  modRoleId: string;
  adminRoleId: string;
  logChannelId: string;
}
