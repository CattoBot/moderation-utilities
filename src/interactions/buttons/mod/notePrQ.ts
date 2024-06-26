import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {
    ActionRowBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ButtonInteraction,
    ButtonBuilder,
    ButtonStyle,
    GuildMember
} from "discord.js";

interface optionsObject {
    disabled: boolean | undefined,
    author: string | undefined,
}

export const build = async (actionRowBuilder: ActionRowBuilder, options: optionsObject, data: String[] | undefined) => {
    return new Promise(resolve => {
        actionRowBuilder.addComponents(
            new ButtonBuilder()
                .setCustomId(`mod:notePrQ_a${options.author}_${data?.join(",")}`)
                .setEmoji(`🗑️`)
                .setDisabled(options?.disabled)
                .setStyle(ButtonStyle.Danger)
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
                    .setDescription("No puedes usar este botón.")
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

        const miembro = interaction.member as GuildMember;
        const guildId = interaction.guild?.id

        if (!miembro.permissions.has(PermissionFlagsBits.ManageMessages))
            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("No tienes permisos para usar esta opción.")
                        .setColor("#fb6444"),
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
                        .setDescription("El usuario no posee ninguna nota")
                        .setColor("#ed4245")
                ],
                components: []
            })

        var permited = miembro.permissions.has(PermissionFlagsBits.ManageRoles)

        if (permited) {
            const botond = new ActionRowBuilder<ButtonBuilder>
            const botone = new ActionRowBuilder<ButtonBuilder>
            const module1 = await import('../general/cancel.js');
            const module2 = await import('./notePr.js');
            await module1.build(botond, { disabled: true, author: interaction.user.id }, [])
            await module2.build(botond, { disabled: true, author: interaction.user.id }, [`${userId}`])
            await module1.build(botone, { disabled: false, author: interaction.user.id }, [])
            await module2.build(botone, { disabled: false, author: interaction.user.id }, [`${userId}`])

            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("¡No habrá vuelta atrás!")
                        .setDescription(
                            `
                  ¿Realmente quieres eliminar todas las notas del usuario?
                  ** **
                  > **Miembro:** ${miembro.user.username}${miembro.user.discriminator && parseInt(miembro.user.discriminator) != 0 ? `#${miembro.user.discriminator} (${userId})` : ""}
                  > ${that_user_notes.length} notas
                  `
                        )
                        .setColor("#2b2d31")
                ],
                components: [botond]
            }).then(() => {
                setTimeout(async function () {
                    await interaction.editReply({ components: [botone] })
                }, 3000)
            })
        } else {
            return await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("¡Hey! Con tus permisos no puedes eliminar todas las notas de un usuario.")
                        .setColor("#ed4245")
                ], ephemeral: true
            })
        }
        return;
    }
}