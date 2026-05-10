import Icon from "@/components/ui/icon";
import { GitHubSettings } from "../useGitHub";

interface Props {
  ghForm: GitHubSettings;
  setGhForm: React.Dispatch<React.SetStateAction<GitHubSettings>>;
  showToken: boolean;
  setShowToken: (v: boolean) => void;
  publicAiEnabled: boolean;
  onPublicAiToggle: (v: boolean) => void;
  selfEditMode: boolean;
  onSelfEditToggle: (v: boolean) => void;
  onLoadZip?: () => void;
  convertingZip?: boolean;
}

const inp = "w-full h-9 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 text-white/70 text-sm font-mono placeholder:text-white/20 outline-none focus:border-[#9333ea]/40 transition-colors";
const label = "text-white/40 text-xs font-medium uppercase tracking-wider block mb-2";

export default function GitHubTab({ 
    ghForm, setGhForm, showToken, setShowToken, 
    publicAiEnabled, onPublicAiToggle, selfEditMode, onSelfEditToggle,
    onLoadZip, convertingZip 
}: Props) {
  return (
    <>
      <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl p-3.5 flex items-start gap-2.5 text-xs leading-relaxed">
        <Icon name="AlertTriangle" size={16} className="mt-0.5 shrink-0" />
        Тут собраны настройки для продвинутых пользователей. Если вы не уверены, лучше ничего не трогайте.
      </div>

      <div>
        <label className={label}>GitHub Token</label>
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={ghForm.token}
            onChange={e => setGhForm(f => ({ ...f, token: e.target.value.trim() }))}
            placeholder="ghp_..."
            className={inp + " pr-10"}
          />
          <button onClick={() => setShowToken(!showToken)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
            <Icon name={showToken ? "EyeOff" : "Eye"} size={14} />
          </button>
        </div>
        <p className="text-white/20 text-xs mt-1.5">Права: <span className="font-mono">repo</span> (Contents: Read & Write).</p>
      </div>

      <div>
        <label className={label}>Путь к репозиторию</label>
        <input type="text" value={ghForm.repo} onChange={e => setGhForm(f => ({ ...f, repo: e.target.value.trim() }))} placeholder="username/my-website" className={inp} />
        <p className="text-white/20 text-xs mt-1.5">Формат: <span className="font-mono">username/repo</span></p>
      </div>

      <div>
        <label className={label}>URL сайта</label>
        <input type="text" value={ghForm.siteUrl ?? ""} onChange={e => setGhForm(f => ({ ...f, siteUrl: e.target.value.trim() }))} placeholder="https://username.github.io/repo/" className={inp} />
        <p className="text-white/20 text-xs mt-1.5">Оставьте пустым для авто-генерации.</p>
      </div>

       <div className="space-y-3">
            <label className={label}>Инструменты</label>
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={onLoadZip}
                    disabled={convertingZip}
                    className="w-full h-10 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 text-white/50 text-sm font-semibold hover:bg-white/[0.08] hover:text-white/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {convertingZip ? <Icon name="Loader" size={16} className="animate-spin"/> : <Icon name="Upload" size={14} />}
                    <span>Загрузить .zip</span>
                </button>
                 <button className="w-full h-10 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 text-white/50 text-sm font-semibold hover:bg-white/[0.08] hover:text-white/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    <Icon name="Download" size={14} />
                    <span>Скачать .zip</span>
                </button>
            </div>
        </div>

      <div className="space-y-3 pt-2">
          <label className={label}>Опции</label>
          <label className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-lg p-3 cursor-pointer hover:bg-white/[0.05]">
              <div className={`w-9 h-5 rounded-full flex items-center transition-colors ${selfEditMode ? 'bg-purple-500 justify-end' : 'bg-white/10 justify-start'}`}>
                  <div className="w-4 h-4 bg-white rounded-full m-0.5"/>
              </div>
              <div className="flex-1">
                  <p className="text-white/70 font-semibold text-sm">Self-Edit Mode</p>
                  <p className="text-white/40 text-xs">Разрешить ИИ изменять свой собственный код (Engine)</p>
              </div>
              <input type="checkbox" checked={selfEditMode} onChange={e => onSelfEditToggle(e.target.checked)} className="hidden" />
          </label>
          <label className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-lg p-3 cursor-pointer hover:bg-white/[0.05]">
              <div className={`w-9 h-5 rounded-full flex items-center transition-colors ${publicAiEnabled ? 'bg-purple-500 justify-end' : 'bg-white/10 justify-start'}`}>
                  <div className="w-4 h-4 bg-white rounded-full m-0.5"/>
              </div>
              <div className="flex-1">
                  <p className="text-white/70 font-semibold text-sm">Публичный доступ к ИИ</p>
                  <p className="text-white/40 text-xs">Разрешить анонимным пользователям использовать API</p>
              </div>
              <input type="checkbox" checked={publicAiEnabled} onChange={e => onPublicAiToggle(e.target.checked)} className="hidden" />
          </label>
      </div>
    </>
  );
}
