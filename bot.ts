import { Client, GatewayIntentBits, Partials } from "discord.js";
import fastify from "fastify";
import config from "./src/config";

export class DiscordBot {
  private client: Client | null = null;
  private fastify: any;
  private ready: boolean = false;

  constructor(fastifyInstance: any) {
    this.fastify = fastifyInstance;
  }

  // Initialize Discord client
  initDiscord(): void {
    if (!process.env.DISCORD_TOKEN) {
      console.warn("⚠️ DISCORD_TOKEN not set in .env - Discord bot disabled");
      return;
    }

    const intents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ];

    this.client = new Client({
      intents,
      partials: [Partials.Message, Partials.Channel, Partials.User],
    });

    // Ready event
    this.client.once("ready", () => {
      this.ready = true;
      console.log(`📡 Discord bot logged in as ${this.client.user?.tag}`);
    });

    // Message create event
    this.client.on("messageCreate", (message) => this.handleMessage(message));
  }

  // Handle Discord messages
  private async handleMessage(message: any): Promise<void> {
    // Ignore bot messages
    if (message.author.bot) return;

    // Skip if DM
    if (!message.guild) return;

    const content = message.content.toLowerCase();

    // Help command
    if (content.startsWith("!help") || content.startsWith("!commands")) {
      await this.sendHelp(message);
      return;
    }

    // Status command
    if (content.startsWith("!status")) {
      await this.sendStatus(message);
      return;
    }

    // Season command
    if (content.startsWith("!season")) {
      await this.sendSeason(message);
      return;
    }

    // Players command
    if (content.startsWith("!players")) {
      await this.sendPlayers(message);
      return;
    }

    // OAuth2 command
    if (content.startsWith("!oauth2")) {
      await this.sendOAuth2(message);
      return;
    }

    // Server info command
    if (content.startsWith("!server")) {
      await this.sendServerInfo(message);
      return;
    }
  }

  // Send help embed
  private async sendHelp(message: any): Promise<void> {
    const embed = {
      title: "🛡️ OGFN Backend Discord Commands",
      color: 0x0099ff,
      fields: [
        { name: "!status", value: "Backend health status", inline: true },
        { name: "!season", value: "Current battle pass season", inline: true },
        { name: "!players", value: "Online players count", inline: true },
        { name: "!server", value: "Server information", inline: false },
        { name: "!help", value: "Show this help message", inline: false }
      ],
      timestamp: new Date()
    };

    await message.channel.send({ embeds: [embed] });
  }

  // Send status embed
  private async sendStatus(message: any): Promise<void> {
    try {
      const healthResponse = await this.fastify.ready;
      const isReady = await this.fastify.http.get("/health");

      const embed = {
        title: "🟢 OGFN Backend Status",
        color: 0x00ff00,
        fields: [
          { name: "Status", value: "Online", inline: true },
          { name: "Port", value: String(config.PORT), inline: true },
          { name: "Season", value: String(config.CURRENT_SEASON), inline: true },
          { name: "Battle Pass", value: config.BATTLEPASS_ENABLED ? "Enabled" : "Disabled", inline: true }
        ],
        timestamp: new Date()
      };

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Error fetching backend status:", error);
      await message.reply("❌ Could not connect to OGFN backend");
    }
  }

  // Send season info
  private async sendSeason(message: any): Promise<void> {
    const embed = {
      title: "🎮 Current Season",
      color: 0x9b59b6,
      fields: [
        { name: "Season", value: `Season ${config.CURRENT_SEASON}`, inline: true },
        { name: "Season Limit", value: String(config.SEASON_LIMIT), inline: true },
        { name: "Battle Pass", value: config.BATTLEPASS_ENABLED ? "Enabled" : "Disabled", inline: true },
        { name: "Shop Rotation", value: "Auto-rotate enabled", inline: false }
      ],
      timestamp: new Date()
    };

    await message.channel.send({ embeds: [embed] });
  }

  // Send players count (placeholder - would query backend)
  private async sendPlayers(message: any): Promise<void> {
    const embed = {
      title: "👥 Player Count",
      color: 0x3498db,
      fields: [
        { name: "Online", value: "Querying...", inline: true },
        { name: "Max Slots", value: "100", inline: true },
        { name: "Queue", value: "0", inline: true }
      ],
      timestamp: new Date()
    };

    await message.channel.send({ embeds: [embed] });
  }

  // Send OAuth2 info
  private async sendOAuth2(message: any): Promise<void> {
    const embed = {
      title: "🔑 Authentication",
      color: 0xe67e22,
      description: "Use `bearer eg1~<token>` format for API authentication",
      fields: [
        { name: "Token Format", value: "`bearer eg1~your_jwt_token`", inline: false },
        { name: "Endpoints", value: "Profile, Matchmaking, Shop, Party", inline: false },
        { name: "Login", value: "Use `/login` or visit auth endpoint", inline: false }
      ],
      timestamp: new Date()
    };

    await message.channel.send({ embeds: [embed] });
  }

  // Send server info
  private async sendServerInfo(message: any): Promise<void> {
    const embed = {
      title: "🖥️ Server Information",
      color: 0x95a5a6,
      fields: [
        { name: "Bot Status", value: this.ready ? "Online" : "Initializing", inline: true },
        { name: "Latency", value: `${Math.round(this.client?.latency || 0)}ms`, inline: true },
        { name: "Guilds", value: this.client?.guilds?.size.toString() || "0", inline: true },
        { name: "Uptime", value: this.client?.uptime ? `${Math.floor(this.client.uptime / 86400000)}d` : "0d", inline: true }
      ],
      timestamp: new Date()
    };

    await message.channel.send({ embeds: [embed] });
  }

  // Start Discord bot
  async start(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.login(process.env.DISCORD_TOKEN);
      console.log("🚀 Discord bot started successfully");
    } catch (error) {
      console.error("❌ Failed to start Discord bot:", error);
    }
  }

  // Stop Discord bot
  stop(): void {
    if (this.client) {
      this.client.destroy();
      console.log("🛑 Discord bot stopped");
    }
  }
}