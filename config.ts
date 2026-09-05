import { z } from "zod";

const EnvSchema = z.object({
  // Server Configuration
  PORT: z.coerce.number().default(3551),
  HOST: z.string().default("0.0.0.0"),

  // Security
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default("24h"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(10),

  // Database
  DATABASE_PATH: z.string().default("./ogfn.db"),

  // XMPP Server
  XMPP_PORT: z.coerce.number().default(5222),
  XMPP_HOST: z.string().default("0.0.0.0"),

  // Season/Battle Pass Configuration
  CURRENT_SEASON: z.coerce.number().default(2),
  SEASON_LIMIT: z.coerce.number().default(10),
  BATTLEPASS_ENABLED: z.coerce.boolean().default(true),

  // Matchmaking
  MATCHMAKER_IP: z.string().default("127.0.0.1"),
  MATCHMAKER_PORT: z.coerce.number().default(3556),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

const rawFromProcess = process.env;
const parsed = EnvSchema.safeParse(rawFromProcess);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

console.log("✅ Environment configuration loaded:");
console.log("   - Port:", config.PORT);
console.log("   - JWT Secret: configured");
console.log("   - Database:", config.DATABASE_PATH);
console.log("   - XMPP Port:", config.XMPP_PORT);
console.log("   - Current Season:", config.CURRENT_SEASON);