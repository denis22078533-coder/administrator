
// Сервис для взаимодействия с API для генерации музыки (например, Suno через RapidAPI)

const RAPIDAPI_KEY = 'your-rapidapi-key-here'; // Ключ нужно будет вынести в переменные окружения
const API_HOST = 'suno-ai-music-generator.p.rapidapi.com';
const API_URL = `https://${API_HOST}/`;

interface MusicGenerationResponse {
  clip_id: string;
  status: 'generating' | 'complete';
  title?: string;
  audio_url?: string;
  message?: string;
}

/**
 * Отправляет запрос на генерацию музыки на основе текстового промпта.
 * @param prompt - Текстовое описание для генерации музыки.
 * @param token - JWT токен пользователя для авторизации на бэкенде.
 * @returns - Объект с информацией о сгенерированном треке.
 */
export const generateMusic = async (prompt: string, token: string): Promise<{ audio_url?: string; error?: string }> => {
  try {
    const response = await fetch('/api/music/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (response.status === 402) {
      return { error: 'Недостаточно лимитов для генерации музыки.' };
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Ошибка при генерации музыки');
    }

    const data = await response.json();
    return { audio_url: data.audio_url };

  } catch (error: any) {
    console.error('SunoService Error:', error);
    return { error: error.message };
  }
};
