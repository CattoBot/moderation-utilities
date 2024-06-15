import { LogLevel, SapphireClient, container } from "@sapphire/framework";
import { GatewayIntentBits, Partials } from "discord.js";
import { PrismaClient } from "@prisma/client";
import { getRootData } from "@sapphire/pieces";
import { join } from "path";
import { InternationalizationContext } from "@sapphire/plugin-i18next";

export class App extends SapphireClient {
    private rootData = getRootData();
    constructor() {
        super({
            caseInsensitiveCommands: true,
            logger: {
                level: LogLevel.Debug
            },
            shards: 'auto',
            intents: [
                GatewayIntentBits.DirectMessageReactions,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.GuildEmojisAndStickers,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent
            ],
            partials: [Partials.Channel, Partials.User, Partials.GuildMember, Partials.Message],
            presence: {
                status: "idle"
            },
            loadMessageCommandListeners: true,
            i18n: {
                fetchLanguage: async (context: InternationalizationContext) => {
                    const guild = await container.prisma.guild.findUnique({ where: { guild_id: context.guild?.id } });
                    return guild?.lang || 'en-US';
                }
            },
            loadApplicationCommandRegistriesStatusListeners: true
        });

        this.stores.get('interaction-handlers').registerPath(join(this.rootData.root, 'interactions'));
    }

    public override async login(token?: string): Promise<string> {
        container.prisma = new PrismaClient();
        return super.login(token);
    }
}
