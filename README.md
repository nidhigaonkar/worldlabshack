
# Reverie

**Built for the 1st World Labs Hackathon in SF** — An interactive memory lane experience where you explore 3D worlds generated from your photos with MediaPipe gesture controls.


A spatial experience app with two modes: an escape-room style game with AI-generated 3D worlds, and a memory-lane mode where you upload photos and walk through a personalized 3D world.

## Tech Stack

- **Core:** React 19, TypeScript 5.9, Vite 7
- **Styling:** Tailwind CSS 4, PostCSS, Autoprefixer
- **3D:** Three.js, @sparkjsdev/spark (Gaussian splat rendering)
- **AI / APIs:** World Labs Marble (world generation), OpenAI (GPT-3.5-turbo, GPT-4o-mini), Google Gemini (transition images), ElevenLabs (text-to-sound)
- **Input:** MediaPipe Tasks Vision for hand tracking and gesture-based navigation
- **Storage:** localStorage for saved worlds
- **Tooling:** ESLint, Vite dev proxy for external APIs



## Escape Room
1. **Pick your interests** — Select 3+ themes (nature, sci-fi, fantasy, ocean, cyberpunk, ancient ruins, etc.) from a grid of 20 options.
2. **Explore 3 worlds** — Each world is generated from a text prompt tailored to your interests. Worlds 2 and 3 build on the previous ones for a connected, evolving journey.
3. **View 3D Gaussian splats** — Worlds render as interactive 3D point clouds in-browser using [@sparkjsdev/spark](https://github.com/sparkjsdev/spark) and Three.js. You can orbit, zoom, and move with WASD or MediaPipe gesture controls!
4. **Travel through portals** — Click the glowing portal in each world to advance. Between worlds, a Gemini-generated transition image shows a mystical portal tunnel while the next world loads.
5. **Play ambient sound** — auto generation of ambient audio based on the scene with ElevenLabs.
6. **Open in Marble** — Each world links to [marble.worldlabs.ai](https://marble.worldlabs.ai) for the full Marble viewing experience.
7. **Save worlds** — Generated worlds are stored so you can revisit them later.

## APIs Used

| API | Purpose |
|-----|---------|
| **World Labs (Marble)** | Text-to-3D world generation |
| **OpenAI (GPT-3.5-turbo)** | Generate world descriptions from interests; generate ambient sound prompts |
| **Google Gemini** | Generate 360° portal transition images |
| **ElevenLabs** | Text-to-sound ambient audio generation |



## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS**
- **Three.js** + **@sparkjsdev/spark** for Gaussian splat rendering

## Setup

1. Copy `.env.example` to `.env` and add your API keys:
   ```
   VITE_WORLDLABS_API_KEY=
   VITE_OPENAI_API_KEY=
   VITE_GEMINI_API_KEY=
   VITE_ELEVENLABS_API_KEY=
   ```

2. Install and run:
   ```bash
   npm install
   npm run dev
   ```