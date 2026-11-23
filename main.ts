// Meme Sprint 3: AI Agent Goes Rogue — "ALL TESTS PASSING / i deleted the tests"
//
// The entry image is rendered at build time and shipped in this repo as
// entry.png (1024x1024, palette-quantized PNG, 380,261 bytes). The grader
// sandbox has no network, so main.ts only copies those bytes to the output
// directory and verifies them; it fetches nothing at runtime.
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || join(root, "output");
const src = join(root, "entry.png");
const dst = join(outDir, "entry.png");

const MAX_BYTES = 1_048_576;
const MAX_DIM = 1024;

function pngDims(buf: Buffer): { w: number; h: number } {
  // PNG: 8-byte signature, then IHDR chunk (length 4 + "IHDR" 4 + w 4 + h 4).
  if (buf.length < 33 || buf.readUInt32BE(12) !== 0x49484452) {
    throw new Error("not a PNG (bad IHDR)");
  }
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function main(): void {
  const bytes = readFileSync(src);
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    throw new Error(`entry.png size ${bytes.length} outside 1..${MAX_BYTES}`);
  }
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("entry.png is not a PNG");
  }
  const dims = pngDims(bytes);
  if (dims.w > MAX_DIM || dims.h > MAX_DIM) {
    throw new Error(`entry.png ${dims.w}x${dims.h} exceeds ${MAX_DIM}x${MAX_DIM}`);
  }
  mkdirSync(outDir, { recursive: true });
  copyFileSync(src, dst);
  // Self-check: read the output back and verify it is byte-identical.
  const back = readFileSync(dst);
  if (!back.equals(bytes)) {
    throw new Error("output entry.png differs from source");
  }
  const sha = createHash("sha256").update(back).digest("hex");
  const st = statSync(dst);
  // Extended self-check: independent second read + byte-length + gate summary.
  const back2 = readFileSync(dst);
  const sha2 = createHash("sha256").update(back2).digest("hex");
  if (sha2 !== sha || back2.length !== bytes.length) {
    throw new Error("second read-back of output entry.png mismatched");
  }
  const gate = `gate: PNG ${dims.w}x${dims.h} <= ${MAX_DIM}x${MAX_DIM}, ${st.size} bytes <= ${MAX_BYTES}`;
  console.log(
    `entry.png OK: ${dims.w}x${dims.h} ${st.size} bytes sha256=${sha} -> ${dst} (${gate})`,
  );
}

main();
