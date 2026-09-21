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
const imageCache = new Map();
let cursorColor = '#fff';
let pendingCursorColor = cursorColor;
let cursorColorTimer;
let rightClickTimes = [];
let popupTimeout;
let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let ringX = pointerX;
let ringY = pointerY;
const cursorColorForBackground = (element) => {
  let current = element;
  while (current && current !== document.documentElement) {
    const background = getComputedStyle(current).backgroundColor.match(/[\d.]+/g);
    if (background && background.length >= 3 && Number(background[3] ?? 1) > 0) {
      const [red, green, blue] = background.map(Number);
      const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
      return luminance > 155 ? '#171313' : '#fff';
    }
    current = current.parentElement;
  }
  return '#fff';
};
const setCursorColorFromPixel = (red, green, blue) => {
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  queueCursorColor(luminance > 155 ? '#171313' : '#fff');
};
const queueCursorColor = (color) => {
  if (color === pendingCursorColor) return;
  pendingCursorColor = color;
  clearTimeout(cursorColorTimer);
  cursorColorTimer = window.setTimeout(() => {
    cursorColor = pendingCursorColor;
    document.documentElement.style.setProperty('--cursor-color', cursorColor);
  }, 140);
};
const getBackgroundImage = (element) => {
  let current = element;
  while (current && current !== document.documentElement) {
    const imageUrl = getComputedStyle(current).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if (imageUrl && !imageUrl.startsWith('data:')) return { element: current, imageUrl };
    current = current.parentElement;
  }
  return null;
};
const sampleBackgroundImage = (element, x, y) => {
  const imageData = getBackgroundImage(element);
  if (!imageData) return;
  const { element: imageElement, imageUrl } = imageData;
  const rect = imageElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  let imageRecord = imageCache.get(imageUrl);
  if (!imageRecord) {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    imageRecord = { image, ready: false, failed: false };
    imageCache.set(imageUrl, imageRecord);
    image.onload = () => {
      imageRecord.ready = true;
      updateCursorColor(pointerX, pointerY);
    };
    image.onerror = () => { imageRecord.failed = true; };
    image.src = imageUrl;
  }
  if (!imageRecord.ready || imageRecord.failed) return;
  const canvas = sampleBackgroundImage.canvas || (sampleBackgroundImage.canvas = document.createElement('canvas'));
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const scale = Math.max(rect.width / imageRecord.image.naturalWidth, rect.height / imageRecord.image.naturalHeight);
  const renderedWidth = imageRecord.image.naturalWidth * scale;
  const renderedHeight = imageRecord.image.naturalHeight * scale;
  const offsetX = (rect.width - renderedWidth) / 2;
  const offsetY = (rect.height - renderedHeight) / 2;
  const sourceX = (x - rect.left - offsetX) / scale;
  const sourceY = (y - rect.top - offsetY) / scale;
  try {
    context.clearRect(0, 0, 1, 1);
    context.drawImage(imageRecord.image, sourceX, sourceY, 1, 1, 0, 0, 1, 1);
    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
    setCursorColorFromPixel(red, green, blue);
  } catch {
    imageRecord.failed = true;
  }
};
const updateCursorColor = (x, y) => {
  const element = document.elementFromPoint(x, y);
  queueCursorColor(cursorColorForBackground(element));
  sampleBackgroundImage(element, x, y);
};
window.addEventListener('pointermove', (event) => {
  pointerX = event.clientX;
  pointerY = event.clientY;
  document.body.classList.remove('cursor-hidden');
  cursorDot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
  updateCursorColor(pointerX, pointerY);
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
  window.setTimeout(() => document.body.classList.remove('cursor-click'), 900);
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
