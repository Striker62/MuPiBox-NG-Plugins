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
  let loadedId = null;
  let loadedRevision = null;
  let previous = null;
  const sdk = window.MuPiBoxAdminSDK;
  const store = sdk && window.BookStore.create(sdk);
  let pendingAction = null;
  let busy = false;
  let pages = [];
  let selected = -1;
  let importing = false;
  let importVersion = 0;

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
      get('admin-page-heading').textContent = 'Seite ' + (selected + 1 - (get('editor-cover').checked ? 1 : 0));
      get('admin-original-name').textContent = page.file.name;
      get('admin-page-text').value = page.text;
      const isCover = get('editor-cover').checked && selected === 0;
      get('admin-page-text').disabled = isCover;
      if (isCover) get('admin-page-heading').textContent = 'Cover (00)';
      get('admin-text-count').textContent = Array.from(page.text).length + ' Zeichen';
    } else get('admin-image').removeAttribute('src');
    get('admin-up').disabled = !page || selected <= (get('editor-cover').checked ? 1 : 0);
    get('admin-down').disabled = !page || selected === pages.length - 1 || (get('editor-cover').checked && selected === 0);
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
      label.textContent = get('editor-cover').checked && index === 0 ? 'Cover' : String(index + 1 - (get('editor-cover').checked ? 1 : 0)).padStart(2, '0');
      button.title = page.file.name;
      button.append(thumbnail, label);
      button.onclick = () => { selected = index; renderSelection(); };
      get('admin-pages').append(button);
    });
    renderSelection();
  }

  function updateFolder() {
    const name = loadedId || folderName(get('admin-title').value);
    get('admin-folder').value = name;
    get('admin-path').textContent = 'books/' + (name || 'mein-buch') + '/';
  }

  panel.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      if (!get('admin-discard').hidden) get('admin-keep').click();

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
    if (selected === 0 && get('editor-cover').checked) get('editor-cover').checked = false;
    const [removed] = pages.splice(selected, 1);
    if (removed) URL.revokeObjectURL(removed.url);
    selected = Math.min(selected, pages.length - 1);
    renderPages();
  };

  function clearDraft() {
    loadedId = null;
    loadedRevision = null;
    previous = null;
    get('editor-cover').checked = false;
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
  function confirmDiscard(action) {
    if (pages.length || get('admin-title').value) {
      pendingAction = action;
      get('admin-discard-heading').textContent = 'Aktuellen Entwurf verlassen?';
      get('admin-discard').hidden = false;
      get('admin-keep').focus();
    } else action();
  }
  get('admin-new').onclick = () => confirmDiscard(clearDraft);
  get('admin-keep').onclick = () => { pendingAction = null; get('admin-discard').hidden = true; };
  get('admin-discard-confirm').onclick = () => {
    get('admin-discard').hidden = true;
    const action = pendingAction;
    pendingAction = null;
    if (action) action();
  };
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
    if (importing || busy) return;
    const files = Array.from(get('admin-files').files).sort((a, b) =>
      a.name.localeCompare(b.name, 'de', {numeric: true}));
    if (!files.length) return;
    importing = true;
    get('editor-save').disabled = true;
    get('editor-load').disabled = true;
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
    get('editor-save').disabled = false;
    get('editor-load').disabled = false;
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

  async function loadLibrary() {
    if (!store) throw Error('Bitte die Buchverwaltung innerhalb der MuPiBox-Administration öffnen (Alpha 85 oder neuer).');
    const books = await store.list();
    const list = get('editor-existing');
    list.replaceChildren(new Option('Buch auswählen …',''));
    for (const book of books) list.append(new Option(book.title,book.id));
    if (loadedId) list.value = loadedId;
    get('editor-root').textContent = books.length + ' Bücher · CommunityApps/community.buecherkiste/books/';
  }
  function setBusy(value) {
    busy = value;
    for (const id of ['admin-title','editor-cover','editor-save','editor-load','editor-refresh','admin-add','admin-new']) get(id).disabled = value;
    get('admin-page-editor').inert = value;
    get('admin-pages').inert = value;
  }
  function showError(error) {
    const detail = error?.message || String(error || 'Unbekannter Fehler');
    const alert = get('editor-error');
    get('editor-error-detail').textContent = detail;
    alert.hidden = false;
    alert.focus();
    message(detail);
    return detail;
  }
  get('editor-error-close').onclick = () => { get('editor-error').hidden = true; };
  async function openBook(id) {
    if (busy || importing || !id) return;
    setBusy(true);
    const incoming = [];
    try {
      const data = await store.load(id);
      for (const page of data.pages) {
        const file = new File([page.blob],page.path.split('/').pop(),{type:page.blob.type});
        incoming.push({file,url:URL.createObjectURL(file),text:page.text,path:page.path});
      }
      for (const page of pages) URL.revokeObjectURL(page.url);
      pages = incoming;
      previous = data;
      loadedId = id;
      loadedRevision = data.revision;
      selected = 0;
      get('admin-title').value = data.info.title;
      get('editor-cover').checked = data.coverOnly;
      updateFolder(); renderPages();
      get('editor-save-status').textContent = 'Buch geladen. Änderungen werden erst mit „Buch speichern“ übernommen.';
      message('Seiten und Vorlesetexte geladen. Ein separates Cover hat keinen Vorlesetext.');
    } catch (error) {
      for (const page of incoming) URL.revokeObjectURL(page.url);
      showError(error);
    } finally { setBusy(false); }
  }
  get('editor-load').onclick = () => {
    if (busy || importing) return;
    const id = get('editor-existing').value;
    if (id) confirmDiscard(() => openBook(id)); else message('Bitte zuerst ein Buch auswählen.');
  };
  get('editor-refresh').onclick = async () => {
    if (busy || importing) return;
    setBusy(true);
    try { await loadLibrary(); message('Bücherliste aktualisiert. Der Entwurf bleibt erhalten.'); }
    catch (error) { showError(error); } finally { setBusy(false); }
  };
  get('editor-cover').onchange = renderPages;
  get('editor-save').onclick = async () => {
    if (busy || importing) return;
    if (!store) { message('Die MuPiBox-Admin-SDK ist nicht verfügbar.'); return; }
    setBusy(true);
    get('editor-error').hidden = true;
    get('editor-save-status').textContent = 'Buch wird gespeichert …';
    try {
      const result = await store.save({id:get('admin-folder').value,title:get('admin-title').value,
        pages,coverOnly:get('editor-cover').checked,previous},message);
      loadedId = result.id;
      previous = result;
      pages.forEach((page,i) => { page.path = result.pages[i].path; });
      loadedRevision = result.revision;
      get('editor-save-status').textContent = result.warning || 'Buch und index.json gespeichert.';
      message(result.warning || 'Gespeichert. Vorlesetexte bleiben vollständig erhalten.');
      if (result.warning) showError(result.warning);
      try { await loadLibrary(); }
      catch (error) { showError('Das Buch ist gespeichert. Nur die Bücherliste konnte nicht neu geladen werden: ' + (error.message || String(error))); }
    } catch (error) {
      const detail = showError(error);
      get('editor-save-status').textContent = 'Speichern fehlgeschlagen: ' + detail + ' – Der Entwurf bleibt geöffnet.';
    } finally { setBusy(false); }
  };
  window.addEventListener('beforeunload',event => {
    if (pages.length || get('admin-title').value) { event.preventDefault(); event.returnValue = ''; }
  });
  updateFolder(); renderPages();
  loadLibrary().catch(showError);
})();
