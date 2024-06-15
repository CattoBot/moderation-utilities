import { Subcommand } from "@sapphire/plugin-subcommands";
import { GuildMember, PermissionFlagsBits, EmbedBuilder, TextChannel } from "discord.js";
import { Emojis } from "../emojis";
import { container } from "@sapphire/framework";

export class AddNoteCommand {
    public static async run(interaction: Subcommand.ChatInputCommandInteraction) {
        const member = interaction.member as GuildMember;
        const user = interaction.options.getUser("user");
        const noteText = interaction.options.getString("text");
        const restrictionRole = interaction.options.getRole("restriction");
        const attachments = this.getAttachments(interaction);

        if (!this.hasManageMessagesPermission(member)) {
            return this.replyWithNoPermission(interaction);
        }

        if (user?.bot) {
            return this.replyWithBotUser(interaction);
        }

        const guildId = interaction.guild?.id;
        const existingNotes = await this.getUserNotes(user?.id, guildId);

        if (existingNotes.length >= 25) {
            return this.replyWithMaxNotes(interaction);
        }

        const newNoteId = await this.getNewNoteId(guildId);
        await this.saveNote({
            noteId: newNoteId,
            userId: user?.id,
            guildId: guildId,
            perpetratorId: member.id,
            noteText: noteText,
            restrictionRoleId: restrictionRole?.id,
        });

        const logChannel = await this.getLogChannel(guildId);
        if (logChannel && user) {
            await this.logNote({
                interaction,
                member,
                user: { username: user.username, id: user.id },
                noteId: newNoteId,
                noteText,
                restrictionRole,
                attachments,
                logChannel,
            });
        } else {
            await this.replyWithNoLogChannel(interaction);
        }

        return this.replyWithSuccess(interaction, existingNotes, newNoteId);
    }

    private static getAttachments(interaction: Subcommand.ChatInputCommandInteraction) {
        return [
            interaction.options.getAttachment("attachment1"),
            interaction.options.getAttachment("attachment2"),
            interaction.options.getAttachment("attachment3"),
            interaction.options.getAttachment("attachment4"),
            interaction.options.getAttachment("attachment5"),
        ].filter((attachment) => attachment);
    }

    private static hasManageMessagesPermission(member: GuildMember) {
        return member.permissions.has(PermissionFlagsBits.ManageMessages);
    }

