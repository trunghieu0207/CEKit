/**
 * Generates public/icons/icon-{16,32,48,128}.png with no dependencies.
 * A rounded blue tile with a white node mark (centre dot + three spokes).
 * Drawn at 4x and box-downsampled for antialiasing.
 *
 * Run with: pnpm icons
 */
import { deflateSync } from 'node:zlib'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons')
const SIZES = [16, 32, 48, 128]
const SS = 4 // supersampling factor

const TOP = [0x4d, 0xa3, 0xe8] // brand blue, light
const BOTTOM = [0x1c, 0x6f, 0xb5] // brand blue, dark

const mix = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t))

/** Signed distance from p to the segment ab. */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function drawTile(size) {
  const n = size * SS
  // RGBA at supersampled resolution.
  const buf = new Uint8Array(n * n * 4)

  const radius = n * 0.22
  const cx = n / 2
  const cy = n / 2
  const coreR = n * 0.105
  const nodeR = n * 0.072
  const spoke = n * 0.032
  const dist = n * 0.27

  const nodes = [-90, 30, 150].map((deg) => {
    const rad = (deg * Math.PI) / 180
    return [cx + Math.cos(rad) * dist, cy + Math.sin(rad) * dist]
  })

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4

      // Rounded-rect mask.
      const qx = Math.max(radius - x, x - (n - 1 - radius), 0)
      const qy = Math.max(radius - y, y - (n - 1 - radius), 0)
      if (Math.hypot(qx, qy) > radius) continue

      const [r, g, b] = mix(TOP, BOTTOM, y / (n - 1))
      buf[i] = r
      buf[i + 1] = g
      buf[i + 2] = b
      buf[i + 3] = 255

      const px = x + 0.5
      const py = y + 0.5
      const onMark =
        Math.hypot(px - cx, py - cy) <= coreR ||
        nodes.some(
          ([nx, ny]) =>
            Math.hypot(px - nx, py - ny) <= nodeR ||
            distToSegment(px, py, cx, cy, nx, ny) <= spoke / 2,
        )

      if (onMark) {
        buf[i] = 255
        buf[i + 1] = 255
        buf[i + 2] = 255
      }
    }
  }

  return downsample(buf, n, size)
}

/** Box filter from n x n RGBA down to size x size RGBA. */
function downsample(src, n, size) {
  const out = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * n + (x * SS + sx)) * 4
          const alpha = src[i + 3]
          // Premultiply so transparent pixels do not darken the edges.
          r += src[i] * alpha
          g += src[i + 1] * alpha
          b += src[i + 2] * alpha
          a += alpha
        }
      }
      const o = (y * size + x) * 4
      out[o] = a === 0 ? 0 : Math.round(r / a)
      out[o + 1] = a === 0 ? 0 : Math.round(g / a)
      out[o + 2] = a === 0 ? 0 : Math.round(b / a)
      out[o + 3] = Math.round(a / (SS * SS))
    }
  }
  return out
}

// --- minimal PNG encoder (RGBA, 8-bit, no interlace) ---

function crc32(buf) {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  Buffer.from(data).copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  // 10..12 = compression, filter, interlace = 0

  // Filter type 0 (None) per scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0
    Buffer.from(rgba.subarray(y * size * 4, (y + 1) * size * 4)).copy(raw, rowStart + 1)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

await mkdir(OUT_DIR, { recursive: true })
for (const size of SIZES) {
  const png = encodePng(drawTile(size), size)
  await writeFile(resolve(OUT_DIR, `icon-${size}.png`), png)
  console.log(`icon-${size}.png  ${png.length} bytes`)
}
