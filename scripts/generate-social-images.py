#!/usr/bin/env python3
"""Generate original social and touch images for midya.ca."""
from __future__ import annotations

import math
import random
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
FONTS_DIR = ROOT / ".fonts-cache"
FONTS_DIR.mkdir(exist_ok=True)

FONT_URL = (
    "https://github.com/google/fonts/raw/main/ofl/audiowide/"
    "Audiowide-Regular.ttf"
)
SYSTEM_UI = Path("/System/Library/Fonts/Supplemental/Arial.ttf")

VOID = (2, 3, 9)
INK = (241, 246, 255)
CYAN = (109, 231, 255)
BLUE = (69, 140, 255)
VIOLET = (162, 125, 255)
GOLD = (255, 217, 120)


def ensure_display_font() -> Path:
    path = FONTS_DIR / "Audiowide-Regular.ttf"
    if not path.exists():
        subprocess.run(["curl", "-fsSL", "-o", str(path), FONT_URL], check=True)
    return path


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def add_glow(
    image: Image.Image,
    center: tuple[int, int],
    radius: int,
    color: tuple[int, int, int],
    opacity: int,
) -> None:
    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    x, y = center
    draw.ellipse(
        (x - radius, y - radius, x + radius, y + radius),
        fill=(*color, opacity),
    )
    image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(radius // 2)))


def draw_star_field(
    draw: ImageDraw.ImageDraw,
    width: int,
    height: int,
    count: int,
    seed: int,
) -> None:
    rng = random.Random(seed)
    palette = (INK, CYAN, BLUE, VIOLET, GOLD)
    for _ in range(count):
        x = rng.randrange(width)
        y = rng.randrange(height)
        radius = rng.choice((1, 1, 1, 1, 2))
        color = rng.choice(palette)
        alpha = rng.randrange(65, 205)
        draw.ellipse(
            (x - radius, y - radius, x + radius, y + radius),
            fill=(*color, alpha),
        )


def draw_spiral_galaxy(
    image: Image.Image,
    center: tuple[int, int],
    radius: int,
    count: int,
    seed: int,
) -> None:
    rng = random.Random(seed)
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    cx, cy = center
    arms = 5

    for index in range(count):
        radius_ratio = rng.random() ** 0.62
        distance = radius_ratio * radius
        arm = index % arms
        angle = (
            arm / arms * math.tau
            + distance * 0.025
            + (rng.random() - 0.5) * (1.2 - radius_ratio * 0.45)
        )
        x = cx + math.cos(angle) * distance
        y = cy + math.sin(angle) * distance * 0.38
        y += (rng.random() - 0.5) * (7 + radius_ratio * 13)

        if radius_ratio < 0.25:
            color = INK
        elif radius_ratio < 0.65:
            color = VIOLET
        else:
            color = BLUE
        point_radius = 2 if rng.random() > 0.9 else 1
        alpha = int(185 - radius_ratio * 90)
        draw.ellipse(
            (
                x - point_radius,
                y - point_radius,
                x + point_radius,
                y + point_radius,
            ),
            fill=(*color, alpha),
        )

    layer = layer.filter(ImageFilter.GaussianBlur(0.25))
    image.alpha_composite(layer)


def draw_planet(image: Image.Image, center: tuple[int, int], radius: int) -> None:
    planet = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(planet)
    cx, cy = center

    draw.ellipse(
        (cx - radius * 1.7, cy - radius * 0.34, cx + radius * 1.7, cy + radius * 0.34),
        outline=(*CYAN, 90),
        width=3,
    )
    draw.ellipse(
        (cx - radius, cy - radius, cx + radius, cy + radius),
        fill=(32, 43, 96, 255),
        outline=(*VIOLET, 160),
        width=2,
    )
    draw.ellipse(
        (
            cx - radius * 0.55,
            cy - radius * 0.65,
            cx + radius * 0.2,
            cy + radius * 0.05,
        ),
        fill=(*BLUE, 60),
    )
    image.alpha_composite(planet)


def make_og_image() -> Image.Image:
    width, height = 1200, 630
    image = Image.new("RGBA", (width, height), VOID + (255,))
    draw = ImageDraw.Draw(image)

    for y in range(height):
        ratio = y / height
        draw.line(
            [(0, y), (width, y)],
            fill=(
                int(VOID[0] + 4 * ratio),
                int(VOID[1] + 7 * ratio),
                int(VOID[2] + 20 * ratio),
                255,
            ),
        )

    add_glow(image, (890, 255), 300, VIOLET, 58)
    add_glow(image, (1060, 500), 250, BLUE, 42)
    draw_star_field(ImageDraw.Draw(image), width, height, 310, seed=431)
    draw_spiral_galaxy(image, (940, 290), 310, 1500, seed=771)
    draw_planet(image, (995, 410), 54)

    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.rounded_rectangle(
        (58, 54, 1142, 576),
        radius=28,
        outline=(*CYAN, 55),
        width=2,
    )
    overlay_draw.line((92, 90, 235, 90), fill=(*CYAN, 150), width=3)
    overlay_draw.line((92, 96, 170, 96), fill=(*VIOLET, 110), width=1)
    image.alpha_composite(overlay)

    display_path = ensure_display_font()
    ui_path = SYSTEM_UI if SYSTEM_UI.exists() else display_path
    draw = ImageDraw.Draw(image)
    display = font(display_path, 71)
    display_small = font(display_path, 31)
    ui = font(ui_path, 25)
    meta = font(ui_path, 20)

    draw.text((94, 130), "MIDYA", font=display, fill=INK)
    draw.text((94, 215), "RAHMANI", font=display, fill=INK)
    draw.text((98, 320), "PERSONAL PROFILE", font=display_small, fill=CYAN)
    draw.text((99, 374), "Toronto, Ontario · Canada", font=ui, fill=(*INK, 210))
    draw.text(
        (99, 426),
        "ADAPTAVIST  ·  CIBC  ·  WATERLOO  ·  YORK",
        font=meta,
        fill=(*BLUE, 235),
    )
    draw.text((99, 508), "MIDYA.CA", font=meta, fill=(*INK, 185))

    return image.convert("RGB")


def make_touch_icon() -> Image.Image:
    size = 180
    image = Image.new("RGBA", (size, size), VOID + (255,))
    add_glow(image, (90, 90), 74, BLUE, 72)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(
        (7, 7, size - 7, size - 7),
        radius=34,
        fill=(5, 8, 23, 235),
        outline=(*CYAN, 130),
        width=2,
    )
    draw.ellipse((24, 53, 156, 127), outline=(*VIOLET, 150), width=2)
    draw.ellipse((36, 36, 144, 144), outline=(*CYAN, 85), width=1)
    draw.ellipse((147, 75, 155, 83), fill=CYAN)
    display = font(ensure_display_font(), 72)
    bbox = draw.textbbox((0, 0), "M", font=display)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    draw.text(
        ((size - text_width) / 2, (size - text_height) / 2 - bbox[1]),
        "M",
        font=display,
        fill=INK,
    )
    return image.convert("RGB")


def main() -> None:
    PUBLIC.mkdir(exist_ok=True)
    og = make_og_image()
    og.save(PUBLIC / "og-image.png", "PNG", optimize=True)
    og.save(
        PUBLIC / "og-image.jpg",
        "JPEG",
        quality=92,
        optimize=True,
        progressive=True,
    )
    touch_icon = make_touch_icon()
    touch_icon.save(PUBLIC / "apple-touch-icon.png", "PNG", optimize=True)
    touch_icon.resize((32, 32), Image.Resampling.LANCZOS).save(
        PUBLIC / "favicon-32x32.png",
        "PNG",
        optimize=True,
    )
    touch_icon.resize((16, 16), Image.Resampling.LANCZOS).save(
        PUBLIC / "favicon-16x16.png",
        "PNG",
        optimize=True,
    )

    for name in (
        "og-image.jpg",
        "og-image.png",
        "apple-touch-icon.png",
        "favicon-32x32.png",
        "favicon-16x16.png",
    ):
        path = PUBLIC / name
        print(f"{name}: {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
