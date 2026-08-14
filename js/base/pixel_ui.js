export const COLORS = {
  NES_RED: '#E60012',
  MARIO_YELLOW: '#F8D800',
  RETRO_GREEN: '#00A844',
  BLACK: '#000000',
  PIXEL_GRAY: '#7C7C7C',
  DARK_GRAY: '#3C3C3C',
  WHITE: '#FCFCFC',
  PANEL_BG: '#1A1A2E',
  SCREEN_BG: '#0A0A12',
  CRT_SCAN: 'rgba(0, 0, 0, 0.18)',
  CRT_GLOW: 'rgba(248, 216, 0, 0.04)'
};

export function PixelUI() {
  this.colors = COLORS;
}

PixelUI.prototype.drawPixelFrame = function (ctx, x, y, w, h, options) {
  options = options || {};
  const outer = options.outerColor || COLORS.BLACK;
  const inner = options.innerColor || COLORS.WHITE;
  const fill = options.fillColor || COLORS.PANEL_BG;
  const outerW = options.outerWidth != null ? options.outerWidth : 4;
  const innerW = options.innerWidth != null ? options.innerWidth : 2;

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = outer;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = inner;
  ctx.fillRect(x + outerW, y + outerW, w - outerW * 2, h - outerW * 2);
  const inset = outerW + innerW;
  ctx.fillStyle = fill;
  ctx.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
};

PixelUI.prototype.drawMosaicBackground = function (ctx, width, height, tileSize) {
  const size = tileSize || 8;
  const cols = Math.ceil(width / size);
  const rows = Math.ceil(height / size);
  let r, c;
  ctx.imageSmoothingEnabled = false;
  for (r = 0; r < rows; r++) {
    for (c = 0; c < cols; c++) {
      ctx.fillStyle = ((r + c) % 2 === 0) ? '#0D0D18' : '#12121F';
      ctx.fillRect(c * size, r * size, size, size);
    }
  }
};

PixelUI.prototype.drawDarkGrid = function (ctx, x, y, w, h, tileSize) {
  const size = tileSize || 8;
  const cols = Math.ceil(w / size);
  const rows = Math.ceil(h / size);
  let r, c;
  const c1 = '#1A1A1A';
  const c2 = '#2E2E2E';

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  for (r = 0; r < rows; r++) {
    for (c = 0; c < cols; c++) {
      ctx.fillStyle = ((r + c) % 2 === 0) ? c1 : c2;
      ctx.fillRect(x + c * size, y + r * size, size, size);
    }
  }
  ctx.restore();
};

PixelUI.prototype.drawCRTScanlines = function (ctx, width, height, offset) {
  let y;
  const step = 3;
  const off = (offset || 0) % step;
  ctx.save();
  ctx.fillStyle = COLORS.CRT_SCAN;
  for (y = off; y < height; y += step) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.fillStyle = COLORS.CRT_GLOW;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};

PixelUI.prototype.drawStripe = function (ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x, y + h - 2, w, 2);
};

