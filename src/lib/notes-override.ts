import { ChatInputCommand } from "@sapphire/framework";

function registerApplicationNotesCommand(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand((builder) =>
        builder
            .setName('notes')
            .setDescription('Manage notes for a user')
            .addSubcommand((command) =>
                command
                    .setName('add')
                    .setDescription('Create a new note for a user')
                    .addUserOption((option) =>
                        option
                            .setName('user')
                            .setDescription('To which user do you want to attach the note?')
                            .setRequired(true),
                    )
                    .addStringOption((option) =>
                        option
                            .setName('text')
                            .setDescription('Enter a note body')
                            .setRequired(true),
                    )
                    .addAttachmentOption((option) =>
                        option
                            .setName('attachment1')
                            .setDescription('Enter a file')
                            .setRequired(false),
                    )
                    .addAttachmentOption((option) =>
                        option
                            .setName('attachment2')
                            .setDescription('Enter a file')
                            .setRequired(false),
                    )
                    .addAttachmentOption((option) =>
                        option
                            .setName('attachment3')
                            .setDescription('Enter a file')
                            .setRequired(false),
                    )
                    .addAttachmentOption((option) =>
                        option
                            .setName('attachment4')
                            .setDescription('Enter a file')
                            .setRequired(false),
                    )
                    .addAttachmentOption((option) =>
                        option
                            .setName('attachment5')
                            .setDescription('Enter a file')
                            .setRequired(false),
                    )
                    .addRoleOption((option) =>
                        option
                            .setName('restriction')
                            .setDescription('Indicate the role that will be able to access the note')
                            .setRequired(false),
                    ),
            )
            .addSubcommand((command) =>
                command
                    .setName('remove')
                    .setDescription('Remove a note from a user')
                    .addIntegerOption((option) =>
                        option
                            .setName('id')
                            .setDescription('Enter the ID of the note to remove')
                            .setMinValue(0)
                            .setRequired(true),
                    ),
            )
            .addSubcommand((command) =>
                command
                    .setName('find')
                    .setDescription('Get the complete information of a note')
                    .addIntegerOption((option) =>
                        option
                            .setName('id')
                            .setDescription('Enter the ID of the note to review')
                            .setMinValue(0)
                            .setRequired(true),
                    ),
            )
            .addSubcommand((command) =>
                command
                    .setName('list')
                    .setDescription('Get the list of notes from a user')
                    .addUserOption((option) =>
                        option
                            .setName('user')
                            .setDescription('Which user do you want to get the list of notes from?')
                            .setRequired(true),
                    ),
            ),
    );
}

export { registerApplicationNotesCommand };