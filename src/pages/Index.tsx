import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import AuthScreen from "@/components/AuthScreen";
import FeedPage from "@/components/FeedPage";
import EventsPage from "@/components/EventsPage";
import CalendarPage from "@/components/CalendarPage";
import ChatPage from "@/components/ChatPage";
import NewsPage from "@/components/NewsPage";
import StatsPage from "@/components/StatsPage";
import ProfilePage from "@/components/ProfilePage";

type Tab = "feed" | "events" | "calendar" | "chat" | "news" | "stats" | "profile";

const NAV_ITEMS: { id: Tab; icon: string; label: string; badge?: number }[] = [
  { id: "feed", icon: "Home", label: "Лента" },
  { id: "events", icon: "Flag", label: "События" },
  { id: "calendar", icon: "Calendar", label: "Календарь" },
  { id: "chat", icon: "MessageCircle", label: "Чат", badge: 31 },
  { id: "news", icon: "Newspaper", label: "Новости" },
  { id: "stats", icon: "BarChart2", label: "Статистика" },
  { id: "profile", icon: "User", label: "Профиль" },
];

export default function Index() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("feed");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 fire-gradient rounded-2xl flex items-center justify-center text-3xl animate-pulse">
            🏁
          </div>
          <span className="font-oswald text-xl text-white tracking-widest">MOTO<span className="text-fire">FEED</span></span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case "feed": return <FeedPage />;
      case "events": return <EventsPage />;
      case "calendar": return <CalendarPage />;
      case "chat": return <ChatPage />;
      case "news": return <NewsPage />;
      case "stats": return <StatsPage />;
      case "profile": return <ProfilePage />;
      default: return <FeedPage />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "4.5rem" }}>
        {renderPage()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-background/95 backdrop-blur-md border-t border-border nav-glow">
        <div className="flex items-center justify-around px-1 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all relative ${
                  isActive ? "text-fire" : "text-muted-foreground hover:text-white"
                }`}
              >
                {item.badge && !isActive && (
                  <span className="absolute -top-0.5 right-0 min-w-4 h-4 bg-fire rounded-full flex items-center justify-center text-[9px] text-white font-bold px-0.5">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
                <div className={`transition-transform ${isActive ? "scale-110" : ""}`}>
                  <Icon name={item.icon} size={22} />
                </div>
                <span className={`text-[9px] font-oswald font-semibold tracking-wider transition-colors ${isActive ? "text-fire" : "text-muted-foreground"}`}>
                  {item.label.toUpperCase()}
                </span>
                {isActive && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-fire rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
