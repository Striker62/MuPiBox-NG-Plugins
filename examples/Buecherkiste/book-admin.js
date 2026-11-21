(() => {
  'use strict';

  function folderName(title) {
    return title.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue').replace(/ß/g, 'ss').normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
  }

  function movePage(pages, index, direction) {
    const target = index + direction;
    if (index < 0 || target < 0 || index >= pages.length || target >= pages.length) return index;
    [pages[index], pages[target]] = [pages[target], pages[index]];
    return target;
  }

  if (typeof module !== 'undefined') module.exports = {folderName, movePage};
  if (typeof document === 'undefined') return;

  const get = id => document.getElementById(id);
  const panel = get('book-admin');
  const hotspot = get('admin-entry');
  let pages = [];
  let selected = -1;
  let importing = false;
  let importVersion = 0;
  let taps = [];
  let previousFocus = null;

  function message(text) {
    get('admin-message').textContent = text;
  }

  function renderSelection() {
    const page = pages[selected];
    get('admin-empty').hidden = Boolean(page);
    get('admin-page-editor').hidden = !page;
    if (page) {
      get('admin-image').src = page.url;
      get('admin-image').alt = 'Vorschau von Seite ' + (selected + 1);
      get('admin-page-heading').textContent = 'Seite ' + (selected + 1);
      get('admin-original-name').textContent = page.file.name;
      get('admin-page-text').value = page.text;
      get('admin-text-count').textContent = Array.from(page.text).length + ' Zeichen';
    } else get('admin-image').removeAttribute('src');
    get('admin-up').disabled = !page || selected === 0;
    get('admin-down').disabled = !page || selected === pages.length - 1;
    for (const button of get('admin-pages').children) {
      button.setAttribute('aria-current', String(Number(button.dataset.index) === selected));
    }
    get('admin-page-count').textContent = pages.length + (pages.length === 1 ? ' Seite' : ' Seiten');
  }

  function renderPages() {
    get('admin-pages').replaceChildren();
    pages.forEach((page, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.index = String(index);
      button.className = 'admin-page-card';
      const thumbnail = document.createElement('img');
      thumbnail.src = page.url;
      thumbnail.alt = '';
      thumbnail.loading = 'lazy';
      const label = document.createElement('span');
      label.textContent = String(index + 1).padStart(2, '0');
      button.title = page.file.name;
      button.append(thumbnail, label);
      button.onclick = () => { selected = index; renderSelection(); };
      get('admin-pages').append(button);
    });
    renderSelection();
  }

  function updateFolder() {
    const name = folderName(get('admin-title').value);
    get('admin-folder').value = name;
    get('admin-path').textContent = 'books/' + (name || 'mein-buch') + '/';
  }

  function openAdmin() {
    previousFocus = document.activeElement;
    get('shelf').inert = true;
    panel.hidden = false;
    get('app-exit').hidden = true;
    get('admin-title').focus();
  }

  function closeAdmin() {
    get('admin-discard').hidden = true;
    panel.hidden = true;
    get('shelf').inert = false;
    get('app-exit').hidden = false;
    previousFocus?.focus();
  }

  hotspot.onclick = () => {
    const now = Date.now();
    taps = taps.filter(time => now - time < 1500);
    taps.push(now);
    if (taps.length >= 3) { taps = []; openAdmin(); }
  };
  get('admin-close').onclick = closeAdmin;
  panel.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      if (!get('admin-discard').hidden) get('admin-keep').click();
      else closeAdmin();
    }
    if (event.key === 'Tab') {
      const scope = get('admin-discard').hidden ? panel : get('admin-discard');
      const controls = Array.from(scope.querySelectorAll('button,input,textarea,[tabindex]'))
        .filter(node => !node.disabled && node.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  get('admin-title').oninput = updateFolder;
  get('admin-page-text').oninput = () => {
    if (!pages[selected]) return;
    pages[selected].text = get('admin-page-text').value;
    get('admin-text-count').textContent = Array.from(pages[selected].text).length + ' Zeichen';
  };
  get('admin-up').onclick = () => { selected = movePage(pages, selected, -1); renderPages(); };
  get('admin-down').onclick = () => { selected = movePage(pages, selected, 1); renderPages(); };
  get('admin-remove').onclick = () => {
    const [removed] = pages.splice(selected, 1);
    if (removed) URL.revokeObjectURL(removed.url);
    selected = Math.min(selected, pages.length - 1);
    renderPages();
  };

  function clearDraft() {
    importVersion++;
    for (const page of pages) URL.revokeObjectURL(page.url);
    pages = [];
    selected = -1;
    get('admin-title').value = '';
    get('admin-files').value = '';
    get('admin-discard').hidden = true;
    updateFolder();
    renderPages();
    message('Neuer Entwurf. Wähle die Bilder für dein Buch.');
    get('admin-title').focus();
  }
  get('admin-new').onclick = () => {
    if (pages.length || get('admin-title').value) {
      get('admin-discard').hidden = false;
      get('admin-keep').focus();
    } else clearDraft();
  };
  get('admin-keep').onclick = () => { get('admin-discard').hidden = true; get('admin-new').focus(); };
  get('admin-discard-confirm').onclick = clearDraft;
  get('admin-add').onclick = () => get('admin-files').click();

  async function previewFile(file) {
    if (!/\.(jpe?g|png|webp|gif)$/i.test(file.name) || file.size > 8 * 1024 * 1024) {
      throw Error('Bilder müssen JPEG, PNG, WebP oder GIF und höchstens 8 MiB groß sein.');
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 24000000) {
        throw Error('Dieses Bild ist zu groß. Verwende höchstens 24 Megapixel.');
      }
      return {file, url, text: ''};
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  get('admin-files').onchange = async () => {
    if (importing) return;
    const files = Array.from(get('admin-files').files).sort((a, b) =>
      a.name.localeCompare(b.name, 'de', {numeric: true}));
    if (!files.length) return;
    importing = true;
    get('admin-add').disabled = true;
    get('admin-new').disabled = true;
    const version = importVersion;
    let added = 0, rejected = 0;
    let bytes = pages.reduce((sum, page) => sum + page.file.size, 0);
    for (const file of files) {
      if (version !== importVersion) break;
      message('Bilder werden geladen … ' + (added + rejected + 1) + ' / ' + files.length);
      try {
        if (pages.length >= 200 || bytes + file.size > 128 * 1024 * 1024) {
          throw Error('Der Entwurf ist voll. Maximal 200 Seiten und 128 MiB Bilder.');
        }
        const page = await previewFile(file);
        if (version !== importVersion) { URL.revokeObjectURL(page.url); break; }
        pages.push(page);
        bytes += file.size;
        added++;
      } catch (error) { rejected++; message(file.name + ' – ' + error.message); }
    }
    importing = false;
    get('admin-add').disabled = false;
    get('admin-new').disabled = false;
    get('admin-files').value = '';
    if (selected < 0 && pages.length) selected = 0;
    renderPages();
    message(added + ' Bilder hinzugefügt.' + (rejected ? ' ' + rejected + ' Bilder konnten nicht geladen werden (Format oder Größenlimit).' : ''));
  };
  window.addEventListener('pagehide', () => {
    importVersion++;
    for (const page of pages) URL.revokeObjectURL(page.url);
  });
  // A restored browser page keeps File objects but needs fresh object URLs.
  window.addEventListener('pageshow', event => {
    if (event.persisted) { for (const page of pages) page.url = URL.createObjectURL(page.file); renderPages(); }
  });
  updateFolder();
  renderPages();
})();
