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
  flightStars: number;
  galaxyStars: number;
  dust: number;
  asteroids: number;
  clouds: number;
  bloomStrength: number;
  frameInterval: number;
};

type NavigatorWithMemory = Navigator & {
  deviceMemory?: number;
};

type CelestialMotion = {
  object: THREE.Object3D;
  kind: "saturn" | "sun" | "station" | "moon";
  speed: number;
  baseX: number;
  baseY: number;
  phase: number;
  orbitX: number;
  orbitY: number;
};

type AsteroidMotion = {
  mesh: THREE.Mesh<THREE.DodecahedronGeometry, THREE.MeshStandardMaterial>;
  speed: number;
  driftX: number;
  driftY: number;
  spinX: number;
  spinY: number;
};

type CloudMotion = {
  sprite: THREE.Sprite;
  speed: number;
  driftX: number;
  phase: number;
};

function getQualityProfile(): QualityProfile {
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as NavigatorWithMemory).deviceMemory || 4;
  const dpr = window.devicePixelRatio || 1;

  if (mobile || cores <= 4 || memory <= 4) {
    return {
      dpr: Math.min(dpr, 1.15),
      stars: 420,
      flightStars: 300,
      galaxyStars: 900,
      dust: 120,
      asteroids: 5,
      clouds: 2,
      bloomStrength: 0.38,
      frameInterval: 1000 / 40,
    };
  }

  if (cores <= 8 || memory <= 8) {
    return {
      dpr: Math.min(dpr, 1.5),
      stars: 750,
      flightStars: 560,
      galaxyStars: 1800,
      dust: 260,
      asteroids: 8,
      clouds: 3,
      bloomStrength: 0.5,
      frameInterval: 1000 / 55,
    };
  }

  return {
    dpr: Math.min(dpr, 1.8),
    stars: 1200,
    flightStars: 980,
    galaxyStars: 2800,
    dust: 450,
    asteroids: 12,
    clouds: 4,
    bloomStrength: 0.62,
    frameInterval: 1000 / 60,
  };
}

function createStarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context) {
    const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, "rgba(255,255,255,1)");
    glow.addColorStop(0.12, "rgba(255,255,255,0.98)");
    glow.addColorStop(0.38, "rgba(210,231,255,0.58)");
    glow.addColorStop(1, "rgba(170,210,255,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, 128, 128);
    context.filter = "blur(9px)";
    const wisps = [
      { x: 47, y: 62, radius: 42, alpha: 0.34 },
      { x: 76, y: 55, radius: 34, alpha: 0.27 },
      { x: 65, y: 81, radius: 29, alpha: 0.2 },
    ];
    wisps.forEach(({ x, y, radius, alpha }) => {
      const glow = context.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, `rgba(150,180,210,${alpha})`);
      glow.addColorStop(0.45, `rgba(80,115,155,${alpha * 0.6})`);
      glow.addColorStop(1, "rgba(20,40,70,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, 128, 128);
    });
    context.filter = "none";
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStarField(
  count: number,
  radius: number,
  starTexture: THREE.Texture,
): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cool = new THREE.Color("#dceeff");
  const warm = new THREE.Color("#fff7e8");
  const violet = new THREE.Color("#b7c6ff");

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
    map: starTexture,
    size: 0.22,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.48,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

function createFlightStars(
  count: number,
): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);
  const palette = [
    new THREE.Color("#eef9ff"),
    new THREE.Color("#ffffff"),
    new THREE.Color("#f7fbff"),
    new THREE.Color("#8fe9ff"),
    new THREE.Color("#b9a7ff"),
    new THREE.Color("#ffe7ba"),
  ];
  const aspect = Math.max(0.7, window.innerWidth / window.innerHeight);

  for (let index = 0; index < count; index += 1) {
    const positionIndex = index * 3;
    const depth = Math.random();
    const color = palette[Math.floor(Math.random() * palette.length)];
    positions[positionIndex] =
      (Math.random() - 0.5) * (52 + Math.min(aspect, 1.8) * 20);
    positions[positionIndex + 1] = (Math.random() - 0.5) * 46;
    positions[positionIndex + 2] = -62 + depth * 68;
    colors[positionIndex] = color?.r ?? 1;
    colors[positionIndex + 1] = color?.g ?? 1;
    colors[positionIndex + 2] = color?.b ?? 1;
    sizes[index] = 0.85 + Math.random() * 1.9;
    speeds[index] = 4.4 + Math.random() * 10.2;
    phases[index] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      precision highp float;
      attribute float aSize;
      attribute float aSpeed;
      attribute float aPhase;
      uniform float uTime;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec3 animated = position;
        animated.z = mod(position.z + uTime * aSpeed + 62.0, 68.0) - 62.0;
        vec4 viewPosition = modelViewMatrix * vec4(animated, 1.0);
        float viewDepth = max(1.0, -viewPosition.z);
        float twinkle = 0.62 + 0.38 * sin(uTime * 2.3 + aPhase);
        float nearGlow = 1.0 - smoothstep(22.0, 86.0, viewDepth);
        vAlpha = twinkle * (0.62 + nearGlow * 0.55);
        vColor = color;
        gl_PointSize = clamp(aSize * (92.0 / viewDepth), 1.2, 10.5);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 point = gl_PointCoord - 0.5;
        float distanceToCore = length(point);
        float core = smoothstep(0.42, 0.02, distanceToCore);
        float verticalRay =
          smoothstep(0.075, 0.0, abs(point.x)) *
          smoothstep(0.5, 0.06, abs(point.y));
        float horizontalRay =
          smoothstep(0.075, 0.0, abs(point.y)) *
          smoothstep(0.5, 0.06, abs(point.x));
        float sparkle = max(core, max(verticalRay, horizontalRay) * 0.82);
        float alpha = sparkle * vAlpha;
        if (alpha < 0.025) discard;
        gl_FragColor = vec4(vColor * 1.2, alpha);
      }
    `,
  });

  const stars = new THREE.Points(geometry, material);
  stars.renderOrder = 6;
  return stars;
}

function createSpiralGalaxy(
  count: number,
  starTexture: THREE.Texture,
): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const core = new THREE.Color("#f7fbff");
  const middle = new THREE.Color("#c7d0db");
  const edge = new THREE.Color("#6f8299");
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
    map: starTexture,
    size: 0.18,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.62,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.rotation.x = -0.2;
  points.rotation.z = -0.12;
  return points;
}

function createDust(
  count: number,
  starTexture: THREE.Texture,
): THREE.Points {
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
    color: "#a9bfd6",
    map: starTexture,
    size: 0.14,
    opacity: 0.22,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geometry, material);
}

function createConstellationLines(): THREE.LineSegments {
  const positions: number[] = [];
  for (let cluster = 0; cluster < 38; cluster += 1) {
    let x = (Math.random() - 0.5) * 72;
    let y = (Math.random() - 0.5) * 38;
    const z = -16 - Math.random() * 34;
    const segments = 2 + Math.floor(Math.random() * 3);
    for (let segment = 0; segment < segments; segment += 1) {
      const nextX = x + (Math.random() - 0.5) * 8;
      const nextY = y + (Math.random() - 0.5) * 6;
      positions.push(x, y, z, nextX, nextY, z);
      x = nextX;
      y = nextY;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  const material = new THREE.LineBasicMaterial({
    color: "#5e86a8",
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.LineSegments(geometry, material);
}

function createNebula(): THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
  const geometry = new THREE.PlaneGeometry(94, 56, 1, 1);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0.58 },
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
        vec3 blue = vec3(0.012, 0.045, 0.09);
        vec3 slate = vec3(0.08, 0.12, 0.18);
        vec3 silver = vec3(0.22, 0.25, 0.30);
        vec3 color = mix(blue, slate, smoothstep(0.22, 0.7, cloud));
        color = mix(color, silver, ribbon * 0.2);
        float alpha = (cloud * 0.3 + ribbon * 0.08) * vignette * uIntensity;
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
    new THREE.SphereGeometry(1.65, 40, 28),
    new THREE.MeshStandardMaterial({
      color: "#827e75",
      emissive: "#17212c",
      emissiveIntensity: 0.35,
      roughness: 0.78,
      metalness: 0.08,
    }),
  );
  planet.scale.y = 0.94;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 3.25, 80),
    new THREE.MeshBasicMaterial({
      color: "#b7c0c7",
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  ring.rotation.x = Math.PI / 2.45;
  ring.rotation.z = -0.2;

  const ringInner = new THREE.Mesh(
    new THREE.RingGeometry(1.92, 2.04, 80),
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
  group.position.set(8.5, -5.7, -18);
  group.rotation.set(0.08, -0.28, -0.08);
  return group;
}

function createSun(): THREE.Group {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 32, 22),
    new THREE.MeshBasicMaterial({ color: "#ffb451" }),
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.42, 28, 20),
    new THREE.MeshBasicMaterial({
      color: "#ff8a32",
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(core, halo);
  group.position.set(-16, -10, -22);
  return group;
}

function createSpaceStation(): THREE.Group {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: "#b5c2cd",
    emissive: "#122b3b",
    emissiveIntensity: 0.45,
    metalness: 0.72,
    roughness: 0.32,
  });
  const panel = new THREE.MeshStandardMaterial({
    color: "#296fa7",
    emissive: "#0a5c83",
    emissiveIntensity: 0.55,
    metalness: 0.52,
    roughness: 0.38,
  });
  const hull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 2.2, 12),
    metal,
  );
  hull.rotation.z = Math.PI / 2;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.64, 0.08, 8, 32),
    metal.clone(),
  );
  ring.rotation.y = Math.PI / 2;
  const leftPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.06, 0.48),
    panel,
  );
  leftPanel.position.x = -1.38;
  const rightPanel = leftPanel.clone();
  rightPanel.position.x = 1.38;
  group.add(hull, ring, leftPanel, rightPanel);
  group.position.set(0.5, 7.7, -19);
  group.rotation.set(0.22, -0.3, -0.08);
  return group;
}

function resetCelestial(motion: CelestialMotion, depth?: number): void {
  const lowerField = motion.kind === "saturn" || motion.kind === "sun";
  const upperField = motion.kind === "station";
  motion.baseX = (Math.random() - 0.5) * (lowerField ? 30 : 34);
  motion.baseY = lowerField
    ? -5 - Math.random() * 6
    : upperField
      ? 2 + Math.random() * 7
      : -2 + Math.random() * 11;
  motion.phase = Math.random() * Math.PI * 2;
  motion.orbitX = lowerField ? 1.4 + Math.random() * 2.2 : 0.8 + Math.random();
  motion.orbitY = lowerField ? 0.6 + Math.random() : 0.5 + Math.random() * 0.8;
  motion.object.position.set(
    motion.baseX,
    motion.baseY,
    depth ?? -82 - Math.random() * 48,
  );
}

function resetAsteroid(motion: AsteroidMotion, depth?: number): void {
  motion.mesh.position.set(
    (Math.random() - 0.5) * 42,
    (Math.random() - 0.5) * 28,
    depth ?? -72 - Math.random() * 52,
  );
  const scale = 0.25 + Math.random() * 0.7;
  motion.mesh.scale.setScalar(scale);
  motion.mesh.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI,
  );
}

function resetCloud(motion: CloudMotion, depth?: number): void {
  motion.sprite.position.set(
    (Math.random() - 0.5) * 30,
    (Math.random() - 0.5) * 20,
    depth ?? -78 - Math.random() * 44,
  );
  const size = 10 + Math.random() * 14;
  motion.sprite.scale.set(size * 1.7, size, 1);
  motion.phase = Math.random() * Math.PI * 2;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (
      !(
        child instanceof THREE.Mesh ||
        child instanceof THREE.Points ||
        child instanceof THREE.LineSegments
      )
    )
      return;
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

    const starTexture = createStarTexture();
    const outerStars = createStarField(quality.stars, 76, starTexture);
    const flightStars = createFlightStars(quality.flightStars);
    const galaxy = createSpiralGalaxy(quality.galaxyStars, starTexture);
    const dust = createDust(quality.dust, starTexture);
    const constellations = createConstellationLines();
    const nebula = createNebula();
    const saturn = createSaturn();
    const sun = createSun();
    const station = createSpaceStation();
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 24, 18),
      new THREE.MeshStandardMaterial({
        color: "#788694",
        emissive: "#172635",
        emissiveIntensity: 0.28,
        roughness: 0.8,
      }),
    );
    const celestialMotions: CelestialMotion[] = [
      {
        object: saturn,
        kind: "saturn",
        speed: 1.7,
        baseX: 12,
        baseY: -8,
        phase: 0.6,
        orbitX: 2.4,
        orbitY: 1,
      },
      {
        object: sun,
        kind: "sun",
        speed: 1.15,
        baseX: -13,
        baseY: -8.5,
        phase: 2.1,
        orbitX: 2,
        orbitY: 0.8,
      },
      {
        object: station,
        kind: "station",
        speed: 2.25,
        baseX: 0.5,
        baseY: 7.7,
        phase: 4.2,
        orbitX: 1.2,
        orbitY: 0.65,
      },
      {
        object: moon,
        kind: "moon",
        speed: 2.8,
        baseX: 12,
        baseY: 7,
        phase: 5.4,
        orbitX: 1.1,
        orbitY: 0.8,
      },
    ];
    saturn.position.set(12, -8, -48);
    sun.position.set(-13, -8.5, -88);
    station.position.set(0.5, 7.7, -34);
    moon.position.set(12, 7, -66);

    const asteroidGeometry = new THREE.DodecahedronGeometry(0.5, 0);
    const asteroidMaterial = new THREE.MeshStandardMaterial({
      color: "#59636e",
      roughness: 0.94,
      metalness: 0.04,
      flatShading: true,
    });
    const asteroids: AsteroidMotion[] = Array.from(
      { length: quality.asteroids },
      (_, index) => {
        const motion: AsteroidMotion = {
          mesh: new THREE.Mesh(asteroidGeometry, asteroidMaterial),
          speed: 3.8 + Math.random() * 4.8,
          driftX: (Math.random() - 0.5) * 0.22,
          driftY: (Math.random() - 0.5) * 0.16,
          spinX: (Math.random() - 0.5) * 1.4,
          spinY: (Math.random() - 0.5) * 1.4,
        };
        resetAsteroid(
          motion,
          -18 - index * (98 / Math.max(1, quality.asteroids - 1)),
        );
        return motion;
      },
    );

    const cloudTexture = createCloudTexture();
    const clouds: CloudMotion[] = Array.from(
      { length: quality.clouds },
      (_, index) => {
        const material = new THREE.SpriteMaterial({
          map: cloudTexture,
          color: index % 2 === 0 ? "#6d8da9" : "#756d9f",
          transparent: true,
          opacity: 0.1,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const motion: CloudMotion = {
          sprite: new THREE.Sprite(material),
          speed: 1.25 + Math.random() * 1.25,
          driftX: (Math.random() - 0.5) * 0.12,
          phase: 0,
        };
        resetCloud(
          motion,
          -34 - index * (88 / Math.max(1, quality.clouds - 1)),
        );
        return motion;
      },
    );

    scene.add(
      outerStars,
      flightStars,
      galaxy,
      dust,
      constellations,
      nebula,
      saturn,
      sun,
      station,
      moon,
      ...asteroids.map(({ mesh }) => mesh),
      ...clouds.map(({ sprite }) => sprite),
    );

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
    const galaxyPalette = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#82bfff"),
      new THREE.Color("#ad8cff"),
      new THREE.Color("#ffd59a"),
    ];
    const startTime = performance.now() - 2400;
    let animationFrame = 0;
    let running = !reduceMotion;
    let lastRender = 0;
    let previousElapsed = 2.4;
    let scrollTarget = 0;
    let scrollProgress = 0;

    const handlePointer = (event: PointerEvent) => {
      pointerTarget.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerTarget.y = (event.clientY / window.innerHeight - 0.5) * -2;
    };

    const render = (elapsed: number) => {
      const delta = Math.min(0.05, Math.max(0, elapsed - previousElapsed));
      previousElapsed = elapsed;
      pointer.lerp(pointerTarget, 0.035);
      scrollProgress += (scrollTarget - scrollProgress) * 0.045;
      const motionScale = reduceMotion ? 0 : 1;
      camera.position.x =
        Math.sin(elapsed * 0.22) * 0.45 * motionScale + pointer.x * 0.65;
      camera.position.y =
        0.5 +
        Math.cos(elapsed * 0.16) * 0.28 * motionScale +
        pointer.y * 0.4 -
        scrollProgress * 0.45;
      camera.lookAt(0, -scrollProgress * 0.25, -10);

      outerStars.rotation.y = elapsed * 0.003;
      outerStars.rotation.x = Math.sin(elapsed * 0.03) * 0.018;
      const outerMaterial = outerStars.material as THREE.PointsMaterial;
      outerMaterial.opacity =
        0.42 + Math.sin(elapsed * 0.9) * 0.05 * motionScale;
      const flightTime = flightStars.material.uniforms.uTime;
      if (flightTime) flightTime.value = elapsed;
      const galaxyCycleLength = 22;
      const galaxyCycle = Math.floor(elapsed / galaxyCycleLength);
      const galaxyPhase = elapsed % galaxyCycleLength;
      const galaxyFade =
        galaxyPhase < 2.5
          ? galaxyPhase / 2.5
          : galaxyPhase > 18
            ? (galaxyCycleLength - galaxyPhase) / 4
            : 1;
      const galaxyMaterial = galaxy.material as THREE.PointsMaterial;
      const galaxyColor =
        galaxyPalette[galaxyCycle % galaxyPalette.length] ?? galaxyPalette[0];
      if (galaxyColor) galaxyMaterial.color.copy(galaxyColor);
      galaxyMaterial.opacity =
        (0.43 + Math.sin(elapsed * 0.55) * 0.06 * motionScale) *
        THREE.MathUtils.clamp(galaxyFade, 0.08, 1);
      galaxy.rotation.y = elapsed * 0.012;
      galaxy.rotation.z = -0.12 + elapsed * 0.0035;
      galaxy.position.x = Math.sin(elapsed * 0.09) * 1.8 * motionScale;
      galaxy.position.y = Math.cos(elapsed * 0.07) * 0.9 * motionScale;
      dust.rotation.y = -elapsed * 0.007;
      constellations.rotation.y = elapsed * 0.0015;

      if (!reduceMotion) {
        celestialMotions.forEach((motion) => {
          motion.object.position.z += motion.speed * delta;
          motion.object.position.x =
            motion.baseX +
            Math.cos(elapsed * 0.16 + motion.phase) * motion.orbitX;
          motion.object.position.y =
            motion.baseY +
            Math.sin(elapsed * 0.19 + motion.phase) * motion.orbitY -
            scrollProgress * 3;
          motion.object.rotation.y +=
            delta * (motion.kind === "station" ? 0.52 : 0.18);
          motion.object.rotation.x +=
            delta * (motion.kind === "moon" ? 0.11 : 0.035);
          if (motion.object.position.z > 14) resetCelestial(motion);
        });
        const stationRing = station.children[1];
        if (stationRing) stationRing.rotation.z += delta * 0.65;

        asteroids.forEach((motion) => {
          motion.mesh.position.z += motion.speed * delta;
          motion.mesh.position.x += motion.driftX * delta;
          motion.mesh.position.y += motion.driftY * delta;
          motion.mesh.rotation.x += motion.spinX * delta;
          motion.mesh.rotation.y += motion.spinY * delta;
          if (motion.mesh.position.z > 16) resetAsteroid(motion);
        });

        clouds.forEach((motion) => {
          motion.sprite.position.z += motion.speed * delta;
          motion.sprite.position.x += motion.driftX * delta;
          const material = motion.sprite.material as THREE.SpriteMaterial;
          material.opacity =
            0.07 + Math.sin(elapsed * 0.22 + motion.phase) * 0.025;
          if (motion.sprite.position.z > 10) resetCloud(motion);
        });
      }

      const timeUniform = nebula.material.uniforms.uTime;
      if (timeUniform) timeUniform.value = elapsed;
      bloom.strength =
        quality.bloomStrength *
        (0.88 + scrollProgress * 0.12 + Math.sin(elapsed * 0.4) * 0.05);
      composer.render();
    };

    const handleScroll = () => {
      const maximumScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      scrollTarget = Math.min(1, Math.max(0, window.scrollY / maximumScroll));
      if (reduceMotion) {
        scrollProgress = scrollTarget;
        render((performance.now() - startTime) / 1000);
      }
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
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    handleScroll();
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
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibility);
      bloom.dispose();
      outputPass.dispose();
      composer.dispose();
      disposeObject(outerStars);
      disposeObject(flightStars);
      disposeObject(galaxy);
      disposeObject(dust);
      disposeObject(constellations);
      disposeObject(nebula);
      disposeObject(saturn);
      disposeObject(sun);
      disposeObject(station);
      disposeObject(moon);
      asteroidGeometry.dispose();
      asteroidMaterial.dispose();
      clouds.forEach(({ sprite }) => sprite.material.dispose());
      cloudTexture.dispose();
      starTexture.dispose();
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
