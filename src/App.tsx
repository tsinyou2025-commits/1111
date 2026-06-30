import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Player from "@/pages/Player";
import Settings from "@/pages/Settings";
import History from "@/pages/History";
import { StarryBackground } from "@/components/StarryBackground";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { useAppStore } from "@/store/appStore";

function AppContent() {
  const { settings } = useAppStore();

  return (
    <div className={`min-h-screen ${settings.theme === 'dark' ? 'dark' : ''}`}>
      <StarryBackground />
      <Sidebar />
      <BottomNav />
      <main className="relative z-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/player" element={<div />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/history" element={<History />} />
        </Routes>
        <Player />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
