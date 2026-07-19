/**
 * REGIX GOD MODE — Hybrid Command Handler
 * ========================================
 * Registers every command as BOTH a Discord Slash Command and a
 * traditional prefix-based command (e.g. `!check`).
 *
 * On startup: bulk-overwrites global/guild slash commands.
 * On message: parses prefix commands and executes matching handlers.
 * On interaction: routes slash interactions to the same handlers.
 */

import {
  type Message,
  Collection,
  MessageFlags,
  REST,
  Routes,
} from "discord.js";
import type { BotConfig, CommandContext, HybridCommand } from "../types";

/* ─── Internal Registry ──────────────────────────────────────────────────── */

const commands = new Collection<string, HybridCommand>();

export function registerCommand(command: HybridCommand): void {
  commands.set(command.name, command);
}

export function registerCommands(cmds: HybridCommand[]): void {
  for (const cmd of cmds) registerCommand(cmd);
}

/* ─── Slash Command Deployment ───────────────────────────────────────────── */

export async function deploySlashCommands(config: BotConfig): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(config.token);

  const slashData = commands.map((cmd) => ({
    name: cmd.name,
    description: cmd.description,
    options: cmd.options ?? [],
    default_member_permissions:
      cmd.defaultMemberPermissions?.toString() ?? null,
  }));

  try {
    console.log(`[Commands] Deploying ${slashData.length} slash command(s)...`);

    if (config.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: slashData },
      );
      console.log(`[Commands] Deployed to guild ${config.guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), {
        body: slashData,
      });
      console.log("[Commands] Deployed globally");
    }
  } catch (err) {
    console.error("[Commands] Deployment failed:", err);
  }
}

/* ─── Prefix Command Parsing ─────────────────────────────────────────────── */

export async function handlePrefixCommand(
  message: Message,
  config: BotConfig,
): Promise<boolean> {
  const { prefix } = config;

  if (!message.content.startsWith(prefix)) return false;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return false;

  const command = commands.get(commandName);
  if (!command) return false;

  // Permission check
  if (command.defaultMemberPermissions && message.member) {
    const perms = message.member.permissions;
    if (!perms.has(command.defaultMemberPermissions as any)) {
      await message.reply("❌ You do not have permission to use this command.");
      return true;
    }
  }

  const context: CommandContext = {
    message,
    config,
    args: parseArgs(args, command.options ?? []),
    reply: async (opts) => {
      await message.reply({
        content: opts.content,
        embeds: opts.embeds,
      });
    },
  };

  try {
    await command.execute(context);
  } catch (err) {
    console.error(`[Commands] Error executing prefix "${commandName}":`, err);
    await message.reply("❌ An error occurred while executing that command.");
  }

  return true;
}

/* ─── Slash Command Handling ─────────────────────────────────────────────── */

export async function handleSlashCommand(
  interaction: any,
  config: BotConfig,
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  // Permission check
  if (command.defaultMemberPermissions && interaction.member) {
    const perms = (interaction.member as any).permissions;
    if (perms && !perms.has(command.defaultMemberPermissions)) {
      await interaction.reply({
        content: "❌ You do not have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  // Extract slash arguments
  const args: Record<string, string | number | boolean | undefined> = {};
  for (const opt of command.options ?? []) {
    const value = interaction.options.get(opt.name)?.value;
    if (value !== undefined) args[opt.name] = value;
  }

  const context: CommandContext = {
    interaction,
    config,
    args,
    reply: async (opts) => {
      const replyOptions: any = {
        content: opts.content,
        embeds: opts.embeds,
        components: opts.components,
        flags:
          opts.flags ?? (opts.ephemeral ? MessageFlags.Ephemeral : undefined),
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
    },
  };

  try {
    await command.execute(context);
  } catch (err) {
    console.error(`[Commands] Error executing slash "${command.name}":`, err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ An error occurred while executing that command.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

/* ─── Argument Parsing Helper ────────────────────────────────────────────── */

function parseArgs(
  raw: string[],
  options: any[],
): Record<string, string | number | boolean | undefined> {
  const result: Record<string, string | number | boolean | undefined> = {};

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const value = raw[i];

    if (value !== undefined) {
      switch (opt.type) {
        case 4: // INTEGER
          result[opt.name] = parseInt(value, 10) || 0;
          break;
        case 5: // BOOLEAN
          result[opt.name] = value === "true" || value === "1";
          break;
        case 3: // STRING (default)
        default:
          result[opt.name] = value;
          break;
      }
    }
  }

  return result;
}
