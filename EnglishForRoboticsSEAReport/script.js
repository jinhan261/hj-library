(function () {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const themeButton = document.getElementById('themeButton');
  const themeLabel = document.getElementById('themeLabel');
  const fontButton = document.getElementById('fontButton');
  const fontLabel = document.getElementById('fontLabel');
  const menuButton = document.getElementById('menuButton');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('drawerBackdrop');
  const toc = document.getElementById('toc');
  const backToTop = document.getElementById('backToTop');
  const printButton = document.getElementById('printButton');
  const hero = document.getElementById('top');

  const themeNames = { auto: '自动', light: '浅色', dark: '深色' };
  const storedTheme = localStorage.getItem('efr-theme');
  let theme = ['auto', 'light', 'dark'].includes(storedTheme) ? storedTheme : 'auto';

  function applyTheme(next) {
    theme = next;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    localStorage.setItem('efr-theme', theme);
    if (themeLabel) themeLabel.textContent = themeNames[theme];
    if (themeButton) themeButton.setAttribute('aria-label', `当前${themeNames[theme]}主题，点击切换`);
  }

  if (themeButton) {
    themeButton.addEventListener('click', function () {
      const order = ['auto', 'light', 'dark'];
      applyTheme(order[(order.indexOf(theme) + 1) % order.length]);
    });
  }
  applyTheme(theme);

  const fontScales = [1, 1.1, 1.2];
  const storedScale = Number(localStorage.getItem('efr-font-scale'));
  let fontScale = fontScales.includes(storedScale) ? storedScale : 1;

  function applyFontScale(next) {
    fontScale = next;
    root.style.setProperty('--reading-size', `${18 * fontScale}px`);
    localStorage.setItem('efr-font-scale', String(fontScale));
    if (fontLabel) fontLabel.textContent = `${Math.round(fontScale * 100)}%`;
    if (fontButton) fontButton.setAttribute('aria-label', `当前正文字号${Math.round(fontScale * 100)}%，点击放大`);
  }

  if (fontButton) {
    fontButton.addEventListener('click', function () {
      applyFontScale(fontScales[(fontScales.indexOf(fontScale) + 1) % fontScales.length]);
    });
  }
  applyFontScale(fontScale);

  function openDrawer() {
    if (!sidebar || !menuButton || !backdrop) return;
    sidebar.classList.add('open');
    backdrop.classList.add('visible');
    body.classList.add('drawer-open');
    menuButton.setAttribute('aria-expanded', 'true');
    const firstLink = sidebar.querySelector('a');
    if (firstLink) firstLink.focus();
  }

  function closeDrawer(restoreFocus) {
    if (!sidebar || !menuButton || !backdrop) return;
    sidebar.classList.remove('open');
    backdrop.classList.remove('visible');
    body.classList.remove('drawer-open');
    menuButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) menuButton.focus();
  }

  if (menuButton) {
    menuButton.addEventListener('click', function () {
      if (sidebar && sidebar.classList.contains('open')) closeDrawer(true);
      else openDrawer();
    });
  }
  if (backdrop) backdrop.addEventListener('click', function () { closeDrawer(true); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && sidebar && sidebar.classList.contains('open')) closeDrawer(true);
  });

  function buildToc() {
    if (!toc) return [];
    const targets = [];
    document.querySelectorAll('.report-part').forEach(function (part, partIndex) {
      const partHeading = part.querySelector(':scope > .part-intro > h2');
      if (partHeading) {
        if (!part.id) part.id = `part-${partIndex + 1}`;
        targets.push({ element: part, id: part.id, text: partHeading.textContent.trim(), level: 2 });
      }
      part.querySelectorAll(':scope > .chapter').forEach(function (chapter, chapterIndex) {
        const heading = chapter.querySelector(':scope > h2');
        if (!heading) return;
        if (!chapter.id) chapter.id = `part-${partIndex + 1}-chapter-${chapterIndex + 1}`;
        targets.push({ element: chapter, id: chapter.id, text: heading.textContent.trim(), level: 3 });
      });
    });

    const fragment = document.createDocumentFragment();
    targets.forEach(function (target) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${target.id}`;
      link.textContent = target.text;
      link.dataset.level = String(target.level);
      link.addEventListener('click', function () { closeDrawer(false); });
      li.appendChild(link);
      fragment.appendChild(li);
      target.link = link;
    });
    toc.replaceChildren(fragment);
    return targets;
  }

  const tocTargets = buildToc();
  if ('IntersectionObserver' in window && tocTargets.length) {
    const activeObserver = new IntersectionObserver(function (entries) {
      const visible = entries
        .filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      if (!visible.length) return;
      const current = tocTargets.find(function (item) { return item.element === visible[0].target; });
      if (!current) return;
      tocTargets.forEach(function (item) { item.link.classList.toggle('active', item === current); });
      current.link.scrollIntoView({ block: 'nearest' });
    }, { rootMargin: '-16% 0px -70% 0px', threshold: [0, .01] });
    tocTargets.forEach(function (item) { activeObserver.observe(item.element); });
  }

  if (backToTop) {
    backToTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    if ('IntersectionObserver' in window && hero) {
      const heroObserver = new IntersectionObserver(function (entries) {
        const atTop = entries.some(function (entry) { return entry.isIntersecting; });
        backToTop.classList.toggle('visible', !atTop);
      }, { threshold: .08 });
      heroObserver.observe(hero);
    }
  }

  if (printButton) printButton.addEventListener('click', function () { window.print(); });

  document.querySelectorAll('a[href^="http"]').forEach(function (link) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });

  function phraseText(element) {
    if (element.dataset.copy) return element.dataset.copy;
    const english = element.querySelector('[lang="en"]');
    return (english || element).textContent.trim();
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }

  function speakText(text) {
    if (!('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(function (voice) { return /^en-SG/i.test(voice.lang); })
      || voices.find(function (voice) { return /^en-GB/i.test(voice.lang); })
      || voices.find(function (voice) { return /^en/i.test(voice.lang); })
      || null;
    utterance.lang = utterance.voice ? utterance.voice.lang : 'en-GB';
    utterance.rate = .92;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function addPhraseTools(element) {
    if (element.dataset.toolsReady === 'true') return;
    element.dataset.toolsReady = 'true';
    const text = phraseText(element);
    if (!text) return;
    const actions = document.createElement('div');
    actions.className = 'phrase-actions';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'copy-button';
    copy.textContent = '复制英文';
    copy.addEventListener('click', async function () {
      try {
        await copyText(text);
        copy.textContent = '已复制';
        window.setTimeout(function () { copy.textContent = '复制英文'; }, 1400);
      } catch (error) {
        copy.textContent = '复制失败';
      }
    });
    actions.appendChild(copy);

    if ('speechSynthesis' in window) {
      const speak = document.createElement('button');
      speak.type = 'button';
      speak.className = 'speak-button';
      speak.textContent = '听节奏';
      speak.title = '浏览器合成语音，只作节奏参考';
      speak.addEventListener('click', function () { speakText(text); });
      actions.appendChild(speak);
    }
    element.appendChild(actions);
  }

  document.querySelectorAll('[data-tools], .phrase-row .copyable').forEach(addPhraseTools);

  const phraseSearch = document.getElementById('phraseSearch');
  const phraseCount = document.getElementById('phraseCount');
  const phraseRows = Array.from(document.querySelectorAll('.phrase-row'));

  function filterPhrases() {
    if (!phraseSearch) return;
    const query = phraseSearch.value.trim().toLocaleLowerCase();
    let visible = 0;
    phraseRows.forEach(function (row) {
      const haystack = `${row.dataset.tags || ''} ${row.textContent}`.toLocaleLowerCase();
      const match = !query || haystack.includes(query);
      row.hidden = !match;
      if (match) visible += 1;
    });
    if (phraseCount) phraseCount.textContent = `${visible} 条`;
  }

  if (phraseSearch) phraseSearch.addEventListener('input', filterPhrases);
  filterPhrases();
})();
