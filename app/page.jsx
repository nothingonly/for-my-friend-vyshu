"use client";

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Lenis from '@studio-freight/lenis';
import FBOCanvas from '../components/FBOCanvas';

// Reusable animated text component
const FadeUpText = ({ children, className = "", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: false, amount: 0.5 }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

// Three roaming particle groups
const FloatingOrbs = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[5] overflow-hidden">
      {/* Orb 1 */}
      <motion.div
        className="absolute w-96 h-96 bg-amber-500/20 rounded-full blur-3xl mix-blend-screen"
        animate={{
          x: [0, 200, -100, 0],
          y: [0, -150, 100, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        style={{ top: '10%', left: '15%' }}
      />
      {/* Orb 2 */}
      <motion.div
        className="absolute w-[30rem] h-[30rem] bg-[#d4af37]/15 rounded-full blur-3xl mix-blend-screen"
        animate={{
          x: [0, -250, 150, 0],
          y: [0, 200, -100, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{ top: '40%', right: '10%' }}
      />
      {/* Orb 3 */}
      <motion.div
        className="absolute w-80 h-80 bg-yellow-500/20 rounded-full blur-3xl mix-blend-screen"
        animate={{
          x: [0, 150, -200, 0],
          y: [0, 250, -50, 0],
          scale: [1, 1.3, 0.9, 1],
        }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        style={{ bottom: '5%', left: '30%' }}
      />
    </div>
  );
};

export default function VyshnaviPage() {
  const canvasRef = useRef(null);

  // Canvas Image Sequence Player (Preload & requestAnimationFrame)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    const totalFrames = 300;
    const images = new Array(totalFrames).fill(null);
    const preloadCount = 10;
    let isPlaying = false;
    let frameIndex = 0;
    let animationFrameId;
    let lastTime = performance.now();
    const fps = 30;
    const interval = 1000 / fps;

    // Helper to draw image covering the entire canvas like object-cover
    const drawImageCover = (ctx, img, w, h) => {
      const imgRatio = img.width / img.height;
      const canvasRatio = w / h;
      let drawW, drawH, drawX, drawY;

      if (canvasRatio > imgRatio) {
        drawW = w;
        drawH = w / imgRatio;
        drawX = 0;
        drawY = (h - drawH) / 2;
      } else {
        drawW = h * imgRatio;
        drawH = h;
        drawX = (w - drawW) / 2;
        drawY = 0;
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Re-draw current frame on resize if loaded
      if (images[frameIndex] && images[frameIndex].complete && images[frameIndex].naturalWidth > 0) {
        drawImageCover(ctx, images[frameIndex], canvas.width, canvas.height);
      }
    };

    window.addEventListener('resize', resize);
    resize(); // Initial size setup

    const animate = (time) => {
      if (!isPlaying) return;
      animationFrameId = requestAnimationFrame(animate);

      if (time - lastTime >= interval) {
        if (images[frameIndex] && images[frameIndex].complete && images[frameIndex].naturalWidth > 0) {
          drawImageCover(ctx, images[frameIndex], canvas.width, canvas.height);
        }

        // Dynamically load frames slightly ahead to avoid blocking
        const loadAheadIndex = (frameIndex + preloadCount) % totalFrames;
        if (!images[loadAheadIndex]) {
          loadImage(loadAheadIndex);
        }

        frameIndex = (frameIndex + 1) % totalFrames;
        // Account for exact frame timing by using modulo
        lastTime = time - (time - lastTime) % interval; 
      }
    };

    const startPlaying = () => {
      if (!isPlaying) {
        isPlaying = true;
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    const loadImage = (index) => {
      if (images[index]) return;
      const img = new Image();
      const paddedIndex = String(index).padStart(4, '0');
      img.src = `/frames/frame_${paddedIndex}.webp`;
      images[index] = img;

      // Start animation exactly when the first frame loads
      if (index === 0) {
        if (img.complete) {
          startPlaying();
        } else {
          img.onload = startPlaying;
        }
      }
    };

    // Preload the first batch of frames immediately
    for (let i = 0; i < preloadCount; i++) {
      loadImage(i);
    }

    // Force wake-up for Canvas and Lenis by simulating a window resize
    const wakeUpTimeout = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100); // 100ms delay ensures DOM is painted

    return () => {
      isPlaying = false;
      clearTimeout(wakeUpTimeout);
      window.removeEventListener('resize', resize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    // Lenis smooth scrolling setup
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <main className="relative bg-[#050505] text-neutral-100 font-sans antialiased overflow-x-hidden selection:bg-[#d4af37]/30 selection:text-amber-200">

      {/* WebP Image Sequence Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full z-0 opacity-75 mix-blend-screen brightness-110"
      />

      {/* WebGL FBO Particle Background Layer */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        <FBOCanvas />
      </div>

      {/* Ambient Gold Radial Background Gradient */}
      <div
        className="pointer-events-none fixed inset-0 z-[2] opacity-40 mix-blend-screen"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.15) 0%, rgba(0, 0, 0, 0) 70%)'
        }}
      />

      {/* Roaming Orbs Layer */}
      <FloatingOrbs />

      {/* Content Wrapper */}
      <div className="relative z-10 w-full flex flex-col">

        {/* Section 1 (The Hero) */}
        <section className="h-screen w-full flex flex-col items-center justify-center px-6 relative">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="absolute top-12 left-0 w-full flex justify-center"
          >
            <span className="text-[10px] tracking-[0.4em] font-mono text-[#d4af37]/70 uppercase">
              IGNITING SEQUENCE
            </span>
          </motion.div>

          <FadeUpText delay={0.4}>
            <h1
              className="text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] font-serif font-extralight tracking-[0.5em] leading-none text-neutral-100 select-none pl-[0.5em] text-center"
              style={{ textShadow: '0px 0px 30px rgba(212, 175, 55, 0.8), 0px 0px 60px rgba(212, 175, 55, 0.4)' }}
            >
              VYSHNAVI
            </h1>
          </FadeUpText>

          <FadeUpText delay={0.8} className="mt-8 max-w-2xl text-center">
            <p className="text-lg sm:text-xl font-light tracking-wide text-neutral-300 leading-relaxed font-serif">
              "Instead of a standard DM, I wanted to build something unforgettable. Happy Friendship Day, Vyshu."
            </p>
          </FadeUpText>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: [0, 10, 0] }}
            transition={{
              opacity: { delay: 1.5, duration: 1 },
              y: { repeat: Infinity, duration: 2, ease: "easeInOut" }
            }}
            className="absolute bottom-12 text-xs font-mono tracking-[0.3em] text-[#d4af37]/60 uppercase flex flex-col items-center gap-2"
          >
            <span>Scroll to Ignite</span>
            <span>↓</span>
          </motion.div>
        </section>

        {/* Section 2 (December 2025) */}
        <section className="h-screen w-full flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto">
          <FadeUpText delay={0.1}>
            <p className="text-sm font-mono tracking-[0.3em] text-[#d4af37]/80 mb-6 uppercase">
              December 2, 2025.
            </p>
          </FadeUpText>
          <FadeUpText delay={0.3}>
            <p className="text-2xl sm:text-4xl lg:text-5xl font-serif font-light leading-snug tracking-tight text-neutral-100 drop-shadow-lg">
              "The day we met. You told me about your startup idea, and we just started talking."
            </p>
          </FadeUpText>
        </section>

        {/* Section 3 (April 2026 - The Open Gym & The Call) */}
        <section className="h-screen w-full flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto">
          <FadeUpText delay={0.1}>
            <p className="text-sm font-mono tracking-[0.3em] text-[#d4af37]/80 mb-6 uppercase">
              April 2026.
            </p>
          </FadeUpText>
          <FadeUpText delay={0.3}>
            <p className="text-xl sm:text-3xl lg:text-4xl font-serif font-light leading-relaxed tracking-tight text-neutral-300 drop-shadow-lg mb-8">
              "I still remember our conversation in the open gym. You asked about my long-time friends, and I told you I didn't really have any."
            </p>
          </FadeUpText>
          <FadeUpText delay={0.6}>
            <p className="text-2xl sm:text-4xl lg:text-5xl font-serif font-normal leading-snug tracking-tight text-[#d4af37] brightness-125" style={{ textShadow: '0px 0px 20px rgba(212, 175, 55, 0.4)' }}>
              "A day or two later, you called me and said: 'I will be your long-time friend.'"
            </p>
          </FadeUpText>
        </section>

        {/* Section 4 (The Loan - During the same call) */}
        <section className="h-screen w-full flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto gap-8">
          <FadeUpText delay={0.1}>
            <p className="text-xl sm:text-3xl lg:text-4xl font-serif font-light leading-relaxed text-neutral-200">
              "Right after that, you said that if I ever need 1 Lakh or more after B.Tech, you will give it to me."
            </p>
          </FadeUpText>
          <FadeUpText delay={0.4}>
            <p className="text-xl sm:text-3xl lg:text-4xl font-serif font-light leading-relaxed text-neutral-200">
              "But I have to return it with interest."
            </p>
          </FadeUpText>
          <FadeUpText delay={0.7}>
            <p className="text-base sm:text-xl lg:text-2xl font-serif italic text-[#d4af37]/70 mt-6">
              "(And definitely, if I take money from you in the future, I will repay it with interest!)"
            </p>
          </FadeUpText>
        </section>

        {/* Section 5 (The Finale) */}
        <section className="h-screen w-full flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto relative">
          <FadeUpText delay={0.1}>
            <p className="text-2xl sm:text-4xl lg:text-6xl font-serif font-light leading-tight tracking-tight text-neutral-100 mb-6">
              "I haven't met anyone quite like you."
            </p>
          </FadeUpText>
          <FadeUpText delay={0.4}>
            <p className="text-3xl sm:text-5xl lg:text-7xl font-serif font-normal leading-tight tracking-tight text-[#d4af37] brightness-110" style={{ textShadow: '0px 0px 30px rgba(212, 175, 55, 0.6)' }}>
              "I will remember this forever."
            </p>
          </FadeUpText>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 1.5, delay: 1 }}
            className="absolute bottom-12 text-[10px] tracking-[0.5em] font-mono text-neutral-500 uppercase"
          >
            HAPPY FRIENDSHIP DAY // 2026
          </motion.div>
        </section>

        {/* Footer Area */}
        <div className="w-full px-6 md:px-12 pt-16 pb-12 relative z-10 mt-12 flex flex-col">
          
          {/* Copyright Text */}
          <div className="w-full flex justify-center md:justify-start mb-6">
            <p className="text-white text-xs md:text-sm tracking-[0.3em] uppercase opacity-60 leading-relaxed text-center md:text-left">
              THIS WEBSITE IS MADE FOR MY FRIEND VYSHNAVI
            </p>
          </div>

          <hr className="w-full border-t border-white/20 my-8 relative z-10" />

          <footer className="w-full flex flex-col md:flex-row justify-between items-center md:items-end gap-10 md:gap-8">
            
            {/* Left Side: Name */}
            <div className="w-full md:w-auto flex flex-col gap-2 justify-center md:justify-start overflow-hidden items-center md:items-start">
              <span className="text-gray-500 text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase font-sans">
                Designed & Developed by
              </span>
              <h1
                className="text-2xl md:text-4xl font-serif font-extralight tracking-[0.5em] leading-none text-neutral-100 select-none whitespace-nowrap pl-[0.5em]"
                style={{ textShadow: '0px 0px 30px rgba(212, 175, 55, 0.8), 0px 0px 60px rgba(212, 175, 55, 0.4)' }}
              >
                KOUSHIK KATKAM
              </h1>
            </div>

            {/* Right Side: Links & Contact */}
            <div className="flex flex-col gap-6 md:gap-4 text-center md:text-right items-center md:items-end w-full md:w-auto shrink-0">
              
              {/* Email */}
              <div className="flex flex-col gap-0.5 items-center md:items-end">
                <span className="text-[#d4af37] text-[9px] tracking-[0.3em] uppercase font-bold opacity-70">Email</span>
                <a href="mailto:koushikkatkam@gmail.com" className="text-neutral-200 text-sm font-bold tracking-wider hover:text-white transition-colors">
                  koushikkatkam@gmail.com
                </a>
              </div>

              {/* Instagram */}
              <div className="flex flex-col gap-0.5 items-center md:items-end">
                <span className="text-[#d4af37] text-[9px] tracking-[0.3em] uppercase font-bold opacity-70">Instagram</span>
                <a href="https://instagram.com/koushik_katkam" target="_blank" rel="noreferrer" className="text-neutral-200 text-sm font-bold tracking-wider hover:text-white transition-colors">
                  @koushik_katkam
                </a>
              </div>

              {/* LinkedIn */}
              <div className="flex flex-col gap-0.5 items-center md:items-end">
                <span className="text-[#d4af37] text-[9px] tracking-[0.3em] uppercase font-bold opacity-70">LinkedIn</span>
                <a href="https://www.linkedin.com/in/koushik-katkam/" target="_blank" rel="noreferrer" className="text-neutral-200 text-sm font-bold tracking-wider hover:text-white transition-colors">
                  linkedin.com/in/koushik-katkam
                </a>
              </div>

              {/* GitHub */}
              <div className="flex flex-col gap-0.5 items-center md:items-end">
                <span className="text-[#d4af37] text-[9px] tracking-[0.3em] uppercase font-bold opacity-70">GitHub</span>
                <a href="https://github.com/KatkamKoushik" target="_blank" rel="noreferrer" className="text-neutral-200 text-sm font-bold tracking-wider hover:text-white transition-colors">
                  github.com/KatkamKoushik
                </a>
              </div>

            </div>
          </footer>
        </div>

      </div>
    </main>
  );
}
