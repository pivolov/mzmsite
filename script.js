'use strict';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const iconPath = {
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>'
};
function setMediaIcon(button, paused) {
  button.querySelector('svg').innerHTML = iconPath[paused ? 'play' : 'pause'];
  button.setAttribute('aria-pressed', String(paused));
}

// Theme: explicit choice, shared controls, no dependency on external scripts.
const themeButtons = document.querySelectorAll('[data-theme-toggle]');
function setTheme(dark, save = false) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeButtons.forEach(button => {
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
    const label = button.querySelector('span');
    if (label) label.textContent = dark ? 'Светлая тема' : 'Тёмная тема';
  });
  syncProcessTheme();
  if (save) { try { localStorage.setItem('mzm-theme', dark ? 'dark' : 'light'); } catch {} }
}
// Embedded SVGs inherit their card's exact surface and stroke colors.
function syncProcessTheme() {
  const object = document.querySelector('#process-image');
  let svg;
  try { svg = object?.getSVGDocument()?.documentElement; } catch { return; }
  if (!svg) return;
  const colors = getComputedStyle(object);
  svg.style.color = colors.color;
  svg.style.backgroundColor = colors.backgroundColor;
  svg.style.colorScheme = 'light';
}
setTheme(document.documentElement.dataset.theme === 'dark');
themeButtons.forEach(button => button.addEventListener('click', () => setTheme(document.documentElement.dataset.theme !== 'dark', true)));

// Desktop navigation and a mobile drawer with a focus boundary.
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const header = document.querySelector('.header');
const menuBackdrop = document.querySelector('.menu-backdrop');
const pageContent = document.querySelectorAll('main, .footer');
const productNavigation = document.querySelector('.nav-products');
const productTrigger = document.querySelector('.nav-product-trigger');
const desktopNavigation = window.matchMedia('(min-width: 1101px)');
function toggleProducts(open) {
  productNavigation.classList.toggle('is-open', open);
  productTrigger.setAttribute('aria-expanded', String(open));
}
function setMenu(open) {
  open = open && !desktopNavigation.matches;
  navigation.classList.toggle('open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  menuBackdrop.hidden = !open;
  document.body.classList.toggle('menu-open', open);
  pageContent.forEach(element => { element.inert = open; });
  navigation.inert = !desktopNavigation.matches && !open;
  if (open) {
    header.setAttribute('role', 'dialog');
    header.setAttribute('aria-modal', 'true');
    header.setAttribute('aria-label', 'Меню сайта');
    productTrigger.focus({ preventScroll: true });
  } else {
    header.removeAttribute('role');
    header.removeAttribute('aria-modal');
    header.removeAttribute('aria-label');
    toggleProducts(false);
  }
}
function closeMenu() { setMenu(false); }
setMenu(false);
productTrigger.addEventListener('click', event => {
  const pointerClick = desktopNavigation.matches && event.detail > 0 && event.pointerType !== 'touch';
  toggleProducts(pointerClick || productTrigger.getAttribute('aria-expanded') !== 'true');
});
productNavigation.addEventListener('pointerenter', event => {
  if (desktopNavigation.matches && event.pointerType !== 'touch') toggleProducts(true);
});
productNavigation.addEventListener('pointerleave', () => {
  if (desktopNavigation.matches && !productNavigation.contains(document.activeElement)) toggleProducts(false);
});
productNavigation.addEventListener('focusout', event => {
  if (!productNavigation.contains(event.relatedTarget)) toggleProducts(false);
});
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
menuBackdrop.addEventListener('click', () => { closeMenu(); menuButton.focus(); });
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return;
  const menuOpen = menuButton.getAttribute('aria-expanded') === 'true';
  if (event.key === 'Escape') {
    if (productTrigger.getAttribute('aria-expanded') === 'true') {
      toggleProducts(false);
      productTrigger.focus();
    } else if (menuOpen) {
      closeMenu(); menuButton.focus();
    }
  }
  if (event.key === 'Tab' && menuOpen) {
    const stops = [...header.querySelectorAll('a, button')].filter(element => !element.closest('[inert]') && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
    const first = stops[0], last = stops[stops.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
desktopNavigation.addEventListener('change', closeMenu);
document.addEventListener('pointerdown', event => {
  if (desktopNavigation.matches && !header.contains(event.target)) toggleProducts(false);
});
let headerFrame = 0;
window.addEventListener('scroll', () => {
  if (headerFrame) return;
  headerFrame = requestAnimationFrame(() => {
    header.classList.toggle('is-scrolled', scrollY > 8);
    headerFrame = 0;
  });
}, { passive: true });
header.classList.toggle('is-scrolled', scrollY > 8);
const navigationSections = document.querySelectorAll('main section[id], #contacts');
// A reading band keeps navigation aligned with the current section.
const activeSectionObserver = new IntersectionObserver(entries => {
  const current = entries.find(entry => entry.isIntersecting);
  if (!current) return;
  navigation.querySelectorAll('[aria-current]').forEach(link => link.removeAttribute('aria-current'));
  const target = current.target.id === 'products' ? productTrigger : navigation.querySelector(`a[href="#${current.target.id}"]`);
  target?.setAttribute('aria-current', 'true');
}, { rootMargin: '-80px 0px -65% 0px' });
navigationSections.forEach(section => activeSectionObserver.observe(section));

// Native dialogs: Escape and focus restoration stay with the browser.
function openDialog(id) {
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  document.getElementById(id).showModal();
}
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
});
document.querySelectorAll('[data-inquiry]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    closeMenu();
    document.getElementById('request').focus({ preventScroll: true });
  });
});
document.querySelectorAll('[data-documents]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    if (menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menuButton.focus({ preventScroll: true });
    }
    openDialog('documents');
  });
});

