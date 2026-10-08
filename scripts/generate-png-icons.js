const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c;
  }
  let c = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xFF];
  return (c ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function renderIconPNG(size) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const raw = Buffer.alloc(size * (1 + size * 4));
  let pos = 0;

  const center = size / 2;
  const radius = size * 0.44;
  const cornerR = size * 0.22;

  // Helper distance to rounded rectangle
  function insideRoundedRect(x, y, rx, ry, rw, rh, cr) {
    const dx = Math.max(Math.abs(x - (rx + rw / 2)) - rw / 2 + cr, 0);
    const dy = Math.max(Math.abs(y - (ry + rh / 2)) - rh / 2 + cr, 0);
    return Math.sqrt(dx * dx + dy * dy) <= cr;
  }

  // Helper point in polygon
  function pointInPoly(px, py, vertices) {
    let collision = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i][0], yi = vertices[i][1];
      const xj = vertices[j][0], yj = vertices[j][1];
      const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) collision = !collision;
    }
    return collision;
  }

  const s = size / 512; // scaling factor

  const diamond = [
    [256 * s, 150 * s],
    [390 * s, 215 * s],
    [256 * s, 280 * s],
    [122 * s, 215 * s]
  ];

  for (let y = 0; y < size; y++) {
    raw[pos++] = 0; // Filter: None
    for (let x = 0; x < size; x++) {
      let r = 15, g = 19, b = 28, a = 255; // #0f131c default dark bg

      // Squircle outer body
      const inAppBg = insideRoundedRect(x, y, 0, 0, size, size, cornerR);
      if (!inAppBg) {
        a = 0; // transparent corners
      } else {
        // Gradient dark background
        const gradT = (x + y) / (size * 2);
        r = Math.round(24 - gradT * 14);
        g = Math.round(27 - gradT * 13);
        b = Math.round(37 - gradT * 15);

        // Inner glowing squircle border
        const inBorder = insideRoundedRect(x, y, 6 * s, 6 * s, size - 12 * s, size - 12 * s, cornerR - 4 * s);
        if (!inBorder) {
          r = 79; g = 70; b = 229; // indigo border
        }

        // Inner container card
        const inCard = insideRoundedRect(x, y, 100 * s, 100 * s, 312 * s, 312 * s, 40 * s);
        if (inCard) {
          r = 28; g = 31; b = 41; // surface-container
        }

        // Skull cap base arc
        const dxCenter = Math.abs(x - 256 * s);
        if (y >= 240 * s && y <= 310 * s && dxCenter <= 80 * s) {
          const capArc = 310 * s - ((dxCenter / (80 * s)) ** 2) * 25 * s;
          if (y <= capArc) {
            r = 55; g = 48; b = 163; // deep indigo
          }
        }

        // Diamond mortarboard top
        if (pointInPoly(x, y, diamond)) {
          // Gradient from #6366f1 to #4f46e5
          const dt = (x - 122 * s) / (268 * s);
          r = Math.round(99 - dt * 20);
          g = Math.round(102 - dt * 32);
          b = Math.round(241 - dt * 12);
        }

        // Tassel strand
        const tasselDistX = Math.abs(x - (360 * s + (y - 215 * s) * 0.15));
        if (y >= 215 * s && y <= 290 * s && tasselDistX <= 3 * s) {
          r = 76; g = 215; b = 246; // cyan accent
        }
        // Tassel bead
        const beadDist = Math.hypot(x - 370 * s, y - 295 * s);
        if (beadDist <= 7 * s) {
          r = 76; g = 215; b = 246;
        }

        // Project nodes at bottom
        const n1 = Math.hypot(x - 180 * s, y - 355 * s);
        const n2 = Math.hypot(x - 256 * s, y - 370 * s);
        const n3 = Math.hypot(x - 332 * s, y - 355 * s);
        if (n1 <= 5 * s) { r = 78; g = 222; b = 163; } // tertiary emerald
        if (n2 <= 7 * s) { r = 76; g = 215; b = 246; } // secondary cyan
        if (n3 <= 5 * s) { r = 195; g = 192; b = 255; } // primary light
      }

      raw[pos++] = r;
      raw[pos++] = g;
      raw[pos++] = b;
      raw[pos++] = a;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

const iconsDir = path.join(__dirname, '../frontend/public/icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), renderIconPNG(192));
console.log('✓ Generated icon-192.png');

fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), renderIconPNG(512));
console.log('✓ Generated icon-512.png');
