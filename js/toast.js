let timer = 0;

export function showToast(title, duration) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = title || '';
  el.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(function () {
    el.classList.remove('show');
  }, duration || 1600);
}
