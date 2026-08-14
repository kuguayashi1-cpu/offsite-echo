import { SOUND_LEVELS, pickRandomSound } from '../utils/sound.js';

const MAIN_VOLUME = 1.0;
const AUX_VOLUME = 0.3;
const AUX_ROTATE_INTERVAL = 3500;

export function Music() {
  this.currentAudio = null;
  this.currentLevel = null;
  this.lastChangeTime = 0;
  this.changeInterval = 280;
  this.ready = false;
  this._unlocked = false;
  this._session = false;

  this.mainPool = [];
  this.auxPool = [];
  this.auxAudio = null;
  this.auxLevel = null;
  this.auxTimer = null;
  this.auxListener = null;
}

Music.prototype._makeAudio = function (file, volume) {
  const audio = new Audio();
  audio.src = file;
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = volume;
  audio.playsInline = true;
  audio.setAttribute('playsinline', 'true');
  audio.load();
  return audio;
};

Music.prototype._ensurePool = function () {
  if (this.mainPool.length) return;
  const self = this;
  SOUND_LEVELS.forEach(function (info) {
    self.mainPool[info.level] = self._makeAudio(info.file, MAIN_VOLUME);
    self.auxPool[info.level] = self._makeAudio(info.file, AUX_VOLUME);
  });
};

Music.prototype.init = function () {
  this._ensurePool();
  this.ready = true;
};

/**
 * 必须在用户点击里调用，解锁浏览器自动播放限制。
 */
Music.prototype.unlock = function () {
  this._ensurePool();
  const self = this;
  const els = this.mainPool.concat(this.auxPool);
  let i;
  for (i = 0; i < els.length; i++) {
    const el = els[i];
    if (!el) continue;
    el.muted = true;
    try {
      const p = el.play();
      if (p && p.then) {
        p.then(function () {
          if (self._session) {
            el.muted = false;
            return;
          }
          el.pause();
          el.currentTime = 0;
          el.muted = false;
        }).catch(function () {});
      }
    } catch (e) {}
  }
  this._unlocked = true;
};

Music.prototype.setAuxListener = function (listener) {
  this.auxListener = listener;
};

Music.prototype._playEl = function (el, volume) {
  if (!el) return;
  el.muted = false;
  el.loop = true;
  el.volume = volume;
  try {
    const p = el.play();
    if (p && p.catch) p.catch(function () {});
  } catch (e) {}
};

Music.prototype._pauseEl = function (el) {
  if (!el) return;
  try {
    el.pause();
    el.currentTime = 0;
  } catch (e) {}
};

/**
 * 摄像头开启后立刻开始：辅音随机循环，主音等灰度进来再切轨。
 */
Music.prototype.startSession = function () {
  this._ensurePool();
  this._session = true;
  this._ensureAux();
};

/**
 * 主音：灰度映射哪一档就循环播哪一档（摄像头开启期间持续）。
 */
Music.prototype.play = function (soundInfo) {
  if (!this._session) return null;
  if (!soundInfo || soundInfo.level == null) return null;

  this._ensurePool();
  const now = Date.now();

  if (soundInfo.level !== this.currentLevel) {
    if (this.currentAudio && now - this.lastChangeTime < this.changeInterval) {
      this._ensureAux();
      return null;
    }
    if (this.currentAudio && this.currentAudio !== this.mainPool[soundInfo.level]) {
      this._pauseEl(this.currentAudio);
    }
    this.currentAudio = this.mainPool[soundInfo.level];
    this._playEl(this.currentAudio, MAIN_VOLUME);
    this.currentLevel = soundInfo.level;
    this.lastChangeTime = now;
  } else if (this.currentAudio && this.currentAudio.paused) {
    this._playEl(this.currentAudio, MAIN_VOLUME);
  }

  this._ensureAux();
  return soundInfo;
};

Music.prototype.stop = function () {
  this._session = false;
  this._stopAux();
  if (this.currentAudio) this._pauseEl(this.currentAudio);
  this.currentAudio = null;
  this.currentLevel = null;
  this.lastChangeTime = 0;
};

Music.prototype._playAuxRandom = function () {
  if (!this._session) return null;
  const info = pickRandomSound([this.currentLevel, this.auxLevel]);
  if (this.auxAudio && this.auxAudio !== this.auxPool[info.level]) {
    this._pauseEl(this.auxAudio);
  }
  this.auxAudio = this.auxPool[info.level];
  this._playEl(this.auxAudio, AUX_VOLUME);
  this.auxLevel = info.level;
  if (typeof this.auxListener === 'function') {
    this.auxListener(info);
  }
  return info;
};

Music.prototype._ensureAux = function () {
  const self = this;
  if (!this._session) return;
  if (!this.auxAudio || this.auxLevel === this.currentLevel || (this.auxAudio && this.auxAudio.paused)) {
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
  if (this.auxAudio) this._pauseEl(this.auxAudio);
  this.auxAudio = null;
  this.auxLevel = null;
};
