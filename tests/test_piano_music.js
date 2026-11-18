const test=require('node:test'),assert=require('node:assert/strict');
const m=require('../examples/mupi-klavier/music.js');
test('all lessons fit the host note range and carry valid durations',()=>{for(const s of m.songs){assert.equal(s.notes.length,s.beats.length);assert.ok(s.notes.every(n=>m.white.includes(n)));assert.ok(s.beats.every(b=>b>0));}});
test('wrong note waits, correct note advances, completed lesson stays complete',()=>{const s=m.songs[0];assert.equal(m.advance(0,'G4',s),0);assert.equal(m.advance(0,'C4',s),1);assert.equal(m.advance(s.notes.length,'C4',s),s.notes.length);});