// Product filtering and a restrained pointer response.
document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(item => {
      const selected = item.dataset.filter === button.dataset.filter;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('[data-category]').forEach(card => {
      card.hidden = button.dataset.filter !== 'all' &&
        !card.dataset.category.split(' ').includes(button.dataset.filter);
    });
  });
});
document.querySelectorAll('[data-product]').forEach(button => {
  function setHoverOrigin(event) {
    const bounds = button.getBoundingClientRect();
    const x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
    const y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
    button.style.setProperty('--hover-x', `${x}px`);
    button.style.setProperty('--hover-y', `${y}px`);
  }
  button.addEventListener('pointerenter', setHoverOrigin);
  button.addEventListener('pointerleave', setHoverOrigin);
  button.addEventListener('focus', () => {
    if (!button.matches(':focus-visible')) return;
    button.style.setProperty('--hover-x', '50%');
    button.style.setProperty('--hover-y', '50%');
  });
  button.addEventListener('click', () => {
    const image = button.querySelector('img');
    const target = document.querySelector('#product-dialog > img');
    target.src = image.src;
    target.alt = image.alt;
    const card = button.closest('.product');
    document.querySelector('#product-dialog h2').textContent = card.querySelector('h3').textContent;
    document.querySelector('#product-dialog p').textContent = card.querySelector('p').textContent;
    openDialog('product-dialog');
  });
});

// Gallery: one scroll position for pointer dragging, arrows and keyboard.
const gallery = document.querySelector('.gallery');
let drag = null;
let suppressGalleryClick = false;
function updateGalleryControls() {
  const maximum = gallery.scrollWidth - gallery.clientWidth;
  document.querySelector('[data-gallery="-1"]').disabled = gallery.scrollLeft <= 1;
  document.querySelector('[data-gallery="1"]').disabled = gallery.scrollLeft >= maximum - 1;
}
gallery.addEventListener('scroll', updateGalleryControls, { passive: true });
new ResizeObserver(updateGalleryControls).observe(gallery);
updateGalleryControls();
const galleryStep = () => gallery.querySelector('button').offsetWidth +
  Number.parseFloat(getComputedStyle(gallery).gap);
function moveGallery(direction) {
  gallery.scrollBy({ left: direction * galleryStep(), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
document.querySelectorAll('[data-gallery]').forEach(button => {
  button.addEventListener('click', () => moveGallery(Number(button.dataset.gallery)));
});
gallery.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    moveGallery(event.key === 'ArrowLeft' ? -1 : 1);
  }
});
gallery.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, scroll: gallery.scrollLeft, moved: false };
  suppressGalleryClick = false;
});
gallery.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.moved && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
    drag = null;
    return;
  }
  if (!drag.moved && Math.abs(dx) > 7) {
    drag.moved = true;
    gallery.setPointerCapture(event.pointerId);
    gallery.classList.add('is-dragging');
  }
  if (drag.moved) {
    event.preventDefault();
    gallery.scrollLeft = drag.scroll - dx;
  }
}, { passive: false });
function finishDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  suppressGalleryClick = drag.moved;
  if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
  gallery.classList.remove('is-dragging');
  drag = null;
  // A following click belongs to the drag and must not open a photo.
  setTimeout(() => { suppressGalleryClick = false; }, 0);
}
gallery.addEventListener('pointerup', finishDrag);
gallery.addEventListener('pointercancel', finishDrag);
gallery.addEventListener('click', event => {
  if (suppressGalleryClick) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
document.querySelectorAll('[data-photo]').forEach(button => {
  button.addEventListener('click', () => {
    const target = document.querySelector('#lightbox > img');
    target.src = button.dataset.photo;
    target.alt = button.querySelector('img').alt;
    openDialog('lightbox');
  });
});
document.querySelectorAll('[data-gallery-open]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    gallery.querySelector('[data-photo]').click();
  });
});

