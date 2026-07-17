/**
 * REGIX GOD MODE — /manage command group
 * =======================================
 * Server management commands: manage ignored channels, allowed users,
 * bad words, and whitelist words. Admin only.
 */

import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import {
  loadPermissions,
  loadWords,
  savePermissions,
  saveWords,
} from "../services/storage";
import type { HybridCommand } from "../types";

const command: HybridCommand = {
  name: "manage",
  description: "Manage bot configuration (Admin only).",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  options: [
    {
      name: "ignore",
      description: "Add/remove an ignored channel (bypasses moderation)",
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: "add",
          description: "Add a channel to the ignore list",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "channel",
              description: "The channel to ignore",
              type: ApplicationCommandOptionType.Channel,
              required: true,
            },
          ],
        },
        {
          name: "remove",
          description: "Remove a channel from the ignore list",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "channel",
              description: "The channel to unignore",
              type: ApplicationCommandOptionType.Channel,
              required: true,
            },
          ],
        },
        {
          name: "list",
          description: "List all ignored channels",
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    },
    {
      name: "whitelist",
      description: "Add/remove a word from the whitelist",
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: "add",
          description: "Add a word to the whitelist",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "word",
              description: "The word to whitelist",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "remove",
          description: "Remove a word from the whitelist",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "word",
              description: "The word to remove from whitelist",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "list",
          description: "List all whitelisted words",
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    },
    {
      name: "blacklist",
      description: "Add/remove a word from the bad word list",
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: "add",
          description: "Add a word to the blacklist",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "word",
              description: "The bad word to add",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "remove",
          description: "Remove a word from the blacklist",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "word",
              description: "The bad word to remove",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "list",
          description: "List all bad words",
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
    },
  ],

  async execute(context) {
    const { interaction, args, reply } = context;
    if (!interaction) return;

    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    // ── Ignore channel management ────────────────────────────────────────
    if (subcommandGroup === "ignore") {
      const perms = await loadPermissions();

      if (subcommand === "add") {
        const channel = interaction.options.getChannel("channel", true);
        if (perms.ignoredChannels.includes(channel.id)) {
          await reply({
            content: "ℹ️ That channel is already ignored.",
            ephemeral: true,
          });
          return;
        }
        perms.ignoredChannels.push(channel.id);
        await savePermissions(perms);
        await reply({
          content: `✅ <#${channel.id}> is now ignored by moderation.`,
          ephemeral: true,
        });
      } else if (subcommand === "remove") {
        const channel = interaction.options.getChannel("channel", true);
        perms.ignoredChannels = perms.ignoredChannels.filter(
          (id) => id !== channel.id,
        );
        await savePermissions(perms);
        await reply({
          content: `✅ <#${channel.id}> is no longer ignored.`,
          ephemeral: true,
        });
      } else if (subcommand === "list") {
        if (perms.ignoredChannels.length === 0) {
          await reply({
            content: "ℹ️ No channels are currently ignored.",
            ephemeral: true,
          });
          return;
        }
        const list = perms.ignoredChannels.map((id) => `<#${id}>`).join("\n");
        await reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Ignored Channels")
              .setDescription(list)
              .setColor("Blue")
              .setFooter({ text: "REGIX Studio • GOD MODE" }),
          ],
          ephemeral: true,
        });
      }
      return;
    }

    // ── Whitelist management ─────────────────────────────────────────────
    if (subcommandGroup === "whitelist") {
      const words = await loadWords();

      if (subcommand === "add") {
        const word = interaction.options
          .getString("word", true)
          .toLowerCase()
          .trim();
        if (words.whiteListWords.includes(word)) {
          await reply({
            content: `ℹ️ \`${word}\` is already whitelisted.`,
            ephemeral: true,
          });
          return;
        }
        words.whiteListWords.push(word);
        await saveWords(words);
        await reply({
          content: `✅ \`${word}\` has been added to the whitelist.`,
          ephemeral: true,
        });
      } else if (subcommand === "remove") {
        const word = interaction.options
          .getString("word", true)
          .toLowerCase()
          .trim();
        words.whiteListWords = words.whiteListWords.filter((w) => w !== word);
        await saveWords(words);
        await reply({
          content: `✅ \`${word}\` has been removed from the whitelist.`,
          ephemeral: true,
        });
      } else if (subcommand === "list") {
        if (words.whiteListWords.length === 0) {
          await reply({
            content: "ℹ️ No words are currently whitelisted.",
            ephemeral: true,
          });
          return;
        }
        const list = words.whiteListWords.map((w) => `• \`${w}\``).join("\n");
        await reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Whitelisted Words")
              .setDescription(list)
              .setColor("Green")
              .setFooter({ text: "REGIX Studio • GOD MODE" }),
          ],
          ephemeral: true,
        });
      }
      return;
    }

    // ── Blacklist management ─────────────────────────────────────────────
    if (subcommandGroup === "blacklist") {
      const words = await loadWords();

      if (subcommand === "add") {
        const word = interaction.options
          .getString("word", true)
          .toLowerCase()
          .trim();
        if (words.badWords.includes(word)) {
          await reply({
            content: `ℹ️ \`${word}\` is already in the blacklist.`,
            ephemeral: true,
          });
          return;
        }
        words.badWords.push(word);
        await saveWords(words);
        await reply({
          content: `✅ \`${word}\` has been added to the blacklist.`,
          ephemeral: true,
        });
      } else if (subcommand === "remove") {
        const word = interaction.options
          .getString("word", true)
          .toLowerCase()
          .trim();
        words.badWords = words.badWords.filter((w) => w !== word);
        await saveWords(words);
        await reply({
          content: `✅ \`${word}\` has been removed from the blacklist.`,
          ephemeral: true,
        });
      } else if (subcommand === "list") {
        const total = words.badWords.length;
        const sample = words.badWords.slice(0, 50); // show first 50
        if (sample.length === 0) {
          await reply({
            content: "ℹ️ No bad words configured.",
            ephemeral: true,
          });
          return;
        }
        const list = sample.map((w) => `• \`${w}\``).join("\n");
        await reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                `Bad Words (${total} total${total > 50 ? `, showing first 50` : ""})`,
              )
              .setDescription(list)
              .setColor("Red")
              .setFooter({ text: "REGIX Studio • GOD MODE" }),
          ],
          ephemeral: true,
        });
      }
      return;
    }

    await reply({ content: "❌ Unknown subcommand.", ephemeral: true });
  },
};

export default command;
