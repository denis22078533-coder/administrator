import React from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

// Генерируем тип для всех доступных иконок из lucide-react
export type IconName = keyof typeof LucideIcons;

interface IconProps extends LucideProps {
  name: IconName;
  fallback?: IconName;
}

const Icon: React.FC<IconProps> = ({ name, fallback = 'AlertCircle', ...props }) => {
  const IconComponent = LucideIcons[name];

  if (!IconComponent) {
    const FallbackIcon = LucideIcons[fallback];
    if (!FallbackIcon) {
      return <span className="text-xs text-gray-400">[icon]</span>;
    }
    return <FallbackIcon {...props} />;
  }

  return <IconComponent {...props} />;
};

export default Icon;