// Media pause when hidden, off screen, manually paused, or motion is reduced.
const video = document.querySelector('.hero-video');
const videoButton = document.querySelector('[data-video-toggle]');
let videoVisible = true;
let videoUserPaused = false;
function updateVideo() {
  const paused = videoUserPaused || !videoVisible || document.hidden || reducedMotion.matches;
  if (paused) video.pause();
  else video.play().catch(() => { /* The poster remains visible if autoplay is unavailable. */ });
  setMediaIcon(videoButton, videoUserPaused || reducedMotion.matches);
  const playbackPaused = videoUserPaused || reducedMotion.matches;
  videoButton.setAttribute('aria-label', playbackPaused ? 'Воспроизвести видео' : 'Поставить видео на паузу');
  videoButton.querySelector('span').textContent = playbackPaused ? 'Воспроизвести видео' : 'Поставить на паузу';
}
videoButton.addEventListener('click', () => {
  videoUserPaused = !videoUserPaused;
  updateVideo();
});
const processImage = document.querySelector('#process-image');
const processButton = document.querySelector('.process-pause');
let processVisible = false;
let processUserPaused = false;
function updateProcessMotion() {
  syncProcessTheme();
  let svg;
  try { svg = processImage.getSVGDocument()?.documentElement; } catch { return; }
  if (!svg) return;
  const paused = processUserPaused || !processVisible || reducedMotion.matches || document.hidden;
  if (paused) svg.pauseAnimations?.();
  else svg.unpauseAnimations?.();
  setMediaIcon(processButton, processUserPaused || reducedMotion.matches);
  processButton.querySelector('span').textContent = processUserPaused || reducedMotion.matches ? 'Воспроизвести анимацию' : 'Остановить анимацию';
}
processImage.addEventListener('load', updateProcessMotion);
processButton.addEventListener('click', () => {
  processUserPaused = !processUserPaused;
  updateProcessMotion();
});
const processes = [
  { title: 'Продольная порезка', description: 'Подготовка металла под нужный типоразмер.', image: '01-slitting-v2.svg' },
  { title: 'Намотка', description: 'Намотка стальной ленты.', image: '02-winding-v2.svg' },
  { title: 'Обработка', description: 'Обработка поверхности металла.', image: '03-dip-treatment-v2.svg' }
];
document.querySelectorAll('[data-process]').forEach(button => {
  button.addEventListener('click', () => {
    const process = processes[Number(button.dataset.process)];
    document.querySelector('#process-title').textContent = process.title;
    document.querySelector('.process-description').textContent = process.description;
    processImage.data = `assets/${process.image}`;
    processImage.setAttribute('aria-label', `Схема процесса: ${process.title}`);
    document.querySelectorAll('[data-process]').forEach(item => {
      item.classList.toggle('selected', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
  });
});
const mediaObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.target === video) { videoVisible = entry.isIntersecting; updateVideo(); }
    else { processVisible = entry.isIntersecting; updateProcessMotion(); }
  });
}, { threshold: 0.05 });
mediaObserver.observe(video);
mediaObserver.observe(processImage);
document.addEventListener('visibilitychange', () => { updateVideo(); updateProcessMotion(); });
reducedMotion.addEventListener('change', () => { updateVideo(); updateProcessMotion(); });
updateVideo();

