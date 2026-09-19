if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelector('#current-year').textContent = new Date().getFullYear();

document.querySelectorAll('.reveal').forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index * 35, 260)}ms`;
  observer.observe(element);
});

const counters = document.querySelectorAll('.count');
const countObserver = new IntersectionObserver((entries, observerInstance) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const counter = entry.target;
    const target = Number(counter.dataset.target);
    const suffix = counter.dataset.suffix || '';
    const duration = 1000;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.floor(progress * target);
      counter.textContent = `${value}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    observerInstance.unobserve(counter);
  });
}, { threshold: 0.5 });
counters.forEach((counter) => countObserver.observe(counter));

const cursorDot = document.querySelector('.cursor-dot');
const cursorRing = document.querySelector('.cursor-ring');
const sourcePopup = document.querySelector('#source-popup');
let rightClickTimes = [];
let popupTimeout;
let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let ringX = pointerX;
let ringY = pointerY;
window.addEventListener('pointermove', (event) => {
  pointerX = event.clientX;
  pointerY = event.clientY;
  document.body.classList.remove('cursor-hidden');
  cursorDot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
}, { passive: true });
window.addEventListener('mouseout', (event) => {
  if (!event.relatedTarget && !event.toElement) document.body.classList.add('cursor-hidden');
});
window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});
window.addEventListener('pointerdown', (event) => {
  if (event.button !== 2) return;
  const now = Date.now();
  rightClickTimes = rightClickTimes.filter((time) => now - time < 3000);
  rightClickTimes.push(now);
  if (rightClickTimes.length >= 6) {
    sourcePopup.classList.remove('show');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => sourcePopup.classList.add('show'));
    });
    rightClickTimes = [];
    clearTimeout(popupTimeout);
    popupTimeout = window.setTimeout(() => sourcePopup.classList.remove('show'), 8000);
  }
  document.body.classList.remove('cursor-click');
  void document.body.offsetWidth;
  document.body.classList.add('cursor-click');
  window.setTimeout(() => document.body.classList.remove('cursor-click'), 420);
}, { passive: true });
const animateCursor = () => {
  ringX += (pointerX - ringX) * 0.18;
  ringY += (pointerY - ringY) * 0.18;
  cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
  requestAnimationFrame(animateCursor);
};
document.querySelectorAll('a, .project-card, .feature, .skills span').forEach((element) => {
  element.addEventListener('pointerenter', () => document.body.classList.add('cursor-hover'));
  element.addEventListener('pointerleave', () => document.body.classList.remove('cursor-hover'));
});
animateCursor();
