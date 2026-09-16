import React, { useEffect, useState } from "react";

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function Home() {
  const now = useNow();
  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="uppercase text-xs text-slate-500">Good morning! <span role="img">👋</span></h2>
          <div className="text-lg font-semibold">{dateStr}</div>
          <div className="text-3xl font-extrabold mt-2">{timeStr}</div>
        </div>
        <div className="w-40 h-40 bg-gradient-to-br from-indigo-200 to-indigo-400 rounded-2xl shadow-md flex items-center justify-center text-white">
          <div className="text-center">
            <div className="text-xs">Today's Progress</div>
            <div className="mt-2">60%</div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm">
          <h3 className="font-semibold mb-2">Upcoming</h3>
          <div className="text-sm text-slate-600">📚 Science — 2:00 PM</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm">
          <h3 className="font-semibold mb-2">Important</h3>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>🔔 Pay electricity bill</li>
            <li>📦 Pick up parcel</li>
          </ul>
        </div>
      </section>

      <section className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm">
        <h3 className="font-semibold mb-2">Today's Tasks</h3>
        <ul className="space-y-2 text-sm">
          <li>☑️ Finish homework</li>
          <li>⬜ Pack school bag</li>
          <li>⬜ Buy notebook</li>
        </ul>
      </section>

      <section className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm">
        <h3 className="font-semibold mb-2">Quick Actions</h3>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600">Task</button>
          <button className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600">Reminder</button>
          <button className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600">Note</button>
          <button className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600">Event</button>
        </div>
      </section>
    </div>
  );
}
