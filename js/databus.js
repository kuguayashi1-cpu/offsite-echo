const BEST_SCORE_KEY = 'offsite_best_score';

export function DataBus() {
  this.reset();
  this.bestScore = this._loadBest();
}

DataBus.prototype._loadBest = function () {
  try {
    const v = localStorage.getItem(BEST_SCORE_KEY);
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  } catch (e) {
    return 0;
  }
};

DataBus.prototype.saveBest = function () {
  if (this.score > this.bestScore) {
    this.bestScore = this.score;
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
    } catch (e) {}
    return true;
  }
  return false;
};

DataBus.prototype.reset = function () {
  this.scene = 'start';
  this.grayValue = 0;
  this.frequency = 0;
  this.note = '--';
  this.currentSound = 'STANDBY';
  this.currentSoundLabel = 'AWAITING SCAN';
  this.currentSoundIndex = -1;
  this.currentAuxSound = '--';
  this.currentAuxLabel = 'IDLE';
  this.currentAuxIndex = -1;
  this.isScanning = false;
  this.cameraReady = false;
  this.showCamera = false;
  this.authStatus = 'idle';
  this.grayBarPercent = 0;
  this.frame = 0;
  this.scanlineOffset = 0;
  this.blink = 0;
  this.roiGrayBuffer = null;
  this.colorPreviewBuffer = null;

  this.playState = 'idle';
  this.score = 0;
  this.combo = 0;
  this.timeLeft = 60;
  this.roundHits = 0;
  this.targetLevel = -1;
  this.targetName = '--';
  this.targetLabel = 'PRESS PLAY';
  this.matchPercent = 0;
  this.justScored = 0;
  this.lastGain = 0;
  this.isNewBest = false;
};

DataBus.prototype.resetRound = function () {
  this.playState = 'idle';
  this.score = 0;
  this.combo = 0;
  this.timeLeft = 60;
  this.roundHits = 0;
  this.targetLevel = -1;
  this.targetName = '--';
  this.targetLabel = 'PRESS PLAY';
  this.matchPercent = 0;
  this.justScored = 0;
  this.lastGain = 0;
  this.isNewBest = false;
};

DataBus.prototype.setGray = function (gray, frequency, note) {
  this.grayValue = gray;
  this.frequency = frequency;
  this.note = note;
  this.grayBarPercent = Math.round((Math.max(0, Math.min(255, gray)) / 255) * 100);
};

DataBus.prototype.setSound = function (soundInfo) {
  if (!soundInfo) return;
  this.currentSound = soundInfo.name;
  this.currentSoundLabel = soundInfo.label;
  this.currentSoundIndex = soundInfo.level;
};

DataBus.prototype.setAuxSound = function (soundInfo) {
  if (!soundInfo) return;
  this.currentAuxSound = soundInfo.name;
  this.currentAuxLabel = soundInfo.label;
  this.currentAuxIndex = soundInfo.level;
};

DataBus.prototype.setTarget = function (soundInfo) {
  if (!soundInfo) {
    this.targetLevel = -1;
    this.targetName = '--';
    this.targetLabel = 'PRESS PLAY';
    return;
  }
  this.targetLevel = soundInfo.level;
  this.targetName = soundInfo.name;
  this.targetLabel = 'LV ' + (soundInfo.level + 1) + '/10';
};
