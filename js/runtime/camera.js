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
    self.stream = stream;
    self.video.srcObject = stream;
    self.video.setAttribute('playsinline', 'true');
    self.video.muted = true;
    const playP = self.video.play();
    if (playP && playP.catch) playP.catch(function () {});

    const onReady = function () {
      self.video.removeEventListener('playing', onReady);
      self.video.removeEventListener('loadeddata', onReady);
      self.listening = true;
      self._tick();
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

CameraManager.prototype._tick = function () {
  const self = this;
  if (!this.listening) return;

  const now = Date.now();
  if (now - this._lastCapture < 55) {
    this._raf = requestAnimationFrame(function () {
      self._tick();
    });
    return;
  }
  this._lastCapture = now;

  const v = this.video;
  if (v && v.videoWidth > 0 && v.videoHeight > 0) {
    if (this.capture.width !== v.videoWidth || this.capture.height !== v.videoHeight) {
      this.capture.width = v.videoWidth;
      this.capture.height = v.videoHeight;
    }
    this.captureCtx.drawImage(v, 0, 0);
    const imageData = this.captureCtx.getImageData(0, 0, this.capture.width, this.capture.height);
    this._handleFrame({
      data: imageData.data,
      width: imageData.width,
      height: imageData.height
    });
  }

  this._raf = requestAnimationFrame(function () {
    self._tick();
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

  if (this.stream) {
    this.stream.getTracks().forEach(function (track) {
      track.stop();
    });
    this.stream = null;
  }

  if (this.video) {
    this.video.srcObject = null;
  }

  if (resetStatus !== false) {
    this._status('idle');
  }
};
