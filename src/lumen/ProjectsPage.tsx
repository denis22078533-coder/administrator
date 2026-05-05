import React from 'react';
import { motion } from 'framer-motion';
import Icon from '@/components/ui/icon';

interface ProjectsPageProps {
  onGoToChat: () => void;
}

const TemplateCard = ({ image, title, subtitle, large = false }: { image: string; title:string; subtitle?: string; large?: boolean }) => (
  <div 
    className={`relative w-full rounded-2xl overflow-hidden group cursor-pointer border border-white/[0.08] hover:border-white/20 transition-all ${large ? 'col-span-1 md:col-span-2 aspect-video' : 'aspect-[4/3]'}`}
  >
    <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
    <div className="absolute bottom-0 left-0 p-4">
      <h3 className={`font-bold text-white ${large ? 'text-2xl' : 'text-base'}`}>{title}</h3>
      {subtitle && <p className={`text-white/60 ${large ? 'text-base' : 'text-sm'}`}>{subtitle}</p>}
    </div>
  </div>
);

const ProjectsPage = ({ onGoToChat }: ProjectsPageProps) => {

  return (
    <div className="h-full w-full p-4 md:p-6 overflow-y-auto">
      <div className="mb-6 px-2">
        <h1 className="text-2xl font-bold text-white">Мои проекты</h1>
        <p className="text-white/40">Начните новый проект с шаблона или с чистого листа.</p>
      </div>

      {/* Кнопка создания нового проекта */}
      <div 
        onClick={onGoToChat}
        className="group cursor-pointer mb-6 flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10 rounded-2xl transition-all"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-white text-2xl">
          <Icon name="Plus" />
        </div>
        <div>
          <h2 className="text-white font-bold">Создать первый проект</h2>
          <p className="text-white/40 text-sm">Начать с пустого холста и описать свою идею ИИ</p>
        </div>
        <Icon name="ArrowRight" className="ml-auto text-white/20 group-hover:translate-x-1 transition-transform" />
      </div>
      
      {/* Карточка под кнопкой */}
       <div className="px-2 mb-6">
        <TemplateCard 
          large={true}
          title="Магазин Одежды"
          subtitle="РАСПРОДАЖА"
          image="https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2071&auto=format&fit=crop"
        />
       </div>


      {/* Остальные шаблоны */}
      <div className="px-2 mb-4">
        <h2 className="text-xl font-bold text-white">Другие шаблоны</h2>
      </div>
      <div className="px-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TemplateCard 
          title="Продуктовый магазин"
          subtitle="Свежие продукты"
          image="https://images.unsplash.com/photo-1608686207856-001b95cf60ca?q=80&w=1782&auto=format&fit=crop"
        />
        {/* Можно добавить другие карточки тут */}
      </div>
    </div>
  );
};

export default ProjectsPage;
