(() => {
"use strict";
const sdk = window.MuPiBoxSDK;
const $ = id => document.getElementById(id);
const state = {device:"", toc:null, active:false, paused:false, track:0, busy:false, supported:false};
let polling = null, pollingActive = false, pollCount = 0;
function message(text) { $("message").textContent = text; }
function enabled(id, on) { $(id).disabled = !on; }
function busy(on) { state.busy = on; updateControls(); }
function updateControls() {
 const ready = state.supported && Boolean(state.toc) && !state.busy;
 enabled("previous", ready && state.active);
 enabled("next", ready && state.active);
 enabled("stop", ready && state.active);
 enabled("toggle", ready);
 $("toggle").textContent = !state.active || state.paused ? "▶" : "⏸";
 $("disc-art").classList.toggle("playing", state.active && !state.paused);
}
async function scan({quiet = false} = {}) {
 if (state.busy) return;
 busy(true);
 try {
  const list = await sdk.optical.list();
  const old = state.device;
  const select = $("drive");
  select.replaceChildren();
  for (const drive of list) {
   if (typeof drive.id !== "string" || typeof drive.name !== "string") continue;
   const option = document.createElement("option");
   option.value = drive.id;
   option.textContent = drive.name;
   select.append(option);
  }
  if (list.some(d => d.id === old)) select.value = old;
  state.device = select.value || "";
  if (!state.device) {
   const changed = Boolean(old || state.toc);
   state.toc = null; state.active = false; state.track = 0;
   renderTracks();
   if (!quiet || changed) message("Kein USB-CD/DVD-Laufwerk erkannt. Bitte Laufwerk verbinden.");
   return;
  }
  await loadDisc({quiet});
 } catch (err) {
  if (!quiet) message("Laufwerk nicht verfügbar: " + err.message);
 } finally { busy(false); }
}
async function loadDisc({quiet = false} = {}) {
 if (!state.device) return;
 try {
  const toc = await sdk.optical.disc(state.device);
  if (!Number.isInteger(toc.first) || !Number.isInteger(toc.last) || toc.first < 1 || toc.last > 99 || toc.last < toc.first)
   throw Error("Ungültiges CD-Inhaltsverzeichnis");
  const previous = state.toc;
  const unchanged = quiet && previous && previous.device === state.device && previous.first === toc.first && previous.last === toc.last;
  if (!unchanged) {
   state.toc = toc; state.active = false; state.paused = false; state.track = 0;
   renderTracks();
   message("Audio-CD erkannt. Wähle einen Titel oder drücke Abspielen.");
  }
 } catch (err) {
  const hadDisc = Boolean(state.toc);
  state.toc = null; state.active = false; state.paused = false; state.track = 0;
  if (hadDisc || !quiet) {
   renderTracks();
   message("Keine lesbare Audio-CD. Bitte eine Audio-CD einlegen.");
  }
 }
}
function renderTracks() {
 $("disc-heading").textContent = state.toc ? "Meine Audio-CD" : "Keine CD eingelegt";
 $("disc-count").textContent = state.toc ? (state.toc.tracks + " Titel") : "";
 const box = $("tracks"); box.replaceChildren();
 if (!state.toc) {
  const p = document.createElement("p");
  p.className = "muted"; p.textContent = "Lege eine Audio-CD ein."; box.append(p);
  updateControls();
  return;
 }
 const fragment = document.createDocumentFragment();
 for (let t = state.toc.first; t <= state.toc.last; t++) {
  const btn = document.createElement("button");
  const n = document.createElement("span"); n.className = "number"; n.textContent = String(t).padStart(2,"0");
  const title = document.createElement("span"); title.textContent = "Titel " + t;
  btn.append(n, title); btn.classList.toggle("selected", t === state.track);
  btn.addEventListener("click", () => void play(t)); fragment.append(btn);
 }
 box.append(fragment);
 updateControls();
}
async function play(track) {
 if (state.busy || !state.toc) return;
 busy(true);
 try {
  await sdk.optical.play(state.device, track);
  message("Titel " + track + " wird abgespielt.");
  await refreshStatus();
 } catch (err) { message("CD konnte nicht gestartet werden: " + err.message); }
 finally { busy(false); }
}
async function refreshStatus() {
 if (!state.supported) return;
 try {
  const status = await sdk.optical.status();
  // The box may be playing a CD in another USB drive: never show/control it as this disc.
  const active = status.active === true && status.device === state.device;
  const track = active && Number.isInteger(status.track) && state.toc ? state.toc.first + status.track - 1 : 0;
  const changed = track !== state.track;
  state.active = active;
  state.paused = active && status.state === "paused";
  state.track = track;
  if (changed) renderTracks();
  updateControls();
 } catch (err) {
  message("CD-Status nicht verfügbar: " + err.message);
  state.active = false; updateControls();
 }
}
async function control(action) {
 if (state.busy || !state.toc) return;
 if (action === "toggle" && !state.active) { await play(state.toc.first); return; }
 // Skipping/stopping must not operate on a CD playing in a different drive.
 if (!state.active) return;
 busy(true);
 try {
  await sdk.optical.transport(action);
  await refreshStatus();
  if (action === "stop") message("CD gestoppt.");
 } catch (err) { message("CD-Bedienung nicht möglich: " + err.message); }
 finally { busy(false); await refreshStatus(); }
}
async function boot() {
 $("exit").addEventListener("click", () => void sdk.exit());
 $("scan").addEventListener("click", () => void scan());
 $("drive").addEventListener("change", () => {
  if (state.busy) return;
  state.device = $("drive").value;
  busy(true);
  void loadDisc().finally(() => busy(false));
 });
 for (const action of ["previous","next","stop","toggle"])
  $(action).addEventListener("click", () => void control(action));
 if (!sdk || !sdk.isHosted || !await sdk.supports("optical.list")) {
  message("USB-CD-Unterstützung fehlt in dieser MuPiBox-NG-Version. Bitte den NG-Host aktualisieren.");
  enabled("scan", false); return;
 }
 state.supported = true;
 await scan();
 polling = setInterval(() => {
  if (document.hidden || state.busy || pollingActive) return;
  pollingActive = true;
  void (async () => {
   await refreshStatus();
   // Check for newly plugged drives/inserted discs every ~11s while idle.
   // Avoid repeatedly probing the optical drive during active CD playback.
   if (++pollCount % 5 === 0 && !state.active) await scan({quiet:true});
  })().finally(() => { pollingActive = false; });
 }, 2200);
}
sdk.on("lifecycle.pause", () => { $("disc-art").classList.remove("playing"); });
sdk.on("lifecycle.resume", () => void refreshStatus());
sdk.on("input", ({button, action}) => { if (button === "BACK" && action === "press") void sdk.exit(); });
window.addEventListener("pagehide", () => { if (polling) clearInterval(polling); });
void boot().catch(err => message("CD-Player nicht verfügbar: " + err.message));
})();
