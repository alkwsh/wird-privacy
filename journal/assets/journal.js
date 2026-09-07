(() => {
  const root = document.documentElement;
  const ar = root.lang === 'ar';
  let preferred = null;
  try { preferred = localStorage.getItem('wird-journal-theme'); } catch {}
  if (['light', 'dark'].includes(preferred)) root.dataset.theme = preferred;
  const toggle = document.querySelector('.theme-toggle');
  toggle?.addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    toggle.setAttribute('aria-label', ar ? `المظهر ${dark ? 'الفاتح' : 'الداكن'}، اضغط للتبديل` : `${dark ? 'Light' : 'Dark'} appearance, press to switch`);
    try { localStorage.setItem('wird-journal-theme', root.dataset.theme); } catch {}
  });
  const toast = document.querySelector('.toast');
  let timeout;
  const announce = (message) => {
    if (!toast) return;
    toast.textContent = message; toast.classList.add('visible');
    clearTimeout(timeout); timeout = setTimeout(() => toast.classList.remove('visible'), 3000);
  };
  document.querySelectorAll('.share-button').forEach(button => button.addEventListener('click', async () => {
    const url = button.dataset.url, title = button.dataset.title;
    try {
      if (navigator.share) await navigator.share({title, url});
      else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url); announce(ar ? 'تم نسخ رابط المقال' : 'Story link copied');
      } else window.prompt(ar ? 'انسخ رابط المقال' : 'Copy story link', url);
    } catch (error) {
      if (error.name !== 'AbortError') announce(ar ? 'تعذّرت المشاركة، حاول مرة أخرى' : 'Unable to share. Please try again.');
    }
  }));
  if (!matchMedia('(prefers-reduced-motion:reduce)').matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('entered'); observer.unobserve(entry.target); }
    }), {threshold: 0.08});
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  }
})();
