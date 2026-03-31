const { WebSocket } = require("ws");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config");
const pool = require("../config");

const wsClients   = new Map();
const userSockets = new Map();

async function getConversationPartners(userId, limit = 20) {
    const { rows } = await pool.query(
        `SELECT DISTINCT ON (partner_id)
            CASE WHEN sender_id = $1 THEN recipient_id
                ELSE sender_id
            END AS partner_id,
            sent_at
        FROM messages
        WHERE sender_id = $1 OR recipient_id = $1
        ORDER BY partner_id, sent_at DESC
        LIMIT $2`,
        [userId, limit]
    )

    return rows.map((r) => r.partner_id)
}

function compositeKey(userA, userB) {
    return [userA, userB].sort().join("-")
}

async function saveMessage({ senderId, recipientId, text }) {
    const { rows } = await pool.query(
        `INSERT INTO messages
            (id, sender_id, recipient_id, conversation_key, text, sent_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id, sender_id, recipient_id, conversation_key, text, sent_at`,
        [uuidv4(), senderId, recipientId, compositeKey(senderId, recipientId), text]
    )

    return rows[0]
}

async function getHistory({ userA, userB, limit = 50 }) {
    const { rows } = await pool.query(
        `SELECT id, sender_id, recipient_id, text, sent_at
        FROM   messages
        WHERE  conversation_key = $1
        ORDER  BY sent_at DESC
        LIMIT  $2`,
        [compositeKey(userA, userB), limit]
    )

    return rows.reverse()
}

function registerSocket(userId, ws) {
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(ws);
}

function unregisterSocket(userId, ws) {
    const sockets = userSockets.get(userId)
    if (!sockets) return
    
    sockets.delete(ws)

    if (sockets.size === 0) userSockets.delete(userId)
}

function sendToUser(userId, payload) {
    const sockets = userSockets.get(userId)
    if (!sockets) return false
    
    const data = JSON.stringify(payload)

    let sent = false;
    for (const socket of sockets) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(data)
            sent = true
        }
    }

    return sent
}

function send(ws, payload) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
}

function isOnline(userId) {
    const sockets = userSockets.get(userId)
    if (!sockets) return false
    
    for (const s of sockets) {
        if (s.readyState === WebSocket.OPEN) return true
    }

    return false
}

async function broadcastPresence(userId, status) {
    try {
        const partners = await getConversationPartners(userId);
        const payload  = { type: "presence", user_id: userId, status }
        
        for (const partnerId of partners) {
            sendToUser(partnerId, payload)
        } 
    } catch (err) {
        console.error("[ws] broadcastPresence:", err)
    }
}

const webSocketServer = (server) => {
    const wss = new WebSocket.Server({ server })
    console.log("WebSocket Server created!")

    wss.on("connection", async (ws, req) => {
        let user, clientId

        try {
            const url   = new URL(req.url, `ws://${req.headers.host}`)
            const token = url.searchParams.get("token")
            if (!token) throw new Error("Missing token")

            user = jwt.verify(token, jwtConfig.secret)
            clientId = uuidv4();
        } catch {
            ws.close(1008, "Unauthorized");
            return;
        }

        wsClients.set(ws, { clientId, user_id: user.id })
        registerSocket(user.id, ws)

        send(ws, { type: "connected", clientId, user_id: user.id })

        try {
            const partners = await getConversationPartners(user.id)
            const statuses = partners.map((id) => ({
                user_id: id,
                status:  isOnline(id) ? "online" : "offline",
            }))
            if (statuses.length) send(ws, { type: "presence_list", statuses })
        } catch (err) {
            console.error("[ws] presence_list:", err)
        }

        const firstSocket = userSockets.get(user.id)?.size === 1
        if (firstSocket) broadcastPresence(user.id, "online")

        ws.on("message", async (raw) => {
            let msg

            try { 
                msg = JSON.parse(raw.toString()) 
            } catch { 
                return 
            }

            const client = wsClients.get(ws)
            if (!client) return

            switch (msg.type) {
                case "message": {
                    const { recipient_id, text } = msg;
                    if (!recipient_id || !text?.trim()) return

                    try {
                        const saved = await saveMessage({
                            senderId: client.user_id,
                            recipientId: recipient_id,
                            text: text.trim()
                        })
                        const payload = { type: "message", ...saved }

                        sendToUser(recipient_id, payload)
                        sendToUser(client.user_id, payload)
                    } catch (err) {
                        console.error("[ws] saveMessage:", err)
                        send(ws, { type: "error", message: "Failed to send message" })
                    }

                    break
                }

                case "get_history": {
                    const { recipient_id, limit } = msg
                    if (!recipient_id) return

                    try {
                        const messages = await getHistory({
                            userA: client.user_id,
                            userB: recipient_id,
                            limit: Number(limit) || 50
                        })

                        send(ws, {
                            type: "history",
                            conversation_key: compositeKey(client.user_id, recipient_id),
                            messages
                        })
                    } catch (err) {
                        console.error("[ws] getHistory:", err)
                    }

                    break
                }

                case "typing": {
                    const { recipient_id, isTyping } = msg
                    if (!recipient_id) return

                    sendToUser(recipient_id, {
                        type: "typing",
                        sender_id: client.user_id,
                        isTyping: Boolean(isTyping)
                    })

                    break
                }

                case "get_presence": {
                    const { user_ids } = msg
                    if (!Array.isArray(user_ids) || !user_ids.length) return

                    const statuses = user_ids.map((id) => ({
                        user_id: id,
                        status: isOnline(id) ? "online" : "offline",
                    }))

                    send(ws, { type: "presence_list", statuses })
                    
                    break
                }
            }
        })

        ws.on("close", () => {
            const client = wsClients.get(ws)
            
            if (client) {
                unregisterSocket(client.user_id, ws)
                wsClients.delete(ws)

                // broadcast offline when user has no socket left
                if (!isOnline(client.user_id)) {
                    broadcastPresence(client.user_id, "offline")
                }
            }
        })

        ws.on("error", (err) => console.error("[ws] socket error:", err))
    })
}

module.exports = webSocketServer