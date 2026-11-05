(() => {
  'use strict';
  const sdk = window.MuPiBoxSDK;
  const el = id => document.getElementById(id);
  const canvas = el('drawing');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let busy = false;

  function status(message) {
    el('status').textContent = message;
  }
  function whiteBackground() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  function testImage() {
    whiteBackground();
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#d6f0ff');
    gradient.addColorStop(1, '#fff6c1');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffd447';
    ctx.beginPath();
    ctx.arc(415, 52, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#57a167';
    ctx.fillRect(0, 198, 480, 62);
    ctx.fillStyle = '#243e61';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText('MuPiBox', 35, 100);
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('Foto-Speicher Test', 35, 142);
    status('Testbild erstellt. Jetzt speichern.');
  }
  function coords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * canvas.width / rect.width,
      y: (e.clientY - rect.top) * canvas.height / rect.height
    };
  }
  canvas.addEventListener('pointerdown', e => {
    if (busy) return;
    drawing = true;
    canvas.setPointerCapture?.(e.pointerId);
    const p = coords(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => {
    if (!drawing || busy) return;
    const p = coords(e);
    ctx.strokeStyle = '#df3f68';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    e.preventDefault();
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(event, () => { drawing = false; });
  }
  function canvasBlob() {
    return new Promise((resolve, reject) =>
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG-Erstellung fehlgeschlagen')), 'image/png'));
  }
  async function refresh() {
    const rows = el('photo-list');
    rows.replaceChildren();
    try {
      const photos = await sdk.photos.list();
      el('count').textContent = String(photos.length);
      if (!photos.length) {
        const empty = document.createElement('p');
        empty.textContent = 'Noch keine Fotos gespeichert.';
        rows.append(empty);
      }
      for (const photo of photos) {
        const row = document.createElement('div');
        row.className = 'photo';
        const open = document.createElement('button');
        open.className = 'open';
        open.type = 'button';
        const created = new Date(photo.createdAt);
        open.textContent = Number.isNaN(created.getTime()) ? photo.id : created.toLocaleString('de-DE');
        open.title = photo.filename;
        open.addEventListener('click', () => { void load(photo.id); });
        const del = document.createElement('button');
        del.className = 'delete';
        del.type = 'button';
        del.textContent = 'Löschen';
        del.addEventListener('click', async () => {
          if (busy) return;
          if (del.dataset.confirm !== 'yes') {
            del.dataset.confirm = 'yes';
            del.textContent = 'Sicher?';
            return;
          }
          busy = true;
          try {
            await sdk.photos.delete(photo.id);
            status('Foto gelöscht.');
            await refresh();
          } catch (error) {
            status('Löschen: ' + error.message);
          } finally {
            busy = false;
          }
        });
        row.append(open, del);
        rows.append(row);
      }
    } catch (error) {
      status('Fotos nicht verfügbar: ' + error.message);
      const warning = document.createElement('p');
      warning.textContent = 'Diese Funktion benötigt eine aktuelle MuPiBox-NG-Version und die bestätigte Berechtigung photo-save.';
      rows.append(warning);
    }
  }
  async function load(id) {
    if (busy) return;
    busy = true;
    try {
      const blob = await sdk.photos.get(id);
      const url = URL.createObjectURL(blob);
      try {
        const image = new Image();
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () => reject(new Error('Foto kann nicht angezeigt werden'));
          image.src = url;
        });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        status('Gespeichertes Foto geladen.');
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      status('Laden: ' + error.message);
    } finally {
      busy = false;
    }
  }
  el('save').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    el('save').disabled = true;
    try {
      const blob = await canvasBlob();
      const photo = await sdk.photos.save({blob});
      status('Gespeichert: ' + photo.size + ' Bytes');
      await refresh();
    } catch (error) {
      status('Speichern: ' + error.message);
    } finally {
      busy = false;
      el('save').disabled = false;
    }
  });
  el('clear').addEventListener('click', () => { if (!busy) { whiteBackground(); status('Leeres Bild'); } });
  el('example').addEventListener('click', () => { if (!busy) testImage(); });
  el('refresh').addEventListener('click', () => { void refresh(); });
  testImage();
  void refresh();
})();
