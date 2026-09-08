/* ==========================================================================
   First Light Yoga - shared behavior
   Vanilla JS, no dependencies, no build step.

   Modules
     1.  Reduced motion helper
     2.  Mobile menu + dropdown navigation
     3.  Sticky header blur + back to top (IntersectionObserver, no scroll listeners)
     4.  Scroll dissolve reveals
     5.  Image blur-in on decode
     6.  Accordions
     7.  Form validation with inline messages
     8.  Pose library filter
     9.  Simple text filters (glossary, teacher directory)
     10. Sequence player with per-pose hold timers
     11. Breath pacing indicator
     12. Cookie consent (no non-essential cookies before consent)
     13. Footer year
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------------------------------------------------------------------
     1. Reduced motion
     --------------------------------------------------------------------- */
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function prefersReducedMotion() { return motionQuery.matches; }

  /* ---------------------------------------------------------------------
     2. Navigation
     --------------------------------------------------------------------- */
  function initNav() {
    var toggle   = $('.nav-toggle');
    var nav      = $('#site-nav');
    var backdrop = $('.nav-backdrop');
    if (!toggle || !nav) { return; }

    function isDesktop() { return window.matchMedia('(min-width: 1024px)').matches; }

    function setMenu(open) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      if (backdrop) { backdrop.classList.toggle('is-open', open); }
      document.body.style.overflow = open && !isDesktop() ? 'hidden' : '';
      toggle.querySelector('.nav-toggle-text').textContent = open ? 'Close' : 'Menu';
    }

    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });

    if (backdrop) { backdrop.addEventListener('click', function () { setMenu(false); }); }

    /* Dropdowns: click to open on every viewport, hover assists on desktop. */
    var groups = $$('.has-dropdown');
    function closeGroups(except) {
      groups.forEach(function (g) {
        if (g === except) { return; }
        g.classList.remove('is-open');
        var t = $('.dropdown-toggle', g);
        if (t) { t.setAttribute('aria-expanded', 'false'); }
      });
    }

    groups.forEach(function (group) {
      var trigger = $('.dropdown-toggle', group);
      if (!trigger) { return; }
      trigger.addEventListener('click', function (event) {
        event.stopPropagation();
        var open = !group.classList.contains('is-open');
        closeGroups(group);
        group.classList.toggle('is-open', open);
        trigger.setAttribute('aria-expanded', String(open));
      });
      group.addEventListener('mouseenter', function () {
        if (!isDesktop()) { return; }
        closeGroups(group);
        group.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      });
      group.addEventListener('mouseleave', function () {
        if (!isDesktop()) { return; }
        group.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', function (event) {
      if (!event.target.closest('.has-dropdown')) { closeGroups(null); }
      if (!isDesktop() && nav.classList.contains('is-open') &&
          !event.target.closest('#site-nav') && !event.target.closest('.nav-toggle')) {
        setMenu(false);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') { return; }
      closeGroups(null);
      if (toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });

    /* Keep body scroll unlocked when the layout grows past the mobile panel. */
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (event) {
      if (event.matches) {
        nav.classList.remove('is-open');
        if (backdrop) { backdrop.classList.remove('is-open'); }
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ---------------------------------------------------------------------
     3. Sticky header blur + back to top
     Sentinels avoid per-frame scroll handlers entirely.
     --------------------------------------------------------------------- */
  function initScrollState() {
    var header = $('.site-header');
    var toTop  = $('.to-top');
    if (!('IntersectionObserver' in window)) { return; }

    function makeSentinel(height) {
      var el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'position:absolute;top:0;left:0;width:1px;pointer-events:none;height:' + height;
      document.body.insertBefore(el, document.body.firstChild);
      return el;
    }

    if (header) {
      var headerSentinel = makeSentinel('8px');
      var headerObserverRan = false;
      new IntersectionObserver(function (entries) {
        headerObserverRan = true;
        header.classList.toggle('is-stuck', !entries[0].isIntersecting);
      }).observe(headerSentinel);

      /* If the observer never reports, keep the blurred backing on
         permanently so page text never scrolls under bare nav links. */
      window.setTimeout(function () {
        if (!headerObserverRan) { header.classList.add('is-stuck'); }
      }, 1500);
    }

    if (toTop) {
      var topSentinel = makeSentinel('90vh');
      new IntersectionObserver(function (entries) {
        toTop.classList.toggle('is-visible', !entries[0].isIntersecting);
      }).observe(topSentinel);

      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        var skip = $('.skip-link');
        if (skip) { skip.focus({ preventScroll: true }); }
      });
    }
  }

  /* ---------------------------------------------------------------------
     4. Scroll dissolve
     Sections fade and un-blur as they arrive. Content is visible without JS.
     --------------------------------------------------------------------- */
  function initReveals() {
    var items = $$('.dissolve');
    if (!items.length) { return; }

    function revealAll() {
      items.forEach(function (el) { el.classList.add('is-in'); });
    }

    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      revealAll();
      return;
    }

    /* Anything already on screen is revealed straight away rather than
       waiting on an observer callback, so above-the-fold content is never
       held back by the animation. */
    var pending = [];
    items.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 200) { el.classList.add('is-in'); }
      else { pending.push(el); }
    });
    if (!pending.length) { return; }

    var observerRan = false;
    var io = new IntersectionObserver(function (entries) {
      observerRan = true;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    pending.forEach(function (el) { io.observe(el); });

    /* Safety net. If the observer never reports at all, which happens in
       some headless renderers and crawlers, show everything rather than
       leaving sections blank. */
    window.setTimeout(function () {
      if (!observerRan) { io.disconnect(); revealAll(); }
    }, 1500);
  }

  /* ---------------------------------------------------------------------
     5. Images blur in once they have decoded
     --------------------------------------------------------------------- */
  function initImages() {
    $$('img.blur-in').forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('is-loaded');
        return;
      }
      img.addEventListener('load', function () { img.classList.add('is-loaded'); }, { once: true });
      img.addEventListener('error', function () { img.classList.add('is-loaded'); }, { once: true });
    });
  }

  /* ---------------------------------------------------------------------
     6. Accordions
     --------------------------------------------------------------------- */
  function initAccordions() {
    $$('.acc-trigger').forEach(function (trigger) {
      var panel = document.getElementById(trigger.getAttribute('aria-controls'));
      if (!panel) { return; }
      trigger.addEventListener('click', function () {
        var open = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!open));
        panel.classList.toggle('is-open', !open);
        panel.hidden = false;
      });
    });
  }

  /* ---------------------------------------------------------------------
     7. Form validation
     Rules live in markup: data-rule="required", "email", "min:20", "checked"
     --------------------------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

  function fieldError(input) {
    var rules = (input.getAttribute('data-rule') || '').split('|');
    var value = input.type === 'checkbox' ? input.checked : String(input.value || '').trim();

    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule === 'required' && !value) {
        return input.getAttribute('data-msg-required') || 'This field is required.';
      }
      if (rule === 'checked' && !value) {
        return input.getAttribute('data-msg-checked') || 'Please check this box to continue.';
      }
      if (rule === 'email' && value && !EMAIL_RE.test(value)) {
        return 'Enter an email address in the format name@example.com.';
      }
      if (rule.indexOf('min:') === 0 && value && value.length < parseInt(rule.slice(4), 10)) {
        return 'Please use at least ' + rule.slice(4) + ' characters so we can help properly.';
      }
    }
    return '';
  }

  function initForms() {
    $$('form[data-validate]').forEach(function (form) {
      var status = $('.form-status', form);
      var inputs = $$('[data-rule]', form);

      function validateField(input) {
        var wrap = input.closest('.field') || input.closest('.checkline-wrap') || input.parentElement;
        var msgEl = wrap ? $('.error-msg', wrap) : null;
        var message = fieldError(input);
        if (wrap) { wrap.classList.toggle('has-error', Boolean(message)); }
        if (msgEl) { msgEl.textContent = message; }
        input.setAttribute('aria-invalid', message ? 'true' : 'false');
        return !message;
      }

      inputs.forEach(function (input) {
        input.addEventListener('blur', function () { validateField(input); });
        input.addEventListener('input', function () {
          if (input.getAttribute('aria-invalid') === 'true') { validateField(input); }
        });
        input.addEventListener('change', function () {
          if (input.type === 'checkbox' || input.tagName === 'SELECT') { validateField(input); }
        });
      });

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var firstBad = null;
        inputs.forEach(function (input) {
          if (!validateField(input) && !firstBad) { firstBad = input; }
        });

        if (firstBad) {
          if (status) {
            status.hidden = false;
            status.classList.add('form-status--error');
            status.textContent = 'Please review the highlighted fields and try again.';
          }
          firstBad.focus();
          return;
        }

        if (status) {
          status.hidden = false;
          status.classList.remove('form-status--error');
          status.textContent = form.getAttribute('data-success') ||
            'Thank you. Your message has been received and we reply within two business days.';
        }
        form.reset();
        inputs.forEach(function (input) {
          input.setAttribute('aria-invalid', 'false');
          var wrap = input.closest('.field') || input.parentElement;
          if (wrap) { wrap.classList.remove('has-error'); }
          var msgEl = wrap ? $('.error-msg', wrap) : null;
          if (msgEl) { msgEl.textContent = ''; }
        });
      });
    });
  }

  /* ---------------------------------------------------------------------
     8. Pose library filter: difficulty, body area, prop, free text
     --------------------------------------------------------------------- */
  function initPoseFilter() {
    var list = $('#pose-list');
    if (!list) { return; }

    var items    = $$('.pose-item', list);
    var search   = $('#pose-search');
    var level    = $('#filter-level');
    var area     = $('#filter-area');
    var prop     = $('#filter-prop');
    var count    = $('#pose-count');
    var empty    = $('#pose-empty');
    var reset    = $('#filter-reset');

    function apply() {
      var q      = search ? search.value.trim().toLowerCase() : '';
      var vLevel = level ? level.value : '';
      var vArea  = area ? area.value : '';
      var vProp  = prop ? prop.value : '';
      var shown  = 0;

      items.forEach(function (item) {
        var haystack = (item.getAttribute('data-search') || item.textContent).toLowerCase();
        var okText  = !q || haystack.indexOf(q) !== -1;
        var okLevel = !vLevel || item.getAttribute('data-level') === vLevel;
        var okArea  = !vArea  || (' ' + item.getAttribute('data-area') + ' ').indexOf(' ' + vArea + ' ') !== -1;
        var okProp  = !vProp  || (' ' + item.getAttribute('data-props') + ' ').indexOf(' ' + vProp + ' ') !== -1;
        var visible = okText && okLevel && okArea && okProp;
        item.hidden = !visible;
        if (visible) { shown++; }
      });

      if (count) {
        count.textContent = shown === items.length
          ? 'Showing all ' + items.length + ' poses'
          : 'Showing ' + shown + ' of ' + items.length + ' poses';
      }
      if (empty) { empty.hidden = shown !== 0; }
    }

    [search, level, area, prop].forEach(function (control) {
      if (!control) { return; }
      control.addEventListener('input', apply);
      control.addEventListener('change', apply);
    });

    if (reset) {
      reset.addEventListener('click', function () {
        if (search) { search.value = ''; }
        if (level) { level.value = ''; }
        if (area) { area.value = ''; }
        if (prop) { prop.value = ''; }
        apply();
        if (search) { search.focus(); }
      });
    }

    apply();
  }

  /* ---------------------------------------------------------------------
     9. Generic text filter for glossary and teacher directory
     --------------------------------------------------------------------- */
  function initTextFilters() {
    $$('[data-filter-input]').forEach(function (input) {
      var targetSel = input.getAttribute('data-filter-target');
      var countSel  = input.getAttribute('data-filter-count');
      var emptySel  = input.getAttribute('data-filter-empty');
      var rows      = $$(targetSel);
      var countEl   = countSel ? $(countSel) : null;
      var emptyEl   = emptySel ? $(emptySel) : null;
      var selectSel = input.getAttribute('data-filter-select');
      var select    = selectSel ? $(selectSel) : null;
      var noun      = input.getAttribute('data-filter-noun') || 'results';

      function apply() {
        var q = input.value.trim().toLowerCase();
        var group = select ? select.value : '';
        var shown = 0;
        rows.forEach(function (row) {
          var okText = !q || row.textContent.toLowerCase().indexOf(q) !== -1;
          var okGroup = !group || (' ' + (row.getAttribute('data-group') || '') + ' ').indexOf(' ' + group + ' ') !== -1;
          var visible = okText && okGroup;
          row.hidden = !visible;
          if (visible) { shown++; }
        });
        if (countEl) {
          countEl.textContent = 'Showing ' + shown + ' of ' + rows.length + ' ' + noun;
        }
        if (emptyEl) { emptyEl.hidden = shown !== 0; }
      }

      input.addEventListener('input', apply);
      if (select) { select.addEventListener('change', apply); }
      apply();
    });
  }

  /* ---------------------------------------------------------------------
     10. Sequence player
     Steps are read from the printed practice list, so the page still works
     as a plain readable sequence with JS disabled.
     --------------------------------------------------------------------- */
  function initPlayer() {
    var player = $('.player');
    if (!player) { return; }

    var steps = $$('.player__steps li', player);
    if (!steps.length) { return; }

    var nameEl  = $('.player__now', player);
    var sansEl  = $('.player__sanskrit', player);
    var cueEl   = $('.player__cue', player);
    var timeEl  = $('.player__time', player);
    var fillEl  = $('.player__fill', player);
    var live    = $('.player__live', player);
    var btnPlay = $('[data-player="play"]', player);
    var btnNext = $('[data-player="next"]', player);
    var btnPrev = $('[data-player="prev"]', player);
    var btnStop = $('[data-player="reset"]', player);

    var index = 0;
    var remaining = 0;
    var ticker = null;

    function seconds(i) { return parseInt(steps[i].getAttribute('data-seconds'), 10) || 30; }

    function format(total) {
      var m = Math.floor(total / 60);
      var s = total % 60;
      return m + ':' + (s < 10 ? '0' + s : s);
    }

    function paint() {
      var step = steps[index];
      remaining = remaining || seconds(index);
      if (nameEl) { nameEl.textContent = step.getAttribute('data-name') || ''; }
      if (sansEl) { sansEl.textContent = step.getAttribute('data-sanskrit') || ''; }
      if (cueEl)  { cueEl.textContent  = step.getAttribute('data-cue') || ''; }
      if (timeEl) { timeEl.textContent = format(remaining); }
      if (fillEl) {
        var done = seconds(index) - remaining;
        fillEl.style.width = Math.round((done / seconds(index)) * 100) + '%';
      }
      steps.forEach(function (li, i) {
        li.classList.toggle('is-current', i === index);
        li.classList.toggle('is-done', i < index);
      });
    }

    function announce() {
      if (!live) { return; }
      live.textContent = steps[index].getAttribute('data-name') + ', ' +
        format(seconds(index)) + ' hold.';
    }

    function stopTicker() {
      if (ticker) { clearInterval(ticker); ticker = null; }
    }

    function setPlaying(on) {
      if (!btnPlay) { return; }
      btnPlay.textContent = on ? 'Pause' : 'Start practice';
      btnPlay.setAttribute('aria-pressed', String(on));
    }

    function tick() {
      remaining -= 1;
      if (remaining <= 0) {
        if (index < steps.length - 1) {
          index += 1;
          remaining = seconds(index);
          paint();
          announce();
        } else {
          stopTicker();
          remaining = seconds(index);
          paint();
          setPlaying(false);
          steps.forEach(function (li) { li.classList.add('is-done'); li.classList.remove('is-current'); });
          if (fillEl) { fillEl.style.width = '100%'; }
          if (live) { live.textContent = 'Practice complete. Rest as long as you like.'; }
          if (timeEl) { timeEl.textContent = 'Done'; }
          return;
        }
      }
      paint();
    }

    function play() {
      if (ticker) { return; }
      if (!remaining) { remaining = seconds(index); }
      ticker = setInterval(tick, 1000);
      setPlaying(true);
      announce();
    }

    function pause() { stopTicker(); setPlaying(false); }

    function goTo(i) {
      index = Math.max(0, Math.min(steps.length - 1, i));
      remaining = seconds(index);
      paint();
      announce();
    }

    if (btnPlay) {
      btnPlay.addEventListener('click', function () {
        if (ticker) { pause(); } else { play(); }
      });
    }
    if (btnNext) { btnNext.addEventListener('click', function () { goTo(index + 1); }); }
    if (btnPrev) { btnPrev.addEventListener('click', function () { goTo(index - 1); }); }
    if (btnStop) {
      btnStop.addEventListener('click', function () {
        pause();
        goTo(0);
        if (live) { live.textContent = 'Sequence reset to the first pose.'; }
      });
    }

    /* Each line is a jump target. Made focusable so the list is usable
       with a keyboard as well as a pointer. */
    steps.forEach(function (li, i) {
      li.setAttribute('tabindex', '0');
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', 'Jump to ' + (li.getAttribute('data-name') || 'this pose'));
      li.style.cursor = 'pointer';
      li.addEventListener('click', function () { goTo(i); });
      li.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          goTo(i);
        }
      });
    });

    remaining = seconds(0);
    paint();

    var printBtn = $('[data-print]');
    if (printBtn) { printBtn.addEventListener('click', function () { window.print(); }); }
  }

  /* ---------------------------------------------------------------------
     11. Breath pacing indicator
     --------------------------------------------------------------------- */
  function initPacer() {
    var pacer = $('.pacer');
    if (!pacer) { return; }

    var orb    = $('.pacer__orb', pacer);
    var phase  = $('.pacer__phase', pacer);
    var count  = $('.pacer__count', pacer);
    var select = $('.pacer__pattern', pacer);
    var toggle = $('[data-pacer="toggle"]', pacer);
    var live   = $('.pacer__live', pacer);

    var patterns = {
      'even':   [{ label: 'Inhale', s: 4, scale: 1 }, { label: 'Exhale', s: 4, scale: 0.7 }],
      'longer': [{ label: 'Inhale', s: 4, scale: 1 }, { label: 'Exhale', s: 6, scale: 0.7 }],
      'box':    [{ label: 'Inhale', s: 4, scale: 1 }, { label: 'Hold', s: 4, scale: 1 },
                 { label: 'Exhale', s: 4, scale: 0.7 }, { label: 'Hold', s: 4, scale: 0.7 }],
      'slow':   [{ label: 'Inhale', s: 5, scale: 1 }, { label: 'Exhale', s: 7, scale: 0.7 }]
    };

    var key = 'even';
    var step = 0;
    var left = 0;
    var timer = null;

    function current() { return patterns[key][step]; }

    function render() {
      var c = current();
      if (phase) { phase.textContent = c.label; }
      if (count) { count.textContent = left + ' of ' + c.s + ' seconds'; }
      if (orb) {
        orb.style.transitionDuration = prefersReducedMotion() ? '0s' : c.s + 's';
        orb.style.transform = 'scale(' + c.scale + ')';
      }
    }

    function advance() {
      left -= 1;
      if (left <= 0) {
        step = (step + 1) % patterns[key].length;
        left = current().s;
        render();
        if (live) { live.textContent = current().label; }
        return;
      }
      if (count) { count.textContent = left + ' of ' + current().s + ' seconds'; }
    }

    function start() {
      if (timer) { return; }
      step = 0;
      left = current().s;
      render();
      timer = setInterval(advance, 1000);
      if (toggle) { toggle.textContent = 'Pause pacing'; toggle.setAttribute('aria-pressed', 'true'); }
      if (live) { live.textContent = 'Breath pacing started. ' + current().label; }
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      if (toggle) { toggle.textContent = 'Start pacing'; toggle.setAttribute('aria-pressed', 'false'); }
      if (orb) { orb.style.transitionDuration = '0.6s'; orb.style.transform = 'scale(0.7)'; }
      if (phase) { phase.textContent = 'Ready'; }
      if (count) { count.textContent = 'Paused'; }
    }

    if (toggle) {
      toggle.addEventListener('click', function () {
        if (timer) { stop(); } else { start(); }
      });
    }
    if (select) {
      select.addEventListener('change', function () {
        key = select.value in patterns ? select.value : 'even';
        if (timer) { stop(); start(); }
      });
    }
  }

  /* ---------------------------------------------------------------------
     12. Cookie consent
     Nothing beyond strictly necessary storage is written before a choice.
     --------------------------------------------------------------------- */
  var CONSENT_KEY = 'fly-consent-v1';

  function readConsent() {
    try { return JSON.parse(window.localStorage.getItem(CONSENT_KEY)); }
    catch (err) { return null; }
  }

  function writeConsent(value) {
    try { window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value)); }
    catch (err) { /* storage unavailable, banner will show again */ }
  }

  function initConsent() {
    var banner = $('.consent');
    var openers = $$('[data-consent-open]');

    function show() { if (banner) { banner.hidden = false; requestAnimationFrame(function () { banner.classList.add('is-visible'); }); } }
    function hide() {
      if (!banner) { return; }
      banner.classList.remove('is-visible');
      window.setTimeout(function () { banner.hidden = true; }, prefersReducedMotion() ? 0 : 800);
    }

    if (!banner) { return; }

    openers.forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        var stored = readConsent();
        var prefs = $('.consent__prefs', banner);
        var saveBtn = $('[data-consent="save"]', banner);
        var manageBtn = $('[data-consent="manage"]', banner);
        if (prefs) {
          prefs.hidden = false;
          if (saveBtn) { saveBtn.hidden = false; }
          if (manageBtn) { manageBtn.setAttribute('aria-expanded', 'true'); }
          var a = $('#consent-analytics'); var d = $('#consent-ads');
          if (a) { a.checked = Boolean(stored && stored.analytics); }
          if (d) { d.checked = Boolean(stored && stored.ads); }
        }
        show();
      });
    });

    if (!readConsent()) { window.setTimeout(show, 700); }

    var manage = $('[data-consent="manage"]', banner);
    var prefs  = $('.consent__prefs', banner);
    var save   = $('[data-consent="save"]', banner);

    /* Save only makes sense once the individual toggles are on screen. */
    if (save && prefs && prefs.hidden) { save.hidden = true; }

    if (manage && prefs) {
      manage.addEventListener('click', function () {
        prefs.hidden = !prefs.hidden;
        manage.setAttribute('aria-expanded', String(!prefs.hidden));
        if (save) { save.hidden = prefs.hidden; }
      });
    }

    var accept = $('[data-consent="accept"]', banner);
    var reject = $('[data-consent="reject"]', banner);

    function commit(value) {
      writeConsent(value);
      hide();
      var note = $('.consent-confirm');
      if (note) { note.textContent = 'Your cookie choices have been saved.'; }
    }

    if (accept) { accept.addEventListener('click', function () { commit({ essential: true, analytics: true, ads: true, ts: Date.now() }); }); }
    if (reject) { reject.addEventListener('click', function () { commit({ essential: true, analytics: false, ads: false, ts: Date.now() }); }); }
    if (save) {
      save.addEventListener('click', function () {
        var a = $('#consent-analytics');
        var d = $('#consent-ads');
        commit({ essential: true, analytics: Boolean(a && a.checked), ads: Boolean(d && d.checked), ts: Date.now() });
      });
    }
  }

  /* ---------------------------------------------------------------------
     13. Footer year
     --------------------------------------------------------------------- */
  function initYear() {
    $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
  }

  /* --------------------------------------------------------------------- */
  function boot() {
    initNav();
    initScrollState();
    initReveals();
    initImages();
    initAccordions();
    initForms();
    initPoseFilter();
    initTextFilters();
    initPlayer();
    initPacer();
    initConsent();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
