import { container } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { GuildMember, User, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder } from 'discord.js';

export class ListNoteCommand {
    public static async run(interaction: Subcommand.ChatInputCommandInteraction) {
        const miembro = interaction.member as GuildMember;
        const user = interaction.options.getUser("user") as User;
        const guildId = interaction.guild?.id;
        if (!miembro.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("No tienes permisos para usar este comando.")
                        .setColor("#ed4245"),
                ],
                ephemeral: true
            })
        }

        const that_user_notes = await container.prisma.userNotes.findMany({
            where: {
                user_id: user.id,
                guild_id: guildId
            }
        })
        const row = new ActionRowBuilder<ButtonBuilder>
        if (that_user_notes.length === 0)
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("El usuario no tiene notas.")
                        .setColor("#ed4245"),
                ],
                ephemeral: true
            })
        let fields: any[] = [];
        that_user_notes.filter(async (nota) => {
            const note_perpetrator = await container.client.users.fetch(nota.perpetrator) as User;
            return !isNaN(parseInt(nota.read_role_id || ".")) || note_perpetrator.id == miembro.id || miembro.roles.cache.has(`${nota.read_role_id}`) || miembro.permissions.has(PermissionFlagsBits.ManageGuild)
        }).slice(0, 5).forEach(async (nota) => {

            let text = nota.note.replace(/%39%+/g, "'")

            if (text.length > 250) text = text.substring(0, 197) + ` \`[...]\`\n**\`${Math.floor(text.length - 197)} caracteres restantes\`**`

            fields.push(
                {
                    name: `Nota #${nota.note_id} ${isNaN(parseInt(nota.read_role_id || ".")) ? "" : "`(PRIVADA)`"} ${!nota.attachment_url || nota.attachment_url == "BLANK" ? "" : "<:attachment:1098012443231396033>"}`,
                    value: `${isNaN(parseInt(nota.read_role_id || ".")) ? text : "** **"}`
                }
            )
        });
        var pages = Math.floor(that_user_notes.length / 5);
        if (that_user_notes.length % 5 != 0) pages++;


        const page = await import('../../interactions/buttons/mod/notePage.js');
        const purge = await import('../../interactions/buttons/mod/notePrQ.js');
        await page.build(row, { disabled: true, author: interaction.user.id, emoji: "⬅️" }, [`${user.id}`, "0", "-1"])
        await purge.build(row, { disabled: false, author: interaction.user.id }, [`${user.id}`])
        await page.build(row, { disabled: that_user_notes.length <= 5, author: interaction.user.id, emoji: "➡️" }, [`${user.id}`, "0", "1"])

        if (interaction.deferred) {
            await interaction
                .editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#2b2d31")
                            .setTitle("REPOSITORIO DE NOTAS")
                            .setFooter({
                                text: `${that_user_notes.length}/25 notas${pages > 1 ? ` | Página 1/${pages}` : ""
                                    }`,
                            })
                            .setFields(fields),
                    ],
                    components: [row],
                })
        } else {
            await interaction
                .reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#2b2d31")
                            .setTitle("REPOSITORIO DE NOTAS")
                            .setFooter({
                                text: `${that_user_notes.length}/25 notas${pages > 1 ? ` | Página 1/${pages}` : ""
                                    }`,
                            })
                            .setFields(fields),
                    ],
                    components: [row],
                })
        }
        return;
    }
}