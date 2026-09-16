import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { initDb } from "./db";
import tasksRouter from "./routes/tasks";

dotenv.config();

const PORT = process.env.PORT || 4000;
const otpStore = new Map<string, { code: string; expiresAt: number }>();

async function start() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const db = await initDb();

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

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

  app.use("/api/tasks", tasksRouter(db));

  app.listen(PORT, () => {
    console.log(`DayPilot server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
