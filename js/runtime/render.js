import { PixelUI, COLORS } from '../base/pixel_ui.js';
import { Sprite } from '../base/sprite.js';

export function Renderer(canvas, ctx) {
  this.canvas = canvas;
  this.ctx = ctx;
  this.ui = new PixelUI();
  this.width = canvas.width;
  this.height = canvas.height;

  this.hitAreas = {
    startBtn: null,
    scanBtn: null,
    playBtn: null,
    backBtn: null
  };

  this.layout = this._computeGameLayout();
  this.startPoster = null;
  this.factoryBg = null;
  this.helmets = [];
  this.tools = [];
  this._roiImageData = null;
  this._loadAssets();
}

Renderer.prototype._loadAssets = function () {
  const self = this;
  let i;

  this.startPoster = new Sprite({ src: 'images/start_poster.png' });
  this.startPoster.load('images/start_poster.png');

  this.factoryBg = new Sprite({ src: 'images/factory_bg.png' });
  this.factoryBg.load('images/factory_bg.png');

  for (i = 1; i <= 6; i++) {
    (function (idx) {
      const sp = new Sprite({ width: 48, height: 48, src: 'images/helmet_' + idx + '.png' });
      sp.load('images/helmet_' + idx + '.png');
      self.helmets.push(sp);
    })(i);
  }

  ['helmet.png', 'hammer.png', 'shovel.png', 'tractor.png', 'tile.png'].forEach(function (name) {
    const sp = new Sprite({ width: 22, height: 22, src: 'images/' + name });
    sp.load('images/' + name);
    self.tools.push(sp);
  });
};

Renderer.prototype._computeGameLayout = function () {
  const W = this.width;
  const H = this.height;
  const pad = 14;
  const contentW = W - pad * 2;

  const headerH = 56;
  const hudH = 32;
  const sensorH = 158;
  const btnH = 44;
  const backH = 32;
  const gap = 6;
  const footerH = 14;
  const reserved = backH + headerH + hudH + sensorH + btnH + footerH + gap * 6 + 10;
  let cameraH = Math.max(132, H - reserved);
  cameraH = Math.min(cameraH, Math.floor(H * 0.34), 260);

  const totalH = backH + gap + headerH + gap + hudH + gap + cameraH + gap + sensorH + gap + btnH + gap + footerH;
  const startY = Math.max(8, Math.floor((H - totalH) / 2));

  const backY = startY;
  const headerY = backY + backH + gap;
  const hudY = headerY + headerH + gap;
  const cameraY = hudY + hudH + gap;
  const sensorY = cameraY + cameraH + gap;
  const btnY = sensorY + sensorH + gap;
  const btnGap = 10;
  const btnW = Math.floor((contentW - btnGap) / 2);

  return {
    pad: pad,
    contentW: contentW,
    contentTop: startY,
    contentBottom: btnY + btnH,
    backBtn: { x: pad, y: backY, w: 86, h: backH },
    header: { x: pad, y: headerY, w: contentW, h: headerH },
    hud: { x: pad, y: hudY, w: contentW, h: hudH },
    camera: { x: pad, y: cameraY, w: contentW, h: cameraH },
    sensor: { x: pad, y: sensorY, w: contentW, h: sensorH },
    scanBtn: { x: pad, y: btnY, w: btnW, h: btnH },
    playBtn: { x: pad + btnW + btnGap, y: btnY, w: btnW, h: btnH },
    footerY: btnY + btnH + 8
  };
};

Renderer.prototype.resize = function (width, height) {
  this.width = width;
  this.height = height;
  this.canvas.width = width;
  this.canvas.height = height;
  this.layout = this._computeGameLayout();
  this._bgCache = null;
};

Renderer.prototype.getCameraNativeRect = function () {
  const c = this.layout.camera;
  const inset = 10;
  return {
    x: c.x + inset,
    y: c.y + 26,
    width: c.w - inset * 2,
    height: c.h - 36
  };
};

Renderer.prototype.render = function (databus) {
  const ctx = this.ctx;
  ctx.imageSmoothingEnabled = false;

  if (databus.scene === 'start') {
    this._renderStart(databus);
  } else {
    this._renderGame(databus);
  }
};

