import { calculateGrayFromFrame, ROI_SIZE } from '../utils/gray.js';

export function CameraManager() {
  this.video = document.getElementById('cameraVideo');
  this.capture = document.createElement('canvas');
  this.captureCtx = this.capture.getContext('2d', { willReadFrequently: true });
  this.stream = null;
  this.listening = false;
  this.onFrameCallback = null;
  this.onErrorCallback = null;
  this.onReadyCallback = null;
  this.onAuthStatus = null;
  this.analyzing = false;
  this.layout = { x: 0, y: 0, width: 300, height: 220 };
  this._starting = false;
  this._readyOnce = false;
  this._raf = 0;
  this._lastCapture = 0;
  this._onPause = null;
  this._onEnded = null;
  this._onVis = null;
}

CameraManager.prototype.setLayout = function (x, y, width, height) {
  this.layout = {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(Math.max(16, width)),
    height: Math.round(Math.max(16, height))
  };
};

CameraManager.prototype.setCallbacks = function (hooks) {
  hooks = hooks || {};
  this.onFrameCallback = hooks.onFrame || null;
  this.onErrorCallback = hooks.onError || null;
  this.onReadyCallback = hooks.onReady || null;
  this.onAuthStatus = hooks.onAuthStatus || null;
};

CameraManager.prototype._status = function (s) {
  if (this.onAuthStatus) this.onAuthStatus(s);
};

CameraManager.prototype._fireReady = function () {
  if (this._readyOnce) return;
  this._readyOnce = true;
  this._starting = false;
  this._status('granted');
  if (this.onReadyCallback) this.onReadyCallback();
};

CameraManager.prototype._keepPlaying = function () {
  const v = this.video;
  if (!this.listening || !v) return;
  if (v.paused) {
    const p = v.play();
    if (p && p.catch) p.catch(function () {});
  }
};

/**
 * 把直播画面叠在取景框里，避免 1px 隐藏视频被浏览器暂停。
 */
CameraManager.prototype.syncOverlay = function (canvas, visible) {
  const v = this.video;
  if (!v || !canvas) return;

  if (!visible) {
    v.classList.remove('live');
    v.style.left = '-400px';
    v.style.top = '0px';
    v.style.width = '320px';
    v.style.height = '240px';
    return;
  }

  const scaleX = canvas.clientWidth / canvas.width;
  const scaleY = canvas.clientHeight / canvas.height;
  v.style.left = Math.round(this.layout.x * scaleX) + 'px';
  v.style.top = Math.round(this.layout.y * scaleY) + 'px';
  v.style.width = Math.round(this.layout.width * scaleX) + 'px';
  v.style.height = Math.round(this.layout.height * scaleY) + 'px';
  v.classList.add('live');
  this._keepPlaying();
};

CameraManager.prototype.start = function () {
  if (this._starting && this.stream) return;

  this._starting = true;
  this._readyOnce = false;
  this.stop(false);
  this._starting = true;
  this._status('camera');
  this._createCameraNow();
};

CameraManager.prototype._createCameraNow = function () {
  const self = this;

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    this._starting = false;
    this._status('denied');
    if (this.onErrorCallback) {
      this.onErrorCallback({ errMsg: '瀏覽器不支援攝像頭' });
    }
    return;
  }

  const tryGet = function (constraints) {
    return navigator.mediaDevices.getUserMedia(constraints);
  };

  tryGet({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 640 },
      height: { ideal: 480 }
    }
  }).catch(function () {
    return tryGet({ audio: false, video: true });
  }).then(function (stream) {
    if (!self._starting && !self.listening) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      return;
    }
    self.stream = stream;
    self.video.srcObject = stream;
    self.video.muted = true;
    self.video.playsInline = true;
    self.video.setAttribute('playsinline', 'true');
    self.video.setAttribute('webkit-playsinline', 'true');
    self.video.setAttribute('autoplay', 'true');

    self._bindKeepAlive();

    const playP = self.video.play();
    if (playP && playP.catch) playP.catch(function () {});

    const onReady = function () {
      self.video.removeEventListener('playing', onReady);
      self.video.removeEventListener('loadeddata', onReady);
      self.listening = true;
      self._startTick();
      self._fireReady();
    };

    if (self.video.readyState >= 2 && self.video.videoWidth > 0) {
      onReady();
    } else {
      self.video.addEventListener('playing', onReady);
      self.video.addEventListener('loadeddata', onReady);
    }
  }).catch(function (err) {
    self._starting = false;
    self._status('denied');
    const msg = (err && (err.message || err.name)) || 'camera denied';
    if (self.onErrorCallback) self.onErrorCallback({ errMsg: String(msg) });
  });
};

