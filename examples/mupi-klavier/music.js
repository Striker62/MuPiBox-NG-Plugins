/* Independently authored public-domain melody transcriptions; no core assets. */
(function (scope) {
  'use strict';
  const white = ['C4','D4','E4','F4','G4','A4','B4','C5'];
  const songs = [
    {title:'Alle meine Entchen', notes:['C4','D4','E4','F4','G4','G4','A4','A4','A4','A4','G4','A4','A4','A4','A4','G4','F4','F4','F4','F4','E4','E4','G4','G4','G4','G4','C4'], beats:[1,1,1,1,2,2,1,1,1,1,4,1,1,1,1,4,1,1,1,1,2,2,1,1,1,1,4]},
    {title:'Funkel, funkel, kleiner Stern', notes:['C4','C4','G4','G4','A4','A4','G4','F4','F4','E4','E4','D4','D4','C4'], beats:[1,1,1,1,1,1,2,1,1,1,1,1,1,2]},
    {title:'Hänschen klein', notes:['G4','E4','E4','F4','D4','D4','C4','D4','E4','F4','G4','G4','G4'], beats:[1,1,2,1,1,2,1,1,1,1,1,1,2]}
  ];
  function advance(index, note, song) { return song.notes[index] === note ? index + 1 : index; }
  const api = {white,songs,advance};
  if (typeof module !== 'undefined') module.exports = api;
  else scope.PianoMusic = api;
})(globalThis);