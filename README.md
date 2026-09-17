# Vyshnavi — A Friendship Day Dedication

I created this project as an interactive web experience dedicated to my close friend, Vyshnavi (Vyshu), for Friendship Day 2026. Rather than sending a conventional text message or card, I wanted to craft an immersive digital tribute that pairs modern creative engineering with our personal memories.

The experience blends an obsidian and gold design language with a real-time GPU particle simulation, high-performance canvas frame sequencing, and smooth momentum scrolling.

---

## Why I Built This

Friendship is rarely captured well by standard social media messages. During our time in college, Vyshu and I shared conversations that genuinely shaped my perspective. When I reflected on those moments, I decided to preserve our milestones in code:

1. **December 2, 2025**: The day we first met. She pitched her startup concept to me, and what started as a simple discussion turned into an ongoing friendship.
2. **April 2026 (The Open Gym Conversation)**: During an open gym workout, she asked me about my long-time friends, and I honestly answered that I did not really have any. A couple of days later, she called me up and told me: "I will be your long-time friend."
3. **The Post-Graduation Agreement**: During that same call, she offered to loan me 1 Lakh or more if I ever needed capital after completing my B.Tech degree—with the catch that I must return it with interest. I made sure to record that promise in this project, affirming that if I ever borrow from her, I will repay it with interest.
4. **The Dedication**: A closing note celebrating our friendship, acknowledging that I have rarely met someone with her mindset, and memorializing this bond forever.

---

## Visual Concept and Aesthetics

I designed the interface around a luxury obsidian and gold color palette:
- Deep obsidian base (`#050505`) to create extreme contrast and depth.
- Warm radiant golds (`#D4AF37`, amber, and yellow accents) reflecting warmth, energy, and value.
- Ambient radial gradients and drifting luminous orbs to give the canvas atmospheric lighting.
- Serif typography combined with high tracking for a cinematic, timeless editorial feel.

---

## Technical Architecture

I developed this application using the Next.js App Router and contemporary creative web technologies:

### 1. Framework and Styling
- **Next.js 14 (App Router)**: Server-side rendering and asset pipeline optimization.
- **React 18**: Component architecture and custom lifecycle hooks for canvas orchestration.
- **Tailwind CSS**: Utility-first styling with custom gold tonal scales (`gold-100` through `gold-600`) and layout structuring.

### 2. GPGPU FBO Particle System (`components/FBOCanvas.jsx`)
To produce dynamic particle motion across the screen, I implemented a GPGPU (General-Purpose computing on GPUs) system powered by Three.js and `GPUComputationRenderer`:
- **Simulation Data**: Instead of recalculating thousands of particle positions on the CPU, positions and velocities are stored in floating-point textures (`texturePosition` and `textureVelocity`) and processed entirely on the GPU via custom GLSL fragment shaders.
- **Physics and Curl Noise**: The velocity shader evaluates a 3D Simplex curl noise field (`curlNoise`) to create fluid-like, non-divergent turbulence.
- **Interactive Repulsion**: When a user moves their mouse or drags a finger across a touchscreen, the cursor coordinates are fed into shader uniforms, producing an inverse-distance radial repulsion force that scatters particles organically.
- **Adaptive Compute Grid**: The simulation scales dynamically depending on device capability:
  - Mobile / low-power devices: 96 x 96 grid (9,216 particles)
  - Tablets and small laptops: 160 x 160 to 196 x 196 grid (~25,000 to 38,000 particles)
  - High-resolution desktops: 236 x 236 grid (55,696 particles)
- **Post-Processing Pipeline**: I configured a selective two-stage bloom workflow using `EffectComposer`, `RenderPass`, `UnrealBloomPass`, and a custom composite `ShaderPass`. Particles are isolated on an exclusive render layer so bloom applies purely to the golden sparks without blowing out text or UI elements.

### 3. Canvas Image Sequence Player (`app/page.jsx`)
In the background, I engineered a high-efficiency frame sequence animator:
- Plays back 300 pre-rendered WebP frames (`/frames/frame_0000.webp` through `frame_0299.webp`) at a locked 30 frames per second using `requestAnimationFrame`.
- Features lookahead preloading: frames are fetched ahead of the playhead to guarantee stutter-free looping while keeping memory footprint low.
- Custom aspect-ratio preservation (`drawImageCover`) ensures the video sequence acts like `object-fit: cover` regardless of browser aspect ratio or viewport size changes.

### 4. Smooth Scrolling and Kinetic Typography
- **Lenis (`@studio-freight/lenis`)**: Implemented for inertia-based smooth scrolling to give narrative reading a fluid, cinematic pace.
- **Framer Motion**: Powers the scroll-triggered reveal animations (`FadeUpText`), floating ambient backdrop orbs, and pulsing scroll cues.

---

## Project Structure

Below is an overview of the codebase organization:

```text
for-my-friend-vyshu/
├── app/
│   ├── globals.css          # Base CSS reset and background tokens
│   ├── layout.jsx           # Root layout with metadata and font definitions
│   └── page.jsx             # Main interactive story, Canvas player, and footer
├── components/
│   └── FBOCanvas.jsx        # Three.js WebGL GPGPU particle engine and shaders
├── public/
│   └── frames/              # 300 WebP sequence frames for background playback
├── package.json             # Project dependencies and script declarations
├── postcss.config.js        # PostCSS configuration for Tailwind
├── tailwind.config.js       # Tailwind color extensions and content paths
└── README.md                # Project documentation
```

---

## Local Setup and Development

To run this project locally on your machine:

### Prerequisites
- Node.js (version 18.17 or later)
- pnpm, npm, or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/KatkamKoushik/for-my-friend-vyshu.git
   cd for-my-friend-vyshu
   ```

2. Install dependencies:
   ```bash
   pnpm install
   # or
   npm install
   ```

3. Run the development server:
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

4. Open `http://localhost:3000` in your web browser.

### Building for Production

To generate an optimized production build:

```bash
pnpm build
pnpm start
```

---

## Optimization Details

1. **GPU Offloading**: Physics calculations run on the GPU via fragment shaders, keeping main-thread CPU usage minimal.
2. **Device Awareness**: Pointer type (`hover: none`, `pointer: coarse`) and reduced-motion preferences (`prefers-reduced-motion: reduce`) are queried to adapt particle count and disable heavy bloom passes on mobile.
3. **WebP Compression**: Using WebP image sequence frames instead of high-bitrate video containers avoids autoplay codec issues across different browsers and operating systems.
4. **Clean Disposal**: All Three.js geometries, materials, render targets, composers, animation frames, and resize listeners are properly disposed of on component unmount to prevent memory leaks.

---

## Author

Designed and developed by **Koushik Katkam**.

- Email: koushikkatkam@gmail.com
- GitHub: https://github.com/KatkamKoushik
- LinkedIn: https://www.linkedin.com/in/koushik-katkam/
- Instagram: https://instagram.com/koushik_katkam
