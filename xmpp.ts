import WebSocket from "ws";
import { createDatabase } from "./database";

export function createXMPPServer(httpServer: any, dbPath: string = "./ogfn.db") {
  const wss = new WebSocket.Server({
    noServer: true,
    perMessageDeflate: false, // Disabled for performance
    clientTracking: true
  }) as any;

  let db: any = createDatabase(dbPath);

  // Set database instance
  (wss as any).setDatabase = (database: any) => {
    db = database;
  };

  wss.on("connection", (ws: any, request: any) => {
    const clientIp = request.socket.remoteAddress;
    let authenticated = false;
    let accountId: string | null = null;

    ws.on("message", async (message: any) => {
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
              const bcrypt = await import("bcryptjs");
              const validPassword = await bcrypt.compare(password, user.password_hash);
              if (validPassword) {
                authenticated = true;
                accountId = username;
                ws.accountId = username;
                ws.send(`<presence from="${username}" type="available"/>`);
                ws.send(`<iq type="get" name="bind"><bind><jid>${username}</jid></bind></iq>`);
                ws.send(`<iq type="set" name="session"><session>${username}</session></iq>`);
                ws.send(`<presence from="${username}" type="available"/>`);
              } else {
                ws.send(`<iq type="error"><error type="auth"><fail/></error></iq>`);
                ws.close();
              }
            } else {
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
          wss.clients.forEach((client: any) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
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
          wss.clients.forEach((client: any) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
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

      } catch (error: any) {
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
export function setupXMPPUpgrade(server: any) {
  server.on("upgrade", (request: any, socket: any, head: any) => {
    // Upgrade to WebSocket on port 5222 (XMPP)
    const wss = createXMPPServer(server);
    wss.handleUpgrade(request, socket, head, (ws: any) => {
      wss.emit("connection", ws, request);
    });
  });
}