Renderer.prototype._renderStart = function (databus) {
  const ctx = this.ctx;
  const W = this.width;
  const H = this.height;
  const ui = this.ui;
  const blink = Math.floor(databus.frame / 30) % 2 === 0;

  if (this.startPoster && this.startPoster.ready) {
    const img = this.startPoster.image;
    const scale = Math.max(W / img.width, H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    ui.drawMosaicBackground(ctx, W, H, 8);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, W, H * 0.28);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, H * 0.52, W, H * 0.48);

  const gridY = Math.floor(H * 0.22);
  const cell = Math.min(56, Math.floor((W - 48) / 3));
  const gridW = cell * 3;
  const gridX = Math.floor((W - gridW) / 2);
  let i, col, row, hx, hy;

  for (i = 0; i < this.helmets.length; i++) {
    col = i % 3;
    row = Math.floor(i / 3);
    hx = gridX + col * cell + Math.floor((cell - 48) / 2);
    hy = gridY + row * (cell + 4);
    this.helmets[i].x = hx;
    this.helmets[i].y = hy;
    this.helmets[i].width = 48;
    this.helmets[i].height = 48;
    this.helmets[i].draw(ctx);
  }

  const infoY = Math.floor(H * 0.58);
  ui.drawPixelText(ctx, '2026.08.15', 20, infoY, {
    size: 12, color: COLORS.WHITE, shadow: true
  });
  ui.drawPixelText(ctx, '场的', 20, infoY + 20, {
    size: 22, color: COLORS.WHITE, shadow: true
  });
  ui.drawPixelText(ctx, '佛山市禅城区', 20, infoY + 48, {
    size: 10, color: COLORS.PIXEL_GRAY, shadow: true
  });
  ui.drawPixelText(ctx, '莲江二路6号 T2M二场', 20, infoY + 62, {
    size: 10, color: COLORS.PIXEL_GRAY, shadow: true
  });

  ui.drawPixelText(ctx, '15:00', W - 20, infoY, {
    size: 12, color: COLORS.WHITE, align: 'right', shadow: true
  });
  ui.drawPixelText(ctx, '回声', W - 20, infoY + 20, {
    size: 22, color: COLORS.WHITE, align: 'right', shadow: true
  });
  ui.drawPixelText(ctx, 'Lam', W - 20, infoY + 48, {
    size: 12, color: COLORS.MARIO_YELLOW, align: 'right', shadow: true
  });

  ctx.fillStyle = COLORS.WHITE;
  ctx.fillRect(20, infoY + 82, W - 40, 2);
  ctx.fillStyle = COLORS.NES_RED;
  ctx.fillRect(20, infoY + 86, W - 40, 2);

  const titleY = infoY + 98;
  const title = 'the echo of factory';
  ui.drawPixelText(ctx, title, W / 2, titleY, {
    size: 16, color: COLORS.BLACK, align: 'center', shadow: false
  });
  ui.drawPixelText(ctx, title, W / 2 - 2, titleY - 2, {
    size: 16, color: COLORS.WHITE, align: 'center', shadow: false
  });
  ui.drawPixelText(ctx, title, W / 2, titleY, {
    size: 16, color: COLORS.MARIO_YELLOW, align: 'center', shadow: false
  });

  const btnW = Math.min(220, W - 60);
  const btnH = 48;
  const btnX = Math.floor((W - btnW) / 2);
  const btnY = Math.min(H - 70, titleY + 42);

  this.hitAreas.startBtn = ui.drawPixelButton(ctx, btnX, btnY, btnW, btnH,
    blink ? 'PRESS START' : 'PRESS START ',
    { active: true, fontSize: 14 }
  );

  ui.drawPixelText(ctx, '对准灰度锁定目标音阶 · 限时得分', W / 2, btnY + btnH + 10, {
    size: 9, color: COLORS.PIXEL_GRAY, align: 'center', shadow: true
  });

  ui.drawCRTScanlines(ctx, W, H, databus.scanlineOffset);
};

Renderer.prototype._renderGame = function (databus) {
  const ctx = this.ctx;
  const L = this.layout;
  const ui = this.ui;

  this._drawCachedFactoryBackground(ctx);
  this._drawBackButton(databus);
  this._drawHeader(databus);
  this._drawHud(databus);
  this._drawCameraPanel(databus);
  this._drawSensorPanel(databus);
  this._drawButtons(databus);

  ui.drawPixelText(ctx, 'the echo of factory · MATCH GRAY', this.width / 2, L.footerY, {
    size: 9, color: COLORS.WHITE, align: 'center', shadow: true
  });

  if (!databus.isScanning) {
    databus.scanlineOffset = (databus.scanlineOffset + 0.4) % 3;
    ui.drawCRTScanlines(ctx, this.width, this.height, databus.scanlineOffset);
  }

  this._drawCameraViewportContent(databus);

  if (databus.playState === 'gameover') {
    this._drawGameOver(databus);
  }
};

