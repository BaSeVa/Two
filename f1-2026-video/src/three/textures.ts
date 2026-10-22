import {
  CanvasTexture,
  ClampToEdgeWrapping,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from "three";

// Процедурные текстуры: рисуются на canvas один раз и кэшируются.
// Случайность детерминированная, чтобы каждый рендер давал одинаковые кадры.

export const seeded = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const cache = new Map<string, Texture>();

const make = (
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  repeat = true,
) => {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  texture.anisotropy = 8;
  cache.set(key, texture);
  return texture;
};

// Асфальт: зерно, белые линии по краям и пунктир по центру. U — поперёк, V — вдоль трассы.
export const asphaltTexture = () =>
  make("asphalt", 256, 512, (ctx) => {
    const rnd = seeded(1);
    ctx.fillStyle = "#2a2b31";
    ctx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 9000; i++) {
      const v = 30 + rnd() * 40;
      ctx.fillStyle = `rgba(${v},${v},${v + 4},${0.35 + rnd() * 0.4})`;
      ctx.fillRect(rnd() * 256, rnd() * 512, 1.5, 1.5);
    }
    // следы резины по траектории
    const grd = ctx.createLinearGradient(0, 0, 256, 0);
    grd.addColorStop(0.25, "rgba(0,0,0,0)");
    grd.addColorStop(0.42, "rgba(10,10,12,0.45)");
    grd.addColorStop(0.58, "rgba(10,10,12,0.45)");
    grd.addColorStop(0.75, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = "#e6e6e6";
    ctx.fillRect(4, 0, 5, 512);
    ctx.fillRect(247, 0, 5, 512);
    ctx.fillRect(126, 0, 4, 220);
  });

export const kerbTexture = () =>
  make("kerb", 64, 128, (ctx) => {
    ctx.fillStyle = "#d4161b";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(0, 64, 64, 64);
  });

export const wallTexture = () =>
  make("wall", 64, 256, (ctx) => {
    ctx.fillStyle = "#8a8d96";
    ctx.fillRect(0, 0, 64, 256);
    ctx.fillStyle = "#6f727b";
    for (let y = 0; y < 256; y += 64) ctx.fillRect(0, y, 64, 3);
    // красно-белая полоса по верху отбойника
    ctx.fillStyle = "#c81d25";
    ctx.fillRect(0, 0, 10, 256);
  });

export const fenceTexture = () =>
  make("fence", 64, 64, (ctx) => {
    ctx.clearRect(0, 0, 64, 64);
    ctx.strokeStyle = "rgba(190,195,205,0.9)";
    ctx.lineWidth = 2;
    for (let i = -64; i < 128; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 64, 64);
      ctx.moveTo(i + 64, 0);
      ctx.lineTo(i, 64);
      ctx.stroke();
    }
  });

// Окна небоскрёбов: тёплые и холодные огни, часть темнее
export const windowsTexture = (variant: number) =>
  make(`windows-${variant}`, 128, 256, (ctx) => {
    const rnd = seeded(100 + variant);
    ctx.fillStyle = "#07080c";
    ctx.fillRect(0, 0, 128, 256);
    for (let y = 6; y < 256; y += 16) {
      for (let x = 6; x < 128; x += 16) {
        const r = rnd();
        if (r < 0.55) continue;
        const warm = rnd() < 0.7;
        const a = 0.35 + rnd() * 0.65;
        ctx.fillStyle = warm
          ? `rgba(255,214,150,${a})`
          : `rgba(170,205,255,${a})`;
        ctx.fillRect(x, y, 9, 7);
      }
    }
  });

// Мягкое круглое свечение для ореолов прожекторов, огней и искр
export const glowTexture = () =>
  make(
    "glow",
    128,
    128,
    (ctx) => {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.25, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    },
    false,
  );

export const smokeTexture = () =>
  make(
    "smoke",
    128,
    128,
    (ctx) => {
      const rnd = seeded(7);
      for (let i = 0; i < 18; i++) {
        const x = 40 + rnd() * 48;
        const y = 40 + rnd() * 48;
        const r = 20 + rnd() * 26;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(220,220,225,0.22)");
        g.addColorStop(1, "rgba(220,220,225,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
      }
    },
    false,
  );
