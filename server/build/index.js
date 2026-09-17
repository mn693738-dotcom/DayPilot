"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("./db");
const tasks_1 = __importDefault(require("./routes/tasks"));
dotenv_1.default.config();
const PORT = process.env.PORT || 4000;
const otpStore = new Map();
const adminSessions = new Map();
const verifyAdminPassword = async (password) => {
    const storedHash = process.env.ADMIN_PASSWORD_HASH;
    if (!storedHash)
        return false;
    const [salt, encodedKey] = storedHash.split(":");
    if (!salt || !encodedKey)
        return false;
    const derivedKey = await new Promise((resolve, reject) => {
        crypto_1.default.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key));
    });
    const expectedKey = Buffer.from(encodedKey, "hex");
    return expectedKey.length === derivedKey.length && crypto_1.default.timingSafeEqual(expectedKey, derivedKey);
};
const requireAdmin = (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
    const session = token ? adminSessions.get(token) : undefined;
    if (!session || session.expiresAt < Date.now()) {
        if (token)
            adminSessions.delete(token);
        res.status(401).json({ error: "Admin authentication required" });
        return null;
    }
    return session;
};
async function start() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    const db = await (0, db_1.initDb)();
    app.get("/api/health", (req, res) => res.json({ status: "ok" }));
    app.post("/api/admin/login", async (req, res) => {
        const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
        const password = typeof req.body?.password === "string" ? req.body.password : "";
        const allowedUsers = (process.env.ADMIN_USERNAMES || "").split(",").map((value) => value.trim()).filter(Boolean);
        if (!allowedUsers.includes(username) || !(await verifyAdminPassword(password))) {
            res.status(401).json({ error: "Invalid admin credentials" });
            return;
        }
        const token = crypto_1.default.randomBytes(32).toString("hex");
        adminSessions.set(token, { username, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
        res.json({ token, username });
    });
    app.post("/api/auth/send-otp", async (req, res) => {
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ error: "A valid email address is required" });
            return;
        }
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
        if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
            res.status(503).json({ error: "Email delivery is not configured on the server" });
            return;
        }
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const transporter = nodemailer_1.default.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
        try {
            await transporter.sendMail({
                from: SMTP_FROM,
                to: email,
                subject: "Your DayPilot verification code",
                text: `Your DayPilot verification code is ${code}. It expires in 10 minutes.`,
                html: `<p>Your DayPilot verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
            });
            otpStore.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
            res.json({ message: "Verification code sent" });
        }
        catch (error) {
            console.error("Failed to send verification email:", error);
            res.status(502).json({ error: "Unable to send verification email" });
        }
    });
    app.post("/api/auth/verify-otp", (req, res) => {
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
        const stored = otpStore.get(email);
        if (!stored || stored.expiresAt < Date.now() || stored.code !== code) {
            res.status(400).json({ error: "Invalid or expired verification code" });
            return;
        }
        otpStore.delete(email);
        res.json({ verified: true });
    });
    app.get("/api/admin/overview", async (req, res) => {
        if (!requireAdmin(req, res))
            return;
        const [userCounts, taskCounts, recentActivity] = await Promise.all([
            db.get("SELECT COUNT(*) AS total, SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) AS active FROM users"),
            db.get("SELECT SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed, COUNT(*) AS total FROM tasks"),
            db.all("SELECT title, created_at FROM tasks ORDER BY created_at DESC LIMIT 8"),
        ]);
        res.json({
            totalUsers: userCounts?.total || 0,
            activeUsers: userCounts?.active || 0,
            completedTasks: taskCounts?.completed || 0,
            totalTasks: taskCounts?.total || 0,
            recentActivity,
        });
    });
    app.use("/api/tasks", (0, tasks_1.default)(db));
    app.listen(PORT, () => {
        console.log(`DayPilot server listening on port ${PORT}`);
    });
}
start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
