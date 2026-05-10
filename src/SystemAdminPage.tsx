
import { useState } from 'react';
import { useLumenAuth } from './lumen/useLumenAuth';
import SettingsDrawer from './lumen/SettingsDrawer';
import { useGitHub } from './lumen/useGitHub';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

// This is a placeholder for the settings data structure
interface Settings {
  apiKey: string;
  googleGeminiKey: string;
  deepseekApiKey: string;
  provider: "openai" | "claude" | "google" | "deepseek";
  model: string;
  baseUrl: string;
  proxyUrl: string;
  customPrompt?: string;
}

const DEFAULT_SETTINGS: Settings = {
    apiKey: "",
    googleGeminiKey: "",
    deepseekApiKey: "",
    provider: "openai",
    model: "gpt-4o-mini",
    baseUrl: "https://api.proxyapi.ru/openai/v1",
    proxyUrl: "",
    customPrompt: "",
};

const AdminLoginPage = ({ onLogin }: { onLogin: (p: string) => void }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = () => {
        if (password === 'admin2026') {
            onLogin(password);
            setError('');
        } else {
            setError('Неверный пароль.');
        }
    };

    return (
        <div className="w-screen h-dvh bg-[#07070c] flex items-center justify-center">
            <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center px-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-5xl shadow-[0_0_40px_#f59e0b50] mb-8">
                    🐜
                </div>
                <h1 className="text-white font-bold text-3xl mb-2 text-center">Вход для Администратора сайта</h1>
                
                <div className="w-full flex flex-col gap-4 mt-8">
                    <div className="relative w-full">
                        <input 
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            placeholder="Пароль"
                            className="w-full px-4 py-3 pr-12 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#f59e0b] transition-all"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                           <Icon
                                name={showPassword ? "EyeOff" : "Eye"}
                                className="text-white/50 cursor-pointer hover:text-white/80 transition-colors"
                                size={20}
                                onClick={() => setShowPassword(!showPassword)}
                           />
                        </div>
                    </div>
                    <button 
                        onClick={handleLogin}
                        className="w-full px-4 py-3 bg-[#f59e0b] text-black font-bold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
                    >
                        Войти
                    </button>
                    {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
};


export default function SystemAdminPage() {
    const navigate = useNavigate();
    const { adminMode, adminLogin } = useLumenAuth();
    const { ghSettings, saveGhSettings } = useGitHub(true);

    const [settings, setSettings] = useState<Settings>(() => {
        try {
            const saved = localStorage.getItem("lumen_settings");
            return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
        } catch {
            return DEFAULT_SETTINGS;
        }
    });
    
    const [selfEditMode, setSelfEditMode] = useState<boolean>(() => {
        try { return localStorage.getItem("lumen_self_edit") === "1"; } catch { return false; }
    });

    const [publicAiEnabled, setPublicAiEnabled] = useState<boolean>(() => {
        try { return localStorage.getItem("lumen_public_ai") === "1"; } catch { return false; }
    });
    
    const handleLogin = (password: string) => {
        adminLogin(password);
    };

    const handleSaveSettings = (s: Settings) => {
        setSettings(s);
        localStorage.setItem("lumen_settings", JSON.stringify(s));
    };

    const handleSelfEditToggle = (v: boolean) => {
        setSelfEditMode(v);
        try { localStorage.setItem("lumen_self_edit", v ? "1" : "0"); } catch { /* ignore */ }
    };

    const handlePublicAiToggle = (v: boolean) => {
        setPublicAiEnabled(v);
        try { localStorage.setItem("lumen_public_ai", v ? "1" : "0"); } catch (_e) { /* ignore */ }
    };
    
    if (!adminMode) {
        return <AdminLoginPage onLogin={handleLogin} />;
    }

    return (
        <div className="bg-[#07070c] min-h-dvh text-white">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                 <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="text-3xl">🐜</span>
                        <span>Панель Администратора</span>
                    </h1>
                     <button 
                        onClick={() => navigate('/lumen')}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors"
                    >
                        ← Назад в приложение
                    </button>
                </div>

                <div className="bg-[#121218] border border-white/10 rounded-2xl p-6">
                    <SettingsDrawer
                        open={true}
                        onClose={() => {}}
                        settings={settings}
                        onSave={handleSaveSettings}
                        ghSettings={ghSettings}
                        onSaveGh={saveGhSettings}
                        selfEditMode={selfEditMode}
                        onSelfEditToggle={handleSelfEditToggle}
                        publicAiEnabled={publicAiEnabled}
                        onPublicAiToggle={handlePublicAiToggle}
                        onLoadZip={() => alert("Эта функция доступна только в основном интерфейсе.")}
                        convertingZip={false}
                        isAdmin={true}
                        isTesterMode={false}
                        onToggleTesterMode={() => {}}
                        onResetBalance={() => {}}
                        isFullPage={true}
                    />
                </div>
            </div>
        </div>
    );
}
