'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export default function FBOCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // --- Global tracking variables ---
    const fboMouse = new THREE.Vector3(0, 0, 0);

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const isConstrainedDevice = () => {
      const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return window.innerWidth < 900 || coarse || reducedMotion;
    };

    let isMobile = isConstrainedDevice();

    // --- Scene & Camera ---
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, sizes.width, sizes.height, 0, -1000, 1000);
    camera.position.z = 10;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2));
    renderer.setSize(sizes.width, sizes.height);
    renderer.setClearColor(0x000000, 0);

    // --- Post-processing (selective bloom: particles only) ---
    const BLOOM_LAYER = 1;
    const bloomComposer = new EffectComposer(renderer);
    const finalComposer = new EffectComposer(renderer);
    const renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(sizes.width, sizes.height),
      0.85,
      0.95,
      0.6
    );

    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    const finalPass = new ShaderPass(
      {
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: null },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() {
            vec4 base = texture2D(baseTexture, vUv);
            vec4 bloom = texture2D(bloomTexture, vUv);
            gl_FragColor = base + bloom;
          }
        `,
      },
      'baseTexture'
    );
    finalPass.needsSwap = true;

    finalComposer.addPass(renderScene);
    finalComposer.addPass(finalPass);

    // --- FBO / GPGPU bootstrap ---
    function getComputeSize() {
      if (isMobile) return 96;
      const w = window.innerWidth;
      if (w < 1024) return 160;
      if (w < 1440) return 196;
      return 236;
    }

    let COMPUTE_SIZE = getComputeSize();
    let gpuCompute = null;
    let positionVariable = null;
    let velocityVariable = null;
    let particles = null;
    let pointsMaterial = null;

    function fillPositionTexture(texture) {
      const data = texture.image.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i + 0] = Math.random() * window.innerWidth;
        data[i + 1] = Math.random() * window.innerHeight;
        data[i + 2] = (Math.random() - 0.5) * 100.0;
        data[i + 3] = 1.0;
      }
    }

    function fillVelocityTexture(texture) {
      const data = texture.image.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 1;
      }
    }

    const positionFragmentShader = `
      uniform vec3 uBounds; 
      uniform float uDelta; 
      uniform float uTime;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 pos = texture2D(texturePosition, uv);
        vec4 vel = texture2D(textureVelocity, uv);
        vec3 nextPos = pos.xyz + vel.xyz;
        vec3 center = vec3(uBounds.x * 0.5, uBounds.y * 0.5, 0.0);
        vec3 span = vec3(uBounds.x, uBounds.y, uBounds.z);
        float h = fract(sin(dot(uv + uTime * 0.01, vec2(12.9898, 78.233))) * 43758.5453);
        float h2 = fract(sin(dot(uv + vec2(4.123, 9.456) + uTime * 0.02, vec2(39.346, 11.135))) * 24634.6345);
        bool outX = abs(nextPos.x - center.x) > span.x * 1.25;
        bool outY = abs(nextPos.y - center.y) > span.y * 1.25;
        bool outZ = abs(nextPos.z) > span.z * 1.25;
        if (outX || outY || outZ) {
          nextPos = center + vec3((h - 0.5) * uBounds.x * 0.15, (h2 - 0.5) * uBounds.y * 0.15, (h - 0.5) * uBounds.z * 0.15);
        }
        gl_FragColor = vec4(nextPos, 1.0);
      }
    `;

    const velocityFragmentShader = `
      uniform vec3 uMouse; 
      uniform vec3 uBounds; 
      uniform float uDelta; 
      uniform float uTime;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0); 
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy)); 
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz); 
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy); 
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx; 
        vec3 x2 = x0 - i2 + C.yyy; 
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 1.0/7.0; 
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 
        vec4 x_ = floor(j * ns.z); 
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy; 
        vec4 y = y_ * ns.x + ns.yyyy; 
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy); 
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0; 
        vec4 s1 = floor(b1)*2.0 + 1.0; 
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; 
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy,h.x); 
        vec3 p1 = vec3(a0.zw,h.y); 
        vec3 p2 = vec3(a1.xy,h.z); 
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m; 
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      vec3 curlNoise(vec3 p) {
        const float e = 0.1; 
        vec3 dx = vec3(e, 0.0, 0.0); 
        vec3 dy = vec3(0.0, e, 0.0); 
        vec3 dz = vec3(0.0, 0.0, e);
        vec3 p_x0 = vec3(snoise(p - dx), snoise(p - dx + vec3(12.3)), snoise(p - dx + vec3(24.6)));
        vec3 p_x1 = vec3(snoise(p + dx), snoise(p + dx + vec3(12.3)), snoise(p + dx + vec3(24.6)));
        vec3 p_y0 = vec3(snoise(p - dy), snoise(p - dy + vec3(12.3)), snoise(p - dy + vec3(24.6)));
        vec3 p_y1 = vec3(snoise(p + dy), snoise(p + dy + vec3(12.3)), snoise(p + dy + vec3(24.6)));
        vec3 p_z0 = vec3(snoise(p - dz), snoise(p - dz + vec3(12.3)), snoise(p - dz + vec3(24.6)));
        vec3 p_z1 = vec3(snoise(p + dz), snoise(p + dz + vec3(12.3)), snoise(p + dz + vec3(24.6)));
        float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y; 
        float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z; 
        float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;
        return normalize(vec3(x, y, z) / (2.0 * e));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec3 pos = texture2D(texturePosition, uv).xyz;
        vec3 vel = texture2D(textureVelocity, uv).xyz;
        
        // Increased Noise & Dispersion
        vec3 targetVel = curlNoise(pos * 0.0015 + uTime * 0.15) * 5.0;
        vel += (targetVel - vel) * 0.08;
        
        float dist = distance(pos.xy, uMouse.xy);
        float maxDistance = 150.0; 
        if (dist < maxDistance) {
          vec2 dir = pos.xy - uMouse.xy;
          float force = (maxDistance - dist) / maxDistance;
          vel.xy += normalize(dir + 0.0001) * force * 25.0;
        }
        
        // Removed singularity gravity and reduced heavy damping
        vel *= 0.98; 
        gl_FragColor = vec4(vel, 1.0);
      }
    `;

    function initGpuCompute() {
      try {
        gpuCompute = new GPUComputationRenderer(COMPUTE_SIZE, COMPUTE_SIZE, renderer);

        const positionTexture = gpuCompute.createTexture();
        const velocityTexture = gpuCompute.createTexture();
        fillPositionTexture(positionTexture);
        fillVelocityTexture(velocityTexture);

        positionVariable = gpuCompute.addVariable('texturePosition', positionFragmentShader, positionTexture);
        velocityVariable = gpuCompute.addVariable('textureVelocity', velocityFragmentShader, velocityTexture);

        gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
        gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);

        positionVariable.material.uniforms.uBounds = { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 100) };
        positionVariable.material.uniforms.uTime = { value: 0.0 };
        positionVariable.material.uniforms.uDelta = { value: 0.016 };

        velocityVariable.material.uniforms.uBounds = { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 100) };
        velocityVariable.material.uniforms.uDelta = { value: 0.016 };
        velocityVariable.material.uniforms.uTime = { value: 0.0 };
        velocityVariable.material.uniforms.uMouse = { value: fboMouse };

        const initError = gpuCompute.init();
        if (initError) {
          console.error('GPUComputationRenderer init error:', initError);
          gpuCompute = null;
          positionVariable = null;
          velocityVariable = null;
        }
      } catch (err) {
        console.error('GPUCompute setup failed:', err);
        gpuCompute = null;
        positionVariable = null;
        velocityVariable = null;
      }
    }

    initGpuCompute();

    // --- Particle render layer ---
    function initParticles() {
      if (!gpuCompute || !positionVariable) return;

      const size = COMPUTE_SIZE;
      const particlesCount = size * size;

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particlesCount * 3);
      const references = new Float32Array(particlesCount * 2);

      for (let i = 0; i < particlesCount; i++) {
        const x = ((i % size) + 0.5) / size;
        const y = (Math.floor(i / size) + 0.5) / size;
        references[i * 2] = x;
        references[i * 2 + 1] = y;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('reference', new THREE.BufferAttribute(references, 2));

      const particlesVertexShader = `
        uniform sampler2D uPositionTexture;
        attribute vec2 reference;
        varying vec3 vPos;

        void main() {
          vec3 pos = texture2D(uPositionTexture, reference).xyz;
          vPos = pos; 
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = 2.2;
        }
      `;

      // TASK 3: Fix Additive Blinding & Pure Golden color
      const particlesFragmentShader = `
        uniform float uAlpha;
        varying vec3 vPos;

        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          
          // Make the particles softer
          float mask = smoothstep(0.5, 0.1, d);

          // Fiery gold color as requested
          vec3 finalColor = vec3(1.0, 0.75, 0.05);

          // Lower the base opacity to prevent overlapping blowouts with AdditiveBlending
          float baseOpacity = uAlpha * 0.15;

          gl_FragColor = vec4(finalColor, baseOpacity * mask);
        }
      `;

      pointsMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uPositionTexture: { value: null },
          uAlpha: { value: 0.88 },
        },
        vertexShader: particlesVertexShader,
        fragmentShader: particlesFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      particles = new THREE.Points(geometry, pointsMaterial);
      particles.frustumCulled = false;
      particles.position.z = -300;
      particles.layers.set(BLOOM_LAYER);
      scene.add(particles);
    }

    initParticles();

    // --- Mouse & Touch interaction tracking ---
    const updatePointerFromClient = (clientX, clientY) => {
      fboMouse.x = clientX;
      fboMouse.y = sizes.height - clientY;
      fboMouse.z = 0;
    };

    const resetPointerInteraction = () => {
      fboMouse.set(-10000, -10000, 0);
    };

    const handlePointerMove = (e) => {
      updatePointerFromClient(e.clientX, e.clientY);
    };

    const handleTouchPointer = (e) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      updatePointerFromClient(touch.clientX, touch.clientY);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('touchstart', handleTouchPointer, { passive: true });
    window.addEventListener('touchmove', handleTouchPointer, { passive: true });
    window.addEventListener('touchend', resetPointerInteraction, { passive: true });
    window.addEventListener('touchcancel', resetPointerInteraction, { passive: true });

    // --- Cleanup GPU computation ---
    function disposeGpuCompute() {
      if (particles) {
        scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
        particles = null;
        pointsMaterial = null;
      }
      if (gpuCompute) {
        gpuCompute.dispose();
        gpuCompute = null;
        positionVariable = null;
        velocityVariable = null;
      }
    }

    // --- Resize Handler ---
    let resizeTimer = null;
    const onResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      isMobile = isConstrainedDevice();

      camera.right = sizes.width;
      camera.top = sizes.height;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2));
      renderer.setSize(sizes.width, sizes.height);
      bloomComposer.setSize(sizes.width, sizes.height);
      finalComposer.setSize(sizes.width, sizes.height);

      if (bloomPass) {
        bloomPass.setSize(new THREE.Vector2(sizes.width, sizes.height));
      }

      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newComputeSize = getComputeSize();
        if (newComputeSize !== COMPUTE_SIZE) {
          COMPUTE_SIZE = newComputeSize;
          disposeGpuCompute();
          initGpuCompute();
          initParticles();
        } else {
          if (positionVariable?.material?.uniforms?.uBounds) {
            positionVariable.material.uniforms.uBounds.value.set(window.innerWidth, window.innerHeight, 100);
          }
          if (velocityVariable?.material?.uniforms?.uBounds) {
            velocityVariable.material.uniforms.uBounds.value.set(window.innerWidth, window.innerHeight, 100);
          }
        }
      }, 200);
    };

    window.addEventListener('resize', onResize);

    // --- Render Animation Loop ---
    let animationFrameId = null;

    const animate = () => {
      if (gpuCompute && positionVariable && velocityVariable) {
        velocityVariable.material.uniforms.uMouse.value.copy(fboMouse);
        velocityVariable.material.uniforms.uTime.value += 0.01;
        positionVariable.material.uniforms.uTime.value += 0.01;

        gpuCompute.compute();

        if (pointsMaterial) {
          pointsMaterial.uniforms.uPositionTexture.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
        }
      }

      if (isMobile) {
        camera.layers.enableAll();
        renderer.render(scene, camera);
        camera.layers.set(0);
      } else {
        camera.layers.set(BLOOM_LAYER);
        bloomComposer.render();

        if (finalPass?.uniforms?.bloomTexture) {
          finalPass.uniforms.bloomTexture.value = bloomComposer.readBuffer.texture;
        }

        camera.layers.set(0);
        finalComposer.render();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // --- Clean Up Lifecycle on Unmount ---
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      clearTimeout(resizeTimer);

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchstart', handleTouchPointer);
      window.removeEventListener('touchmove', handleTouchPointer);
      window.removeEventListener('touchend', resetPointerInteraction);
      window.removeEventListener('touchcancel', resetPointerInteraction);
      window.removeEventListener('resize', onResize);

      disposeGpuCompute();
      bloomComposer.dispose();
      finalComposer.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
