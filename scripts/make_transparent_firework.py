from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageSequence


BAYER_4X4 = (
    (0, 8, 2, 10),
    (12, 4, 14, 6),
    (3, 11, 1, 9),
    (15, 7, 13, 5),
)


def remove_black_background(frame: Image.Image, frame_index: int) -> Image.Image:
    source = frame.convert("RGBA")
    output = Image.new("RGBA", source.size, (0, 0, 0, 0))
    source_pixels = source.load()
    output_pixels = output.load()

    for y in range(source.height):
        for x in range(source.width):
            red, green, blue, _ = source_pixels[x, y]
            brightness = max(red, green, blue)
            coverage = max(0.0, min(1.0, (brightness - 5) / 92))
            threshold = (BAYER_4X4[(y + frame_index) % 4][(x + frame_index) % 4] + 0.5) / 16

            if coverage <= threshold:
                continue

            lift = math.sqrt(255 / max(brightness, 1))
            output_pixels[x, y] = (
                min(255, round(red * lift)),
                min(255, round(green * lift)),
                min(255, round(blue * lift)),
                255,
            )

    return output


def to_transparent_palette(frame: Image.Image) -> Image.Image:
    palette_frame = frame.convert("RGB").quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    alpha = frame.getchannel("A")
    pixels = bytearray(palette_frame.tobytes())

    for index, alpha_value in enumerate(alpha.getdata()):
        if alpha_value == 0:
            pixels[index] = 255

    palette_frame.frombytes(bytes(pixels))
    palette = palette_frame.getpalette() or []
    palette_frame.putpalette(palette + [0] * (768 - len(palette)))
    palette_frame.info["transparency"] = 255
    palette_frame.info["disposal"] = 2
    return palette_frame


def main() -> None:
    parser = argparse.ArgumentParser(description="Remove a black background from an animated firework GIF.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()

    with Image.open(args.input) as animation:
        frames: list[Image.Image] = []
        durations: list[int] = []
        preview_frame: Image.Image | None = None

        for frame_index, frame in enumerate(ImageSequence.Iterator(animation)):
            transparent_frame = remove_black_background(frame, frame_index)
            if frame_index == animation.n_frames // 2:
                preview_frame = transparent_frame.copy()
            frames.append(to_transparent_palette(transparent_frame))
            durations.append(frame.info.get("duration", animation.info.get("duration", 60)))

        args.output.parent.mkdir(parents=True, exist_ok=True)
        frames[0].save(
            args.output,
            save_all=True,
            append_images=frames[1:],
            duration=durations,
            loop=0,
            transparency=255,
            disposal=2,
            optimize=False,
        )

        if args.preview and preview_frame:
            args.preview.parent.mkdir(parents=True, exist_ok=True)
            preview_frame.save(args.preview)


if __name__ == "__main__":
    main()