Renderer.prototype._drawCachedFactoryBackground = function (ctx) {
  if (this.factoryBg && this.factoryBg.ready && !this._bgImageCached) {
    this._bgCache = null;
    this._bgImageCached = true;
  }

  if (!this._bgCache || this._bgCacheW !== this.width || this._bgCacheH !== this.height) {
    try {
      this._bgCache = document.createElement('canvas');
      this._bgCache.width = this.width;
      this._bgCache.height = this.height;
      this._bgCacheW = this.width;
      this._bgCacheH = this.height;
      const bctx = this._bgCache.getContext('2d');
      this._drawPageFactoryBackground(bctx);
    } catch (e) {
      this._bgCache = null;
    }
  }

  if (this._bgCache) {
    ctx.drawImage(this._bgCache, 0, 0);
  } else {
    this._drawPageFactoryBackground(ctx);
  }
};

Renderer.prototype._drawPageFactoryBackground = function (ctx) {
  if (this.factoryBg && this.factoryBg.ready) {
    this._drawCoverImage(ctx, this.factoryBg, 0, 0, this.width, this.height);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, this.width, this.height);
  } else {
    this.ui.drawMosaicBackground(ctx, this.width, this.height, 8);
  }
};

Renderer.prototype._drawBackButton = function (databus) {
  const b = this.layout.backBtn;
  if (!b) return;
  this.hitAreas.backBtn = this.ui.drawPixelButton(
    this.ctx, b.x, b.y, b.w, b.h,
    '< BACK',
    { fontSize: 11 }
  );
};

Renderer.prototype._drawHeader = function (databus) {
  const ctx = this.ctx;
  const h = this.layout.header;
  const ui = this.ui;
  let i, iconX, iconY;

  ui.drawPixelFrame(ctx, h.x, h.y, h.w, h.h, {
    outerColor: COLORS.BLACK,
    innerColor: COLORS.WHITE,
    fillColor: COLORS.PANEL_BG,
    outerWidth: 4,
    innerWidth: 2
  });

  ui.drawStripe(ctx, h.x + 6, h.y + 6, h.w - 12, 5, COLORS.MARIO_YELLOW);
  ui.drawStripe(ctx, h.x + 6, h.y + h.h - 11, h.w - 12, 5, COLORS.NES_RED);

  ui.drawPixelText(ctx, 'FACTORY SONIC', this.width / 2, h.y + 14, {
    size: 12, color: COLORS.MARIO_YELLOW, align: 'center', shadow: true
  });
  ui.drawPixelText(ctx, '场的回声 · 灰度对频', this.width / 2, h.y + 30, {
    size: 9, color: COLORS.PIXEL_GRAY, align: 'center', shadow: true
  });

  iconX = this.width / 2 - (6 * 22) / 2;
  iconY = h.y + 40;
  for (i = 0; i < this.helmets.length; i++) {
    this.helmets[i].x = iconX + i * 22;
    this.helmets[i].y = iconY;
    this.helmets[i].width = 16;
    this.helmets[i].height = 16;
    this.helmets[i].draw(ctx);
  }
};

Renderer.prototype._drawHud = function (databus) {
  const ctx = this.ctx;
  const h = this.layout.hud;
  const ui = this.ui;
  const playing = databus.playState === 'playing';
  const over = databus.playState === 'gameover';

  ui.drawPixelFrame(ctx, h.x, h.y, h.w, h.h, {
    outerColor: COLORS.BLACK,
    innerColor: playing ? COLORS.MARIO_YELLOW : COLORS.WHITE,
    fillColor: COLORS.PANEL_BG,
    outerWidth: 3,
    innerWidth: 1
  });

  const combo = databus.combo > 1 ? (' x' + databus.combo) : '';
  const scoreText = 'SCORE ' + this._padScore(databus.score) + combo;
  const timeText = over ? 'RESULT' : (playing ? this._formatTime(databus.timeLeft) : 'READY');
  const bestText = 'BEST ' + this._padScore(databus.bestScore);

  ui.drawPixelText(ctx, scoreText, h.x + 10, h.y + 6, {
    size: 14, color: COLORS.MARIO_YELLOW, shadow: true
  });
  ui.drawPixelText(ctx, timeText, h.x + h.w / 2, h.y + 6, {
    size: 13,
    color: playing ? COLORS.RETRO_GREEN : COLORS.PIXEL_GRAY,
    align: 'center',
    shadow: true
  });
  ui.drawPixelText(ctx, bestText, h.x + h.w - 10, h.y + 6, {
    size: 11, color: COLORS.PIXEL_GRAY, align: 'right', shadow: true
  });
};

