export function FrameView() {
  this.canvas = null;
  this.ctx = null;
  this.imageData = null;
  this.width = 0;
  this.height = 0;
  this.ready = false;
  this._frameCount = 0;
  this._lastUpdate = 0;
  this.minUpdateInterval = 55;
  this.lastDrawRect = null;
}

FrameView.prototype._ensureCanvas = function (w, h) {
  if (this.canvas && this.width === w && this.height === h) return;

  try {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.imageData = this.ctx.createImageData(w, h);
    this.width = w;
    this.height = h;
    this.ready = true;
  } catch (e) {
    console.error('[FrameView] createCanvas failed', e);
    this.ready = false;
  }
};

FrameView.prototype.update = function (frame) {
  if (!frame || !frame.data || !frame.width || !frame.height) return false;

  const now = Date.now();
  if (now - this._lastUpdate < this.minUpdateInterval) {
    return false;
  }
  this._lastUpdate = now;

  const w = frame.width;
  const h = frame.height;
  this._ensureCanvas(w, h);
  if (!this.ready) return false;

  let src;
  if (frame.data instanceof Uint8ClampedArray) {
    src = frame.data;
  } else if (frame.data instanceof Uint8Array) {
    src = frame.data;
  } else {
    src = new Uint8ClampedArray(frame.data);
  }

  if (src.length < w * h * 4) return false;

  if (src instanceof Uint8ClampedArray) {
    this.imageData.data.set(src);
  } else {
    this.imageData.data.set(new Uint8ClampedArray(src.buffer, src.byteOffset, w * h * 4));
  }

  this.ctx.putImageData(this.imageData, 0, 0);
  this._frameCount += 1;
  return true;
};

FrameView.prototype.getCoverSource = function (viewW, viewH) {
  if (!this.ready || !this.width || !this.height) return null;

  const sw = this.width;
  const sh = this.height;
  const viewAspect = viewW / viewH;
  const srcAspect = sw / sh;
  let sx, sy, cw, ch;

  if (srcAspect > viewAspect) {
    ch = sh;
    cw = sh * viewAspect;
    sx = (sw - cw) / 2;
    sy = 0;
  } else {
    cw = sw;
    ch = sw / viewAspect;
    sx = 0;
    sy = (sh - ch) / 2;
  }

  return { sx: sx, sy: sy, sw: cw, sh: ch };
};

FrameView.prototype.drawTo = function (targetCtx, x, y, w, h) {
  if (!this.ready || !this.canvas) return null;

  const src = this.getCoverSource(w, h);
  if (!src) return null;

  targetCtx.save();
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.drawImage(
    this.canvas,
    src.sx, src.sy, src.sw, src.sh,
    x, y, w, h
  );
  targetCtx.restore();

  this.lastDrawRect = { x: x, y: y, width: w, height: h };
  return this.lastDrawRect;
};

FrameView.prototype.clear = function () {
  this.ready = false;
  this.width = 0;
  this.height = 0;
  this.imageData = null;
  this.canvas = null;
  this.ctx = null;
  this.lastDrawRect = null;
  this._lastUpdate = 0;
};
