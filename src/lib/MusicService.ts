
import { z } from 'zod';

const SUNO_API_BASE = 'https://suno-api-sigma.vercel.app';

const GenerateResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  metadata: z.any().nullable(),
});

const ClipSchema = z.object({
  id: z.string(),
  video_url: z.string(),
  audio_url: z.string(),
  image_url: z.string().nullable(),
  image_large_url: z.string().nullable(),
  is_video_pending: z.boolean(),
  major_model_version: z.string(),
  model_name: z.string(),
  metadata: z.any().nullable(),
  is_liked: z.boolean(),
  user_id: z.string(),
  display_name: z.string(),
  handle: z.string(),
  is_handle_updated: z.boolean(),
  created_at: z.string(),
  status: z.string(),
  title: z.string(),
  play_count: z.number(),
  upvote_count: z.number(),
  is_trashed: z.boolean(),
});

const FeedResponseSchema = z.array(ClipSchema);

async function generate(prompt: string, isCustom = false) {
  const url = isCustom
    ? `${SUNO_API_BASE}/api/generate`
    : `${SUNO_API_BASE}/api/custom_generate`;

  const payload = isCustom
    ? {
        prompt,
        tags: 'instrumental, cinematic',
        title: 'Lumen Track',
        make_instrumental: true,
        wait_audio: true,
      }
    : {
        gpt_description_prompt: prompt,
        make_instrumental: true,
        wait_audio: true,
      };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Suno API returned ${response.status}`);
  }

  const data = await response.json();
  console.log("Suno generation response:", data);
  return FeedResponseSchema.parse(data);
}

async function get(id: string) {
  const response = await fetch(`${SUNO_API_BASE}/api/feed/${id}`);
  if (!response.ok) {
    throw new Error(`Suno API returned ${response.status} for feed`);
  }
  const data = await response.json();
  return FeedResponseSchema.parse(data);
}

export const MusicService = {
  generate,
  get,
};

