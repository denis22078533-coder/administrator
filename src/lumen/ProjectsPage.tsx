import React from 'react';
import { motion } from 'framer-motion';
import Icon from '@/components/ui/icon';

interface ProjectsPageProps {
  onGoToChat: () => void;
}

// Компонент карточки шаблона - без изменений
const TemplateCard = ({ image, title, subtitle, large = false }: { image: string; title:string; subtitle?: string; large?: boolean }) => (
  <div 
    className={`relative w-full rounded-2xl overflow-hidden group cursor-pointer border border-white/[0.08] hover:border-white/20 transition-all ${large ? 'col-span-1 md:col-span-2 lg:col-span-3 aspect-video' : 'aspect-[4/3]'}`}
  >
    <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
    <div className="absolute bottom-0 left-0 p-4">
      <h3 className={`font-bold text-white ${large ? 'text-2xl' : 'text-base'}`}>{title}</h3>
      {subtitle && <p className={`text-white/60 ${large ? 'text-sm' : 'text-xs'}`}>{subtitle}</p>}
    </div>
  </div>
);

const ProjectsPage = ({ onGoToChat }: ProjectsPageProps) => {

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="h-full w-full p-4 md:p-6 overflow-y-auto"
    >
      {/* Заголовок */}
      <div className="mb-6 px-1">
        <h1 className="text-2xl font-bold text-white">Проекты</h1>
        <p className="text-white/40 text-sm">Начните с шаблона или чистого листа.</p>
      </div>

      {/* Кнопка создания нового проекта */}
      <div 
        onClick={onGoToChat}
        className="group cursor-pointer mb-8 flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10 rounded-2xl transition-all"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-white text-2xl shadow-lg shadow-[#f59e0b]/20">
          <Icon name="Plus" />
        </div>
        <div>
          <h2 className="text-white font-bold">Создать новый проект</h2>
          <p className="text-white/40 text-sm">Начните с пустого холста и опишите свою идею</p>
        </div>
        <Icon name="ArrowRight" className="ml-auto text-white/20 group-hover:translate-x-1 transition-transform" />
      </div>
      
      {/* Сетка с шаблонами */}
      <div className="px-1 mb-4">
        <h2 className="text-xl font-bold text-white">Начать с шаблона</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <TemplateCard 
          large={true}
          title="Магазин одежды"
          subtitle="РАСПРОДАЖА"
          image="https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2071&auto=format&fit=crop"
        />
        <TemplateCard 
          title="Портфолио фотографа"
          subtitle="Городские пейзажи"
          image="https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?q=80&w=2070&auto=format&fit=crop"
        />
        <TemplateCard 
          title="Кофейня"
          subtitle="Свежая обжарка"
          image="https://images.unsplash.com/photo-1559925393-8be0ec4767c8?q=80&w=1957&auto=format&fit=crop"
        />
        <TemplateCard 
          title="Лендинг SaaS"
          subtitle="Продуктивность"
          image="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=1974&auto=format&fit=crop"
        />
         <TemplateCard 
          title="Блог о путешествиях"
          subtitle="Азия"
          image="https://images.unsplash.com/photo-1528181304800-259b08848526?q=80&w=2070&auto=format&fit=crop"
        />
         <TemplateCard 
          title="Ресторан"
          subtitle="Итальянская кухня"
          image="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop"
        />
         <TemplateCard 
          title="Продуктовый магазин"
          subtitle="Свежие продукты"
          image="https://images.unsplash.com/photo-1608686207856-001b95cf60ca?q=80&w=1782&auto=format&fit=crop"
        />
      </div>
    </motion.div>
  );
};

export default ProjectsPage;
