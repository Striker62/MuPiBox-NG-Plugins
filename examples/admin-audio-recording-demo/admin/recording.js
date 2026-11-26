"use strict";
const $ = id => document.getElementById(id);
const audio = window.MuPiBoxAdminSDK?.audio;
let devices = [], active = false, last = null, preview = null;
const say = message => { $("status").textContent = message; };
function buttons() {
  $("scan").disabled = !audio || active;
  $("start").disabled = !audio || active || !devices.length;
  $("stop").disabled = $("cancel").disabled = !active;
  $("play").disabled = $("trash").disabled = active || !last;
}
function stopPreview() {
  if (preview) { preview.player.pause(); preview.release(); preview = null; }
}
function action(id, fn) {
  $(id).onclick = async () => {
    try { await fn(); } catch (error) { say(error.message); }
    finally { buttons(); }
  };
}
action("scan", async () => {
  const inputs = await audio.listInputDevices();
  devices = inputs.box.map(d => ({...d, source: "box"}));
  if (inputs.secureContext) {
    devices.push({id: "", label: "Browser-Standardmikrofon", source: "browser"});
    devices.push(...inputs.browser.filter(d => d.id).map(d => ({...d, source: "browser"})));
  }
  $("device").replaceChildren(...devices.map((d,i) => new Option(d.label+" ("+d.source+")", i)));
  say(devices.length + " Aufnahmegeräte verfügbar");
});
action("start", async () => {
  if (active) return;
  const d = devices[Number($("device").value)];
  const page = Number($("page").value);
  if (!d || !Number.isInteger(page) || page < 1 || page > 999) throw Error("Gerät und Seite wählen");
  stopPreview();
  const ext = d.source === "box" ? "ogg" : "webm";
  const path = "books/testbuch/seite-"+String(page).padStart(3,"0")+"-"+Date.now()+"."+ext;
  active = true; buttons();
  try {
    say("Aufnahme im MuPiBox-Dialog bestätigen");
    const result = await audio.startRecording({source:d.source,deviceId:d.id,path});
    if (result.cancelled) { say("Abgebrochen"); return; }
    last = result;
    say("Gespeichert: "+result.path);
  } finally { active = false; }
});
action("stop", async () => {
  const status = await audio.getRecordingStatus();
  if (!["recording","paused"].includes(status.state)) throw Error("Aufnahme zuerst im Host bestätigen");
  await audio.stopRecording();
});
action("cancel", async () => { await audio.cancelRecording(); });
action("play", async () => {
  if (!last) return;
  stopPreview();
  preview = await audio.playRecording(last.path);
  say("Wiedergabe: "+last.path);
});
action("trash", async () => {
  if (!last) return;
  const name = last.path.split("/").pop();
  // Native confirm() is unavailable in the sandbox. The explicit button is
  // the user action; confirmName binds the operation to the chosen file.
  stopPreview();
  await audio.deleteRecording(last.path,{expectedRevision:last.revision,confirmName:name});
  last = null; say("In den Papierkorb verschoben");
});
window.addEventListener("pagehide", stopPreview);
if (!audio) say("Admin-Audio-SDK fehlt: App-Verwaltung in NG Alpha 87+ öffnen.");
buttons();
