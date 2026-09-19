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
const accountSessions = new Map();
const supabaseRequest = async (path, init) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
        throw new Error("Supabase account storage is not configured");
    const response = await fetch(`${url}/rest/v1/${path}`, {
        ...init,
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
            ...init?.headers,
        },
    });
    if (!response.ok)
        throw new Error(`Supabase request failed: ${response.status}`);
    return response.status === 204 ? undefined : await response.json();
};
const hashPassword = async (password) => {
    const salt = crypto_1.default.randomBytes(16).toString("hex");
    const key = await new Promise((resolve, reject) => {
        crypto_1.default.scrypt(password, salt, 64, (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
    });
    return `${salt}:${key.toString("hex")}`;
};
const verifyPassword = async (password, storedHash) => {
    const [salt, encodedKey] = storedHash.split(":");
    if (!salt || !encodedKey)
        return false;
    const key = await new Promise((resolve, reject) => {
        crypto_1.default.scrypt(password, salt, 64, (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
    });
    const expected = Buffer.from(encodedKey, "hex");
    return expected.length === key.length && crypto_1.default.timingSafeEqual(expected, key);
};
const accountSession = (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
    const session = token ? accountSessions.get(token) : undefined;
    if (!session || session.expiresAt < Date.now()) {
        if (token)
            accountSessions.delete(token);
        res.status(401).json({ error: "Account authentication required" });
        return null;
    }
    return { ...session, token };
};
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
    app.post("/api/account/login", async (req, res) => {
        const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
        const password = typeof req.body?.password === "string" ? req.body.password : "";
        if (!/^[a-zA-Z0-9_]{3,32}$/.test(username) || password.length < 8) {
            res.status(400).json({ error: "Username or password is invalid" });
            return;
        }
        try {
            const accounts = await supabaseRequest(`accounts?username=eq.${encodeURIComponent(username)}&select=id,username,password_hash&limit=1`);
            let account = accounts[0];
            if (account && !(await verifyPassword(password, account.password_hash))) {
                res.status(401).json({ error: "Invalid username or password" });
                return;
            }
            if (!account) {
                const created = await supabaseRequest("accounts", {
                    method: "POST",
                    body: JSON.stringify({ username, password_hash: await hashPassword(password), last_login: new Date().toISOString(), last_active_at: new Date().toISOString() }),
                });
                account = created[0];
                await supabaseRequest("account_data", { method: "POST", body: JSON.stringify({ account_id: account.id, data: {} }) });
            }
            else {
                await supabaseRequest(`accounts?id=eq.${account.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ last_login: new Date().toISOString(), last_active_at: new Date().toISOString() }),
                });
            }
            const token = crypto_1.default.randomBytes(32).toString("hex");
            accountSessions.set(token, { accountId: account.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
            res.json({ token, username: account.username });
        }
        catch (error) {
            console.error("Account login failed:", error);
            res.status(503).json({ error: "Cloud account storage is unavailable" });
        }
    });
    app.post("/api/temporary/users", async (req, res) => {
        const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
        if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
            res.status(400).json({ error: "Username is invalid" });
            return;
        }
        const now = new Date().toISOString();
        const existing = await db.get("SELECT id FROM users WHERE username = ?", username);
        if (existing) {
            await db.run("UPDATE users SET name = ?, session_type = 'temporary', last_active_at = ? WHERE id = ?", username, now, existing.id);
        }
        else {
            await db.run("INSERT INTO users (id, name, username, session_type, last_active_at) VALUES (?, ?, ?, 'temporary', ?)", crypto_1.default.randomUUID(), username, username, now);
        }
        res.json({ saved: true });
    });
    app.get("/api/account/data", async (req, res) => {
        const session = accountSession(req, res);
        if (!session)
            return;
        const rows = await supabaseRequest(`account_data?account_id=eq.${session.accountId}&select=data&limit=1`);
        res.json(rows[0]?.data || {});
    });
    app.put("/api/account/data", async (req, res) => {
        const session = accountSession(req, res);
        if (!session)
            return;
        await supabaseRequest(`account_data?account_id=eq.${session.accountId}`, {
            method: "PATCH",
            body: JSON.stringify({ data: req.body || {}, updated_at: new Date().toISOString() }),
        });
        const body = req.body && typeof req.body === "object" ? req.body : {};
        const tasks = Array.isArray(body.tasks) ? body.tasks : [];
        const streak = typeof body.activeStreak === "number" ? body.activeStreak : 0;
        const activeDaysThisMonth = typeof body.activeDaysThisMonth === "number" ? body.activeDaysThisMonth : 0;
        const device = typeof body.device === "string" ? body.device : "unknown";
        await supabaseRequest(`accounts?id=eq.${session.accountId}`, {
            method: "PATCH",
            body: JSON.stringify({
                last_active_at: new Date().toISOString(),
                streak,
                active_days_this_month: activeDaysThisMonth,
                device,
            }),
        });
        res.json({ saved: true });
    });
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
        const temporaryUsers = await db.all("SELECT username, last_active_at FROM users WHERE session_type = 'temporary' AND username IS NOT NULL ORDER BY last_active_at DESC");
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const [accounts, dataRows] = await Promise.all([
                supabaseRequest("accounts?select=username,streak,active_days_this_month,last_active_at,device&order=last_active_at.desc"),
                supabaseRequest("account_data?select=account_id,data,updated_at&order=updated_at.desc&limit=20"),
            ]);
            const activeSince = Date.now() - 24 * 60 * 60 * 1000;
            const recentActivity = dataRows.map((row) => ({
                title: `${row.data.tasks?.filter((task) => task.done).length || 0} completed tasks synced`,
                created_at: row.updated_at,
            }));
            res.json({
                totalUsers: accounts.length + temporaryUsers.length,
                activeUsers: accounts.filter((account) => account.last_active_at && Date.parse(account.last_active_at) >= activeSince).length
                    + temporaryUsers.filter((user) => user.last_active_at && Date.parse(user.last_active_at) >= activeSince).length,
                averageStreak: accounts.length ? Math.round(accounts.reduce((sum, account) => sum + (account.streak || 0), 0) / accounts.length) : 0,
                activeDays: accounts.reduce((sum, account) => sum + (account.active_days_this_month || 0), 0),
                completedTasks: dataRows.reduce((sum, row) => sum + (row.data.tasks?.filter((task) => task.done).length || 0), 0),
                totalTasks: dataRows.reduce((sum, row) => sum + (row.data.tasks?.length || 0), 0),
                recentActivity: [
                    ...temporaryUsers.slice(0, 8).map((user) => ({
                        title: `${user.username} started a temporary session`,
                        created_at: user.last_active_at || new Date().toISOString(),
                    })),
                    ...recentActivity,
                ].slice(0, 8),
                devices: accounts.map((account) => ({ username: account.username, device: account.device || "unknown" })),
            });
            return;
        }
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
