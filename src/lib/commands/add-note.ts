import { Subcommand } from "@sapphire/plugin-subcommands";
import { GuildMember, PermissionFlagsBits, EmbedBuilder, TextChannel } from "discord.js";
import { Emojis } from "../emojis";
import { container } from "@sapphire/framework";
export class AddNoteCommand {
    public static async run(interaction: Subcommand.ChatInputCommandInteraction) {

        // Declaramos todos los datos que obtendremos del comando
        const miembro = interaction.member as GuildMember;
        const user = interaction.options.getUser("user");
        const nota = interaction.options.getString("text");
        const rol = interaction.options.getRole("restriction");
        const attachment1 = interaction.options.getAttachment("attachment1");
        const attachment2 = interaction.options.getAttachment("attachment2");
        const attachment3 = interaction.options.getAttachment("attachment3");
        const attachment4 = interaction.options.getAttachment("attachment4");
        const attachment5 = interaction.options.getAttachment("attachment5");

        // Hacemos un array con los adjuntos que existan (Si un adjunto no existe, no lo añade)
        const attachments: any[] = [
            attachment1,
            attachment2,
            attachment3,
            attachment4,
            attachment5
        ].filter((e) => e);

        // Declaramos la ID del servidor
        const guildId = interaction.guild?.id;

        // Comprobamos que el usuario tiene permisos de gestión de mensajes
        if (!miembro.permissions.has(PermissionFlagsBits.ManageMessages))
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("No tienes permisos para usar esta opción.")
                        .setColor("#ed4245"),
                ],
                ephemeral: true
            });

        // Si el usuario al que se le añade la nota es un bot devuelve error
        if (user?.bot)
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("No se pueden hacer anotaciones a bots")
                        .setColor("#ed4245"),
                ],
                ephemeral: true
            });

        // Buscamos todas las otras notas de este usuario
        const that_user_notes: any = await container.prisma.userNotes.findMany({
            where: {
                user_id: user?.id,
                guild_id: guildId
            }
        })

        // Si tiene 25 o más notas, devuelve error
        if (that_user_notes.length >= 25)
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription("Se ha logrado el número máximo de notas que puedes añadir a este usuario.")
                        .setColor("#ed4245"),
                ],
                ephemeral: true
            });

        // Buscamos todas las notas del servidor
        const this_guild_notes: any = await container.prisma.userNotes.findMany({
            where: {
                guild_id: guildId
            }
        })

        // Declaramos una ID de nota por defecto
        var new_note_id = 1;

        // Si el servidor tiene más notas, especificaremos una única
        if (this_guild_notes.length > 0) {

            // Colocaremos todas las notas por orden de ID
            const this_guild_notes_sorted = this_guild_notes.sort(function (a: any, b: any) {
                if (a.NoteID < b.NoteID) return -1;
                if (a.noteID > b.noteID) return 1;
                return 0;
            })

            // Buscaremos la última ID usada, y le sumaremos 1
            new_note_id = Math.floor(parseInt(this_guild_notes_sorted[this_guild_notes_sorted.length - 1].NoteID) + 1)
        }

        // Declaramos que el embed de respuesta debe tener este color
        const embed = new EmbedBuilder().setColor("#2b2d31")

        // Añadimos la nota a la base de datos
        await container.prisma.userNotes.create({
            data: {
                note_id: new_note_id,
                user_id: `${user?.id}`,
                guild_id: `${guildId}`,
                perpetrator: `${miembro.id}`,
                unix: `${Date.now()}`,
                note: `${nota?.replace(/'+/g, "%39%").replace(/\\+/g, "\\\\")}`,
                read_role_id: rol ? `${rol.id}` : null
            },
        });

        // Buscamos los canales configurados del servidor
        const this_guild_config_channels = await container.prisma.configChannels.findUnique({
            where: {
                guild_id: guildId
            }
        })

        // Si el servidor tiene un canal de logs de notas...
        if (
            this_guild_config_channels &&
            this_guild_config_channels.notes_logs &&
            !isNaN(parseInt(this_guild_config_channels.notes_logs))
        ) {

            // Obtenemos el tamaño de los archivos y el máximo de ellos que se pueden subir sin superar los 25MB
            let size = 0
            let uploaded_number = 0

            // Para ello primero los colocamos por orden de tamaño
            const attachments_sorted = attachments.sort(function (a: any, b: any) {
                if (a.size < b.size) return -1;
                if (a.size > b.size) return 1;
                return 0;
            })

            // Si no hay archivos, no hay más que comprobar
            if (attachments.length > 0) {

                // Si los hay, vamos añadiendo de 1 en 1 el contador de archivos hasta que ya no se pueda sin superar los 25 MB
                attachments_sorted.forEach((attachment) => {
                    size += attachment.size
                    if (size < 25000000) {
                        uploaded_number += 1
                    }
                })
            }

            // Obtenemos el canal al que enviaremos el log
            const notes_logs_channel = container.client.channels.resolve(this_guild_config_channels.notes_logs) as TextChannel;

            // Creamos el mensaje que se enviará como log
            const new_note_log = new EmbedBuilder()
                .setTimestamp()
                .setColor("#57f287")
                .setAuthor({
                    name: `${miembro.user.username}${miembro.user.discriminator && parseInt(miembro.user.discriminator) != 0 ? `#${miembro.user.discriminator}` : ""}`,
                    iconURL: miembro.user.avatarURL() || "https://archive.org/download/discordprofilepictures/discordgrey.png"
                })
                .setDescription(
                    `
          **Miembro:** ${user?.username} (${user?.id})
          **Acción:** Crear nota
          ${rol ? `**Restricciones:** <@&${rol.id}>\n` : ""}${rol ? "" : `**Nota:** ${nota?.replace(/%39%+/g, "'").substring(0, 1800)}`}
          `
                )
                .setFooter({ text: `Nota #${new_note_id}` })

            // Si hay archivos...
            if (size > 0) {

                // Indicaremos que se están subiendo
                embed.setFooter({ text: "Subiendo adjuntos..." })
                await interaction.reply({ embeds: [embed], ephemeral: true })

                // Obtendremos un array con la URL de todos ellos
                let attachments_urls: string[] = []

                // Añadiremos tantas URLs al array como sea posible, gracias a la anterior función
                // con la que calculamos el número máximo de archivos sin lograr los 25MB
                attachments_sorted.forEach((attachment) => {
                    if (uploaded_number > 0) {
                        attachments_urls.push(attachment.url)
                    }
                    uploaded_number -= 1
                })

                // Intentaremos enviar este registro
                try {

                    // Estableceremos que como no hubo ningún problema, debería haberse enviado
                    var sended = true

                    // Si hay archivos que adjuntar...
                    if (attachments_urls.length > 0) {

                        // Enviamos el mensaje con el log y los archivos
                        notes_logs_channel
                            .send({
                                embeds: [new_note_log],
                                files: attachments_urls
                            })

                            // Si no lo logra, especifica que no ha sido posible enviar el mensaje
                            .catch(() => {
                                sended = false
                            })

                            // Una vez ejecutada la función, continúa
                            .then(async (m: any) => {

                                // Si no fue posible enviar el mensaje, cancela
                                if (!sended) return;

                                // Obtiene un array con los archivos que hay en el mensaje del log
                                var fileAttachments = Array.from(
                                    m.attachments,
                                    function (entry: any) {
                                        return { key: entry[0], value: entry[1] };
                                    }
                                );

                                // Obtiene uno a uno cada elemento y lo substituye por su URL
                                for (let i = 0; i < fileAttachments.length; i++) {
                                    fileAttachments[i] = fileAttachments[i].value.url;
                                }

                                // Actualiza la base de datos e ingresa las URLs de los adjuntos
                                await container.prisma.userNotes.update({
                                    where: {
                                        note_id_guild_id: {
                                            note_id: new_note_id,
                                            guild_id: `${guildId}`
                                        }
                                    },
                                    data: {
                                        attachment_url: `${fileAttachments.join(";")}`
                                    }
                                });

                                // Si el tamaño total excede los 25MB informa de que alguno de los adjuntos no ha sido subido
                                if (size > 25000000) {
                                    embed.setFooter({ text: "Algunos adjuntos no se han podido subir porque se ha sobrepasado el límite de 25MB" })
                                }

                                // De lo contrario, avisa que todos los adjuntos fueron cargados
                                else {
                                    embed.setFooter({ text: "¡Todos los adjuntos cargados!" })
                                }

                                // Actualiza el mensaje
                                await interaction.editReply({ embeds: [embed] })
                            })
                    }

                    // Si no hay archivos para adjuntar...
                    else {

                        // Envía el mensaje de log
                        notes_logs_channel
                            .send({
                                embeds: [new_note_log],
                            })
                            .then(async () => {
                                embed.setFooter({ text: "No se ha podido subir ninguno de los adjuntos porque todos sobrepasaban los 25MB" })
                                await interaction.editReply({ embeds: [embed] })
                            })
                    }
                }

                // Si falla simplemente indicaremos que no se pudo enviar el log
                catch {
                    embed.setFooter({ text: "El bot no ha podido enviar el log" })
                }
            }

            // Si no hay archivos simplemente mandamos el log
            else {
                notes_logs_channel
                    .send({
                        embeds: [new_note_log],
                    })
            }
        }

        // Si no hay canal de logs configurado avisamos de que es necesario para guardar logs y adjuntos
        else {
            embed.setFooter({ text: "Para guardar logs y adjuntos es necesario configurar un canal de logs de notas." })
        }

        const callback24 = (note: any) => parseInt(note.Unix) > (Date.now() as number) - (24000 * 3600)
        const today = that_user_notes.filter(callback24)

        const callback7 = (note: any) => parseInt(note.Unix) > (Date.now() as number) - (24000 * 3600 * 7)
        const week = that_user_notes.filter(callback7)

        // Una vez finalizado, indicamos que la nota ha sido creada exitosamente
        embed.setDescription(`¡Nota \`#${new_note_id}\` creada exitosamente!\n${today.length > 0 ? `\n${Emojis.Error} \`|\` Esta es la ${today.length + 1}ª nota de este usuario hoy.` : `${week.length > 0 ? `\n${Emojis.Warning} \`|\` Esta es la ${today.length + 1}ª nota de este usuario esta semana.` : ""}`}${that_user_notes.length > 2 ? `\n${Emojis.Warning} \`|\`Esta es la ${that_user_notes.length + 1}ª nota del usuario.` : ""}`)
        if (!interaction.deferred) {
            await interaction.reply({ embeds: [embed], ephemeral: true })
        }

        // Registramos la creación de la nota
        return container.logger.info(`\x1b[32m${miembro.id}\x1b[0m ha añadido la \x1b[33mNOTA#${new_note_id}\x1b[0m a \x1b[32m${user?.id}\x1b[0m en \x1b[36m${interaction.guild?.name} (${guildId})\x1b[0m`)
    }
}
