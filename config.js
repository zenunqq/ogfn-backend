"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const EnvSchema = zod_1.z.object({
    // Server Configuration
    PORT: zod_1.z.coerce.number().default(3551),
    HOST: zod_1.z.string().default("0.0.0.0"),
    // Security
    JWT_SECRET: zod_1.z.string().min(8),
    JWT_EXPIRES_IN: zod_1.z.string().default("24h"),
    BCRYPT_SALT_ROUNDS: zod_1.z.coerce.number().default(10),
    // Database
    DATABASE_PATH: zod_1.z.string().default("./ogfn.db"),
    // XMPP Server
    XMPP_PORT: zod_1.z.coerce.number().default(5222),
    XMPP_HOST: zod_1.z.string().default("0.0.0.0"),
    // Season/Battle Pass Configuration
    CURRENT_SEASON: zod_1.z.coerce.number().default(2),
    SEASON_LIMIT: zod_1.z.coerce.number().default(10),
    BATTLEPASS_ENABLED: zod_1.z.coerce.boolean().default(true),
    // Matchmaking
    MATCHMAKER_IP: zod_1.z.string().default("127.0.0.1"),
    MATCHMAKER_PORT: zod_1.z.coerce.number().default(3556),
    // CORS
    CORS_ORIGIN: zod_1.z.string().default("http://localhost:3000"),
});
const rawFromProcess = process.env;
const parsed = EnvSchema.safeParse(rawFromProcess);
if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.format());
    process.exit(1);
}
exports.config = parsed.data;
console.log("✅ Environment configuration loaded:");
console.log("   - Port:", exports.config.PORT);
console.log("   - JWT Secret: configured");
console.log("   - Database:", exports.config.DATABASE_PATH);
console.log("   - XMPP Port:", exports.config.XMPP_PORT);
console.log("   - Current Season:", exports.config.CURRENT_SEASON);
