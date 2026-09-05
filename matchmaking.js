"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchmakingRoutes = matchmakingRoutes;
async function matchmakingRoutes(fastify) {
    // Playlist names
    fastify.get("/fortnite/api/playlistnames", async (request, reply) => {
        const playlists = [
            "default",
            "competitive",
            "build",
            "default_2v2",
            "default_3v3",
            "default_4v4"
        ];
        reply.send({ playlists });
    });
    // Get lobby session
    fastify.get("/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId", async (request, reply) => {
        const { accountId, sessionId } = request.params;
        // Simulate session creation
        reply.send({
            session: {
                session_id: sessionId,
                address: "127.0.0.1",
                port: 7777,
                gaemode: "SaveTheWorld",
                playlist: "default",
                session_key: Math.random().toString(36).substr(2, 16),
                bIsLobby: true,
                acketKey: "account_key_" + Math.random().toString(36).substr(2, 8)
            }
        });
    });
    // Get matchmaking ticket with details
    fastify.get("/fortnite/api/matchmaking/session/findPlayer/*", async (request, reply) => {
        const ticketId = request.params["*"] || "default";
        reply.send({
            ticket_found: true,
            bucket_id: Math.floor(Math.random() * 100),
            queue_time: 0,
            server_versions: ["16.00.0", "16.00.1", "16.00.2"]
        });
    });
}