CameraManager.prototype._bindKeepAlive = function () {
  const self = this;
  this._unbindKeepAlive();

  this._onPause = function () {
    if (self.listening) {
      const p = self.video.play();
      if (p && p.catch) p.catch(function () {});
    }
  };
  this.video.addEventListener('pause', this._onPause);

  const track = this.stream && this.stream.getVideoTracks()[0];
  if (track) {
    this._onEnded = function () {
      if (!self.listening) return;
      self.listening = false;
      if (self.onErrorCallback) self.onErrorCallback({ errMsg: '摄像头中断' });
    };
    track.addEventListener('ended', this._onEnded);
  }

  this._onVis = function () {
    if (document.visibilityState === 'visible') self._keepPlaying();
  };
  document.addEventListener('visibilitychange', this._onVis);
};

CameraManager.prototype._unbindKeepAlive = function () {
  if (this._onPause && this.video) {
    this.video.removeEventListener('pause', this._onPause);
  }
  this._onPause = null;
  this._onEnded = null;
  if (this._onVis) {
    document.removeEventListener('visibilitychange', this._onVis);
    this._onVis = null;
  }
};

CameraManager.prototype._startTick = function () {
  if (this._raf) {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }
  this._tick();
};

CameraManager.prototype._tick = function () {
  const self = this;
  if (!this.listening) return;

  try {
    const now = Date.now();
    if (now - this._lastCapture >= 50) {
      this._lastCapture = now;
      this._captureFrame();
    }
  } catch (e) {
    console.error('[camera] tick error', e);
  }

  this._raf = requestAnimationFrame(function () {
    self._tick();
  });
};

CameraManager.prototype._captureFrame = function () {
  const v = this.video;
  if (!v || v.videoWidth <= 0 || v.videoHeight <= 0) {
    this._keepPlaying();
    return;
  }

  let w = v.videoWidth;
  let h = v.videoHeight;
  const maxW = 320;
  if (w > maxW) {
    h = Math.round(h * maxW / w);
    w = maxW;
  }

  if (this.capture.width !== w || this.capture.height !== h) {
    this.capture.width = w;
    this.capture.height = h;
  }
  this.captureCtx.drawImage(v, 0, 0, w, h);
  const imageData = this.captureCtx.getImageData(0, 0, w, h);
  this._handleFrame({
    data: imageData.data,
    width: imageData.width,
    height: imageData.height
  });
};

CameraManager.prototype._handleFrame = function (frame) {
  if (!this.listening || this.analyzing) return;
  if (!this.onFrameCallback) return;
  this.analyzing = true;
  try {
    const grayValue = calculateGrayFromFrame(frame, ROI_SIZE);
    this.onFrameCallback(grayValue, frame);
  } catch (e) {
    console.error('[camera] analyze error', e);
  }
  this.analyzing = false;
};

CameraManager.prototype.stop = function (resetStatus) {
  this.listening = false;
  this.analyzing = false;
  this._starting = false;
  this._readyOnce = false;

  if (this._raf) {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  this._unbindKeepAlive();
  this.syncOverlay(document.getElementById('game'), false);

  if (this.stream) {
    this.stream.getTracks().forEach(function (track) {
      track.stop();
    });
    this.stream = null;
  }

  if (this.video) {
    this.video.srcObject = null;
    this.video.classList.remove('live');
  }

  if (resetStatus !== false) {
    this._status('idle');
  }
};
