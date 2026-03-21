const bcrypt = require("bcrypt")
const crypto = require("crypto")
const jwt = require("jsonwebtoken")

const pool = require("../../config/db")
const { jwt: jwtConfig } = require("../../config")
const { toPostgresInterval } = require("../utils/jwt")

const registerUser = async ({ email, password, role }) => {
    let client
    try {
        client = await pool.connect()
        await client.query("BEGIN")

        const existing = await client.query("SELECT id FROM users WHERE email=$1", [email])

        if (existing.rows.length > 0) {
            throw { status: 400, message: "Email already registered" }
        }

        const hash = await bcrypt.hash(password, 10)
        const result = await client.query("INSERT INTO users(email, password_hash, role) VALUES($1,$2,$3) RETURNING id, email, role", [
            email,
            hash,
            role,
        ])

        const userId = result.rows[0].id

        if (role === "job_seeker") {
            await client.query("INSERT INTO candidate_profiles (user_id) VALUES ($1)", [userId])
        } else if (role === "recruiter") {
            await client.query("INSERT INTO companies (user_id) VALUES ($1)", [userId])
        }

        await client.query("COMMIT")
        return result.rows[0]
    } catch (err) {
        if (client) await client.query("ROLLBACK")
        throw err
    } finally {
        if (client) client.release()
    }
}

const loginUser = async ({ email, password }) => {
    const result = await pool.query("SELECT id, email, role, password_hash FROM users WHERE email=$1", [email])

    const user = result.rows[0]
    if (!user) throw { status: 401, message: "Invalid credentials" }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) throw { status: 401, message: "Invalid credentials" }

    const accessToken = jwt.sign({ id: user.id, role: user.role, jti: crypto.randomUUID() }, jwtConfig.secret, { expiresIn: jwtConfig.accessExpiry })

    const refreshToken = jwt.sign({ id: user.id, jti: crypto.randomUUID() }, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpiry })

    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")

    await pool.query(
        `INSERT INTO refresh_tokens(user_id, token, expires_at)
     VALUES($1, $2, NOW() + INTERVAL '${toPostgresInterval(jwtConfig.refreshExpiry)}')`,
        [user.id, refreshTokenHash],
    )

    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        email: user.email,
        role: user.role,
    }
}

const refreshAccessToken = async (refreshToken) => {
    let decoded
    try {
        decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret)
    } catch (err) {
        throw { status: 401, message: "Invalid refresh token" }
    }

    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")

    const result = await pool.query(
        `SELECT * FROM refresh_tokens
     WHERE token=$1
     AND user_id=$2
     AND expires_at > NOW()
     AND revoked = false`,
        [tokenHash, decoded.id],
    )

    if (result.rows.length === 0) {
        throw { status: 401, message: "Refresh token not found or expired" }
    }

    const userResult = await pool.query("SELECT id, email, role FROM users WHERE id=$1", [decoded.id])

    const user = userResult.rows[0]
    if (!user) throw { status: 401, message: "User not found" }

    const accessToken = jwt.sign({ id: user.id, role: user.role, jti: crypto.randomUUID() }, jwtConfig.secret, { expiresIn: jwtConfig.accessExpiry })

    return { access_token: accessToken }
}

const logoutUser = async ({ userId, refreshToken }) => {
    if (refreshToken) {
        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")

        await pool.query("UPDATE refresh_tokens SET revoked=true WHERE token=$1 AND user_id=$2", [tokenHash, userId])
    }
}

module.exports = { registerUser, loginUser, refreshAccessToken, logoutUser }
