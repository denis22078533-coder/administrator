import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const SPORTS = ["MotoGP", "Формула 1", "WRC Ралли", "Superbike", "Дрифт", "Картинг"];
const AVATARS = ["🏁", "🏍️", "🏎️", "🚗", "⚡", "🔥", "🏆", "💨"];

type Screen = "welcome" | "login" | "register";

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginForm, setLoginForm] = useState({ login: "", password: "" });
  const [regForm, setRegForm] = useState({
    username: "",
    email: "",
    password: "",
    display_name: "",
    avatar_emoji: "🏁",
    favorite_sports: [] as string[],
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(loginForm.login, loginForm.password);
    setLoading(false);
    if (res.error) setError(res.error);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!regForm.username || !regForm.email || !regForm.password) {
      setError("Заполните все поля");
      return;
    }
    if (regForm.password.length < 6) {
      setError("Пароль минимум 6 символов");
      return;
    }
    setLoading(true);
    const res = await register({
      username: regForm.username,
      email: regForm.email,
      password: regForm.password,
      display_name: regForm.display_name || regForm.username,
    });
    setLoading(false);
    if (res.error) setError(res.error);
  };

  const toggleSport = (s: string) => {
    setRegForm(prev => ({
      ...prev,
      favorite_sports: prev.favorite_sports.includes(s)
        ? prev.favorite_sports.filter(x => x !== s)
        : [...prev.favorite_sports, s],
    }));
  };

  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-between px-6 py-10">
        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <div className="w-24 h-24 fire-gradient rounded-2xl flex items-center justify-center text-5xl shadow-2xl shadow-fire/30">
              🏁
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
              <span className="w-2 h-2 bg-white rounded-full live-pulse" />
            </div>
          </div>

          <h1 className="font-oswald text-5xl font-bold text-white tracking-widest text-glow mb-2">
            MOTO<span className="text-fire">FEED</span>
          </h1>
          <p className="text-muted-foreground font-roboto text-base mt-2 max-w-xs leading-relaxed">
            Мотоспорт и автоспорт — гонки, трансляции и сообщество в одном месте
          </p>

          {/* Features */}
          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
            {[
              { icon: "Radio", text: "Прямые трансляции гонок" },
              { icon: "Calendar", text: "Все мероприятия сезона" },
              { icon: "MessageCircle", text: "Живые чаты фанатов" },
            ].map((f) => (
              <div key={f.icon} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                <Icon name={f.icon} size={18} className="text-fire flex-shrink-0" />
                <span className="text-white/80 text-sm font-roboto">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full max-w-xs flex flex-col gap-3 mt-8">
          <button
            onClick={() => setScreen("register")}
            className="w-full fire-gradient text-white font-oswald font-bold text-base py-4 rounded-xl tracking-wider shadow-lg shadow-fire/20 hover:opacity-90 transition-opacity"
          >
            НАЧАТЬ БЕСПЛАТНО
          </button>
          <button
            onClick={() => setScreen("login")}
            className="w-full bg-secondary border border-border text-white font-oswald font-semibold text-base py-4 rounded-xl tracking-wider hover:border-fire/40 transition-colors"
          >
            ВОЙТИ В АККАУНТ
          </button>
          <p className="text-center text-muted-foreground text-xs font-roboto mt-1">
            Нажимая «Начать», вы соглашаетесь с условиями использования
          </p>
        </div>
      </div>
    );
  }

  if (screen === "login") {
    return (
      <div className="min-h-screen bg-background flex flex-col px-6 py-8">
        <button onClick={() => { setScreen("welcome"); setError(""); }} className="self-start text-muted-foreground hover:text-white transition-colors mb-6">
          <Icon name="ArrowLeft" size={24} />
        </button>

        <div className="mb-8">
          <h2 className="font-oswald text-3xl font-bold text-white tracking-wider">ДОБРО<br /><span className="text-fire">ПОЖАЛОВАТЬ</span></h2>
          <p className="text-muted-foreground text-sm font-roboto mt-2">Войдите в свой аккаунт</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-1.5 block">EMAIL ИЛИ ЛОГИН</label>
            <input
              type="text"
              value={loginForm.login}
              onChange={e => setLoginForm(p => ({ ...p, login: e.target.value }))}
              placeholder="example@mail.ru"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white font-roboto text-sm placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-1.5 block">ПАРОЛЬ</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white font-roboto text-sm placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 flex items-center gap-2">
              <Icon name="AlertCircle" size={16} className="text-red-400 flex-shrink-0" />
              <span className="text-red-300 text-sm font-roboto">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full fire-gradient text-white font-oswald font-bold text-base py-4 rounded-xl tracking-wider mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Icon name="Loader" size={18} className="animate-spin" /> ВХОДИМ...</> : "ВОЙТИ"}
          </button>
        </form>

        <div className="mt-auto pt-8 text-center">
          <span className="text-muted-foreground text-sm font-roboto">Нет аккаунта? </span>
          <button onClick={() => { setScreen("register"); setError(""); }} className="text-fire font-roboto font-medium text-sm hover:underline">
            Зарегистрироваться
          </button>
        </div>
      </div>
    );
  }

  // Register screen
  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8 overflow-y-auto">
      <button onClick={() => { setScreen("welcome"); setError(""); }} className="self-start text-muted-foreground hover:text-white transition-colors mb-6">
        <Icon name="ArrowLeft" size={24} />
      </button>

      <div className="mb-6">
        <h2 className="font-oswald text-3xl font-bold text-white tracking-wider">НОВЫЙ<br /><span className="text-fire">АККАУНТ</span></h2>
        <p className="text-muted-foreground text-sm font-roboto mt-2">Создайте профиль гонщика</p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-4 pb-8">
        {/* Avatar picker */}
        <div>
          <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-2 block">АВАТАР</label>
          <div className="flex gap-2 flex-wrap">
            {AVATARS.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setRegForm(p => ({ ...p, avatar_emoji: a }))}
                className={`w-11 h-11 rounded-xl text-2xl flex items-center justify-center border-2 transition-all ${regForm.avatar_emoji === a ? 'border-fire bg-fire/10 scale-110' : 'border-border bg-secondary'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-1.5 block">ИМЯ</label>
          <input
            type="text"
            value={regForm.display_name}
            onChange={e => setRegForm(p => ({ ...p, display_name: e.target.value }))}
            placeholder="Алексей Громов"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white font-roboto text-sm placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
          />
        </div>
        <div>
          <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-1.5 block">ЛОГИН *</label>
          <input
            type="text"
            value={regForm.username}
            onChange={e => setRegForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
            placeholder="aleksey_moto"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white font-roboto text-sm placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
            autoComplete="username"
          />
        </div>
        <div>
          <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-1.5 block">EMAIL *</label>
          <input
            type="email"
            value={regForm.email}
            onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))}
            placeholder="example@mail.ru"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white font-roboto text-sm placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-1.5 block">ПАРОЛЬ *</label>
          <input
            type="password"
            value={regForm.password}
            onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))}
            placeholder="Минимум 6 символов"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white font-roboto text-sm placeholder:text-muted-foreground outline-none focus:border-fire transition-colors"
            autoComplete="new-password"
          />
        </div>

        {/* Favorite sports */}
        <div>
          <label className="text-xs font-oswald font-bold text-muted-foreground tracking-wider mb-2 block">ЛЮБИМЫЕ ВИДЫ СПОРТА</label>
          <div className="flex flex-wrap gap-2">
            {SPORTS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSport(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-oswald font-semibold tracking-wide border transition-all ${regForm.favorite_sports.includes(s) ? 'fire-gradient border-fire text-white' : 'border-border bg-secondary text-muted-foreground'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 flex items-center gap-2">
            <Icon name="AlertCircle" size={16} className="text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm font-roboto">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full fire-gradient text-white font-oswald font-bold text-base py-4 rounded-xl tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Icon name="Loader" size={18} className="animate-spin" /> СОЗДАЁМ...</> : "СОЗДАТЬ АККАУНТ"}
        </button>
      </form>

      <div className="text-center -mt-4 pb-4">
        <span className="text-muted-foreground text-sm font-roboto">Уже есть аккаунт? </span>
        <button onClick={() => { setScreen("login"); setError(""); }} className="text-fire font-roboto font-medium text-sm hover:underline">
          Войти
        </button>
      </div>
    </div>
  );
}
