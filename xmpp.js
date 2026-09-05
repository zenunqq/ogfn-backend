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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createXMPPServer = createXMPPServer;
exports.setupXMPPUpgrade = setupXMPPUpgrade;
const ws_1 = __importDefault(require("ws"));
const database_1 = require("./database");
function createXMPPServer(httpServer, dbPath = "./ogfn.db") {
    const wss = new ws_1.default.Server({
        noServer: true,
        perMessageDeflate: false, // Disabled for performance
        clientTracking: true
    });
    let db = (0, database_1.createDatabase)(dbPath);
    // Set database instance
    wss.setDatabase = (database) => {
        db = database;
    };
    wss.on("connection", (ws, request) => {
        const clientIp = request.socket.remoteAddress;
        let authenticated = false;
        let accountId = null;
        ws.on("message", async (message) => {
            try {
                const msg = message.toString();
                // Handle authentication
                if (msg.startsWith("<auth>")) {
                    // Extract base64 encoded credentials from SASL PLAIN
                    const authMatch = msg.match(/<username>([^<]+)<\/username>.*<password>([^<]+)<\/password>/);
                    if (authMatch) {
                        const username = authMatch[1];
                        const password = authMatch[2];
                        // Authenticate user against database
                        const user = db.getUserByAccountId(username);
                        if (user && user.password_hash) {
                            const bcrypt = await Promise.resolve().then(() => __importStar(require("bcryptjs")));
                            const validPassword = await bcrypt.compare(password, user.password_hash);
                            if (validPassword) {
                                authenticated = true;
                                accountId = username;
                                ws.accountId = username;
                                ws.send(`<presence from="${username}" type="available"/>`);
                                ws.send(`<iq type="get" name="bind"><bind><jid>${username}</jid></bind></iq>`);
                                ws.send(`<iq type="set" name="session"><session>${username}</session></iq>`);
                                ws.send(`<presence from="${username}" type="available"/>`);
                            }
                            else {
                                ws.send(`<iq type="error"><error type="auth"><fail/></error></iq>`);
                                ws.close();
                            }
                        }
                        else {
                            ws.send(`<iq type="error"><error type="auth"><fail/></error></iq>`);
                            ws.close();
                        }
                    }
                }
                // Handle presence
                else if (msg.startsWith("<presence")) {
                    if (!authenticated) {
                        ws.close();
                        return;
                    }
                    // Broadcast presence to other clients
                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === ws_1.default.OPEN) {
                            client.send(msg);
                        }
                    });
                }
                // Handle messages
                else if (msg.startsWith("<message")) {
                    if (!authenticated) {
                        ws.close();
                        return;
                    }
                    // Broadcast chat message
                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === ws_1.default.OPEN) {
                            client.send(msg);
                        }
                    });
                }
                // Handle IQ stanzas
                else if (msg.startsWith("<iq")) {
                    if (!authenticated) {
                        ws.close();
                        return;
                    }
                    // Respond to IQ requests
                    ws.send(`<iq type="result" from="${accountId}">${msg}</iq>`);
                }
            }
            catch (error) {
                console.error("XMPP message error:", error.message);
                ws.send(`<iq type="error"><error type="cancel"><message>${error.message}</message></error></iq>`);
            }
        });
        ws.on("close", () => {
            // Handle client disconnect
            console.log(`XMPP client disconnected: ${accountId || clientIp}`);
        });
    });
    return wss;
}
// Upgrade HTTP request to WebSocket for XMPP
function setupXMPPUpgrade(server) {
    server.on("upgrade", (request, socket, head) => {
        // Upgrade to WebSocket on port 5222 (XMPP)
        const wss = createXMPPServer(server);
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
        });
    });
}
