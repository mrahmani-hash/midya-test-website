#!/usr/bin/env python3
"""Generate og-image and apple-touch-icon (no face photos)."""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONTS_DIR = ROOT / ".fonts-cache"
FONTS_DIR.mkdir(exist_ok=True)

FONT_URLS = {
    "Audiowide-Regular.ttf": "https://github.com/google/fonts/raw/main/ofl/audiowide/Audiowide-Regular.ttf",
}
SYSTEM_MONO = Path("/System/Library/Fonts/SFNSMono.ttf")
SYSTEM_UI = Path("/System/Library/Fonts/Supplemental/Arial.ttf")

VOID = (1, 2, 6)
INK = (236, 250, 255)
NEO = (0, 255, 232)
ARC = (0, 180, 255)
VIOLET = (139, 92, 255)


def ensure_font(name: str) -> Path:
    path = FONTS_DIR / name
    if path.exists():
        return path
    url = FONT_URLS[name]
    subprocess.run(["curl", "-fsSL", "-o", str(path), url], check=True)
    return path


def load_fonts():
    display = ensure_font("Audiowide-Regular.ttf")
    ui = SYSTEM_UI if SYSTEM_UI.exists() else display
    mono = SYSTEM_MONO if SYSTEM_MONO.exists() else display
    return (
        ImageFont.truetype(str(display), 72),
        ImageFont.truetype(str(display), 36),
        ImageFont.truetype(str(ui), 28),
        ImageFont.truetype(str(mono), 22),
    )


def hex_points(cx: float, cy: float, r: float) -> list[tuple[float, float]]:
    return [
        (
            cx + r * math.cos(math.radians(60 * i - 30)),
            cy + r * math.sin(math.radians(60 * i - 30)),
        )
        for i in range(6)
    ]


def draw_hex_grid(draw: ImageDraw.ImageDraw, w: int, h: int) -> None:
    r = 34
    dx = r * 1.5
    dy = r * math.sqrt(3)
    for row in range(-2, int(h / dy) + 3):
        for col in range(-2, int(w / dx) + 3):
            cx = col * dx + (dx * 0.5 if row % 2 else 0)
            cy = row * dy
            pts = hex_points(cx, cy, r - 2)
            draw.polygon(pts, outline=(*NEO, 28))


def radial_glow(base: Image.Image, cx: int, cy: int, radius: int, color: tuple[int, ...]) -> None:
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    for i in range(radius, 0, -8):
        alpha = int(90 * (1 - i / radius))
        gdraw.ellipse((cx - i, cy - i, cx + i, cy + i), fill=(*color[:3], alpha))
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    base.alpha_composite(glow)


def make_og_image() -> Image.Image:
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), VOID + (255,))
    draw = ImageDraw.Draw(img)

    # Subtle vertical gradient
    for y in range(h):
        t = y / h
        r = int(VOID[0] + 8 * t)
        g = int(VOID[1] + 14 * t)
        b = int(VOID[2] + 28 * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

    grid = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw_hex_grid(ImageDraw.Draw(grid), w, h)
    img = Image.alpha_composite(img, grid)

    radial_glow(img, 180, 120, 220, NEO)
    radial_glow(img, 1020, 520, 260, VIOLET)
    radial_glow(img, 900, 80, 180, ARC)

    draw = ImageDraw.Draw(img)
    # Accent lines
    draw.line([(0, 420), (420, 0)], fill=(*NEO, 60), width=2)
    draw.line([(w, 210), (w - 360, h)], fill=(*ARC, 50), width=2)
    draw.rectangle((48, 48, 180, 52), fill=NEO)
    draw.rectangle((48, 48, 52, 120), fill=NEO)

    font_name, font_site, font_tag, font_meta = load_fonts()

    # Center card
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(card)
    cx0, cy0, cx1, cy1 = 120, 140, w - 120, h - 100
    cdraw.rounded_rectangle(
        (cx0, cy0, cx1, cy1),
        radius=18,
        fill=(6, 14, 26, 200),
        outline=(*NEO, 90),
        width=2,
    )
    card = card.filter(ImageFilter.GaussianBlur(0))
    img = Image.alpha_composite(img, card)
    draw = ImageDraw.Draw(img)

    draw.text((160, 200), "MIDYA RAHMANI", font=font_name, fill=INK)
    draw.text((164, 292), "midya.ca", font=font_site, fill=NEO)

    tag = "Technology · AI · Innovation"
    bbox = draw.textbbox((0, 0), tag, font=font_tag)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) // 2, 380), tag, font=font_tag, fill=(*INK, 220))

    meta = "10+ years · Waterloo MSc · York BCom"
    mbbox = draw.textbbox((0, 0), meta, font=font_meta)
    mw = mbbox[2] - mbbox[0]
    draw.text(((w - mw) // 2, 430), meta, font=font_meta, fill=(*ARC, 230))

    # Corner hex emblem (no face)
    hx, hy, hr = 1040, 88, 36
    draw.polygon(hex_points(hx, hy, hr), outline=NEO, width=2)
    draw.polygon(hex_points(hx, hy, hr - 10), outline=(*ARC, 180), width=1)
    em = ImageFont.truetype(str(ensure_font("Audiowide-Regular.ttf")), 28)
    draw.text((hx - 10, hy - 16), "M", font=em, fill=NEO)

    return img.convert("RGB")


def make_apple_touch() -> Image.Image:
    size = 180
    img = Image.new("RGBA", (size, size), VOID + (255,))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((8, 8, size - 8, size - 8), radius=28, fill=(6, 14, 26, 255), outline=NEO, width=2)
    draw.polygon(hex_points(size / 2, size / 2 - 4, 58), outline=(*ARC, 120), width=1)
    font = ImageFont.truetype(str(FONTS_DIR / "Audiowide-Regular.ttf"), 72)
    draw.text((52, 48), "M", font=font, fill=NEO)
    return img.convert("RGB")


def main() -> None:
    load_fonts()
    og = make_og_image()
    og.save(ROOT / "og-image.png", "PNG", optimize=True)
    og.save(ROOT / "og-image.jpg", "JPEG", quality=92, optimize=True, progressive=True)

    icon = make_apple_touch()
    icon.save(ROOT / "apple-touch-icon.png", "PNG", optimize=True)

    print(f"og-image.jpg: {(ROOT / 'og-image.jpg').stat().st_size} bytes")
    print(f"og-image.png: {(ROOT / 'og-image.png').stat().st_size} bytes")
    print(f"apple-touch-icon.png: {(ROOT / 'apple-touch-icon.png').stat().st_size} bytes")


if __name__ == "__main__":
    main()
