
const API_URL = 'https://suno-api-sigma-six.vercel.app'; // Using the community-hosted proxy

interface GeneratePayload {
  prompt: string;
  make_instrumental: boolean;
  wait_audio: boolean;
}

interface Track {
  id: string;
  video_url: string;
  audio_url: string;
  image_url: string | null;
  image_large_url: string | null;
  major_model_version: string;
  model_name: string;
  metadata: {
    tags: string | null;
    prompt: string;
    gpt_description_prompt: string | null;
    audio_prompt_id: string | null;
    history: any | null;
    concat_history: any | null;
    type: string;
    duration: number;
    refund_credits: any | null;
    stream: boolean;
    error_type: string | null;
    error_message: string | null;
  };
  is_liked: boolean;
  user_id: string;
  display_name: string;
  handle: string;
  is_handle_public: boolean;
  created_at: string; 
  status: 'complete' | 'streaming' | 'submitted';
  title: string;
  play_count: number;
  upvote_count: number;
  is_trashed: boolean;
}

export class MusicService {
  private static sunoProxyUrl: string = 'https://suno-api-sigma-six.vercel.app';

  static async generate(prompt: string, isInstrumental = false): Promise<Track[]> {
    if (!this.sunoProxyUrl) {
      throw new Error("Suno proxy URL is not configured. Please set VITE_SUNO_PROXY_URL in your environment variables.");
    }
    
    try {
      // Step 1: Generate the song
      const generateResponse = await fetch(`${this.sunoProxyUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          make_instrumental: isInstrumental,
          wait_audio: false,
        } as GeneratePayload),
      });

      if (!generateResponse.ok) {
        const errorBody = await generateResponse.text();
        console.error('Suno generation failed:', errorBody);
        throw new Error(`Failed to start music generation (HTTP ${generateResponse.status}).`);
      }

      const generatedTracks: Track[] = await generateResponse.json();
      const ids = generatedTracks.map(t => t.id).join(',');

      // Step 2: Poll for completion
      for (let i = 0; i < 60; i++) { // Poll for up to 2 minutes
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const feedResponse = await fetch(`${this.sunoProxyUrl}/api/feed/${ids}`);
        if (!feedResponse.ok) {
          // Don't throw, just log and continue polling
          console.warn(`Polling failed (HTTP ${feedResponse.status}), retrying...`);
          continue;
        }

        const feedTracks: Track[] = await feedResponse.json();
        const allDone = feedTracks.every(t => t.status === 'complete');

        if (allDone) {
            // Add a small extra delay to ensure files are available on the server
            await new Promise(resolve => setTimeout(resolve, 1000)); 
            return feedTracks;
        }
      }

      throw new Error('Music generation timed out. The song took too long to process.');

    } catch (error) {
      console.error("An error occurred in MusicService:", error);
      if (error instanceof Error) {
        throw new Error(`[MusicService] ${error.message}`);
      }
      throw new Error('[MusicService] An unknown error occurred.');
    }
  }
}
