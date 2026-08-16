import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

type GalaxyBackgroundProps = {
  onReady: () => void;
};

type QualityProfile = {
  dpr: number;
  stars: number;
  galaxyStars: number;
  dust: number;
  bloomStrength: number;
  frameInterval: number;
};

type NavigatorWithMemory = Navigator & {
  deviceMemory?: number;
};

function getQualityProfile(): QualityProfile {
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as NavigatorWithMemory).deviceMemory || 4;
  const dpr = window.devicePixelRatio || 1;

  if (mobile || cores <= 4 || memory <= 4) {
    return {
      dpr: Math.min(dpr, 1.15),
      stars: 900,
      galaxyStars: 1200,
      dust: 240,
      bloomStrength: 0.42,
      frameInterval: 1000 / 40,
    };
  }

  if (cores <= 8 || memory <= 8) {
    return {
      dpr: Math.min(dpr, 1.5),
      stars: 1600,
      galaxyStars: 2200,
      dust: 500,
      bloomStrength: 0.58,
      frameInterval: 1000 / 55,
    };
  }

  return {
    dpr: Math.min(dpr, 1.8),
    stars: 2400,
    galaxyStars: 3400,
    dust: 800,
    bloomStrength: 0.72,
    frameInterval: 1000 / 60,
  };
}

function createStarField(count: number, radius: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cool = new THREE.Color("#8fd8ff");
  const warm = new THREE.Color("#fff1d5");
  const violet = new THREE.Color("#b29cff");

  for (let index = 0; index < count; index += 1) {
    const distance = radius * (0.45 + Math.random() * 0.55);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const positionIndex = index * 3;
    positions[positionIndex] = distance * Math.sin(phi) * Math.cos(theta);
    positions[positionIndex + 1] = distance * Math.cos(phi);
    positions[positionIndex + 2] =
      distance * Math.sin(phi) * Math.sin(theta) - radius * 0.22;

    const color = cool
      .clone()
      .lerp(Math.random() > 0.72 ? warm : violet, Math.random() * 0.7);
    colors[positionIndex] = color.r;
    colors[positionIndex + 1] = color.g;
    colors[positionIndex + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.095,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.82,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

function createSpiralGalaxy(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const core = new THREE.Color("#f4fbff");
  const middle = new THREE.Color("#9d8cff");
  const edge = new THREE.Color("#2988ff");
  const arms = 5;

  for (let index = 0; index < count; index += 1) {
    const radiusRatio = Math.pow(Math.random(), 0.64);
    const radius = radiusRatio * 24;
    const arm = index % arms;
    const branchAngle = (arm / arms) * Math.PI * 2;
    const spin = radius * 0.43;
    const scatter = (1 - radiusRatio * 0.52) * 2.1;
    const angle = branchAngle + spin + (Math.random() - 0.5) * scatter;
    const positionIndex = index * 3;

    positions[positionIndex] =
      Math.cos(angle) * radius + (Math.random() - 0.5) * 1.3;
    positions[positionIndex + 1] =
      (Math.random() - 0.5) * (0.5 + radiusRatio * 2.6);
    positions[positionIndex + 2] =
      Math.sin(angle) * radius + (Math.random() - 0.5) * 1.3 - 12;

    const color =
      radiusRatio < 0.28
        ? core.clone().lerp(middle, radiusRatio / 0.28)
        : middle.clone().lerp(edge, (radiusRatio - 0.28) / 0.72);
    colors[positionIndex] = color.r;
    colors[positionIndex + 1] = color.g;
    colors[positionIndex + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.11,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.rotation.x = -0.2;
  points.rotation.z = -0.12;
  return points;
}

function createDust(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const positionIndex = index * 3;
    positions[positionIndex] = (Math.random() - 0.5) * 42;
    positions[positionIndex + 1] = (Math.random() - 0.5) * 24;
    positions[positionIndex + 2] = -2 - Math.random() * 28;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: "#87d7ff",
    size: 0.035,
    opacity: 0.45,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geometry, material);
}

function createNebula(): THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
  const geometry = new THREE.PlaneGeometry(94, 56, 1, 1);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0.78 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uIntensity;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x),
          f.y
        );
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int octave = 0; octave < 5; octave++) {
          value += amplitude * noise(p);
          p = p * 2.03 + vec2(13.7, 9.2);
          amplitude *= 0.48;
        }
        return value;
      }

      void main() {
        vec2 centered = vUv - 0.5;
        centered.x *= 1.65;
        float time = uTime * 0.018;
        float cloud = fbm(centered * 3.0 + vec2(time, -time * 0.7));
        cloud += fbm(centered * 6.0 - vec2(time * 0.6, time)) * 0.42;
        float vignette = smoothstep(0.86, 0.08, length(centered));
        float ribbon = exp(-abs(centered.y + sin(centered.x * 4.0 + time) * 0.11) * 5.2);
        vec3 blue = vec3(0.025, 0.19, 0.48);
        vec3 violet = vec3(0.29, 0.075, 0.58);
        vec3 cyan = vec3(0.04, 0.55, 0.72);
        vec3 color = mix(blue, violet, smoothstep(0.28, 0.82, cloud));
        color = mix(color, cyan, ribbon * 0.24);
        float alpha = (cloud * 0.38 + ribbon * 0.12) * vignette * uIntensity;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const nebula = new THREE.Mesh(geometry, material);
  nebula.position.set(0, 0, -36);
  return nebula;
}

