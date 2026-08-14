import { SOUND_LEVELS, pickRandomSound } from '../utils/sound.js';

const MAIN_VOLUME = 1.0;
const AUX_VOLUME = 0.3;
const AUX_ROTATE_INTERVAL = 3500;

export function Music() {
  this.ctx = null;
  this.buffers = [];
  this.mainGain = null;
  this.auxGain = null;
  this.masterGain = null;
  this.mainSource = null;
  this.auxSource = null;
  this.keepAlive = null;
  this.currentAudio = null;
  this.currentLevel = null;
  this.lastChangeTime = 0;
  this.changeInterval = 280;
  this.ready = false;
  this._unlocked = false;
  this._session = false;
  this._loadPromise = null;
  this.auxLevel = null;
  this.auxTimer = null;
  this.auxListener = null;
}

Music.prototype._getCtx = function () {
  if (this.ctx) return this.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;

  const ctx = new AC();
  this.ctx = ctx;
  this.masterGain = ctx.createGain();
  this.masterGain.gain.value = 1;
  this.masterGain.connect(ctx.destination);

  this.mainGain = ctx.createGain();
  this.mainGain.gain.value = MAIN_VOLUME;
  this.mainGain.connect(this.masterGain);

  this.auxGain = ctx.createGain();
  this.auxGain.gain.value = AUX_VOLUME;
  this.auxGain.connect(this.masterGain);

  return ctx;
};

Music.prototype.init = function () {
  this.ready = true;
  this._loadBuffers();
};

Music.prototype._loadBuffers = function () {
  const ctx = this._getCtx();
  if (!ctx) return Promise.resolve();
  if (this._loadPromise) return this._loadPromise;

  const self = this;
  this._loadPromise = Promise.all(SOUND_LEVELS.map(function (info) {
    return fetch(info.file)
      .then(function (res) { return res.arrayBuffer(); })
      .then(function (raw) {
        return new Promise(function (resolve, reject) {
          const ret = ctx.decodeAudioData(raw, resolve, reject);
          if (ret && typeof ret.then === 'function') ret.then(resolve, reject);
        });
      })
      .then(function (buf) {
        self.buffers[info.level] = buf;
      })
      .catch(function (err) {
        console.error('[music] decode failed', info.file, err);
      });
  })).then(function () {
    if (self._session) {
      self._ensureAux();
      if (self.currentLevel != null) {
        self._startMain(self.currentLevel);
      }
    }
  });

  return this._loadPromise;
};

/**
 * 必须在用户点击里同步调用。iPhone 摄像头授权后也要再点一次才能出声。
 */
Music.prototype.unlock = function () {
  const ctx = this._getCtx();
  if (!ctx) return;

  if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
    const p = ctx.resume();
    if (p && p.catch) p.catch(function () {});
  }

  if (!this.keepAlive) {
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0.00008;
      osc.frequency.value = 220;
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(0);
      this.keepAlive = osc;
    } catch (e) {}
  }

  this._unlocked = true;
  this._loadBuffers();
};

Music.prototype.setAuxListener = function (listener) {
  this.auxListener = listener;
};

Music.prototype._stopSource = function (src) {
  if (!src) return;
  try { src.stop(0); } catch (e) {}
  try { src.disconnect(); } catch (e) {}
};

Music.prototype._startLoop = function (buffer, gainNode) {
  const ctx = this._getCtx();
  if (!ctx || !buffer) return null;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.connect(gainNode);
  try {
    src.start(0);
  } catch (e) {
    return null;
  }
  return src;
};

Music.prototype._startMain = function (level) {
  const buf = this.buffers[level];
  if (!buf) return false;
  if (this.mainSource) this._stopSource(this.mainSource);
  this.mainSource = this._startLoop(buf, this.mainGain);
  this.currentLevel = level;
  this.currentAudio = this.mainSource;
  return !!this.mainSource;
};

Music.prototype.startSession = function () {
  this._session = true;
  this.unlock();
  this._ensureAux();
};

Music.prototype.play = function (soundInfo) {
  if (!this._session) return null;
  if (!soundInfo || soundInfo.level == null) return null;

  const ctx = this._getCtx();
  if (ctx && ctx.state !== 'running') {
    const p = ctx.resume();
    if (p && p.catch) p.catch(function () {});
  }

  const now = Date.now();
  if (soundInfo.level !== this.currentLevel) {
    if (this.mainSource && now - this.lastChangeTime < this.changeInterval) {
      this._ensureAux();
      return null;
    }
    if (!this._startMain(soundInfo.level)) {
      this._ensureAux();
      return null;
    }
    this.lastChangeTime = now;
  }

  this._ensureAux();
  return soundInfo;
};

Music.prototype.stop = function () {
  this._session = false;
  this._stopAux();
  this._stopSource(this.mainSource);
  this.mainSource = null;
  this.currentAudio = null;
  this.currentLevel = null;
  this.lastChangeTime = 0;
};

Music.prototype._playAuxRandom = function () {
  if (!this._session) return null;
  const info = pickRandomSound([this.currentLevel, this.auxLevel]);
  const buf = this.buffers[info.level];
  if (!buf) return null;

  this._stopSource(this.auxSource);
  this.auxSource = this._startLoop(buf, this.auxGain);
  this.auxLevel = info.level;
  if (typeof this.auxListener === 'function') {
    this.auxListener(info);
  }
  return info;
};

Music.prototype._ensureAux = function () {
  const self = this;
  if (!this._session) return;
  if (!this.auxSource || this.auxLevel === this.currentLevel) {
    this._playAuxRandom();
  }
  if (this.auxTimer) return;
  this.auxTimer = setInterval(function () {
    if (!self._session) return;
    self._playAuxRandom();
  }, AUX_ROTATE_INTERVAL);
};

Music.prototype._stopAux = function () {
  if (this.auxTimer) {
    clearInterval(this.auxTimer);
    this.auxTimer = null;
  }
  this._stopSource(this.auxSource);
  this.auxSource = null;
  this.auxLevel = null;
};
