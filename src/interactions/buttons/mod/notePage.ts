import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, EmbedBuilder, PermissionFlagsBits, ButtonInteraction, ButtonBuilder, ButtonStyle, GuildMember, User } from "discord.js";

interface optionsObject {
    disabled: boolean | undefined,
    author: string | undefined,
    emoji: string
}

export const build = async (actionRowBuilder: ActionRowBuilder, options: optionsObject, data: String[] | undefined) => {
    return new Promise(resolve => {
        actionRowBuilder.addComponents(
            new ButtonBuilder()
                .setCustomId(`mod:notePage_u${options.author}_${data?.join(",")}`)
                .setEmoji(options.emoji)
                .setDisabled(options?.disabled)
                .setStyle(ButtonStyle.Secondary)
        );
        resolve(true)
    })
};

export class ButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override async parse(interaction: ButtonInteraction) {
        const cat: string = interaction.customId.split(/:+/g)[0];
        const id: string = interaction.customId.split(/:+/g)[1].split(/_+/g)[0];
        if (cat == __dirname.split(/\/+/g)[__dirname.split(/\/+/g).length - 1] && id == __filename.split(/\/+/g)[__filename.split(/\/+/g).length - 1].split(/\.+/g)[0]) {
            const restriction: string = interaction.customId.split(/:+/g)[1].split(/_+/g)[1];
            let permited: boolean = restriction.startsWith("a")
            if (!permited && restriction.startsWith("u")) {
                permited = (interaction.user.id == restriction.slice(1, restriction.length))
            }
            if (permited) {
                return this.some();
            } else {
                let embed = new EmbedBuilder()
                    .setDescription("No puedes utilizar este botón.")
                    .setColor("#ed4245")
                await interaction.reply({ embeds: [embed] })
                return this.none();
            }
        } else {
            return this.none();
        }
    }

    public async run(interaction: ButtonInteraction) {
        const customIDsplitted = interaction.customId.split(/_+/g);
        const userId = customIDsplitted[2].split(/,+/g)[0];
        const page = parseInt(customIDsplitted[2].split(/,+/g)[1]) || 0;
        const movement = parseInt(customIDsplitted[2].split(/,+/g)[2]) || 0;

        const new_page = page + movement

        const miembro = interaction.member as GuildMember;
        const guildId = interaction.guild?.id;

        if (!miembro.permissions.has(PermissionFlagsBits.ManageMessages))
            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("No tienes permisos para usar esta opción.")
                        .setColor("#ed4245"),
                ],
                components: [],
            });

        const that_user_notes = await this.container.prisma.userNotes.findMany({
            where: {
                user_id: `${userId}`,
                guild_id: `${guildId}`
            }
        })

        if (!that_user_notes || that_user_notes.length == 0)
            return await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("¡El usuario ya no tiene notas!")
                        .setColor("#ed4245")
                ],
                components: []
            })
        const embed = new EmbedBuilder()
            .setColor("#2b2d31")
            .setTitle("REPOSITORIO DE NOTAS")
        const row = new ActionRowBuilder<ButtonBuilder>
        let fields: any[] = []

        that_user_notes.filter(async (nota) => {
            const note_perpetrator = await this.container.client.users.fetch(nota.perpetrator) as User;
            return !isNaN(parseInt(nota.read_role_id || ".")) || note_perpetrator.id == miembro.id || miembro.roles.cache.has(`${nota.read_role_id}`) || miembro.permissions.has(PermissionFlagsBits.ManageGuild)
        }).slice(5 * (new_page), 5 * (new_page + 1)).forEach(async (nota) => {

            let text = nota.note.replace(/%39%+/g, "'")

            if (text.length > 250) text = text.substring(0, 197) + ` \`[...]\`\n**\`${Math.floor(text.length - 197)} caracteres restantes\`**`

            fields.push(
                {
                    name: `Nota #${nota.note_id} ${isNaN(parseInt(nota.read_role_id || ".")) ? "" : "`(PRIVADA)`"} ${!nota.attachment_url || nota.attachment_url == "BLANK" ? "" : "<:attachment:1098012443231396033>"}`,
                    value: `${isNaN(parseInt(nota.read_role_id || ".")) ? text : "** **"}`
                }
            )
        });
        let ammount = that_user_notes.filter(e => e.guild_id == guildId).length
        let pages = Math.floor(ammount / 5)
        if (ammount % 5 != 0) pages++
        const pagebutton = await import('./notePage.js');
        const purge = await import('./notePrQ.js');
        await pagebutton.build(row, { disabled: new_page == 0, author: interaction.user.id, emoji: "⬅️" }, [`${userId}`, `${new_page}`, "-1"])
        await purge.build(row, { disabled: false, author: interaction.user.id }, [`${userId}`])
        await pagebutton.build(row, { disabled: new_page == (pages - 1), author: interaction.user.id, emoji: "➡️" }, [`${userId}`, `${new_page}`, "1"])
        embed
            .setFooter({ text: `${ammount}/25 notas${pages > 1 ? ` | Página ${new_page + 1}/${pages}` : ""}` })
            .setFields(fields)
        return await interaction.update({ embeds: [embed], components: [row] })
    }
}