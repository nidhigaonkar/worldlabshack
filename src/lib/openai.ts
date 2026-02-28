const API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string;

export interface Interest {
  id: string;
  name: string;
  emoji: string;
  keywords: string[];
}

export const INTERESTS: Interest[] = [
  { id: 'nature', name: 'Nature', emoji: '🌲', keywords: ['forest', 'mountains', 'rivers', 'wildlife'] },
  { id: 'sci-fi', name: 'Sci-Fi', emoji: '🚀', keywords: ['space', 'futuristic', 'technology', 'alien'] },
  { id: 'fantasy', name: 'Fantasy', emoji: '🧙', keywords: ['magic', 'dragons', 'castles', 'enchanted'] },
  { id: 'ocean', name: 'Ocean', emoji: '🌊', keywords: ['underwater', 'coral', 'marine', 'deep sea'] },
  { id: 'cyberpunk', name: 'Cyberpunk', emoji: '🌃', keywords: ['neon', 'dystopian', 'hacker', 'augmented'] },
  { id: 'ancient', name: 'Ancient Ruins', emoji: '🏛️', keywords: ['temple', 'archaeological', 'mysterious', 'forgotten'] },
  { id: 'steampunk', name: 'Steampunk', emoji: '⚙️', keywords: ['Victorian', 'brass', 'clockwork', 'airship'] },
  { id: 'horror', name: 'Horror', emoji: '👻', keywords: ['haunted', 'dark', 'eerie', 'supernatural'] },
  { id: 'cosmic', name: 'Cosmic', emoji: '🌌', keywords: ['nebula', 'stars', 'celestial', 'void'] },
  { id: 'tropical', name: 'Tropical', emoji: '🏝️', keywords: ['island', 'paradise', 'palm', 'lagoon'] },
  { id: 'winter', name: 'Winter', emoji: '❄️', keywords: ['snow', 'ice', 'frozen', 'arctic'] },
  { id: 'desert', name: 'Desert', emoji: '🏜️', keywords: ['sand', 'oasis', 'dunes', 'ancient'] },
  { id: 'music', name: 'Music', emoji: '🎵', keywords: ['concert', 'festival', 'instruments', 'rhythm'] },
  { id: 'art', name: 'Art Gallery', emoji: '🎨', keywords: ['paintings', 'sculpture', 'museum', 'creative'] },
  { id: 'gardens', name: 'Gardens', emoji: '🌸', keywords: ['flowers', 'zen', 'botanical', 'peaceful'] },
  { id: 'caves', name: 'Caves', emoji: '🦇', keywords: ['crystal', 'underground', 'cavern', 'glowing'] },
  { id: 'floating', name: 'Floating Islands', emoji: '🪨', keywords: ['sky', 'clouds', 'waterfalls', 'magical'] },
  { id: 'library', name: 'Library', emoji: '📚', keywords: ['books', 'knowledge', 'ancient', 'mystical'] },
  { id: 'marketplace', name: 'Marketplace', emoji: '🏪', keywords: ['bazaar', 'vendors', 'exotic', 'bustling'] },
  { id: 'volcano', name: 'Volcanic', emoji: '🌋', keywords: ['lava', 'fire', 'molten', 'dramatic'] },
];

export async function generateWorldDescription(
  interests: Interest[],
  worldNumber: number,
  previousWorlds: string[] = []
): Promise<string> {
  const interestNames = interests.map(i => i.name).join(', ');

  let worldContext = '';
  if (worldNumber === 1) {
    worldContext = 'This is the FIRST world - create a grounded, immersive starting environment.';
  } else if (worldNumber === 2) {
    worldContext = `This is the SECOND world. Previous world was: "${previousWorlds[0]?.slice(0, 100)}..."
    
Create something different but thematically connected. Take a few elements from the previous world and reimagine it in a new context.
Example: if previous had waterfalls → this could have waterfalls in space, or frozen waterfalls, or upside-down waterfalls in a new environment.`;
  } else {
    worldContext = `This is the FINAL world. Previous worlds: 
1. "${previousWorlds[0]?.slice(0, 80)}..."
2. "${previousWorlds[1]?.slice(0, 80)}..."

Create the most EPIC and SURREAL combination - merge elements from both previous worlds into something extraordinary and climactic.`;
  }

  const userPrompt = `Categories: ${interestNames}

${worldContext}

Write a detailed 3D scene description. Include environment, lighting, atmosphere, textures, colors.
DO NOT name the place or say "Welcome to". Just describe what you see.

Write 2-3 sentences, around 40-60 words:`;

  console.log('[OpenAI] Generating world description', { worldNumber, interests: interestNames });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      max_tokens: 120,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  let description = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!description) throw new Error('Empty response from OpenAI');
  
  // Allow longer prompts - up to 400 chars for better world generation
  if (description.length > 400) {
    description = description.slice(0, 397) + '...';
  }
  
  console.log('[OpenAI] Generated description:', description);
  return description;
}

