import { DataBus } from './databus.js';
import * as grayUtil from './utils/gray.js';
import * as soundUtil from './utils/sound.js';
import { Renderer } from './runtime/render.js';
import { Music } from './runtime/music.js';
import { CameraManager } from './runtime/camera.js';
import { FrameView } from './runtime/frame_view.js';
import { showToast } from './toast.js';

const HOLD_MS = 1100;
const SCORE_LOCK = 90;
const SCORE_UNIT = 100;
const COMBO_BREAK_MS = 650;

function Main() {
  this.canvas = document.getElementById('game');
  this.ctx = this.canvas.getContext('2d');

  this._fitCanvas();

  this.databus = new DataBus();
  this.music = new Music();
  this.camera = new CameraManager();
  this.frameView = new FrameView();
  this.renderer = new Renderer(this.canvas, this.ctx);
  this.renderer.frameView = this.frameView;

  this.lastUiUpdateTime = 0;
  this.uiUpdateInterval = 150;
  this.aniId = 0;
  this._touchLocked = false;
  this._roiTick = 0;
  this._lastTick = Date.now();
  this._roundStart = 0;
  this._matchHold = 0;
  this._matchStamp = 0;
  this._offTarget = 0;
  this._offStamp = 0;

  this.music.init();
  this._bindAux();
  this._bindTouch();
  this._bindCamera();
  this._bindResize();
  const self = this;
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') self.music.unlock();
  });
  this._loop();
}

Main.prototype._fitCanvas = function () {
  const w = Math.max(320, window.innerWidth);
  const h = Math.max(480, window.innerHeight);
  this.logicWidth = w;
  this.logicHeight = h;
  this.canvas.width = w;
  this.canvas.height = h;
};

Main.prototype._bindResize = function () {
  const self = this;
  window.addEventListener('resize', function () {
    self._fitCanvas();
    self.renderer.resize(self.logicWidth, self.logicHeight);
    const rect = self.renderer.getCameraNativeRect();
    self.camera.setLayout(rect.x, rect.y, rect.width, rect.height);
  });
};

Main.prototype._bindAux = function () {
  const self = this;
  this.music.setAuxListener(function (info) {
    self.databus.setAuxSound(info);
  });
};

Main.prototype._canvasPoint = function (e) {
  const rect = this.canvas.getBoundingClientRect();
  const src = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]) || e;
  const x = (src.clientX - rect.left) * (this.canvas.width / rect.width);
  const y = (src.clientY - rect.top) * (this.canvas.height / rect.height);
  return { x: x, y: y };
};

Main.prototype._bindTouch = function () {
  const self = this;
  this._lastHitAt = 0;

  const onDown = function (e) {
    self.music.unlock();
    if (self._touchLocked) return;
    const now = Date.now();
    if (now - self._lastHitAt < 350) return;
    if (e.cancelable) e.preventDefault();
    const p = self._canvasPoint(e.changedTouches ? e : e);
    const hit = self.renderer.hitTest(p.x, p.y, self.databus.scene, self.databus.playState);
    if (!hit) return;
    self._lastHitAt = now;

    if (hit === 'start') {
      self.enterGame();
    } else if (hit === 'scan') {
      self.onToggleScan();
    } else if (hit === 'play') {
      self.onTogglePlay();
    } else if (hit === 'back') {
      self.backToStart();
    } else if (hit === 'backScan') {
      self.backToRecordPage();
    }
  };

  this.canvas.addEventListener('pointerdown', onDown);
  this.canvas.addEventListener('touchend', onDown, { passive: false });
  this.canvas.addEventListener('click', onDown);
};

