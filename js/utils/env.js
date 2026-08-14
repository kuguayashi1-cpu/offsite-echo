export function isIOS() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function isInAppBrowser() {
  const ua = navigator.userAgent || '';
  return /MicroMessenger|WeChat|Instagram|Line\/|FBAN|FBAV|Twitter|TikTok|Bytedance|QQ\//i.test(ua);
}

export function cameraHint(err) {
  const name = (err && (err.name || err.errMsg)) || '';
  const text = String(name) + ' ' + String((err && err.message) || '');
  if (/NotAllowed|PermissionDenied|denied/i.test(text)) {
    return '請到設定 → Safari → 攝影機 → 允許';
  }
  if (/NotFound|DevicesNotFound/i.test(text)) {
    return '找不到攝像頭';
  }
  if (/NotReadable|TrackStart|in use/i.test(text)) {
    return '鏡頭被占用，請關掉其他App';
  }
  if (/Security|NotSupported|undefined/i.test(text)) {
    return '請用 Safari 打開此網頁';
  }
  if (isInAppBrowser()) {
    return '請用 Safari 打開（不要用微信內建瀏覽器）';
  }
  return text.slice(0, 22) || '攝像頭失敗';
}

export function polyfillMediaDevices() {
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {};
  }
  if (typeof navigator.mediaDevices.getUserMedia === 'function') return;

  const legacy = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  if (!legacy) return;

  navigator.mediaDevices.getUserMedia = function (constraints) {
    return new Promise(function (resolve, reject) {
      legacy.call(navigator, constraints, resolve, reject);
    });
  };
}
