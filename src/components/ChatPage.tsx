import { useState } from "react";
import Icon from "@/components/ui/icon";

const CHATS = [
  {
    id: 1,
    name: "MotoGP Фанаты",
    avatar: "🏍️",
    lastMsg: "Марк СНОВА первый! Просто нереально",
    time: "сейчас",
    unread: 24,
    online: true,
    members: "12.4K",
  },
  {
    id: 2,
    name: "Формула 1 Россия",
    avatar: "🏎️",
    lastMsg: "Верстаппен: +18 очков от Хэмилтона",
    time: "2 мин",
    unread: 7,
    online: true,
    members: "8.9K",
  },
  {
    id: 3,
    name: "WRC Ралли Клуб",
    avatar: "🚗",
    lastMsg: "Кто едет смотреть Ралли Финляндия?",
    time: "15 мин",
    unread: 3,
    online: true,
    members: "4.2K",
  },
  {
    id: 4,
    name: "Российский Картинг",
    avatar: "🔧",
    lastMsg: "Результаты этапа в Сочи выложены",
    time: "1ч",
    unread: 0,
    online: false,
    members: "2.1K",
  },
  {
    id: 5,
    name: "Дрифт Коллектив",
    avatar: "💨",
    lastMsg: "Новое видео с прогрева задней оси...",
    time: "3ч",
    unread: 0,
    online: false,
    members: "3.7K",
  },
  {
    id: 6,
    name: "Superbike Любители",
    avatar: "🏁",
    lastMsg: "Топ-5 мотоциклов сезона — обсуждение",
    time: "5ч",
    unread: 0,
    online: false,
    members: "1.8K",
  },
];

const MESSAGES = [
  { id: 1, user: "Дима К.", text: "Марк СНОВА первый! Просто нереально смотреть", time: "14:32", own: false },
  { id: 2, user: "Вы", text: "Да, этот Маркес — огонь! Круг 3 был шедевр", time: "14:33", own: true },
  { id: 3, user: "Алёна М.", text: "Педроса пытается догнать, но уже -4 сек... не догонит", time: "14:34", own: false },
  { id: 4, user: "Артём Р.", text: "🔥🔥🔥 какой обгон в повороте 7!", time: "14:35", own: false },
  { id: 5, user: "Вы", text: "Видел! Чуть со стула не упал 😂", time: "14:35", own: true },
  { id: 6, user: "Иван С.", text: "Сколько ещё кругов до финиша?", time: "14:37", own: false },
  { id: 7, user: "Дима К.", text: "Ещё 8 кругов, держитесь! Здесь главное шины", time: "14:38", own: false },
];

export default function ChatPage() {
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const activeData = CHATS.find(c => c.id === activeChat);

  if (activeChat && activeData) {
    return (
      <div className="flex flex-col h-screen pb-16">
        {/* Chat header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setActiveChat(null)} className="text-muted-foreground hover:text-white transition-colors">
            <Icon name="ArrowLeft" size={22} />
          </button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-lg">{activeData.avatar}</div>
          <div className="flex-1">
            <p className="font-oswald text-white font-semibold text-sm">{activeData.name}</p>
            <p className="text-xs text-fire font-roboto">{activeData.members} участников · онлайн</p>
          </div>
          <button className="text-muted-foreground hover:text-white transition-colors">
            <Icon name="MoreVertical" size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {MESSAGES.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.own ? 'items-end' : 'items-start'}`}>
              {!msg.own && <span className="text-xs text-fire font-oswald font-bold mb-1">{msg.user}</span>}
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl ${msg.own ? 'fire-gradient text-white rounded-br-sm' : 'bg-secondary text-white rounded-bl-sm'}`}>
                <p className="text-sm font-roboto">{msg.text}</p>
              </div>
              <span className="text-xs text-muted-foreground mt-1">{msg.time}</span>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border flex gap-2 bg-background">
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Написать сообщение..."
            className="flex-1 bg-secondary border border-border rounded-full px-4 py-2 text-sm font-roboto text-white placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
          />
          <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${message ? 'fire-gradient' : 'bg-secondary'}`}>
            <Icon name="Send" size={18} className="text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-oswald text-2xl font-bold tracking-widest text-white">ЧАТ</h1>
          <p className="text-muted-foreground text-xs font-roboto mt-0.5">Сообщества по видам спорта</p>
        </div>
        <button className="w-9 h-9 fire-gradient rounded-full flex items-center justify-center">
          <Icon name="Plus" size={18} className="text-white" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 border border-border">
          <Icon name="Search" size={16} className="text-muted-foreground" />
          <input placeholder="Поиск чатов..." className="flex-1 bg-transparent text-sm font-roboto text-white placeholder:text-muted-foreground outline-none" />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex flex-col">
        {CHATS.map((chat, i) => (
          <button
            key={chat.id}
            onClick={() => setActiveChat(chat.id)}
            className={`animate-fade-in stagger-${Math.min(i + 1, 5)} opacity-0 flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/50 text-left`}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center text-2xl">
                {chat.avatar}
              </div>
              {chat.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-oswald font-semibold text-white text-sm">{chat.name}</span>
                <span className="text-xs text-muted-foreground font-roboto">{chat.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-roboto truncate pr-2">{chat.lastMsg}</p>
                {chat.unread > 0 && (
                  <span className="flex-shrink-0 min-w-5 h-5 fire-gradient rounded-full flex items-center justify-center text-white text-xs font-bold px-1">
                    {chat.unread}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground/60 font-roboto">{chat.members} участников</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
