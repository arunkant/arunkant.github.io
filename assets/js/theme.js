(function () {
  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  var root = document.documentElement;
  btn.addEventListener('click', function () {
    var current = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', current);
    try { localStorage.setItem('theme', current); } catch (_) {}
  });
})();