PixelUI.prototype.drawPixelText = function (ctx, text, x, y, options) {
  options = options || {};
  const size = options.size || 12;
  const color = options.color || COLORS.WHITE;
  const align = options.align || 'left';
  const baseline = options.baseline || 'top';
  const shadow = options.shadow !== false;

  ctx.imageSmoothingEnabled = false;
  ctx.font = 'bold ' + size + 'px "Courier New", Courier, monospace';
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (shadow) {
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillText(text, x + 2, y + 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
};

PixelUI.prototype.drawPixelButton = function (ctx, x, y, w, h, label, options) {
  options = options || {};
  const active = !!options.active;
  const danger = !!options.danger;
  const innerBorder = active ? COLORS.MARIO_YELLOW : (danger ? COLORS.NES_RED : COLORS.WHITE);
  const fill = active ? '#3A1A00' : (danger ? '#2A0008' : COLORS.DARK_GRAY);
  const textColor = active ? COLORS.MARIO_YELLOW : (danger ? COLORS.NES_RED : COLORS.WHITE);

  this.drawPixelFrame(ctx, x, y, w, h, {
    outerColor: COLORS.BLACK,
    innerColor: innerBorder,
    fillColor: fill,
    outerWidth: 3,
    innerWidth: 2
  });

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + 5, y + 5, w - 10, 3);

  this.drawPixelText(ctx, label, x + w / 2, y + h / 2 - 6, {
    size: options.fontSize || 13,
    color: textColor,
    align: 'center',
    baseline: 'top',
    shadow: true
  });

  return { x: x, y: y, width: w, height: h, label: label };
};

PixelUI.prototype.drawPixelProgressBar = function (ctx, x, y, w, h, percent, blocks) {
  const total = blocks || 10;
  const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * total);
  const gap = 2;
  const blockW = Math.floor((w - gap * (total - 1)) / total);
  let i, bx, color;

  this.drawPixelFrame(ctx, x - 4, y - 4, w + 8, h + 8, {
    outerColor: COLORS.BLACK,
    innerColor: COLORS.PIXEL_GRAY,
    fillColor: COLORS.BLACK,
    outerWidth: 2,
    innerWidth: 1
  });

  for (i = 0; i < total; i++) {
    bx = x + i * (blockW + gap);
    if (i < filled) {
      if (i < 3) color = COLORS.RETRO_GREEN;
      else if (i < 7) color = COLORS.MARIO_YELLOW;
      else color = COLORS.NES_RED;
    } else {
      color = COLORS.DARK_GRAY;
    }
    ctx.fillStyle = color;
    ctx.fillRect(bx, y, blockW, h);
    if (i < filled) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(bx, y, blockW, 2);
    }
  }
  return filled;
};

PixelUI.prototype.drawROIBox = function (ctx, cx, cy, size) {
  const half = size / 2;
  const x = Math.round(cx - half);
  const y = Math.round(cy - half);
  const arm = 18;
  const thick = 3;
  const s = size;

  ctx.imageSmoothingEnabled = false;

  ctx.strokeStyle = COLORS.BLACK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 1, y - 1, s + 2, s + 2);

  ctx.strokeStyle = COLORS.MARIO_YELLOW;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, s, s);

  ctx.fillStyle = COLORS.MARIO_YELLOW;
  ctx.fillRect(x, y, arm, thick);
  ctx.fillRect(x, y, thick, arm);
  ctx.fillRect(x + s - arm, y, arm, thick);
  ctx.fillRect(x + s - thick, y, thick, arm);
  ctx.fillRect(x, y + s - thick, arm, thick);
  ctx.fillRect(x, y + s - arm, thick, arm);
  ctx.fillRect(x + s - arm, y + s - thick, arm, thick);
  ctx.fillRect(x + s - thick, y + s - arm, thick, arm);

  ctx.fillRect(cx - 4, cy - 1, 8, 2);
  ctx.fillRect(cx - 1, cy - 4, 2, 8);

  this.drawPixelText(ctx, 'ROI 100x100 GRAY', cx, y + s + 6, {
    size: 10,
    color: COLORS.MARIO_YELLOW,
    align: 'center',
    baseline: 'top',
    shadow: true
  });
};

PixelUI.prototype.drawDataRow = function (ctx, x, y, key, value, options) {
  options = options || {};
  this.drawPixelText(ctx, key, x, y, {
    size: options.keySize || 11,
    color: COLORS.PIXEL_GRAY,
    align: 'left',
    shadow: true
  });
  this.drawPixelText(ctx, String(value), x + (options.valueOffset || 110), y, {
    size: options.valueSize || 12,
    color: options.valueColor || COLORS.MARIO_YELLOW,
    align: 'left',
    shadow: true
  });
};

PixelUI.prototype.hitTest = function (rect, px, py) {
  if (!rect) return false;
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
};
