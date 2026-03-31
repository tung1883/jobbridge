const express = require("express")
const { v4: uuidv4} = require("uuid")

const router = express.Router()
const auth = require("../middleware/auth")

const sseClients = new Map()

router.get("/stream", auth, (req, res) => {
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")
    res.setHeader("X-Accel-Buffering", "no") // disable nginx buffering
    res.flushHeaders()

    const userID = req.user.id

    const clientId = uuidv4()
    sseClients.set(clientId, { res, userID })

    res.write(
        `data: ${JSON.stringify({
            type: "connected",
            clientId,
            message: "SSE stream connected",
            timestamp: Date.now(),
        })}\n\n`,
    )

    // heartbeat every 30s to keep connection alive
    const heartbeat = setInterval(() => {
        res.write(`: heartbeat\n\n`)
    }, 30000)

    req.on("close", () => {
        clearInterval(heartbeat)
        sseClients.delete(clientId)
    })
})

// use for testing
router.post("/notify", (req, res) => {
    const { title, message, type = "info", target } = req.body

    const notification = {
        type: "notification",
        id: uuidv4(),
        title: title || "Notification",
        message: message || "",
        notifType: type,
        timestamp: Date.now(),
    }

    let sent = 0
    for (const [id, client] of sseClients) {
        if (!target || id === target) {
            client.res.write(`data: ${JSON.stringify(notification)}\n\n`)
            sent++
        }
    }

    res.json({ success: true, sent, totalClients: sseClients.size })
})

const updateApplicantStatus = ({ user_id, status }) => {
    const event = {
        type: "application_update",
        id: uuidv4(),
        status,
        timestamp: Date.now(),
    }

    let sent = 0

    for (const [, client] of sseClients) {
        if (client.userID === user_id) {
            client.res.write(`data: ${JSON.stringify(event)}\n\n`)
            sent++
        }
    }

    return { success: true, sent }
}

module.exports = { router, updateApplicantStatus }