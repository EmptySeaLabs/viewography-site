// Viewography site interactions. Everything here is an enhancement: the page reads fine without this file.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const canObserve = 'IntersectionObserver' in window;

  // Header: condense after the first scroll and mark the section on screen.
  const setScrolled = () => document.documentElement.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', setScrolled, { passive: true });
  setScrolled();

  const navLinks = $$('.site-header nav a[href^="#"]');
  const sections = navLinks.map((link) => $(link.getAttribute('href'))).filter(Boolean);
  if (canObserve && sections.length) {
    const onScreen = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? onScreen.add(entry.target) : onScreen.delete(entry.target)));
      const current = sections.find((section) => onScreen.has(section));
      navLinks.forEach((link) => {
        if (current && link.getAttribute('href') === '#' + current.id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((section) => observer.observe(section));
  }

  // Sections ease in as they arrive.
  const revealTargets = $$('.promise-strip span, .section-intro, .numbered-step, .control-note, .planner-demo, .scenario, .app-heading, .tour, .privacy-strip > *, .faq-list details, .final-cta');
  if (canObserve && !reduced) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach((target) => {
      const siblings = [...target.parentElement.children].filter((child) => revealTargets.includes(child));
      target.style.setProperty('--d', Math.min(siblings.indexOf(target), 5) * 0.07 + 's');
      target.classList.add('reveal');
      observer.observe(target);
    });
  }

  // Hero: step the illustrative plan through three months.
  const plan = $('[data-plan]');
  if (plan) {
    const months = [
      { total: ['2 of 3', ' services this month.'], rows: [
        ['Finish your current show', 'Keep this service while you catch up.', 'keep', 'Keep'],
        ['A quiet month ahead?', 'Pause before the next renewal.', 'pause', 'Pause'],
        ['Your next season is ready', 'Come back with more to watch.', 'resume', 'Resume'] ] },
      { total: ['1 of 3', ' services next month.'], rows: [
        ['Season finished', 'Nothing new for a while. Pause before it renews.', 'pause', 'Pause'],
        ['Still quiet', 'Stay paused. Your saved shows will wait.', 'pause', 'Paused'],
        ['New episodes every week', 'Keep it while the season airs.', 'keep', 'Keep'] ] },
      { total: ['2 of 3', ' services the month after.'], rows: [
        ['Next season is months away', 'Stay paused until there’s more to watch.', 'pause', 'Paused'],
        ['Two saved shows are back', 'Resume with a full month to watch.', 'resume', 'Resume'],
        ['Finale week', 'Keep it through the last episode.', 'keep', 'Keep'] ] }
    ];
    const buttons = $$('.plan-months button', plan);
    const rows = $$('.plan-row', plan);
    const total = $('.plan-total', plan);
    let timer = 0;
    const show = (index, announce) => {
      buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      total.setAttribute('aria-live', announce ? 'polite' : 'off');
      $('strong', total).textContent = months[index].total[0];
      total.lastChild.textContent = months[index].total[1];
      rows.forEach((row, i) => {
        const [title, detail, tone, label] = months[index].rows[i];
        $('strong', row).textContent = title;
        $('p', row).textContent = detail;
        const status = $('.status', row);
        status.className = 'status ' + tone;
        status.textContent = label;
        row.classList.remove('swap');
        row.style.setProperty('--d', i * 0.06 + 's');
        void row.offsetWidth;
        row.classList.add('swap');
      });
    };
    const stop = () => { clearInterval(timer); timer = 0; };
    buttons.forEach((button, index) => button.addEventListener('click', () => { stop(); show(index, true); }));
    $('.plan-months', plan).hidden = false;
    total.hidden = false;
    // Play through once so the idea lands, then leave it to the reader.
    if (canObserve && !reduced) {
      let step = 0;
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting || timer) return;
        observer.disconnect();
        timer = setInterval(() => {
          step += 1;
          if (step > months.length) return stop();
          show(step % months.length, false);
        }, 3200);
      }, { threshold: 0.6 });
      observer.observe(plan);
      ['pointerdown', 'focusin'].forEach((type) => plan.addEventListener(type, stop, { once: true }));
    }
  }

  // The math: one service, paused through its quiet months.
  const gap = $('[data-gap]');
  if (gap) {
    const price = $('#gap-price', gap);
    const quiet = $('#gap-months', gap);
    const update = () => {
      $('#gap-price-out', gap).textContent = '$' + price.value;
      $('#gap-months-out', gap).textContent = quiet.value;
      $('#gap-total', gap).textContent = '$' + price.value * quiet.value;
    };
    price.addEventListener('input', update);
    quiet.addEventListener('input', update);
    update();
    gap.hidden = false;
  }

  // App tour: the list drives the screens, and swiping the screens drives the list.
  const tour = $('[data-tour]');
  if (tour) {
    const strip = $('.tour-strip', tour);
    const slides = $$('.tour-slide', strip);
    const links = $$('.tour-link', tour);
    const arrows = $$('.tour-arrow', tour);
    const count = $('.tour-count', tour);
    const swipes = matchMedia('(max-width: 760px)');
    let current = 0;
    const offset = (slide) => slide.offsetLeft - slides[0].offsetLeft;
    const mark = (index) => {
      if (index === current) return;
      current = index;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-current', i === index);
        if (Math.abs(i - index) < 2) $('img', slide).loading = 'eager';
      });
      links.forEach((link, i) => (i === index ? link.setAttribute('aria-current', 'true') : link.removeAttribute('aria-current')));
      count.textContent = index + 1 + ' / ' + slides.length;
      arrows[0].disabled = index === 0;
      arrows[1].disabled = index === slides.length - 1;
    };
    const go = (index) => {
      const target = Math.max(0, Math.min(slides.length - 1, index));
      if (swipes.matches) strip.scrollTo({ left: offset(slides[target]), behavior: reduced ? 'auto' : 'smooth' });
      mark(target);
    };
    links.forEach((link, index) => link.addEventListener('click', (event) => { event.preventDefault(); go(index); }));
    arrows.forEach((arrow) => arrow.addEventListener('click', () => go(current + Number(arrow.dataset.dir))));
    let settle = 0;
    strip.addEventListener('scroll', () => {
      if (!swipes.matches) return;
      clearTimeout(settle);
      settle = setTimeout(() => {
        const nearest = slides.reduce((best, slide, i) => (Math.abs(offset(slide) - strip.scrollLeft) < Math.abs(offset(slides[best]) - strip.scrollLeft) ? i : best), 0);
        mark(nearest);
      }, 90);
    }, { passive: true });
    strip.addEventListener('keydown', (event) => {
      if (swipes.matches || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      go(current + (event.key === 'ArrowRight' ? 1 : -1));
    });
    // Phones swipe a strip; wider screens fade between stacked screens. Keep the place when the layout changes.
    swipes.addEventListener('change', () => strip.scrollTo({ left: swipes.matches ? offset(slides[current]) : 0, behavior: 'auto' }));
    slides[0].classList.add('is-current');
    arrows[0].disabled = true;
    $('.tour-controls', tour).hidden = false;
  }
})();
