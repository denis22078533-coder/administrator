import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import Icon from '@/components/ui/icon';
import { useGitHub, ProjectFile } from './useGitHub';
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
    imageUrl: '/project-product-store.png',
    repo: 'denis22078533-coder/product-store-template',
  },
];

interface ProjectCardProps {
  project: Project;
  onOpen: (repo: string) => void;
  onApply: (repo: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, onApply }) => {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden shadow-lg transition-all hover:shadow-xl hover:border-white/10">
      <div className="relative">
        <img src={project.imageUrl} alt={project.name} className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <h3 className="absolute bottom-3 left-4 text-white font-bold text-lg">{project.name}</h3>
      </div>
      <div className="p-4">
        <p className="text-white/50 text-sm mb-4">{project.description}</p>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
            onClick={() => onOpen(project.repo)}
            className="flex-1 h-9 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/80 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="FolderOpen" size={14} />
            Открыть
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
            onClick={() => onApply(project.repo)}
            className="flex-1 h-9 rounded-lg bg-purple-600/50 hover:bg-purple-600/70 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="Check" size={16} />
            Применить
          </motion.button>
        </div>
      </div>
    </div>
  );
};

interface ProjectsPageProps {
    onOpenProject: (repo: string) => void;
    onApplyToGitHub: (repo: string) => void;
    onProjectLoaded: (files: ProjectFile[], repo: string) => void;
    isTesterMode: boolean;
    projectFiles: ProjectFile[];
    currentRepo: string | null;
}

const ProjectsPage: React.FC<ProjectsPageProps> = ({ 
    onOpenProject, 
    onApplyToGitHub, 
    onProjectLoaded, 
    isTesterMode, 
    projectFiles,
    currentRepo
}) => {
  const { downloadProjectAsZip } = useGitHub(false);
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

  const handleDownload = () => {
      if (projectFiles.length > 0) {
          downloadProjectAsZip(projectFiles, currentRepo || 'project');
      } else {
          alert("Нет файлов для скачивания.");
      }
  }

  return (
    <div className="p-6">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Готовые проекты</h1>
                <p className="text-white/50">Выберите шаблон, чтобы начать работу.</p>
            </div>
            {isTesterMode && (
                <div className='flex items-center gap-2'>
                    <input type="file" accept=".zip" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                    <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-10 px-4 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-blue-500/30"
                    >
                        <Icon name="Upload" size={15} />
                        Загрузить .zip
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={handleDownload}
                        className="h-10 px-4 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-semibold text-sm transition-colors flex items-center justify-center gap-2 border border-emerald-500/30"
                        disabled={projectFiles.length === 0}
                    >
                        <Icon name="Download" size={15} />
                        Скачать проект
                    </motion.button>
                </div>
            )}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectsData.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpen={onOpenProject}
            onApply={onApplyToGitHub}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectsPage;
