import React, { useState } from "react";
import Home from "./pages/Home";
import Modes from "./pages/Modes";
import TopBar from "./components/TopBar";

export default function App() {
  const [route, setRoute] = useState("home");

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800">
      <TopBar onNavigate={setRoute} />
      <main className="p-4 max-w-4xl mx-auto">
        {route === "home" && <Home />}
        {route === "modes" && <Modes />}
        {/* Additional routes (Calendar, Tasks, Profile) to be added */}
      </main>

      {/* Quick Add floating button */}
      <div className="fixed right-6 bottom-6">
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-2xl">+</button>
      </div>
    </div>
  );
}
