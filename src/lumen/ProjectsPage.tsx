import React from 'react';
import { motion } from 'framer-motion';
import Icon from '@/components/ui/icon';

interface ProjectsPageProps {
  // Функция для перехода в чат с готовым запросом
  onSelectTemplate: (prompt: string) => void;
  // Функция для перехода в чат с пустым полем
  onGoToChat: () => void;
}

// Определяем структуру данных для шаблона
interface TemplateData {
  title: string;
  subtitle: string;
  image: string;
  prompt: string; // Запрос для ИИ
  large?: boolean;
}

// Компонент карточки. Теперь он принимает onClick.
const TemplateCard = ({ image, title, subtitle, large = false, onClick }: TemplateData & { onClick: () => void }) => (
  <div 
    onClick={onClick}
    className={`relative w-full rounded-2xl overflow-hidden group cursor-pointer border border-white/[0.08] hover:border-white/20 transition-all ${large ? 'col-span-1 md:col-span-2 lg:col-span-3 aspect-video' : 'aspect-[4/3]'}`}
  >
    <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Icon name="Wand2" size={24} className="text-white" />
        </div>
    </div>
    <div className="absolute bottom-0 left-0 p-4">
      <h3 className={`font-bold text-white ${large ? 'text-2xl' : 'text-base'}`}>{title}</h3>
      {subtitle && <p className={`text-white/60 ${large ? 'text-sm' : 'text-xs'}`}>{subtitle}</p>}
    </div>
  </div>
);

// Массив с данными шаблонов
const templates: TemplateData[] = [
  {
    large: true,
    title: "Магазин одежды",
    subtitle: "Сезонная распродажа",
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2071&auto=format&fit=crop",
    prompt: "Создай элегантный и современный сайт для магазина одежды. На главной странице должен быть большой баннер с текстом 'Сезонная распродажа до -50%' и кнопкой 'Смотреть каталог'. Ниже размести сетку с 4-6 популярными товарами (женская и мужская одежда). Добавь секцию 'О нас' и простой футер с контактами."
  },
  {
    title: "Портфолио фотографа",
    subtitle: "Городские пейзажи",
    image: "https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?q=80&w=2070&auto=format&fit=crop",
    prompt: "Создай минималистичный сайт-портфолио для фотографа. Цветовая схема - темная. Главная страница - это полноэкранная галерея из 6-8 лучших работ в стиле 'городские пейзажи'. В меню должны быть пункты 'Галерея', 'Обо мне', 'Контакты'."
  },
  {
    title: "Кофейня",
    subtitle: "Свежая обжарка",
    image: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?q=80&w=1957&auto=format&fit=crop",
    prompt: "Разработай уютный сайт для небольшой кофейни. Используй теплые, кофейные тона. На первом экране - аппетитное фото чашки кофе и текст 'Ваш идеальный день начинается здесь'. Ниже - наше меню (эспрессо, капучино, латте, выпечка), карта с адресом и часы работы."
  },
  {
    title: "Лендинг SaaS",
    subtitle: "Приложение для продуктивности",
    image: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=1974&auto=format&fit=crop",
    prompt: "Сделай лендинг для SaaS приложения 'TaskMaster'. Хедлайн: 'Организуйте свои задачи и проекты в одном месте'. Ключевые фичи для отображения: Управление задачами, Командная работа, Аналитика. Добавь отзывы клиентов и три тарифных плана: Free, Pro, Enterprise."
  },
];

const ProjectsPage = ({ onSelectTemplate, onGoToChat }: ProjectsPageProps) => {

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="h-full w-full p-4 md:p-6 overflow-y-auto"
    >
      <div className="mb-6 px-1">
        <h1 className="text-2xl font-bold text-white">Проекты</h1>
        <p className="text-white/40 text-sm">Начните с шаблона или чистого листа.</p>
      </div>

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
      
      <div className="px-1 mb-4">
        <h2 className="text-xl font-bold text-white">Начать с шаблона</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map((template) => (
          <TemplateCard 
            key={template.title}
            {...template}
            onClick={() => onSelectTemplate(template.prompt)}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default ProjectsPage;
