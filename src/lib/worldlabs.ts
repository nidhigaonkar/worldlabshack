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

/** Parse a data URL into a Blob for uploading */
function dataUrlToBlob(dataUrl: string): { blob: Blob; extension: string; mimeType: string } {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image data URL');
  const mimeType = match[1];
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
  const bytes = atob(match[2]);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return { blob: new Blob([arr], { type: mimeType }), extension, mimeType };
}

/** Step 1: Prepare upload, Step 2: PUT to signed URL. Returns media_asset_id. */
async function uploadImageAsMediaAsset(dataUrl: string, filename: string): Promise<string> {
  const { blob, extension, mimeType } = dataUrlToBlob(dataUrl);

  // Step 1: prepare upload
  const prepareRes = await fetch('/api/wl/marble/v1/media-assets:prepare_upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'WLT-Api-Key': API_KEY,
    },
    body: JSON.stringify({ file_name: filename, extension, kind: 'image' }),
  });

  if (!prepareRes.ok) {
    const text = await prepareRes.text();
    throw new Error(`prepare_upload failed (${prepareRes.status}): ${text}`);
  }

  const data = await prepareRes.json() as {
    media_asset?: { media_asset_id: string };
    upload_info?: { upload_url: string; required_headers?: Record<string, string> };
  };
  const media_asset_id = data.media_asset?.media_asset_id;
  const upload_url = data.upload_info?.upload_url;
  const required_headers = data.upload_info?.required_headers ?? {};

  if (!media_asset_id || !upload_url) {
    throw new Error(`prepare_upload failed: missing media_asset_id or upload_url in response`);
  }

  console.log('[World Labs] prepared upload, media_asset_id:', media_asset_id);

  // Step 2: PUT to signed URL (external S3 — goes direct, not through proxy)
  const putRes = await fetch(upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
      ...required_headers,
    },
    body: blob,
  });

  if (!putRes.ok) {
    throw new Error(`Signed upload failed (${putRes.status})`);
  }

  console.log('[World Labs] uploaded image, media_asset_id:', media_asset_id);
  return media_asset_id;
}

export async function generateWorldFromImages(
  imageDataUrls: string[],
  textPrompt: string
): Promise<string> {
  // Limit to 4 images (multi-image API max without reconstruct_images)
  const imagesToUse = imageDataUrls.slice(0, 4);

  console.log('[World Labs] Uploading', imagesToUse.length, 'images as media assets...');

  let mediaAssetIds: string[];
  try {
    mediaAssetIds = await Promise.all(
      imagesToUse.map((dataUrl, i) => uploadImageAsMediaAsset(dataUrl, `memory-${i}.jpg`))
    );
  } catch (err) {
    console.error('[World Labs] Upload failed, falling back to text-only:', err);
    return generateWorld(textPrompt);
  }

  // Step 3: Generate world with media_asset_ids
  const multiImagePrompt = mediaAssetIds.map((id, i) => ({
    content: { source: 'media_asset' as const, media_asset_id: id },
    azimuth: (360 * i) / mediaAssetIds.length,
  }));

  const body = {
    display_name: textPrompt.slice(0, 60),
    world_prompt: {
      type: 'multi-image' as const,
      multi_image_prompt: multiImagePrompt,
      text_prompt: textPrompt,
    },
    model: 'Marble 0.1-mini',
    permission: { public: true },
  };

  console.log('[World Labs] POST worlds:generate (multi-image)', {
    imageCount: mediaAssetIds.length,
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
    console.error('[World Labs] Image generate failed:', { status: res.status, body: text });
    console.log('[World Labs] Falling back to text-only generation...');
    return generateWorld(textPrompt);
  }

  const data = await res.json();
  const operationId: string = data.operation_id ?? data.name?.split('/').pop();
  if (!operationId) throw new Error('No operation_id in response');
  console.log('[World Labs] operation_id (multi-image):', operationId);
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
        splatUrls?.full_res ?? splatUrls?.['500k'] ?? splatUrls?.['100k'];
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
