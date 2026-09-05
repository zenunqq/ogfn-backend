export declare class DiscordBot {
    private client;
    private fastify;
    private ready;
    constructor(fastifyInstance: any);
    initDiscord(): void;
    private handleMessage;
    private sendHelp;
    private sendStatus;
    private sendSeason;
    private sendPlayers;
    private sendOAuth2;
    private sendServerInfo;
    start(): Promise<void>;
    stop(): void;
}