// Masked typography, photo wipes and spatial card sequences. Native scroll stays intact.
const entranceAnimations = new Set();
const pendingEntrances = new Set();
function runEntrance(element, frames, options) {
  const animation = element.animate(frames, { easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards', ...options });
  entranceAnimations.add(animation);
  animation.finished.then(() => entranceAnimations.delete(animation)).catch(() => entranceAnimations.delete(animation));
}
function prepareHeading(heading) {
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(word => {
      if (!word || /^\s+$/.test(word)) {
        fragment.append(document.createTextNode(word));
        return;
      }
      const mask = document.createElement('span');
      const inner = document.createElement('span');
      mask.className = 'reveal-word';
      inner.className = 'reveal-word-inner';
      inner.textContent = word;
      mask.append(inner);
      fragment.append(mask);
    });
    node.replaceWith(fragment);
  });
}
function reveal(element, kind, delay = 0) {
  element.classList.remove('motion-pending');
  pendingEntrances.delete(element);
  if (reducedMotion.matches) return;
  if (kind === 'heading') {
    let lastTop = -Infinity;
    let line = -1;
    let wordInLine = 0;
    element.querySelectorAll('.reveal-word-inner').forEach(word => {
      const top = Math.round(word.getBoundingClientRect().top);
      if (Math.abs(top - lastTop) > 4) { line++; wordInLine = 0; lastTop = top; }
      runEntrance(word, [
        { transform: 'translateY(100%)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 }
      ], { duration: 780, delay: delay + line * 80 + Math.min(wordInLine++ * 16, 80) });
    });
    return;
  }
  if (kind === 'media') {
    runEntrance(element, [
      { clipPath: 'inset(0 0 32% 0 round 22px)', transform: 'translateY(18px)', opacity: 0 },
      { clipPath: 'inset(0 round 22px)', transform: 'translateY(0)', opacity: 1 }
    ], { duration: 850, delay });
    const image = element.querySelector('img,video');
    if (image) runEntrance(image, [{ transform: 'scale(1.045)' }, { transform: 'scale(1)' }], { duration: 1000, delay });
    return;
  }
  runEntrance(element, [
    { opacity: 0, transform: `translateY(${kind === 'card' ? 26 : 18}px)` },
    { opacity: 1, transform: 'translateY(0)' }
  ], { duration: kind === 'card' ? 720 : 620, delay });
  if (element.matches('.fact')) element.querySelectorAll('.tiles i').forEach((tile, index) => {
    runEntrance(tile, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 700, delay: delay + 320 + index * 80 });
  });
}
const entranceObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    reveal(entry.target, entry.target.dataset.motion, Number(entry.target.dataset.revealDelay || 0));
    entranceObserver.unobserve(entry.target);
  });
}, { threshold: 0.08, rootMargin: '0px 0px -56px 0px' });
if (!reducedMotion.matches) {
  document.querySelectorAll('h1, main h2').forEach(prepareHeading);
  const targets = document.querySelectorAll('h1, main h2, .hero-description, .hero-bottom, .fact, .product, .gallery > button, .process, .benefit-grid article, .order-list li, .case, .director-photo, .director-copy > p, .director-signature, .review-grid figure, .news-picture, .news article > h3, .news article > .eyebrow, .faq details, .request-copy > p, .request-contacts, .inquiry-form > label, .inquiry-form > .button');
  targets.forEach(element => {
    element.dataset.motion = element.matches('h1,h2') ? 'heading'
      : element.matches('.hero-picture,.director-photo,.news-picture,.gallery > button') ? 'media'
      : element.matches('.fact,.product,.review-grid figure,.benefit-grid article') ? 'card' : 'content';
    element.classList.add('motion-pending');
    pendingEntrances.add(element);
    entranceObserver.observe(element);
  });
  document.querySelectorAll('.fact-grid,.product-grid,.benefit-grid,.review-grid,.faq-list,.inquiry-form').forEach(group => {
    [...group.children].forEach((element, index) => {
      element.dataset.revealDelay = String(Math.min(index % (group.matches('.faq-list') ? 5 : 3), 3) * 65);
    });
  });
}
document.addEventListener('focusin', event => {
  const pending = event.target.closest('.motion-pending');
  if (!pending) return;
  pending.classList.remove('motion-pending');
  pendingEntrances.delete(pending);
  entranceObserver.unobserve(pending);
});
reducedMotion.addEventListener('change', () => {
  if (!reducedMotion.matches) return;
  entranceAnimations.forEach(animation => animation.finish());
  pendingEntrances.forEach(element => element.classList.remove('motion-pending'));
  pendingEntrances.clear();
  entranceObserver.disconnect();
});

// The blue track represents actual document progress. No scroll interception.
const orderList = document.querySelector('.order-list');
const stages = [...orderList.querySelectorAll('li')];
let orderInView = false;
let scrollFrame = 0;
function updateOrderProgress() {
  scrollFrame = 0;
  if (!orderInView) return;
  const bounds = orderList.getBoundingClientRect();
  const readingLine = innerHeight * 0.64;
  const progress = Math.max(0, Math.min(1, (readingLine - bounds.top) / bounds.height));
  orderList.style.setProperty('--order-progress', String(progress));
  let current = -1;
  stages.forEach((stage, index) => {
    if (stage.getBoundingClientRect().top <= readingLine) current = index;
  });
  stages.forEach((stage, index) => stage.classList.toggle('is-current', index === current));
}
function requestOrderFrame() {
  if (orderInView && !scrollFrame) scrollFrame = requestAnimationFrame(updateOrderProgress);
}
new IntersectionObserver(entries => {
  orderInView = entries[0].isIntersecting;
  if (orderInView) updateOrderProgress();
  else {
    const bounds = orderList.getBoundingClientRect();
    orderList.style.setProperty('--order-progress', bounds.bottom < 0 ? '1' : '0');
  }
}).observe(orderList);
window.addEventListener('scroll', requestOrderFrame, { passive: true });
window.addEventListener('resize', requestOrderFrame, { passive: true });