function createSaturn(): THREE.Group {
  const group = new THREE.Group();
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 48, 32),
    new THREE.MeshStandardMaterial({
      color: "#5f6fa5",
      emissive: "#17204a",
      emissiveIntensity: 0.65,
      roughness: 0.72,
      metalness: 0.08,
    }),
  );
  planet.scale.y = 0.94;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.75, 4.2, 96),
    new THREE.MeshBasicMaterial({
      color: "#91cfff",
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  ring.rotation.x = Math.PI / 2.45;
  ring.rotation.z = -0.2;

  const ringInner = new THREE.Mesh(
    new THREE.RingGeometry(2.45, 2.68, 96),
    new THREE.MeshBasicMaterial({
      color: "#d9e9ff",
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ringInner.rotation.copy(ring.rotation);

  group.add(planet, ring, ringInner);
  group.position.set(7.4, -3.8, -11);
  group.rotation.set(0.08, -0.28, -0.08);
  return group;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Points)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

export function GalaxyBackground({ onReady }: GalaxyBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const quality = getQualityProfile();
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#02030a", 0.018);

    const camera = new THREE.PerspectiveCamera(
      52,
      window.innerWidth / window.innerHeight,
      0.1,
      160,
    );
    camera.position.set(0, 0.5, 18);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: quality.dpr > 1.2,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFallback(true);
      onReadyRef.current();
      return;
    }

    renderer.setPixelRatio(quality.dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute("aria-hidden", "true");
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setFallback(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);
    setFallback(false);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight("#708dff", 1.5);
    const keyLight = new THREE.PointLight("#88ddff", 48, 80, 1.7);
    keyLight.position.set(2, 4, 10);
    const rimLight = new THREE.PointLight("#8d5cff", 36, 65, 1.8);
    rimLight.position.set(-12, -4, -2);
    scene.add(ambient, keyLight, rimLight);

    const outerStars = createStarField(quality.stars, 76);
    const galaxy = createSpiralGalaxy(quality.galaxyStars);
    const dust = createDust(quality.dust);
    const nebula = createNebula();
    const saturn = createSaturn();
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 28, 20),
      new THREE.MeshStandardMaterial({
        color: "#627bd8",
        emissive: "#17235b",
        emissiveIntensity: 0.55,
        roughness: 0.8,
      }),
    );
    moon.position.set(-7.2, 4.7, -8);

    scene.add(outerStars, galaxy, dust, nebula, saturn, moon);

    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(quality.dpr);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      quality.bloomStrength,
      0.6,
      0.38,
    );
    composer.addPass(bloom);
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2();
    const startTime = performance.now() - 2400;
    let animationFrame = 0;
    let running = !reduceMotion;
    let lastRender = 0;

    const handlePointer = (event: PointerEvent) => {
      pointerTarget.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerTarget.y = (event.clientY / window.innerHeight - 0.5) * -2;
    };

    const render = (elapsed: number) => {
      pointer.lerp(pointerTarget, 0.035);
      camera.position.x = pointer.x * 0.55;
      camera.position.y = 0.5 + pointer.y * 0.34;
      camera.lookAt(0, 0, -10);

      outerStars.rotation.y = elapsed * 0.003;
      outerStars.rotation.x = Math.sin(elapsed * 0.03) * 0.018;
      galaxy.rotation.y = elapsed * 0.016;
      galaxy.rotation.z = -0.12 + elapsed * 0.004;
      dust.rotation.y = -elapsed * 0.007;
      saturn.rotation.y = -0.28 + elapsed * 0.045;
      saturn.position.y = -3.8 + Math.sin(elapsed * 0.28) * 0.28;
      moon.position.y = 4.7 + Math.sin(elapsed * 0.35) * 0.35;
      const timeUniform = nebula.material.uniforms.uTime;
      if (timeUniform) timeUniform.value = elapsed;
      composer.render();
    };

    const animate = (time: number) => {
      if (!running) return;
      animationFrame = window.requestAnimationFrame(animate);
      if (time - lastRender < quality.frameInterval) return;
      lastRender = time;
      render((time - startTime) / 1000);
    };

    const handleResize = () => {
      const nextQuality = getQualityProfile();
      renderer.setPixelRatio(nextQuality.dpr);
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setPixelRatio(nextQuality.dpr);
      composer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      render((performance.now() - startTime) / 1000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        running = false;
        window.cancelAnimationFrame(animationFrame);
        return;
      }
      if (!reduceMotion && !running) {
        running = true;
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    render(2.4);
    onReadyRef.current();
    if (!reduceMotion) {
      animationFrame = window.requestAnimationFrame(animate);
    }

    return () => {
      running = false;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      bloom.dispose();
      outputPass.dispose();
      composer.dispose();
      disposeObject(outerStars);
      disposeObject(galaxy);
      disposeObject(dust);
      disposeObject(nebula);
      disposeObject(saturn);
      disposeObject(moon);
      renderer.dispose();
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        handleContextLost,
      );
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`galaxy-background${fallback ? " is-fallback" : ""}`}
      aria-hidden="true"
    />
  );
}
