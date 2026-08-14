export function Sprite(options) {
  options = options || {};
  this.x = options.x || 0;
  this.y = options.y || 0;
  this.width = options.width || 0;
  this.height = options.height || 0;
  this.visible = options.visible !== false;
  this.image = null;
  this.src = options.src || '';
  this.ready = false;
}

Sprite.prototype.load = function (src, callback) {
  const self = this;
  const path = src || this.src;
  if (!path) {
    if (callback) callback(null);
    return;
  }
  this.src = path;
  this.image = new Image();
  this.image.onload = function () {
    if (!self.width) self.width = self.image.width;
    if (!self.height) self.height = self.image.height;
    self.ready = true;
    if (callback) callback(self.image);
  };
  this.image.onerror = function () {
    console.warn('[Sprite] load failed:', path);
    self.ready = false;
    if (callback) callback(null);
  };
  this.image.src = path;
};

Sprite.prototype.draw = function (ctx) {
  if (!this.visible || !this.image || !this.ready) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
};