// Details preserve native keyboard semantics and animate the content height.
document.querySelectorAll('.case,.faq details').forEach(details => {
  const summary = details.querySelector('summary');
  let animation = null;
  let expanding = details.open;
  details.addEventListener('toggle', () => { if (!animation) expanding = details.open; });
  summary.addEventListener('click', event => {
    if (reducedMotion.matches) return;
    event.preventDefault();
    const start = details.getBoundingClientRect().height;
    animation?.cancel();
    expanding = !expanding;
    if (expanding) details.open = true;
    const end = expanding ? details.scrollHeight : summary.getBoundingClientRect().height + 1;
    details.style.overflow = 'hidden';
    animation = details.animate({ height: [`${start}px`, `${end}px`] }, { duration: 360, easing: 'cubic-bezier(.2,.7,.2,1)' });
    animation.onfinish = () => {
      details.open = expanding;
      details.style.overflow = '';
      animation = null;
    };
  });
});

// Demo articles and email drafts. No simulated server submission.
const articles = [
  // These are explicitly marked editorial drafts in the cards and dialog.
  { title: 'Что указать в запросе на стальную ленту', text: 'Укажите требуемую толщину, ширину, объём и назначение ленты. Если есть спецификация, приложите её к запросу. Возможность изготовления и условия закупки подтверждаются после технического согласования. Это демонстрационный материал для будущей публикации.' },
  { title: 'Как согласовать несколько позиций в одной поставке', text: 'Соберите перечень продукции и характеристики в одном запросе. Отдельно укажите объём по каждой позиции и желаемые условия отгрузки. Состав партии, сроки и документы согласовываются при оформлении заказа. Это демонстрационный материал для будущей публикации.' },
  { title: 'Мы обновили сайт!', text: 'Мы готовим новый сайт Магнитогорского завода металлообработки. В каталоге можно выбрать направление продукции, посмотреть производство и документы, а затем обсудить поставку с заводом. Это проект публикации; текст будет уточнён перед запуском сайта.' }
];
document.querySelectorAll('[data-news-all]').forEach(button => button.addEventListener('click', () => openDialog('news-archive')));
document.querySelectorAll('[data-article]').forEach(button => {
  button.addEventListener('click', () => {
    const article = articles[Number(button.dataset.article)];
    document.querySelector('#article-dialog h2').textContent = article.title;
    document.querySelector('#article-dialog p').textContent = article.text;
    openDialog('article-dialog');
  });
});
document.querySelectorAll('.inquiry-form').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const body = `Имя: ${data.get('name')}\nКонтакт: ${data.get('contact')}\n\n${data.get('message') || ''}`;
    const mailto = `mailto:oomzm@yandex.ru?subject=${encodeURIComponent('Запрос металлопродукции')}&body=${encodeURIComponent(body)}`;
    form.querySelector('.form-status').textContent = 'Открываем почтовую программу. Отправьте подготовленное письмо, чтобы передать запрос.';
    window.location.href = mailto;
  });
});

// Decorative background shares the same visibility and reduced-motion policy.
const backgroundVideos = [...document.querySelectorAll('.background-video')];
const visibleBackgrounds = new Set();
function updateBackgroundVideos() {
  backgroundVideos.forEach(media => {
    if (reducedMotion.matches || document.hidden || !visibleBackgrounds.has(media)) media.pause();
    else media.play().catch(() => {});
  });
}
const backgroundObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) visibleBackgrounds.add(entry.target);
    else visibleBackgrounds.delete(entry.target);
  });
  updateBackgroundVideos();
});
backgroundVideos.forEach(media => backgroundObserver.observe(media));
reducedMotion.addEventListener('change', updateBackgroundVideos);
document.addEventListener('visibilitychange', updateBackgroundVideos);
updateBackgroundVideos();

document.querySelectorAll('.nav-dropdown button').forEach(button => {
  button.addEventListener('click', () => {
    closeMenu();
    document.querySelector('#products').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  });
});
document.querySelectorAll('[data-catalog-all]').forEach(button => button.addEventListener('click', () => {
  document.querySelector('.filters [data-filter="all"]').click();
  closeMenu();
}));
