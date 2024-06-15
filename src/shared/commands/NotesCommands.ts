import { SubcommandOptions } from "@sapphire/plugin-subcommands";
import { Time } from "@sapphire/time-utilities";
import { PermissionFlagsBits } from "discord.js";

export const NotesCommandsOptions: SubcommandOptions = {
    name: 'notes',
    description: 'Manage notes for a user',
    requiredUserPermissions: [PermissionFlagsBits.MuteMembers],
    cooldownDelay: Time.Second * 10,
    subcommands: [
        {
            name: 'add', chatInputRun: "ChatInputAddNote"
        },
        {
            name: 'remove', chatInputRun: "ChatInputRemoveNote"
        },
        {
            name: 'find', chatInputRun: "ChatInputShowNote"
        },
        {
            name: 'list', chatInputRun: "chatInputList"
        }
    ]
}