import React from "react";

function ModeCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm">
      <h4 className="font-semibold mb-2">{title}</h4>
      {children}
    </div>
  );
}

export default function Modes() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Modes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModeCard title="🚪 I'm Leaving">
          <ul className="text-sm space-y-1">
            <li>☑️ Phone</li>
            <li>☑️ Wallet</li>
            <li>☑️ Keys</li>
            <li>⬜ Water bottle</li>
            <li>⬜ School bag</li>
          </ul>
        </ModeCard>

        <ModeCard title="📚 I'm Studying">
          <div className="text-sm">
            <div className="font-medium">Current Goal</div>
            <div>Mathematics — Chapter 4</div>
            <div className="mt-2">45 minute focus session</div>
            <div className="mt-3">
              <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white">Start Focus</button>
            </div>
          </div>
        </ModeCard>

        <ModeCard title="🛒 I'm Shopping">
          <div className="text-sm">
            <ul className="space-y-1">
              <li>⬜ Milk</li>
              <li>⬜ Bread</li>
              <li>⬜ Notebook</li>
              <li>☑️ Pen</li>
            </ul>
            <div className="mt-2">Budget: ₹500 · Spent: ₹230 · Remaining: ₹270</div>
          </div>
        </ModeCard>

        <ModeCard title="✈️ I'm Travelling">
          <div className="text-sm">
            <div className="font-medium">Trip: Weekend getaway</div>
            <div>Destination: Mountainview</div>
            <div className="mt-2">Packing checklist available</div>
          </div>
        </ModeCard>

        <ModeCard title="🌙 Going to Sleep">
          <div className="text-sm">
            <div className="font-medium">Tomorrow</div>
            <div>📚 Science class — 9:00 AM</div>
            <div className="mt-2">Preparation: ⬜ Pack bag · ⬜ Charge phone</div>
            <div className="mt-3">
              <button className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600">Finish My Day</button>
            </div>
          </div>
        </ModeCard>
      </div>
    </div>
  );
}
