/* Scoped persistence for the book editor. No HTTP or filesystem access. */
(() => {
  'use strict';
  const slug = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
  const imagePath = value => typeof value === 'string' && /^images\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(jpe?g|png|webp|gif)$/i.test(value) && !value.includes('..');
  const textPath = value => typeof value === 'string' && /^(tts|text)\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.json$/.test(value) && !value.includes('..');
  const jsonBlob = value => new Blob([JSON.stringify(value, null, 2)], {type:'application/json'});
  function create(sdk) {
    async function readJSON(path) {
      const result = await sdk.files.read(path);
      return {value:JSON.parse(await result.blob.text()), revision:result.revision};
    }
    async function listing(path) {
      const result = await sdk.files.list(path);
      if (result.truncated) throw Error('Der Ordner ist zu groß für eine vollständige Auflistung: ' + path);
      return result.entries || [];
    }
    async function catalog() {
      const rows = await listing('books');
      if (!rows.some(row => row.name === 'index.json' && !row.isDir)) return {
        value:{books:rows.filter(row => row.isDir && slug(row.name)).map(row => row.name)}, revision:''};
      const result = await readJSON('books/index.json');
      if (!result.value || !Array.isArray(result.value.books) || result.value.books.some(name => !slug(name))) {
        throw Error('index.json ist ungültig. Die Bücherliste wurde nicht verändert.');
      }
      return result;
    }
    async function list() {
      const rows = await listing('books');
      const books = [];
      for (const row of rows) {
        if (!row.isDir || !slug(row.name)) continue;
        try {
          const result = await readJSON('books/' + row.name + '/book.json');
          books.push({id:row.name, title:result.value.title || row.name});
        } catch { books.push({id:row.name,title:row.name + ' (unvollständig oder nicht lesbar)'}); }
      }
      return books.sort((a,b) => a.title.localeCompare(b.title, 'de'));
    }
    async function load(id) {
      if (!slug(id)) throw Error('Ungültiger Buchordner.');
      const base = 'books/' + id + '/';
      const result = await readJSON(base + 'book.json');
      const info = result.value;
      if ((info.layout || 'full-page') !== 'full-page') throw Error('Dieses Layout bearbeitet derzeit Vollseitenbücher. Bild-und-Text-Bücher bleiben unverändert.');
      const pattern = info.imagePattern || 'images/{page:02d}.jpg';
      const matches = [...pattern.matchAll(/\{(page|page_plus_one)(?::0?([1-4])d)?\}/g)];
      if (matches.length !== 1 || !imagePath(pattern.replace(matches[0][0], '01'))) throw Error('Nicht unterstütztes Bildmuster.');
      const rows = await listing(base + 'images');
      const names = new Set(rows.filter(row => !row.isDir).map(row => 'images/' + row.name));
      const paths = [];
      let misses = 0;
      for (let number = 1; number <= 200 && misses < 2; number++) {
        const match = matches[0];
        const path = pattern.replace(match[0], String(number + (match[1] === 'page_plus_one' ? 1 : 0)).padStart(Number(match[2]) || 1, '0'));
        const stem = path.replace(/\.[^.]+$/, '');
        const actual = [path, ...['jpg','jpeg','png','webp','gif','JPG','JPEG','PNG','WEBP','GIF'].map(ext => stem + '.' + ext)].find(candidate => names.has(candidate));
        if (actual) { paths.push(actual); misses = 0; } else misses++;
      }
      if (!paths.length) throw Error('Keine Buchseiten gefunden.');
      let texts = [];
      const speech = info.tts || info.text;
      if (speech) {
        if (!textPath(speech)) throw Error('Ungültiger Vorlesetext-Pfad.');
        const data = (await readJSON(base + speech)).value;
        if (!Array.isArray(data.pages)) throw Error('Die Vorlesetexte enthalten keine Seitenliste.');
        texts = data.pages.map(item => typeof item === 'string' ? item : String(item?.text || ''));
      }
      const coverOnly = imagePath(info.cover) && names.has(info.cover) && !paths.includes(info.cover);
      const ordered = coverOnly ? [info.cover, ...paths] : paths;
      const pages = [];
      for (let i = 0; i < ordered.length; i++) {
        const path = ordered[i];
        const file = await sdk.files.read(base + path);
        pages.push({path, blob:file.blob, text:coverOnly && i === 0 ? '' : texts[i - (coverOnly ? 1 : 0)] || ''});
      }
      return {id, info, revision:result.revision, pages, coverOnly};
    }
    async function save(draft, progress = () => {}) {
      const {id, title, pages, coverOnly, previous} = draft;
      if (!slug(id) || !title.trim() || title.length > 300) throw Error('Bitte einen gültigen Buchtitel eingeben.');
      if (!pages.length || pages.length > 200 || (coverOnly && pages.length < 2)) throw Error('Bitte mindestens eine Inhaltsseite hinzufügen (höchstens 200 Bilder).');
      const lines = (coverOnly ? pages.slice(1) : pages).map(page => ({text:page.text}));
      const speech = jsonBlob({pages:lines});
      if (speech.size > 256 * 1024) throw Error('Die Vorlesetexte überschreiten 256 KiB.');
      for (const page of pages) {
        if (page.file.size > 8 * 1024 * 1024) throw Error('Ein Bild überschreitet 8 MiB.');
        if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(page.file.name)) throw Error('Nicht unterstütztes Bildformat.');
      }
      const index = await catalog(); // Validate before making any changes.
      if (previous) {
        const current = await readJSON('books/' + id + '/book.json');
        if (current.revision !== previous.revision) throw Error('Das Buch wurde zwischenzeitlich geändert. Bitte neu öffnen.');
      }
      const generation = 'edit-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
      const base = 'books/' + id + '/';
      const reuse = previous && previous.coverOnly === coverOnly && previous.pages?.length === pages.length &&
        pages.every((page,i) => page.path && page.path === previous.pages[i].path);
      // New, immutable assets keep the published book intact until book.json
      // is replaced with its expected revision. Never overwrite numbered originals.
      const output = [];
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (reuse) { output.push(page.path); continue; }
        const ext = page.file.name.split('.').pop().toLowerCase();
        if (!['jpg','jpeg','png','webp','gif'].includes(ext)) throw Error('Nicht unterstütztes Bildformat.');
        const path = 'images/' + generation + '-' + String(i + (coverOnly ? 0 : 1)).padStart(2,'0') + '.' + ext;
        progress('Bild ' + (i+1) + ' / ' + pages.length + ' speichern …');
        await sdk.files.write(base + path, page.file, {expectedRevision:''});
        output.push(path);
      }
      const tts = 'tts/' + generation + '.json';
      await sdk.files.write(base + tts, speech, {expectedRevision:''});
      const ext = output[coverOnly ? 1 : 0].split('.').pop();
      const info = {...(previous?.info || {}), id, title, layout:'full-page', firstPage:1,
        cover:output[0], imagePattern:reuse ? previous.info.imagePattern : 'images/' + generation + '-{page:02d}.' + ext, tts};
      const saved = await sdk.files.write(base + 'book.json', jsonBlob(info), {expectedRevision:previous?.revision || ''});
      // A catalog conflict must not undo another administrator's changes.
      // Return the saved book plus a clear warning so retry does not duplicate it.
      let warning = '';
      try {
        if (!index.value.books.includes(id)) index.value.books.push(id);
        await sdk.files.write('books/index.json', jsonBlob(index.value), {expectedRevision:index.revision});
      } catch (error) { warning = 'Buch gespeichert, aber index.json nicht aktualisiert: ' + error.message + ' Bitte erneut speichern.'; }
      return {id, info, revision:saved.revision, warning, coverOnly,
        pages:pages.map((page,i) => ({path:output[i],text:page.text,blob:page.file}))};
    }
    return {list, load, save};
  }
  if (typeof module !== 'undefined') module.exports = {create};
  if (typeof window !== 'undefined') window.BookStore = {create};
})();
