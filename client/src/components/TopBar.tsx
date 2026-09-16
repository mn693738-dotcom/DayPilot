import React from "react";

export default function TopBar({ onNavigate }: { onNavigate: (route: string) => void }) {
  return (
    <header className="backdrop-blur-sm sticky top-0 z-20 bg-white/60 dark:bg-slate-900/60 border-b border-transparent dark:border-slate-700">
      <div className="max-w-4xl mx-auto p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="font-bold text-xl">DayPilot</div>
          <nav className="hidden sm:flex gap-2">
            <button className="px-3 py-2 rounded-md hover:bg-slate-100" onClick={() => onNavigate("home")}>Home</button>
            <button className="px-3 py-2 rounded-md hover:bg-slate-100" onClick={() => onNavigate("modes")}>Modes</button>
            <button className="px-3 py-2 rounded-md hover:bg-slate-100">Calendar</button>
            <button className="px-3 py-2 rounded-md hover:bg-slate-100">Tasks</button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-md hover:bg-slate-100">🔔</button>
          <button className="p-2 rounded-md hover:bg-slate-100">👤</button>
        </div>
      </div>
    </header>
  );
}