export interface SceneSelectionResult {
  selectedIndices: number[];
  themes: string[];
  worldPrompt: string;
}

export async function selectSceneImages(
  images: { dataUrl: string; filename: string }[]
): Promise<SceneSelectionResult> {
  console.log('[OpenAI] Analyzing', images.length, 'images for scene selection...');

  const imageContents = images.map((img, index) => ({
    type: 'image_url' as const,
    image_url: {
      url: img.dataUrl,
      detail: 'low' as const,
    },
  }));

  const prompt = `You are analyzing ${images.length} personal photos to create a 3D memory world.

TASK 1: Select 2-4 images that show clear SCENES or ENVIRONMENTS:
- Good: rooms, parks, beaches, landscapes, buildings, streets, nature views
- Avoid: selfies, close-up portraits, food close-ups, blurry images, text/screenshots

TASK 2: Identify 3-5 emotional themes from all the photos (e.g., "family gatherings", "outdoor adventures", "cozy home moments", "travel memories")

TASK 3: Write a brief world description (30-50 words) that captures the essence of these memories for 3D world generation. Focus on atmosphere, lighting, and spatial elements.

Respond ONLY with valid JSON in this exact format:
{
  "selectedIndices": [0, 2, 5],
  "themes": ["family love", "nature adventures", "cozy evenings"],
  "worldPrompt": "A warm, nostalgic hallway connecting intimate memory spaces. Soft golden hour lighting filters through, with personal photographs adorning the walls. The atmosphere feels like walking through cherished moments frozen in time."
}

Image indices are 0-based (0 to ${images.length - 1}).`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...imageContents,
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI Vision API failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim() ?? '';
  
  console.log('[OpenAI] Vision response:', content);

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    
    const parsed = JSON.parse(jsonMatch[0]) as SceneSelectionResult;
    
    if (!Array.isArray(parsed.selectedIndices) || parsed.selectedIndices.length === 0) {
      parsed.selectedIndices = [0];
    }
    parsed.selectedIndices = parsed.selectedIndices.filter(
      (i: number) => i >= 0 && i < images.length
    );
    
    if (!Array.isArray(parsed.themes) || parsed.themes.length === 0) {
      parsed.themes = ['personal memories'];
    }
    
    if (!parsed.worldPrompt || typeof parsed.worldPrompt !== 'string') {
      parsed.worldPrompt = 'A nostalgic memory space filled with warm lighting and personal photographs.';
    }

    console.log('[OpenAI] Scene selection result:', parsed);
    return parsed;
  } catch (parseErr) {
    console.warn('[OpenAI] Failed to parse response, using defaults:', parseErr);
    return {
      selectedIndices: [0],
      themes: ['personal memories'],
      worldPrompt: 'A nostalgic memory space filled with warm lighting and personal photographs adorning the walls.',
    };
  }
}

export async function getSoundPrompt(caption: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      max_tokens: 25,
      messages: [
        {
          role: 'user',
          content: `Based on this 3D world: "${caption.slice(0, 150)}" → write ambient sound description (10 words max):`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const soundPrompt = data.choices?.[0]?.message?.content?.trim() ?? '';
  return soundPrompt || `Ambient atmosphere for ${caption.slice(0, 50)}`;
}

