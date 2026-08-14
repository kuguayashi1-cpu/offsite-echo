import { pickRandomSound } from '../utils/sound.js';

const MAIN_VOLUME = 1.0;
const AUX_VOLUME = 0.3;
const AUX_ROTATE_INTERVAL = 3500;

export function Music() {
  this.currentAudio = null;
  this.currentLevel = null;
  this.lastChangeTime = 0;
  this.changeInterval = 500;
  this.ready = false;

  this.auxAudio = null;
  this.auxLevel = null;
  this.auxTimer = null;
  this.auxListener = null;
}

Music.prototype.init = function () {
  this.ready = true;
};

Music.prototype.setAuxListener = function (listener) {
  this.auxListener = listener;
};

Music.prototype.play = function (soundInfo) {
  const now = Date.now();
  if (!soundInfo || !soundInfo.file) return null;

  this.init();

  if (!(soundInfo.level === this.currentLevel && this.currentAudio)) {
    if (now - this.lastChangeTime < this.changeInterval && this.currentAudio) {
      this._ensureAux();
      return null;
    }
    this._destroyAudio(this.currentAudio);
    this.currentAudio = this._createLoop(soundInfo.file, MAIN_VOLUME);
    this.currentAudio.play();
    this.currentLevel = soundInfo.level;
    this.lastChangeTime = now;
  }

  this._ensureAux();
  return soundInfo;
};

Music.prototype.stop = function () {
  this._stopAux();
  this._destroyAudio(this.currentAudio);
  this.currentAudio = null;
  this.currentLevel = null;
  this.lastChangeTime = 0;
};

Music.prototype._createLoop = function (file, volume) {
  const audio = new Audio(file);
  audio.loop = true;
  audio.volume = volume;
  audio.preload = 'auto';
  audio.onerror = function () {
    console.error('[music] error:', file);
  };
  return {
    play: function () {
      const p = audio.play();
      if (p && p.catch) p.catch(function () {});
    },
    stop: function () {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {}
    },
    destroy: function () {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch (e) {}
    }
  };
};

Music.prototype._destroyAudio = function (audio) {
  if (!audio) return;
  try {
    audio.stop();
    audio.destroy();
  } catch (e) {}
};

Music.prototype._playAuxRandom = function () {
  const info = pickRandomSound([this.currentLevel, this.auxLevel]);
  this._destroyAudio(this.auxAudio);
  this.auxAudio = this._createLoop(info.file, AUX_VOLUME);
  this.auxAudio.play();
  this.auxLevel = info.level;
  if (typeof this.auxListener === 'function') {
    this.auxListener(info);
  }
  return info;
};

Music.prototype._ensureAux = function () {
  const self = this;
  if (!this.auxAudio || this.auxLevel === this.currentLevel) {
    this._playAuxRandom();
  }
  if (this.auxTimer) return;
  this.auxTimer = setInterval(function () {
    self._playAuxRandom();
  }, AUX_ROTATE_INTERVAL);
};

Music.prototype._stopAux = function () {
  if (this.auxTimer) {
    clearInterval(this.auxTimer);
    this.auxTimer = null;
  }
  this._destroyAudio(this.auxAudio);
  this.auxAudio = null;
  this.auxLevel = null;
};
