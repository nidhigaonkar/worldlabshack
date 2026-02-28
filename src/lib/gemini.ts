const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

export async function generateTransitionImage(): Promise<string> {
  const prompt = `A stunning 360-degree equirectangular projection of a swirling mystical portal tunnel.
Photorealistic, cinematic lighting, seamless transition on left and right edges, aspect ratio 2:1, 8K resolution, VR environment map.
Deep purple and blue energy vortex, glowing particles, ethereal mist, cosmic void in the center leading to another dimension.
Magical interdimensional gateway with swirling nebula colors, stars, and light rays converging toward the center.`;

  console.log('[Gemini] Generating transition image with gemini-3.1-flash-image-preview...');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('[Gemini] API Error:', text);
    throw new Error(`Gemini API failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  
  // Find image part in response (can be mixed with text)
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: { inlineData?: { data: string } }) => p.inlineData?.data);
  
  if (!imagePart?.inlineData?.data) {
    console.error('[Gemini] No image data in response:', data);
    throw new Error('No image data in Gemini response');
  }

  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  console.log('[Gemini] Transition image generated successfully');

  return `data:${mimeType};base64,${imagePart.inlineData.data}`;
}
