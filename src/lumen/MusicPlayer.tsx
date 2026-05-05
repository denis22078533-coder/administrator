import { motion } from 'framer-motion';
import Icon from '@/components/ui/icon';

interface Props {
  track: any;
}

export default function MusicPlayer({ track }: Props) {
  if (!track) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-blue-900/50 rounded-2xl p-4 mt-2 shadow-lg"
    >
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-cover bg-center shadow-md" style={{ backgroundImage: `url(${track.image_url || '/placeholder.svg'})` }} />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{track.title || 'Без названия'}</p>
          <p className="text-white/50 text-sm truncate">{track.display_name || 'Неизвестный исполнитель'}</p>
        </div>
      </div>
      <audio controls src={track.audio_url} className="w-full mt-4 h-10 rounded-lg" />
      <div className="flex justify-between items-center mt-3 text-xs text-white/40">
        <div className="flex items-center gap-1.5">
          <Icon name="Play" size={12} />
          <span>{track.play_count}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon name="Heart" size={12} />
          <span>{track.upvote_count}</span>
        </div>
        <a href={`https://suno.com/song/${track.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white/70 transition-colors">
            <Icon name="ExternalLink" size={12} />
            <span>Suno</span>
        </a>
      </div>
    </motion.div>
  );
}
