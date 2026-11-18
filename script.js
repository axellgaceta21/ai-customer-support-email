(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.primary-nav');
  const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function closeMenu() {
    nav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
  }
  menuButton.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  navLinks.forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', event => {
    if (nav.classList.contains('is-open') && !nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });

  if ('IntersectionObserver' in window) {
    const observed = navLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => {
          const active = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-18% 0px -65% 0px' });
    observed.forEach(section => sectionObserver.observe(section));
  }

  const carousel = document.querySelector('.carousel');
  const slides = [...carousel.querySelectorAll('.carousel-slide')];
  const dots = [...carousel.querySelectorAll('.carousel-dots button')];
  const status = carousel.querySelector('.carousel-status');
  let slideIndex = 0;
  function showSlide(index) {
    slideIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.hidden = i !== slideIndex;
      slide.classList.toggle('is-active', i === slideIndex);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === slideIndex);
      if (i === slideIndex) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    status.textContent = `${String(slideIndex + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  }
  carousel.querySelector('.carousel-prev').addEventListener('click', () => showSlide(slideIndex - 1));
  carousel.querySelector('.carousel-next').addEventListener('click', () => showSlide(slideIndex + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => showSlide(i)));
  carousel.addEventListener('keydown', event => {
    if (document.querySelector('.lightbox:not([hidden])')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); showSlide(slideIndex + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); showSlide(slideIndex - 1); }
  });
  let swipeX = null;
  carousel.addEventListener('touchstart', event => { if (event.touches.length === 1) swipeX = event.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', event => {
    if (swipeX === null || !event.changedTouches.length) return;
    const delta = event.changedTouches[0].clientX - swipeX;
    if (Math.abs(delta) > 45) showSlide(slideIndex + (delta < 0 ? 1 : -1));
    swipeX = null;
  }, { passive: true });

  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const viewport = document.getElementById('lightbox-scroll');
  const imageWrap = lightbox.querySelector('.lightbox-image-wrap');
  const zoomLabel = document.getElementById('zoom-level');
  const closeButton = lightbox.querySelector('.lightbox-close');
  let previousFocus = null;
  let scale = 1;
  let fit = true;
  let dragging = null;

  function fitScale() {
    if (!lightboxImage.naturalWidth || !lightboxImage.naturalHeight) return 1;
    return Math.min(1, (viewport.clientWidth - 24) / lightboxImage.naturalWidth, (viewport.clientHeight - 24) / lightboxImage.naturalHeight);
  }
  function imagePointAtViewportCenter() {
    const width = lightboxImage.clientWidth || 1;
    const height = lightboxImage.clientHeight || 1;
    const offsetX = Math.max(0, (imageWrap.clientWidth - width) / 2);
    const offsetY = Math.max(0, (imageWrap.clientHeight - height) / 2);
    return {
      x: Math.max(0, Math.min(1, (viewport.scrollLeft + viewport.clientWidth / 2 - offsetX) / width)),
      y: Math.max(0, Math.min(1, (viewport.scrollTop + viewport.clientHeight / 2 - offsetY) / height))
    };
  }
  function renderScale(point = null) {
    if (!lightboxImage.naturalWidth) return;
    const usedScale = fit ? fitScale() : scale;
    const width = Math.max(1, Math.round(lightboxImage.naturalWidth * usedScale));
    const height = Math.max(1, Math.round(lightboxImage.naturalHeight * usedScale));
    lightboxImage.style.width = `${width}px`;
    lightboxImage.style.height = `${height}px`;
    imageWrap.style.width = `${Math.max(viewport.clientWidth, width)}px`;
    imageWrap.style.height = `${Math.max(viewport.clientHeight, height)}px`;
    zoomLabel.textContent = `${Math.round(usedScale * 100)}%`;
    if (point) {
      const offsetX = Math.max(0, (imageWrap.clientWidth - width) / 2);
      const offsetY = Math.max(0, (imageWrap.clientHeight - height) / 2);
      viewport.scrollLeft = offsetX + point.x * width - viewport.clientWidth / 2;
      viewport.scrollTop = offsetY + point.y * height - viewport.clientHeight / 2;
    } else {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }
  }
  function openViewer(button) {
    previousFocus = button;
    fit = true;
    scale = 1;
    lightboxCaption.textContent = button.dataset.caption || button.querySelector('img')?.alt || 'Project screenshot';
    lightboxImage.alt = lightboxCaption.textContent;
    lightbox.hidden = false;
    document.body.classList.add('viewer-open');
    lightboxImage.onload = () => renderScale();
    lightboxImage.src = button.dataset.image;
    if (lightboxImage.complete && lightboxImage.naturalWidth) renderScale();
    closeButton.focus();
  }
  function closeViewer() {
    lightbox.hidden = true;
    document.body.classList.remove('viewer-open');
    lightboxImage.removeAttribute('src');
    lightboxImage.onload = null;
    dragging = null;
    viewport.classList.remove('is-dragging');
    previousFocus?.focus();
  }
  document.querySelectorAll('.image-open').forEach(button => button.addEventListener('click', () => openViewer(button)));
  lightbox.addEventListener('click', event => {
    const action = event.target.closest('[data-lightbox-action]')?.dataset.lightboxAction;
    if (!action) return;
    if (action === 'close') closeViewer();
    else if (action === 'fit' || action === 'reset') { fit = true; scale = 1; renderScale(); }
    else if (action === 'actual') { const point = imagePointAtViewportCenter(); fit = false; scale = 1; renderScale(point); }
    else if (action === 'zoom-in' || action === 'zoom-out') {
      const point = imagePointAtViewportCenter();
      scale = Math.max(.25, Math.min(3, (fit ? fitScale() : scale) + (action === 'zoom-in' ? .25 : -.25)));
      fit = false;
      renderScale(point);
    }
  });
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeViewer(); return; }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); lightbox.querySelector('[data-lightbox-action="zoom-in"]').click(); }
    if (event.key === '-') { event.preventDefault(); lightbox.querySelector('[data-lightbox-action="zoom-out"]').click(); }
    if (event.key === '0') { event.preventDefault(); lightbox.querySelector('[data-lightbox-action="actual"]').click(); }
    if (event.key === 'Tab') {
      const controls = [...lightbox.querySelectorAll('button')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('resize', () => { if (!lightbox.hidden) renderScale(fit ? null : imagePointAtViewportCenter()); });

  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    dragging = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove', event => {
    if (!dragging) return;
    viewport.scrollLeft = dragging.left - (event.clientX - dragging.x);
    viewport.scrollTop = dragging.top - (event.clientY - dragging.y);
  });
  function stopDrag() { dragging = null; viewport.classList.remove('is-dragging'); }
  viewport.addEventListener('pointerup', stopDrag);
  viewport.addEventListener('pointercancel', stopDrag);
  viewport.addEventListener('lostpointercapture', stopDrag);

  let pinch = null;
  const touchDistance = touches => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  viewport.addEventListener('touchstart', event => {
    if (event.touches.length === 2) pinch = { distance: touchDistance(event.touches), scale: fit ? fitScale() : scale, point: imagePointAtViewportCenter() };
  }, { passive: true });
  viewport.addEventListener('touchmove', event => {
    if (!pinch || event.touches.length !== 2) return;
    event.preventDefault();
    scale = Math.max(.25, Math.min(3, pinch.scale * touchDistance(event.touches) / pinch.distance));
    fit = false;
    renderScale(pinch.point);
  }, { passive: false });
  viewport.addEventListener('touchend', event => { if (event.touches.length < 2) pinch = null; }, { passive: true });

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const revealItems = document.querySelectorAll('.section-heading, .overview-card, .stage, .safety-intro, .safety-list, .video-card, .tech-grid article');
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: .06 });
    revealItems.forEach(item => { item.classList.add('reveal-ready'); revealObserver.observe(item); });
  }

})();