Renderer.prototype._padScore = function (n) {
  let s = String(Math.max(0, n || 0));
  while (s.length < 5) s = '0' + s;
  return s;
};

Renderer.prototype._formatTime = function (sec) {
  const s = Math.max(0, sec || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + (r < 10 ? '0' + r : r);
};

Renderer.prototype._drawCameraPanel = function (databus) {
  const ctx = this.ctx;
  const c = this.layout.camera;
  const ui = this.ui;

  ui.drawPixelFrame(ctx, c.x, c.y, c.w, c.h, {
    outerColor: COLORS.BLACK,
    innerColor: COLORS.WHITE,
    fillColor: '#121212',
    outerWidth: 4,
    innerWidth: 2
  });

  ui.drawPixelText(ctx, 'OPTICAL SENSOR', c.x + 12, c.y + 8, {
    size: 10, color: COLORS.RETRO_GREEN, shadow: true
  });

  const pending = databus.authStatus === 'privacy' || databus.authStatus === 'camera';
  const statusText = databus.isScanning ? '* SCANNING' : (pending ? '* AUTH...' : 'o STANDBY');
  ui.drawPixelText(ctx, statusText, c.x + c.w - 12, c.y + 8, {
    size: 10,
    color: (databus.isScanning || pending) ? COLORS.RETRO_GREEN : COLORS.PIXEL_GRAY,
    align: 'right',
    shadow: true
  });

  if (pending) {
    const rect = this.getCameraNativeRect();
    ui.drawPixelText(ctx, '等待摄像头授权...', rect.x + rect.width / 2, rect.y + 4, {
      size: 10, color: COLORS.MARIO_YELLOW, align: 'center', shadow: true
    });
  }
};

Renderer.prototype._drawCameraViewportContent = function (databus) {
  const ctx = this.ctx;
  const ui = this.ui;
  const rect = this.getCameraNativeRect();
  let cx = rect.x + rect.width / 2;
  let cy = rect.y + rect.height / 2;
  const roiSize = 100;

  ui.drawDarkGrid(ctx, rect.x, rect.y, rect.width, rect.height, 8);

  if (databus.isScanning && databus.cameraReady) {
    ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
    const roiX = Math.round(cx - roiSize / 2);
    const roiY = Math.round(cy - roiSize / 2);
    this._drawROIGrayOverlay(ctx, databus, roiX, roiY, roiSize);
  } else if (databus.isScanning) {
    ui.drawPixelText(ctx, '正在开启摄像头...', cx, cy, {
      size: 12, color: COLORS.MARIO_YELLOW, align: 'center', shadow: true
    });
  } else {
    ui.drawPixelText(ctx, '[ CAMERA OFF ]', cx, cy - 14, {
      size: 12, color: COLORS.WHITE, align: 'center', shadow: true
    });
    ui.drawPixelText(ctx, '点 START SCAN 授权开启', cx, cy + 6, {
      size: 10, color: COLORS.PIXEL_GRAY, align: 'center', shadow: true
    });
  }

  ui.drawROIBox(ctx, cx, cy, roiSize);

  if (databus.playState === 'playing' && databus.targetName && databus.targetName !== '--') {
    ui.drawPixelText(ctx, 'TARGET ' + databus.targetLabel, cx, rect.y + 6, {
      size: 10, color: COLORS.MARIO_YELLOW, align: 'center', shadow: true
    });
    ui.drawPixelText(ctx, 'SCORE ' + this._padScore(databus.score), cx, rect.y + 22, {
      size: 14, color: COLORS.WHITE, align: 'center', shadow: true
    });
  }

  if (databus.justScored > 0) {
    ui.drawPixelText(ctx, '+' + databus.lastGain, cx, cy - roiSize / 2 - 18, {
      size: 22, color: COLORS.MARIO_YELLOW, align: 'center', shadow: true
    });
  }
};

Renderer.prototype._drawColorPreview = function (ctx, x, y, w, h) {
  if (this.frameView && this.frameView.ready) {
    return this.frameView.drawTo(ctx, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  return null;
};

Renderer.prototype._drawCoverImage = function (ctx, sprite, x, y, w, h) {
  if (!sprite || !sprite.ready || !sprite.image) {
    ctx.fillStyle = '#101018';
    ctx.fillRect(x, y, w, h);
    return;
  }
  const img = sprite.image;
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
};

Renderer.prototype._drawROIGrayOverlay = function (ctx, databus, roiX, roiY, roiSize) {
  const buf = databus.roiGrayBuffer;
  if (!buf || !buf.data) {
    ctx.fillStyle = 'rgba(40,40,40,0.35)';
    ctx.fillRect(roiX, roiY, roiSize, roiSize);
    return;
  }

  try {
    if (!this._roiImageData ||
        this._roiImageData.width !== buf.width ||
        this._roiImageData.height !== buf.height) {
      this._roiImageData = ctx.createImageData(buf.width, buf.height);
    }
    this._roiImageData.data.set(buf.data);

    if (!this._roiCanvas) {
      this._roiCanvas = document.createElement('canvas');
      this._roiCtx = this._roiCanvas.getContext('2d');
    }
    if (this._roiCanvas.width !== buf.width || this._roiCanvas.height !== buf.height) {
      this._roiCanvas.width = buf.width;
      this._roiCanvas.height = buf.height;
    }
    this._roiCtx.putImageData(this._roiImageData, 0, 0);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this._roiCanvas, roiX, roiY, roiSize, roiSize);
    ctx.restore();
  } catch (e) {
    try {
      ctx.putImageData(this._roiImageData, roiX, roiY);
    } catch (e2) {
      console.warn('[render] ROI gray failed', e2);
    }
  }
};

Renderer.prototype._drawSensorPanel = function (databus) {
  const ctx = this.ctx;
  const s = this.layout.sensor;
  const ui = this.ui;
  const matching = databus.playState === 'playing' && databus.matchPercent > 0;

  ui.drawPixelFrame(ctx, s.x, s.y, s.w, s.h, {
    outerColor: COLORS.BLACK,
    innerColor: COLORS.MARIO_YELLOW,
    fillColor: COLORS.PANEL_BG,
    outerWidth: 4,
    innerWidth: 2
  });

  ui.drawPixelText(ctx, 'GRAY SENSOR', s.x + 12, s.y + 8, {
    size: 11, color: COLORS.RETRO_GREEN, shadow: true
  });
  ui.drawPixelText(ctx, 'G ' + databus.grayValue, s.x + s.w - 12, s.y + 8, {
    size: 10, color: COLORS.WHITE, align: 'right', shadow: true
  });

  ui.drawPixelProgressBar(ctx, s.x + 14, s.y + 26, s.w - 28, 10, databus.grayBarPercent, 10);

  const targetLine = databus.targetLevel >= 0
    ? databus.targetName
    : 'PRESS PLAY TO START';
  ui.drawPixelText(ctx, 'TARGET', s.x + 14, s.y + 44, {
    size: 9, color: COLORS.PIXEL_GRAY, shadow: true
  });
  ui.drawPixelText(ctx, targetLine, s.x + 70, s.y + 44, {
    size: 10, color: COLORS.MARIO_YELLOW, shadow: true
  });
  ui.drawPixelText(ctx, databus.targetLabel, s.x + s.w - 12, s.y + 44, {
    size: 10, color: COLORS.NES_RED, align: 'right', shadow: true
  });

  ui.drawPixelText(ctx, matching ? 'LOCKING' : 'LOCK', s.x + 14, s.y + 62, {
    size: 9, color: matching ? COLORS.RETRO_GREEN : COLORS.PIXEL_GRAY, shadow: true
  });
  ui.drawPixelProgressBar(ctx, s.x + 70, s.y + 62, s.w - 86, 10, databus.matchPercent || 0, 10);

  ui.drawDataRow(ctx, s.x + 14, s.y + 84, 'MAIN:', databus.currentSound, {
    valueColor: COLORS.MARIO_YELLOW, valueOffset: 56, valueSize: 11, keySize: 10
  });
  ui.drawDataRow(ctx, s.x + 14, s.y + 102, 'AUX 30%:', databus.currentAuxSound, {
    valueColor: COLORS.RETRO_GREEN, valueOffset: 72, valueSize: 11, keySize: 10
  });

  ctx.fillStyle = COLORS.BLACK;
  ctx.fillRect(s.x + 10, s.y + 122, s.w - 20, 28);
  ctx.fillStyle = COLORS.PIXEL_GRAY;
  ctx.fillRect(s.x + 10, s.y + 122, s.w - 20, 2);

  ui.drawPixelText(ctx, '对准目标 · 锁定90即+100', s.x + 16, s.y + 128, {
    size: 9, color: COLORS.PIXEL_GRAY, shadow: true
  });
};

Renderer.prototype._drawButtons = function (databus) {
  const ctx = this.ctx;
  const L = this.layout;
  let playLabel = 'PLAY';
  let playActive = false;
  if (databus.playState === 'playing') {
    playLabel = 'STOP';
    playActive = true;
  } else if (databus.playState === 'gameover') {
    playLabel = 'PLAY';
    playActive = true;
  }

  const pending = databus.authStatus === 'privacy' || databus.authStatus === 'camera';
  this.hitAreas.scanBtn = this.ui.drawPixelButton(
    ctx, L.scanBtn.x, L.scanBtn.y, L.scanBtn.w, L.scanBtn.h,
    databus.isScanning ? 'STOP SCAN' : (pending ? 'AUTH...' : 'START SCAN'),
    { active: databus.isScanning || pending, fontSize: 12 }
  );

  this.hitAreas.playBtn = this.ui.drawPixelButton(
    ctx, L.playBtn.x, L.playBtn.y, L.playBtn.w, L.playBtn.h,
    playLabel,
    { active: playActive, fontSize: 12 }
  );
};

Renderer.prototype._drawGameOver = function (databus) {
  const ctx = this.ctx;
  const ui = this.ui;
  const W = this.width;
  const H = this.height;
  const boxW = Math.min(280, W - 40);
  const boxH = 210;
  const x = Math.floor((W - boxW) / 2);
  const y = Math.floor((H - boxH) / 2) - 20;

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);

  ui.drawPixelFrame(ctx, x, y, boxW, boxH, {
    outerColor: COLORS.BLACK,
    innerColor: COLORS.MARIO_YELLOW,
    fillColor: COLORS.PANEL_BG,
    outerWidth: 4,
    innerWidth: 2
  });

  ui.drawPixelText(ctx, 'FINAL SCORE', W / 2, y + 18, {
    size: 16, color: COLORS.MARIO_YELLOW, align: 'center', shadow: true
  });
  ui.drawPixelText(ctx, this._padScore(databus.score), W / 2, y + 48, {
    size: 28, color: COLORS.WHITE, align: 'center', shadow: true
  });
  ui.drawPixelText(ctx, '+' + (databus.roundHits * 100) + '   HITS ' + databus.roundHits + '   BEST ' + this._padScore(databus.bestScore), W / 2, y + 84, {
    size: 10, color: COLORS.PIXEL_GRAY, align: 'center', shadow: true
  });

  if (databus.isNewBest) {
    ui.drawPixelText(ctx, 'NEW BEST', W / 2, y + 104, {
      size: 12, color: COLORS.RETRO_GREEN, align: 'center', shadow: true
    });
  }

  ui.drawPixelText(ctx, 'PLAY 再来  /  BACK 扫描页', W / 2, y + 128, {
    size: 10, color: COLORS.PIXEL_GRAY, align: 'center', shadow: true
  });

  const btnY = y + 154;
  const btnW = Math.floor((boxW - 28) / 2);
  this.hitAreas.retryBtn = ui.drawPixelButton(
    ctx, x + 8, btnY, btnW, 40, 'PLAY', { active: true, fontSize: 12 }
  );
  this.hitAreas.backScanBtn = ui.drawPixelButton(
    ctx, x + 20 + btnW, btnY, btnW, 40, 'BACK', { fontSize: 12 }
  );
};

Renderer.prototype.hitTest = function (px, py, scene, playState) {
  if (scene === 'start') {
    if (this.ui.hitTest(this.hitAreas.startBtn, px, py)) return 'start';
    if (py > this.height * 0.7) return 'start';
    return null;
  }
  if (playState === 'gameover') {
    if (this.ui.hitTest(this.hitAreas.retryBtn, px, py)) return 'play';
    if (this.ui.hitTest(this.hitAreas.backScanBtn, px, py)) return 'backScan';
    if (this.ui.hitTest(this.hitAreas.playBtn, px, py)) return 'play';
    if (this.ui.hitTest(this.hitAreas.backBtn, px, py)) return 'back';
    return null;
  }
  if (this.ui.hitTest(this.hitAreas.backBtn, px, py)) return 'back';
  if (this.ui.hitTest(this.hitAreas.scanBtn, px, py)) return 'scan';
  if (this.ui.hitTest(this.hitAreas.playBtn, px, py)) return 'play';
  return null;
};