    private static async replyWithNoPermission(interaction: Subcommand.ChatInputCommandInteraction) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription("No tienes permisos para usar esta opción.")
                    .setColor("#ed4245"),
            ],
            ephemeral: true,
        });
    }

    private static async replyWithBotUser(interaction: Subcommand.ChatInputCommandInteraction) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription("No se pueden hacer anotaciones a bots")
                    .setColor("#ed4245"),
            ],
            ephemeral: true,
        });
    }

    private static async getUserNotes(userId: string | null | undefined, guildId: string | undefined) {
        return container.prisma.userNotes.findMany({
            where: {
                user_id: userId!,
                guild_id: guildId,
            },
        });
    }

    private static async replyWithMaxNotes(interaction: Subcommand.ChatInputCommandInteraction) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription("Se ha logrado el número máximo de notas que puedes añadir a este usuario.")
                    .setColor("#ed4245"),
            ],
            ephemeral: true,
        });
    }

    private static async getNewNoteId(guildId: string | undefined) {
        const guildNotes = await container.prisma.userNotes.findMany({
            where: { guild_id: guildId },
        });

        if (guildNotes.length === 0) return 1;

        return guildNotes.reduce((maxId, note) => Math.max(maxId, note.note_id), 0) + 1;
    }

    private static async saveNote({
        noteId,
        userId,
        guildId,
        perpetratorId,
        noteText,
        restrictionRoleId,
    }: {
        noteId: number;
        userId: string | undefined;
        guildId: string | undefined;
        perpetratorId: string;
        noteText: string | null | undefined;
        restrictionRoleId?: string | null;
    }) {
        await container.prisma.userNotes.create({
            data: {
                note_id: noteId,
                user_id: userId || '',
                guild_id: guildId || '',
                perpetrator: perpetratorId,
                unix: `${Date.now()}`,
                note: noteText?.replace(/'+/g, "%39%").replace(/\\+/g, "\\\\") || '',
                read_role_id: restrictionRoleId,
            },
        });
    }

    private static async getLogChannel(guildId: string | undefined) {
        const config = await container.prisma.configChannels.findUnique({
            where: { guild_id: guildId },
        });
        return config ? container.client.channels.resolve(config.notes_logs!) as TextChannel : null;
    }

    private static async logNote({
        interaction,
        member,
        user,
        noteId,
        noteText,
        restrictionRole,
        attachments,
        logChannel,
    }: {
        interaction: Subcommand.ChatInputCommandInteraction;
        member: GuildMember;
        user: { username?: string; id?: string };
        noteId: number;
        noteText: string | null | undefined;
        restrictionRole: { id: string } | null | undefined;
        attachments: any[];
        logChannel: TextChannel;
    }) {
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor("#57f287")
            .setAuthor({
                name: `${member.user.username}${member.user.discriminator && parseInt(member.user.discriminator) != 0 ? `#${member.user.discriminator}` : ""}`,
                iconURL: member.user.avatarURL() || "https://archive.org/download/discordprofilepictures/discordgrey.png",
            })
            .setDescription(
                `**Miembro:** ${user.username} (${user.id})\n**Acción:** Crear nota\n${restrictionRole ? `**Restricciones:** <@&${restrictionRole.id}>\n` : ""}${restrictionRole ? "" : `**Nota:** ${noteText?.replace(/%39%+/g, "'").substring(0, 1800)}`}`
            )
            .setFooter({ text: `Nota #${noteId}` });

        if (attachments.length > 0) {
            await this.handleAttachments({
                interaction,
                attachments,
                logChannel,
                embed,
                noteId,
                guildId: interaction.guild?.id,
            });
        } else {
            await logChannel.send({ embeds: [embed] });
        }
    }

    private static async handleAttachments({
        interaction,
        attachments,
        logChannel,
        embed,
        noteId,
        guildId,
    }: {
        interaction: Subcommand.ChatInputCommandInteraction;
        attachments: any[];
        logChannel: TextChannel;
        embed: EmbedBuilder;
        noteId: number;
        guildId: string | undefined;
    }) {
        const sortedAttachments = attachments.sort((a, b) => a.size - b.size);
        const attachmentUrls = [];
        let totalSize = 0;

        for (const attachment of sortedAttachments) {
            if (totalSize + attachment.size < 25000000) {
                totalSize += attachment.size;
                attachmentUrls.push(attachment.url);
            } else {
                break;
            }
        }

        try {
            const message = await logChannel.send({
                embeds: [embed],
                files: attachmentUrls,
            });

            const uploadedUrls = message.attachments.map((att) => att.url);

            await container.prisma.userNotes.update({
                where: {
                    note_id_guild_id: {
                        note_id: noteId,
                        guild_id: guildId || '',
                    },
                },
                data: {
                    attachment_url: uploadedUrls.join(";"),
                },
            });

            embed.setFooter({ text: "¡Todos los adjuntos cargados!" });
        } catch {
            embed.setFooter({ text: "El bot no ha podido enviar el log" });
        }

        await interaction.editReply({ embeds: [embed] });
    }

    private static async replyWithNoLogChannel(interaction: Subcommand.ChatInputCommandInteraction) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setFooter({ text: "Para guardar logs y adjuntos es necesario configurar un canal de logs de notas." }),
            ],
            ephemeral: true,
        });
    }

    private static async replyWithSuccess(interaction: Subcommand.ChatInputCommandInteraction, existingNotes: any[], newNoteId: number) {
        const recentNotes = existingNotes.filter(note => parseInt(note.unix) > Date.now() - 86400000);
        const weeklyNotes = existingNotes.filter(note => parseInt(note.unix) > Date.now() - 604800000);

        const embed = new EmbedBuilder()
            .setDescription(`¡Nota \`#${newNoteId}\` creada exitosamente!\n${recentNotes.length > 0 ? `\n${Emojis.Error} \`|\` Esta es la ${recentNotes.length + 1}ª nota de este usuario hoy.` : `${weeklyNotes.length > 0 ? `\n${Emojis.Warning} \`|\` Esta es la ${weeklyNotes.length + 1}ª nota de este usuario esta semana.` : ""}`}${existingNotes.length > 2 ? `\n${Emojis.Warning} \`|\` Esta es la ${existingNotes.length + 1}ª nota del usuario.` : ""}`)
            .setColor("#2b2d31");

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