Main.prototype._bindCamera = function () {
  const self = this;
  const rect = this.renderer.getCameraNativeRect();
  this.camera.setLayout(rect.x, rect.y, rect.width, rect.height);

  this.camera.setCallbacks({
    onFrame: function (grayValue, frame) {
      if (frame) {
        self.frameView.update(frame);
        self._roiTick += 1;
        if (self._roiTick % 3 === 1) {
          self.databus.roiGrayBuffer = grayUtil.extractROIGrayBuffer(frame, grayUtil.ROI_SIZE);
        }
      }
      self.analyzeGray(grayValue);
    },
    onReady: function () {
      self.databus.cameraReady = true;
      self.databus.showCamera = true;
      self.databus.isScanning = true;
      self.databus.authStatus = 'granted';
      self.music.unlock();
      self.music.startSession();
      self.databus.currentSound = 'SCANNING...';
      self.databus.currentSoundLabel = 'CAMERA OK';
      showToast('点一下画面开声音，再 PLAY', 1800);
    },
    onAuthStatus: function (status) {
      self.databus.authStatus = status;
      if (status === 'camera') {
        self.databus.currentSoundLabel = 'AUTH CAMERA...';
      }
    },
    onError: function (err) {
      console.error('[main] camera error:', err);
      self.databus.isScanning = false;
      self.databus.showCamera = false;
      self.databus.cameraReady = false;
      self.databus.authStatus = 'denied';
      self.databus.currentSound = 'STANDBY';
      self.databus.currentSoundLabel = 'CAMERA FAIL';
      if (self.databus.playState === 'playing') {
        self._endRound();
      }
      let tip = (err && err.errMsg) ? String(err.errMsg) : '摄像头失败';
      if (tip.length > 22) tip = tip.slice(0, 22);
      showToast(tip, 2000);
    }
  });
};

Main.prototype.enterGame = function () {
  this.music.unlock();
  this.databus.scene = 'game';
  this.renderer.layout = this.renderer._computeGameLayout();
  showToast('场的回声', 800);
};

Main.prototype.onToggleScan = function () {
  if (this.databus.authStatus === 'camera') {
    return;
  }
  if (this.databus.isScanning || this.databus.cameraReady) {
    this.stopScan();
    return;
  }
  this.startScan();
};

Main.prototype.startScan = function () {
  const rect = this.renderer.getCameraNativeRect();
  this.camera.setLayout(rect.x, rect.y, rect.width, rect.height);

  this.databus.resetRound();
  this.databus.currentSound = 'INITIALIZING...';
  this.databus.currentSoundLabel = 'TAP AUTH...';
  this.databus.authStatus = 'camera';

  this.music.init();
  this.music.unlock();
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    showToast('iPhone请关闭静音拨片', 1400);
  }

  const self = this;
  this._touchLocked = true;
  setTimeout(function () {
    self._touchLocked = false;
  }, 600);

  this.camera.start();
};

Main.prototype.stopScan = function (opts) {
  this.databus.isScanning = false;
  this.databus.showCamera = false;
  this.databus.cameraReady = false;
  this.databus.currentSound = 'STANDBY';
  this.databus.currentSoundLabel = 'AWAITING SCAN';
  this.databus.currentSoundIndex = -1;
  this.databus.currentAuxSound = '--';
  this.databus.currentAuxLabel = 'IDLE';
  this.databus.currentAuxIndex = -1;
  this.databus.authStatus = 'idle';
  this.databus.roiGrayBuffer = null;
  this.databus.colorPreviewBuffer = null;
  this.databus.matchPercent = 0;
  this.databus.resetRound();
  if (this.frameView) this.frameView.clear();
  this.camera.stop();
  this.music.stop();
  if (!(opts && opts.silent)) {
    this.databus.scene = 'game';
    showToast('已返回录制页', 900);
  }
};

Main.prototype.backToRecordPage = function () {
  const db = this.databus;
  db.playState = 'idle';
  db.matchPercent = 0;
  db.justScored = 0;
  db.setTarget(null);
  db.scene = 'game';
  showToast('已回扫描页', 800);
};

Main.prototype.backToStart = function () {
  this.stopScan({ silent: true });
  this.databus.scene = 'start';
  showToast('场的回声', 700);
};

Main.prototype.onTogglePlay = function () {
  this.music.unlock();
  const db = this.databus;
  if (db.isScanning && db.cameraReady) {
    this.music.startSession();
  }

  if (db.playState === 'playing') {
    this._endRound();
    return;
  }

  if (!db.isScanning || !db.cameraReady) {
    showToast('请先 START SCAN', 1400);
    return;
  }

  this._startRound();
};

