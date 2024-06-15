import { Subcommand, SubcommandOptions } from '@sapphire/plugin-subcommands';
import { ChatInputCommand, Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { NotesCommandsOptions } from '../../shared/commands/NotesCommands';
import { registerApplicationNotesCommand } from '../../lib/notes-override';
import { AddNoteCommand } from '../../lib/commands/add-note';
import { ListNoteCommand } from '../../lib/commands/list-note';

@ApplyOptions<SubcommandOptions>(NotesCommandsOptions)
export class NotesCommand extends Subcommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
        });
    }

    override registerApplicationCommands(registry: ChatInputCommand.Registry) {
        registerApplicationNotesCommand(registry);
    }

    public async ChatInputAddNote(interaction: Subcommand.ChatInputCommandInteraction) {
        await AddNoteCommand.run(interaction)
    }

    public async chatInputRemoveNote() {
        // Lógica para eliminar una nota
    }

    public async chatInputShowNote() {
        // Lógica para encontrar una nota específica
    }

    public async chatInputList(interaction: Subcommand.ChatInputCommandInteraction) {
        await ListNoteCommand.run(interaction)
    }
}
