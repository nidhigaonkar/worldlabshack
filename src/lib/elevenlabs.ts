const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY as string;

export async function generateSoundEffect(text: string): Promise<ArrayBuffer> {
  const res = await fetch('/api/el/v1/sound-generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_text_to_sound_v2',
      loop: true,
      duration_seconds: 8,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs API failed (${res.status}): ${text}`);
  }

  return res.arrayBuffer();
}

export interface AudioEngine {
  stop: () => void;
  setMuted: (muted: boolean) => void;
}

export async function startAudioLoop(audioData: ArrayBuffer): Promise<AudioEngine> {
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const buffer = await ctx.decodeAudioData(audioData.slice(0));

  const gainNode = ctx.createGain();
  gainNode.connect(ctx.destination);

  let source: AudioBufferSourceNode | null = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(gainNode);
  source.start(0);

  return {
    stop() {
      source?.stop();
      source = null;
      ctx.close();
    },
    setMuted(muted: boolean) {
      gainNode.gain.value = muted ? 0 : 1;
    },
  };
}

let audioUnlocked = false;

export function unlockAudio() {
  if (audioUnlocked) return;
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.connect(gain);
  osc.start(0);
  osc.stop(0.01);
  audioUnlocked = true;
  console.log('[ElevenLabs] AudioContext unlocked by user gesture');
}