Main.prototype._startRound = function () {
  const db = this.databus;
  db.playState = 'playing';
  db.score = 0;
  db.combo = 0;
  db.timeLeft = 0;
  db.roundHits = 0;
  db.matchPercent = 0;
  db.justScored = 0;
  db.lastGain = 0;
  db.isNewBest = false;
  this._roundStart = Date.now();
  this._matchHold = 0;
  this._matchStamp = 0;
  this._offTarget = 0;
  this._offStamp = 0;
  this._rollTarget();
  showToast('PLAY 中 · 锁定90得100分', 1200);
};

Main.prototype._rollTarget = function () {
  const exclude = [];
  if (this.music.currentLevel != null) exclude.push(this.music.currentLevel);
  if (this.databus.targetLevel >= 0) exclude.push(this.databus.targetLevel);
  const target = soundUtil.pickRandomSound(exclude);
  this.databus.setTarget(target);
  this._matchHold = 0;
  this.databus.matchPercent = 0;
};

Main.prototype._endRound = function () {
  const db = this.databus;
  if (db.playState !== 'playing') return;
  db.playState = 'gameover';
  db.timeLeft = Math.max(0, Math.floor((Date.now() - this._roundStart) / 1000));
  db.matchPercent = 0;
  db.isNewBest = db.saveBest();
  db.targetLabel = 'RESULT';
  showToast('得分 ' + db.score, 1600);
};

Main.prototype.analyzeGray = function (grayValue) {
  const now = Date.now();
  const frequency = grayUtil.grayToFrequency(grayValue);
  const note = grayUtil.grayToNote(grayValue);
  const soundInfo = soundUtil.mapGrayToSound(grayValue);

  if (now - this.lastUiUpdateTime >= this.uiUpdateInterval) {
    this.lastUiUpdateTime = now;
    this.databus.setGray(grayValue, frequency, note);
    this.databus.setSound(soundInfo);
  }

  if (this.databus.isScanning) {
    const played = this.music.play(soundInfo);
    if (played) this.databus.setSound(played);
  }

  if (this.databus.playState === 'playing') {
    this._updateMatch(now);
  }
};

Main.prototype._updateMatch = function (now) {
  const db = this.databus;
  if (db.targetLevel < 0) return;

  const playingLevel = this.music.currentLevel;
  const matched = playingLevel != null && playingLevel === db.targetLevel;

  if (matched) {
    this._offTarget = 0;
    if (!this._matchStamp) this._matchStamp = now;
    this._matchHold = now - this._matchStamp;
    db.matchPercent = Math.min(100, Math.round((this._matchHold / HOLD_MS) * 100));

    if (db.matchPercent >= SCORE_LOCK) {
      this._scoreHit();
      this._matchStamp = 0;
    }
  } else {
    this._matchStamp = 0;
    this._matchHold = 0;
    db.matchPercent = Math.max(0, db.matchPercent - 8);
    if (this._offStamp) {
      this._offTarget = now - this._offStamp;
    } else {
      this._offStamp = now;
      this._offTarget = 0;
    }
    if (this._offTarget >= COMBO_BREAK_MS && db.combo > 0) {
      db.combo = 0;
    }
  }

  if (matched) this._offStamp = 0;
};

Main.prototype._scoreHit = function () {
  const db = this.databus;
  db.combo += 1;
  db.roundHits += 1;
  db.score += SCORE_UNIT;
  db.lastGain = SCORE_UNIT;
  db.justScored = 70;
  this._rollTarget();
};

Main.prototype._tickGame = function () {
  const db = this.databus;
  if (db.justScored > 0) db.justScored -= 1;

  if (db.playState !== 'playing') return;
  db.timeLeft = Math.max(0, Math.floor((Date.now() - this._roundStart) / 1000));
};

Main.prototype._loop = function () {
  const self = this;
  const now = Date.now();
  this._lastTick = now;
  this.databus.frame += 1;
  this._tickGame();
  this.renderer.render(this.databus);
  const live = this.databus.scene === 'game' && this.databus.isScanning;
  const rect = this.renderer.getCameraNativeRect();
  this.camera.setLayout(rect.x, rect.y, rect.width, rect.height);
  this.camera.syncOverlay(this.canvas, live);
  this.aniId = requestAnimationFrame(function () {
    self._loop();
  });
};

window.addEventListener('DOMContentLoaded', function () {
  window.gameMain = new Main();
});
