import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { loadBotConfig, saveBotConfig } from "../services/storage";
import type { HybridCommand } from "../types";

const command: HybridCommand = {
  name: "settings",
  description: "View or change bot settings (Admin only).",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  options: [
    {
      name: "view",
      description: "View all current bot settings.",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "timeout",
      description: "Set timeout duration in minutes for flagged users.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "minutes",
          description: "Duration in minutes (default 1).",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
    },
    {
      name: "max-strikes",
      description: "Set max strikes before auto-ban.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "count",
          description: "Number of strikes (default 3).",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
    },
    {
      name: "notification",
      description: "Set the notification channel for moderation alerts.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "channel",
          description: "The channel to send alerts to.",
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
      ],
    },
    {
      name: "log-channel",
      description: "Set the log channel for detailed logs.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "channel",
          description: "The log channel.",
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
      ],
    },
    {
      name: "dm-warning",
      description: "Customize DM warning embed.",
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: "title",
          description: "Set the DM warning title.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "text",
              description: "New title.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "description",
          description:
            "Set the DM warning description (use {strikes}, {maxStrikes}, {reason}, {banWarning}).",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "text",
              description: "New description.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "thumbnail",
          description: "Set the DM warning thumbnail URL.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "url",
              description: "Image URL.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "image",
          description: "Set the DM warning image URL.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "url",
              description: "Image URL.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: "log-embed",
      description: "Customize log embed.",
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: "title",
          description: "Set the log embed title.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "text",
              description: "New title.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "thumbnail",
          description: "Set the log embed thumbnail URL.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "url",
              description: "Image URL.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "image",
          description: "Set the log embed image URL.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "url",
              description: "Image URL.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: "terms",
      description: "Customize Terms & Conditions embed.",
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: "title",
          description: "Set the terms embed title.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "text",
              description: "New title.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "description",
          description: "Set the terms embed description.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "text",
              description: "New description.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "thumbnail",
          description: "Set the terms embed thumbnail URL.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "url",
              description: "Image URL.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "image",
          description: "Set the terms embed image URL.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "url",
              description: "Image URL.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: "strike-embed",
      description: "Customize strike check embed.",
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: "title",
          description: "Set the strike embed title.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "text",
              description: "New title.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "thumbnail",
          description: "Set the strike embed thumbnail URL.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "url",
              description: "Image URL.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "image",
          description: "Set the strike embed image URL.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "url",
              description: "Image URL.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: "reset-embed",
      description: "Customize strikes reset embed.",
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: "title",
          description: "Set the reset embed title.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "text",
              description: "New title.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "thumbnail",
          description: "Set the reset embed thumbnail URL.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "url",
              description: "Image URL.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "image",
          description: "Set the reset embed image URL.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "url",
              description: "Image URL.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
      ],
    },
  ],

  async execute(context) {
    const { interaction, reply } = context;
    if (!interaction) return;

    const bc = await loadBotConfig();
    const subG = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    const save = async () => {
      await saveBotConfig(bc);
      await reply({
        content: "✅ Setting updated.",
        flags: MessageFlags.Ephemeral,
      });
    };

    if (!subG) {
      if (sub === "view") {
        const embed = new EmbedBuilder()
          .setTitle("⚙️ **REGIX Bot Settings**")
          .setColor("Blue")
          .addFields(
            {
              name: "⏱ **Timeout Duration**",
              value: `${bc.timeoutDurationMs / 60000} min(s)`,
              inline: true,
            },
            {
              name: "🔢 **Max Strikes**",
              value: String(bc.maxStrikes),
              inline: true,
            },
            {
              name: "🔔 **Notification Channel**",
              value:
                bc.notificationChannelId ?
                  `<#${bc.notificationChannelId}>`
                : "Not set",
              inline: true,
            },
            {
              name: "📝 **Log Channel**",
              value: bc.logChannelId ? `<#${bc.logChannelId}>` : "Not set",
              inline: true,
            },
            {
              name: "🚨 **DM Warning Title**",
              value: bc.dmWarningTitle || "Default",
              inline: true,
            },
            {
              name: "🖼 **DM Warning Thumb**",
              value: bc.dmWarningThumbnail ? "✅ Set" : "❌ Not set",
              inline: true,
            },
            {
              name: "🖼 **DM Warning Image**",
              value: bc.dmWarningImage ? "✅ Set" : "❌ Not set",
              inline: true,
            },
            {
              name: "📝 **Log Embed Title**",
              value: bc.logTitle || "Default",
              inline: true,
            },
            {
              name: "🖼 **Log Thumb**",
              value: bc.logThumbnail ? "✅ Set" : "❌ Not set",
              inline: true,
            },
            {
              name: "🖼 **Log Image**",
              value: bc.logImage ? "✅ Set" : "❌ Not set",
              inline: true,
            },
            {
              name: "📜 **Terms Title**",
              value: bc.termsTitle || "Default",
              inline: true,
            },
            {
              name: "🖼 **Terms Thumb**",
              value: bc.termsThumbnail ? "✅ Set" : "❌ Not set",
              inline: true,
            },
            {
              name: "🖼 **Terms Image**",
              value: bc.termsImage ? "✅ Set" : "❌ Not set",
              inline: true,
            },
            {
              name: "📊 **Strike Title**",
              value: bc.strikeTitle || "Default",
              inline: true,
            },
            {
              name: "🖼 **Strike Thumb**",
              value: bc.strikeThumbnail ? "✅ Set" : "❌ Not set",
              inline: true,
            },
            {
              name: "🖼 **Strike Image**",
              value: bc.strikeImage ? "✅ Set" : "❌ Not set",
              inline: true,
            },
            {
              name: "✅ **Reset Title**",
              value: bc.resetTitle || "Default",
              inline: true,
            },
            {
              name: "🖼 **Reset Thumb**",
              value: bc.resetThumbnail ? "✅ Set" : "❌ Not set",
              inline: true,
            },
            {
              name: "🖼 **Reset Image**",
              value: bc.resetImage ? "✅ Set" : "❌ Not set",
              inline: true,
            },
          )
          .setFooter({ text: "REGIX Studio • GOD MODE" })
          .setTimestamp();
        await reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }
      if (sub === "timeout") {
        bc.timeoutDurationMs =
          interaction.options.getInteger("minutes", true) * 60000;
        await save();
        return;
      }
      if (sub === "max-strikes") {
        bc.maxStrikes = interaction.options.getInteger("count", true);
        await save();
        return;
      }
      if (sub === "notification") {
        bc.notificationChannelId = interaction.options.getChannel(
          "channel",
          true,
        ).id;
        await save();
        return;
      }
      if (sub === "log-channel") {
        bc.logChannelId = interaction.options.getChannel("channel", true).id;
        await save();
        return;
      }
    }

    if (subG === "dm-warning") {
      if (sub === "title") {
        bc.dmWarningTitle = interaction.options.getString("text", true);
        await save();
        return;
      }
      if (sub === "description") {
        bc.dmWarningDesc = interaction.options.getString("text", true);
        await save();
        return;
      }
      if (sub === "thumbnail") {
        bc.dmWarningThumbnail = interaction.options.getString("url", true);
        await save();
        return;
      }
      if (sub === "image") {
        bc.dmWarningImage = interaction.options.getString("url", true);
        await save();
        return;
      }
    }
    if (subG === "log-embed") {
      if (sub === "title") {
        bc.logTitle = interaction.options.getString("text", true);
        await save();
        return;
      }
      if (sub === "thumbnail") {
        bc.logThumbnail = interaction.options.getString("url", true);
        await save();
        return;
      }
      if (sub === "image") {
        bc.logImage = interaction.options.getString("url", true);
        await save();
        return;
      }
    }
    if (subG === "terms") {
      if (sub === "title") {
        bc.termsTitle = interaction.options.getString("text", true);
        await save();
        return;
      }
      if (sub === "description") {
        bc.termsDesc = interaction.options.getString("text", true);
        await save();
        return;
      }
      if (sub === "thumbnail") {
        bc.termsThumbnail = interaction.options.getString("url", true);
        await save();
        return;
      }
      if (sub === "image") {
        bc.termsImage = interaction.options.getString("url", true);
        await save();
        return;
      }
    }
    if (subG === "strike-embed") {
      if (sub === "title") {
        bc.strikeTitle = interaction.options.getString("text", true);
        await save();
        return;
      }
      if (sub === "thumbnail") {
        bc.strikeThumbnail = interaction.options.getString("url", true);
        await save();
        return;
      }
      if (sub === "image") {
        bc.strikeImage = interaction.options.getString("url", true);
        await save();
        return;
      }
    }
    if (subG === "reset-embed") {
      if (sub === "title") {
        bc.resetTitle = interaction.options.getString("text", true);
        await save();
        return;
      }
      if (sub === "thumbnail") {
        bc.resetThumbnail = interaction.options.getString("url", true);
        await save();
        return;
      }
      if (sub === "image") {
        bc.resetImage = interaction.options.getString("url", true);
        await save();
        return;
      }
    }

    await reply({
      content: "❌ Unknown setting.",
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
