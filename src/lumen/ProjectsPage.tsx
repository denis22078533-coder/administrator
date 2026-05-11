import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import Icon from '@/components/ui/icon';
import { ProjectFile } from './useGitHub';
import JSZip from 'jszip';

interface Project {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  repo: string;
}

const projectsData: Project[] = [
  {
    id: 'product-store',
    name: 'Магазин продуктов',
    description: 'Готовый шаблон для интернет-магазина с адаптивным дизайном и базовой логикой.',
    imageUrl: '/project-product-store.png', // <-- Исправляем путь
    repo: 'denis22078533-coder/product-store-template',
  },
];

const UploadCard: React.FC<{ onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void, inputRef: React.RefObject<HTMLInputElement> }> = ({ onFileSelect, inputRef }) => {
    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer bg-white/[0.03] border-2 border-dashed border-white/[0.1] rounded-2xl flex flex-col items-center justify-center text-center p-6 h-full min-h-[290px] transition-colors hover:border-white/20 hover:bg-white/[0.05]"
        >
            <input type="file" accept=".zip" ref={inputRef} onChange={onFileSelect} className="hidden" />
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Icon name="UploadCloud" size={32} className="text-white/50"/>
            </div>
            <h3 className="font-bold text-white">Загрузить свой проект</h3>
            <p className="text-sm text-white/40 mt-1">Перенесите сюда .zip-архив или нажмите для выбора файла.</p>
        </motion.div>
    );
};


interface ProjectCardProps {
  project: Project;
  onOpen: (repo: string) => void;
  onDownload: (repo: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, onDownload }) => {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden shadow-lg flex flex-col">
      <div className="relative">
        <img src={project.imageUrl} alt={project.name} className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-bold text-white text-lg">{project.name}</h3>
        <p className="text-white/50 text-sm mt-1 mb-4 flex-grow">{project.description}</p>
        <div className="flex gap-2 items-center mt-auto">
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
            onClick={() => onOpen(project.repo)}
            className="flex-1 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="FolderOpen" size={14} />
            Открыть
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
            onClick={() => onDownload(project.repo)}
            className="h-9 w-9 flex-shrink-0 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 font-semibold text-sm transition-colors flex items-center justify-center"
          >
            <Icon name="Download" size={15} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

interface ProjectsPageProps {
    onOpenProject: (repo: string) => void;
    onProjectLoaded: (files: ProjectFile[], repo: string) => void;
    onDownloadProject: (repo: string) => void;
    isTesterMode: boolean;
}

const ProjectsPage: React.FC<ProjectsPageProps> = ({ onOpenProject, onProjectLoaded, onDownloadProject, isTesterMode }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const zip = await JSZip.loadAsync(file);
        const files: ProjectFile[] = [];
        const repoName = file.name.replace('.zip', '');

        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
            if (!zipEntry.dir) {
                const content = await zipEntry.async('string');
                files.push({ path: relativePath, content });
            }
        }
        onProjectLoaded(files, repoName);
    } catch (error) {
        console.error("Ошибка при чтении ZIP-архива:", error);
        alert("Не удалось прочитать ZIP-архив.");
    }
    
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Готовые проекты</h1>
        <p className="text-white/50">Выберите готовый шаблон или загрузите свой проект.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isTesterMode && <UploadCard onFileSelect={handleFileSelect} inputRef={fileInputRef} />}
        {projectsData.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpen={onOpenProject}
            onDownload={onDownloadProject}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectsPage;
