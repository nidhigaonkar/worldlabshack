import type { WorldResult } from '../types';

const API_KEY = import.meta.env.VITE_WORLDLABS_API_KEY as string;

export interface SavedWorld {
  id: string;
  prompt: string;
  timestamp: string;
  marbleUrl: string;
  caption: string;
  thumbnailUrl?: string;
  splatUrl?: string;
  panoUrl?: string;
}

function saveWorldToStorage(world: SavedWorld) {
  const saved = JSON.parse(localStorage.getItem('savedWorlds') || '[]') as SavedWorld[];
  saved.push(world);
  localStorage.setItem('savedWorlds', JSON.stringify(saved));
  console.log('[World Labs] SAVED WORLD:', world);
  console.log('[World Labs] Total saved worlds:', saved.length);
  console.log('[World Labs] To export all saved worlds, run in console: JSON.parse(localStorage.getItem("savedWorlds"))');
}

export function getSavedWorlds(): SavedWorld[] {
  return JSON.parse(localStorage.getItem('savedWorlds') || '[]');
}

export async function generateWorld(prompt: string): Promise<string> {
  const body = {
    display_name: prompt.slice(0, 60),
    world_prompt: { type: 'text', text_prompt: prompt },
    model: 'Marble 0.1-mini',
    permission: { public: true },
  };
  console.log('[World Labs] POST worlds:generate (using Marble-mini)', { body });
  console.log('[World Labs] API Key present:', !!API_KEY, 'length:', API_KEY?.length);
  const res = await fetch('/api/wl/marble/v1/worlds:generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'WLT-Api-Key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[World Labs] API Error:', { status: res.status, body: text, headers: Object.fromEntries(res.headers.entries()) });
    throw new Error(`World Labs generate failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const operationId: string = data.operation_id ?? data.name?.split('/').pop();
  if (!operationId) throw new Error('No operation_id in response');
  console.log('[World Labs] operation_id:', operationId);
  return operationId;
}

export async function generateWorldFromImages(
  imageDataUrls: string[],
  textPrompt: string
): Promise<string> {
  const imagePrompts = imageDataUrls.map(dataUrl => ({
    image: dataUrl,
  }));

  const body = {
    display_name: textPrompt.slice(0, 60),
    world_prompt: {
      type: 'image',
      image_prompts: imagePrompts,
      text_prompt: textPrompt,
    },
    model: 'Marble 0.1-mini',
    permission: { public: true },
  };

  console.log('[World Labs] POST worlds:generate with images', {
    imageCount: imageDataUrls.length,
    textPrompt: textPrompt.slice(0, 100),
  });

  const res = await fetch('/api/wl/marble/v1/worlds:generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'WLT-Api-Key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[World Labs] Image API Error:', { status: res.status, body: text });
    
    console.log('[World Labs] Falling back to text-only generation...');
    return generateWorld(textPrompt);
  }

  const data = await res.json();
  const operationId: string = data.operation_id ?? data.name?.split('/').pop();
  if (!operationId) throw new Error('No operation_id in response');
  console.log('[World Labs] operation_id (image-based):', operationId);
  return operationId;
}

export async function pollOperation(
  operationId: string,
  onProgress?: (attempt: number) => void,
  originalPrompt?: string,
): Promise<WorldResult> {
  const MAX_ATTEMPTS = 60;
  const INTERVAL_MS = 3000;

  console.log('[World Labs] polling operation', operationId);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    onProgress?.(attempt);
    if (attempt === 1) console.log('[World Labs] GET operations/' + operationId);

    const res = await fetch(`/api/wl/marble/v1/operations/${operationId}`, {
      headers: { 'WLT-Api-Key': API_KEY },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`World Labs poll failed (${res.status}): ${text}`);
    }

    const data = await res.json();

    if (data.done) {
      const r = data.response ?? data.metadata?.response ?? data;
      console.log('[World Labs] Full response:', JSON.stringify(r, null, 2));
      
      const marbleUrl: string =
        r.world_marble_url ?? r.assets?.world_marble_url ?? r.marble_url;
      const caption: string =
        r.assets?.caption ?? r.caption ?? '';
      const thumbnailUrl: string | undefined =
        r.assets?.thumbnail_url ?? r.thumbnail_url;
      const splatUrls = r.assets?.splats?.spz_urls;
      const splatUrl: string | undefined =
        splatUrls?.['500k'] ?? splatUrls?.full_res ?? splatUrls?.['100k'];
      const panoUrl: string | undefined =
        r.assets?.imagery?.pano_url ?? r.pano_url ?? r.imagery?.pano_url;

      if (!marbleUrl) throw new Error('No marble URL in completed operation');
      console.log('[World Labs] done', { marbleUrl, splatUrl, panoUrl, thumbnailUrl, attempt });
      
      // Auto-save the world
      saveWorldToStorage({
        id: operationId,
        prompt: originalPrompt || caption || 'Unknown prompt',
        timestamp: new Date().toISOString(),
        marbleUrl,
        caption,
        thumbnailUrl,
        splatUrl,
        panoUrl,
      });
      
      return { marbleUrl, caption, thumbnailUrl, splatUrl, panoUrl };
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise<void>((resolve) => setTimeout(resolve, INTERVAL_MS));
    }
  }

  throw new Error('World generation timed out after 3 minutes');
}
