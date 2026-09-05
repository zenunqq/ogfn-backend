"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRoutes = profileRoutes;
const auth_1 = require("../auth");
const config_1 = require("../config");
async function profileRoutes(fastify, dbInstance) {
    const db = dbInstance;
    const CURRENT_SEASON = config_1.config.CURRENT_SEASON;
    // ===== Authentication Endpoints =====
    // User registration
    fastify.post("/fortnite/api/auth/v1/registration/signup", async (request, reply) => {
        const { account_id, username, email, password } = request.body;
        // Hash password
        const bcrypt = await Promise.resolve().then(() => __importStar(require("bcryptjs")));
        const passwordHash = await bcrypt.hash(password, 10);
        // Check if user exists
        const existingUser = db.getUserByAccountId(account_id);
        if (existingUser) {
            reply.code(409).send({ error: "Account already exists" });
            return;
        }
        // Create user
        const result = db.createUser(account_id, username, email, passwordHash);
        if (result.changes === 0) {
            reply.code(500).send({ error: "Failed to create user" });
            return;
        }
        // Create profile
        db.createProfile(account_id, "{}");
        // Generate token
        const token = (0, auth_1.generateToken)(account_id, username);
        reply.send({
            token,
            type: "access_token",
            expires_in: "24h"
        });
    });
    // User login
    fastify.post("/fortnite/api/auth/v1/login", async (request, reply) => {
        const { account_id, password } = request.body;
        const user = db.getUserByAccountId(account_id);
        if (!user) {
            reply.code(401).send({ error: "Invalid credentials" });
            return;
        }
        const bcrypt = await Promise.resolve().then(() => __importStar(require("bcryptjs")));
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            reply.code(401).send({ error: "Invalid credentials" });
            return;
        }
        // Update last login
        db.updateUserLastLogin(user.id);
        // Generate token
        const token = (0, auth_1.generateToken)(user.account_id, user.username);
        reply.send({
            token,
            type: "access_token",
            expires_in: "24h"
        });
    });
    // ===== Profile Protocol Endpoints =====
    // Client Quest Login - daily quests and seasonal quests
    fastify.post("/fortnite/api/game/v2/profile/:accountId/client/ClientQuestLogin", async (request, reply) => {
        const user = request.user;
        const accountId = user?.accountId;
        if (!accountId) {
            reply.code(401).send({ error: "Unauthenticated" });
            return;
        }
        const profile = db.getProfileByAccountId(accountId);
        if (!profile) {
            reply.code(404).send({ error: "Profile not found" });
            return;
        }
        // Update last modified
        db.updateProfile(accountId, profile.data);
        // Return quest data
        reply.send({
            profile: JSON.parse(profile.data),
            quests: {
                daily: {
                    quests: [
                        { id: "daily_1", title: "Eliminate enemies", progress: 0, target: 10, reward: 500 },
                        { id: "daily_2", title: "Survive matches", progress: 0, target: 5, reward: 500 }
                    ]
                },
                seasonal: {
                    quests: [
                        { id: "season_1", title: "Seasonal challenge", progress: 0, target: 15, reward: 1000 }
                    ]
                }
            }
        });
    });
    // Fort Daily Quest Reroll
    fastify.post("/fortnite/api/game/v2/profile/:accountId/client/FortRerollDailyQuest", async (request, reply) => {
        const user = request.user;
        const accountId = user?.accountId;
        if (!accountId) {
            reply.code(401).send({ error: "Unauthenticated" });
            return;
        }
        const profile = db.getProfileByAccountId(accountId);
        if (!profile) {
            reply.code(404).send({ error: "Profile not found" });
            return;
        }
        const data = JSON.parse(profile.data);
        // Simple reroll - just reset progress
        data.dailyQuestProgress = 0;
        db.updateProfile(accountId, JSON.stringify(data));
        reply.send({ success: true });
    });
    // Athena Pin Quest
    fastify.post("/fortnite/api/game/v2/profile/:accountId/client/AthenaPinQuest", async (request, reply) => {
        const user = request.user;
        const accountId = user?.accountId;
        if (!accountId) {
            reply.code(401).send({ error: "Unauthenticated" });
            return;
        }
        const profile = db.getProfileByAccountId(accountId);
        if (!profile) {
            reply.code(404).send({ error: "Profile not found" });
            return;
        }
        const data = JSON.parse(profile.data);
        data.pinnedQuests = data.pinnedQuests || [];
        db.updateProfile(accountId, JSON.stringify(data));
        reply.send({ success: true });
    });
    // Gift Catalog Entry
    fastify.post("/fortnite/api/game/v2/profile/:accountId/client/GiftCatalogEntry", async (request, reply) => {
        const user = request.user;
        const accountId = user?.accountId;
        const { entry_id } = request.body;
        if (!accountId) {
            reply.code(401).send({ error: "Unauthenticated" });
            return;
        }
        const profile = db.getProfileByAccountId(accountId);
        if (!profile) {
            reply.code(404).send({ error: "Profile not found" });
            return;
        }
        const data = JSON.parse(profile.data);
        data.giftEntries = data.giftEntries || [];
        data.giftEntries.push({ entry_id, gifted: false });
        db.updateProfile(accountId, JSON.stringify(data));
        reply.send({ success: true });
    });
    // Unlock Reward Node
    fastify.post("/fortnite/api/game/v2/profile/:accountId/client/UnlockRewardNode", async (request, reply) => {
        const user = request.user;
        const accountId = user?.accountId;
        const { node_id } = request.body;
        if (!accountId) {
            reply.code(401).send({ error: "Unauthenticated" });
            return;
        }
        const profile = db.getProfileByAccountId(accountId);
        if (!profile) {
            reply.code(404).send({ error: "Profile not found" });
            return;
        }
        const data = JSON.parse(profile.data);
        data.unlockedNodes = data.unlockedNodes || [];
        data.unlockedNodes.push(node_id);
        db.updateProfile(accountId, JSON.stringify(data));
        reply.send({ success: true });
    });
    // Receive Gifts Enabled
    fastify.post("/fortnite/api/game/v2/profile/:accountId/client/SetReceiveGiftsEnabled", async (request, reply) => {
        const user = request.user;
        const accountId = user?.accountId;
        const { enabled } = request.body;
        if (!accountId) {
            reply.code(401).send({ error: "Unauthenticated" });
            return;
        }
        const profile = db.getProfileByAccountId(accountId);
        if (!profile) {
            reply.code(404).send({ error: "Profile not found" });
            return;
        }
        const data = JSON.parse(profile.data);
        data.receiveGifts = enabled;
        db.updateProfile(accountId, JSON.stringify(data));
        reply.send({ success: true });
    });
    // ===== World Info Endpoint =====
    // World info for client
    fastify.get("/fortnite/api/game/v2/world/info", async (request, reply) => {
        const season = CURRENT_SEASON;
        const chapter = 1; // Default chapter
        reply.send({
            world_playlist_blueprints: [],
            enabled_features: [],
            chapter,
            season,
            time: {
                seconds_elapsed: Math.floor(Date.now() / 1000),
                time_offset: 0
            },
            v14n: true,
            v14n_tier: 3
        });
    });
    // ===== Enabled Features =====
    fastify.get("/fortnite/api/game/v2/enabled_features", async (request, reply) => {
        const season = CURRENT_SEASON;
        const features = {};
        // Based on season, enable/disable features
        if (season >= 1)
            features["core_gameplay"] = true;
        if (season >= 2)
            features["battle_pass"] = config_1.config.BATTLEPASS_ENABLED;
        if (season >= 3)
            features["arena"] = true;
        if (season >= 4)
            features["creative_2"] = true;
        reply.send(features);
    });
    // ===== Matchmaking Ticket Endpoints =====
    // Find player for matchmaking
    fastify.get("/fortnite/api/game/v2/matchmakingservice/ticket/player/*", async (request, reply) => {
        const user = request.user;
        const accountId = user?.accountId;
        const playerPath = request.params["*"] || "";
        if (!accountId) {
            reply.code(401).send({ error: "Unauthenticated" });
            return;
        }
        const ticket = db.getMMTicket(playerPath);
        if (!ticket) {
            reply.code(404).send({ error: "Ticket not found" });
            return;
        }
        reply.send({
            ticket: ticket.ticket_data,
            playlist: "default_playlist",
            bucket_id: ticket.bucket_id || 0
        });
    });
    // ===== Shop Rotation =====
    // Get item shop
    fastify.get("/fortnite/api/game/v2/shop/offers", async (request, reply) => {
        const season = CURRENT_SEASON;
        const rotation = db.getShopRotation(season);
        let items = [];
        if (rotation?.items) {
            try {
                items = JSON.parse(rotation.items);
            }
            catch {
                items = [];
            }
        }
        // Generate shop offers based on season
        const shopOffers = items.slice(0, 5).map((item, index) => ({
            offer_id: `shop_${index}`,
            cosmetics: [{ id: item, quantity: 1 }],
            pricing: {
                vBucks: 1000 + (index * 200)
            }
        }));
        reply.send({
            shop_offers: shopOffers,
            use_vbucks: true,
            vbucks_balance: 10000
        });
    });
    // ===== Party Endpoints =====
    // Create party
    fastify.post("/fortnite/api/party/v1/create", async (request, reply) => {
        const user = request.user;
        const accountId = user?.accountId;
        if (!accountId) {
            reply.code(401).send({ error: "Unauthenticated" });
            return;
        }
        const profile = db.getProfileByAccountId(accountId);
        if (!profile) {
            reply.code(404).send({ error: "Profile not found" });
            return;
        }
        const data = JSON.parse(profile.data);
        data.party = data.party || {
            id: Math.random().toString(36).substr(2, 9),
            creator: accountId,
            members: [accountId],
            invite_only: true
        };
        db.updateProfile(accountId, JSON.stringify(data));
        reply.send({ success: true, party: data.party });
    });
    // Join party
    fastify.post("/fortnite/api/party/v1/join", async (request, reply) => {
        const user = request.user;
        const accountId = user?.accountId;
        const { party_id } = request.body;
        if (!accountId) {
            reply.code(401).send({ error: "Unauthenticated" });
            return;
        }
        const profile = db.getProfileByAccountId(accountId);
        if (!profile) {
            reply.code(404).send({ error: "Profile not found" });
            return;
        }
        const data = JSON.parse(profile.data);
        data.party = data.party || {};
        data.party.members = data.party.members || [];
        if (!data.party.members.includes(accountId)) {
            data.party.members.push(accountId);
        }
        db.updateProfile(accountId, JSON.stringify(data));
        reply.send({ success: true, party: data.party });
    });
}
