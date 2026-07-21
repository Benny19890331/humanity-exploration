from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageSequence


def union_alpha_bounds(frames: list[Image.Image]) -> tuple[int, int, int, int]:
    bounds = [frame.getchannel("A").getbbox() for frame in frames]
    visible = [bound for bound in bounds if bound is not None]
    if not visible:
        return (0, 0, frames[0].width, frames[0].height)

    left = min(bound[0] for bound in visible)
    top = min(bound[1] for bound in visible)
    right = max(bound[2] for bound in visible)
    bottom = max(bound[3] for bound in visible)
    padding = max(8, round(max(right - left, bottom - top) * 0.045))

    return (
        max(0, left - padding),
        max(0, top - padding),
        min(frames[0].width, right + padding),
        min(frames[0].height, bottom + padding),
    )


def build_atlas(source_path: Path, output_path: Path, frame_size: int, columns: int) -> tuple[int, int, int]:
    with Image.open(source_path) as source:
        frames = [frame.convert("RGBA") for frame in ImageSequence.Iterator(source)]

    if not frames:
        raise ValueError("The source animation has no frames")

    crop_box = union_alpha_bounds(frames)
    rows = math.ceil(len(frames) / columns)
    atlas = Image.new("RGBA", (frame_size * columns, frame_size * rows), (0, 0, 0, 0))

    for index, frame in enumerate(frames):
        cropped = frame.crop(crop_box)
        cropped.thumbnail((frame_size, frame_size), Image.Resampling.LANCZOS)
        tile = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
        tile.alpha_composite(
            cropped,
            ((frame_size - cropped.width) // 2, (frame_size - cropped.height) // 2),
        )
        atlas.alpha_composite(tile, ((index % columns) * frame_size, (index // columns) * frame_size))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output_path, "WEBP", lossless=False, quality=86, alpha_quality=100, method=6)
    return len(frames), atlas.width, atlas.height


def main() -> None:
    parser = argparse.ArgumentParser(description="Build one decoded sprite atlas from a transparent firework GIF.")
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--frame-size", type=int, default=240)
    parser.add_argument("--columns", type=int, default=5)
    args = parser.parse_args()

    frame_count, width, height = build_atlas(args.source, args.output, args.frame_size, args.columns)
    print(f"frames={frame_count} atlas={width}x{height} output={args.output}")


if __name__ == "__main__":
    main()
