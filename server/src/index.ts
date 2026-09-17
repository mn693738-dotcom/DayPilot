import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { initDb } from "./db";
import tasksRouter from "./routes/tasks";

dotenv.config();

const PORT = process.env.PORT || 4000;
const otpStore = new Map<string, { code: string; expiresAt: number }>();
const adminSessions = new Map<string, { username: string; expiresAt: number }>();
const accountSessions = new Map<string, { accountId: string; expiresAt: number }>();

const supabaseRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase account storage is not configured");
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
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  return response.status === 204 ? (undefined as T) : await response.json() as T;
};

const hashPassword = async (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
  });
  return `${salt}:${key.toString("hex")}`;
};

const verifyPassword = async (password: string, storedHash: string) => {
  const [salt, encodedKey] = storedHash.split(":");
  if (!salt || !encodedKey) return false;
  const key = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
  });
  const expected = Buffer.from(encodedKey, "hex");
  return expected.length === key.length && crypto.timingSafeEqual(expected, key);
};

const accountSession = (req: express.Request, res: express.Response) => {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const session = token ? accountSessions.get(token) : undefined;
  if (!session || session.expiresAt < Date.now()) {
    if (token) accountSessions.delete(token);
    res.status(401).json({ error: "Account authentication required" });
    return null;
  }
  return { ...session, token };
};

const verifyAdminPassword = async (password: string) => {
  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!storedHash) return false;

  const [salt, encodedKey] = storedHash.split(":");
  if (!salt || !encodedKey) return false;

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key));
  });
  const expectedKey = Buffer.from(encodedKey, "hex");
  return expectedKey.length === derivedKey.length && crypto.timingSafeEqual(expectedKey, derivedKey);
};

const requireAdmin = (req: express.Request, res: express.Response) => {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const session = token ? adminSessions.get(token) : undefined;
  if (!session || session.expiresAt < Date.now()) {
    if (token) adminSessions.delete(token);
    res.status(401).json({ error: "Admin authentication required" });
    return null;
  }
  return session;
};

async function start() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const db = await initDb();

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.post("/api/account/login", async (req, res) => {
    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username) || password.length < 8) {
      res.status(400).json({ error: "Username or password is invalid" });
      return;
    }

    try {
      type Account = { id: string; username: string; password_hash: string };
      const accounts = await supabaseRequest<Account[]>(`accounts?username=eq.${encodeURIComponent(username)}&select=id,username,password_hash&limit=1`);
      let account = accounts[0];
      if (account && !(await verifyPassword(password, account.password_hash))) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }
      if (!account) {
        const created = await supabaseRequest<Account[]>("accounts", {
          method: "POST",
          body: JSON.stringify({ username, password_hash: await hashPassword(password), last_login: new Date().toISOString(), last_active_at: new Date().toISOString() }),
        });
        account = created[0];
        await supabaseRequest("account_data", { method: "POST", body: JSON.stringify({ account_id: account.id, data: {} }) });
      } else {
        await supabaseRequest(`accounts?id=eq.${account.id}`, {
          method: "PATCH",
          body: JSON.stringify({ last_login: new Date().toISOString(), last_active_at: new Date().toISOString() }),
        });
      }
      const token = crypto.randomBytes(32).toString("hex");
      accountSessions.set(token, { accountId: account.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
      res.json({ token, username: account.username });
    } catch (error) {
      console.error("Account login failed:", error);
      res.status(503).json({ error: "Cloud account storage is unavailable" });
    }
  });

  app.get("/api/account/data", async (req, res) => {
    const session = accountSession(req, res);
    if (!session) return;
    const rows = await supabaseRequest<Array<{ data: Record<string, unknown> }>>(`account_data?account_id=eq.${session.accountId}&select=data&limit=1`);
    res.json(rows[0]?.data || {});
  });

  app.put("/api/account/data", async (req, res) => {
    const session = accountSession(req, res);
    if (!session) return;
    await supabaseRequest(`account_data?account_id=eq.${session.accountId}`, {
      method: "PATCH",
      body: JSON.stringify({ data: req.body || {}, updated_at: new Date().toISOString() }),
    });
    const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    const tasks = Array.isArray(body.tasks) ? body.tasks as Array<{ done?: boolean }> : [];
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

    const token = crypto.randomBytes(32).toString("hex");
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
    const transporter = nodemailer.createTransport({
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
    } catch (error) {
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
    if (!requireAdmin(req, res)) return;

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      type Account = { username: string; streak: number; active_days_this_month: number; last_active_at: string | null; device: string | null };
      type AccountData = { account_id: string; data: { tasks?: Array<{ done?: boolean }> }; updated_at: string };
      const [accounts, dataRows] = await Promise.all([
        supabaseRequest<Account[]>("accounts?select=username,streak,active_days_this_month,last_active_at,device&order=last_active_at.desc"),
        supabaseRequest<AccountData[]>("account_data?select=account_id,data,updated_at&order=updated_at.desc&limit=20"),
      ]);
      const activeSince = Date.now() - 24 * 60 * 60 * 1000;
      const recentActivity = dataRows.map((row) => ({
        title: `${row.data.tasks?.filter((task) => task.done).length || 0} completed tasks synced`,
        created_at: row.updated_at,
      }));
      res.json({
        totalUsers: accounts.length,
        activeUsers: accounts.filter((account) => account.last_active_at && Date.parse(account.last_active_at) >= activeSince).length,
        averageStreak: accounts.length ? Math.round(accounts.reduce((sum, account) => sum + (account.streak || 0), 0) / accounts.length) : 0,
        activeDays: accounts.reduce((sum, account) => sum + (account.active_days_this_month || 0), 0),
        completedTasks: dataRows.reduce((sum, row) => sum + (row.data.tasks?.filter((task) => task.done).length || 0), 0),
        totalTasks: dataRows.reduce((sum, row) => sum + (row.data.tasks?.length || 0), 0),
        recentActivity,
        devices: accounts.map((account) => ({ username: account.username, device: account.device || "unknown" })),
      });
      return;
    }

    const [userCounts, taskCounts, recentActivity] = await Promise.all([
      db.get<{ total: number; active: number }>(
        "SELECT COUNT(*) AS total, SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) AS active FROM users"
      ),
      db.get<{ completed: number; total: number }>(
        "SELECT SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed, COUNT(*) AS total FROM tasks"
      ),
      db.all<{ title: string; created_at: string }[]>(
        "SELECT title, created_at FROM tasks ORDER BY created_at DESC LIMIT 8"
      ),
    ]);

    res.json({
      totalUsers: userCounts?.total || 0,
      activeUsers: userCounts?.active || 0,
      completedTasks: taskCounts?.completed || 0,
      totalTasks: taskCounts?.total || 0,
      recentActivity,
    });
  });

  app.use("/api/tasks", tasksRouter(db));

  app.listen(PORT, () => {
    console.log(`DayPilot server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
