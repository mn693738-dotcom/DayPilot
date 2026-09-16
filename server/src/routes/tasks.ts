import express from "express";
import { DB } from "../db";

export default function tasksRouter(db: DB) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const rows = await db.all("SELECT * FROM tasks ORDER BY completed, due_date IS NULL, due_date");
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const t = req.body;
      const result = await db.run(
        `INSERT INTO tasks (user_id, title, description, due_date, due_time, priority, category, reminder_at, completed)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        t.user_id || null,
        t.title,
        t.description || null,
        t.due_date || null,
        t.due_time || null,
        t.priority || null,
        t.category || null,
        t.reminder_at || null,
        t.completed ? 1 : 0
      );

      const created = await db.get("SELECT * FROM tasks WHERE id = ?", result.lastID);
      res.status(201).json(created);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  return router;
}
