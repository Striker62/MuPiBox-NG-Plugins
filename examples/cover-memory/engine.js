/* Independent matching-pairs engine, MIT. No host dependencies. */
(function (root) {
  'use strict';
  const sets = {
    shapes: ['●','■','▲','★','♥','◆','⬟','☾'],
    animals: ['Hund','Katze','Maus','Hase','Bär','Fuchs','Schwein','Fisch'],
    numbers: ['1','2','3','4','5','6','7','8']
  };
  function shuffle(array, rng = Math.random) {
    const out = [...array];
    for (let i=out.length-1;i>0;i--) { const j=Math.floor(rng()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; }
    return out;
  }
  function classic(theme) {
    return (theme === 'mixed' ? Object.keys(sets) : [theme]).flatMap(group =>
      (sets[group] || sets.shapes).map((glyph,i)=>({key:group+i,glyph,art:group==='animals'?'art/animal-'+i+'.svg':null})));
  }
  function board(items,count,rng=Math.random) {
    const unique=[...new Map(items.map(item=>[item.key,item])).values()];
    const chosen=shuffle(unique,rng).slice(0,Math.min(8,count));
    return {cards:shuffle(chosen.flatMap(item=>[0,1].map(()=>({...item,open:false,matched:false}))),rng),
      first:null,second:null,attempts:0,matches:0};
  }
  function flip(state,i) {
    const card=state.cards[i];
    if (!card || card.open || card.matched || state.second!==null) return 'ignored';
    card.open=true;
    if (state.first===null) {state.first=i;return 'first';}
    state.attempts++;
    const first=state.cards[state.first];
    if (first.key===card.key) {
      first.matched=card.matched=true;state.first=null;state.matches++;
      return state.matches*2===state.cards.length?'won':'match';
    }
    state.second=i;return 'miss';
  }
  function close(state) {
    if (state.second===null) return;
    state.cards[state.first].open=state.cards[state.second].open=false;
    state.first=state.second=null;
  }
  const api={classic,board,flip,close};
  if(typeof module==='object')module.exports=api;else root.MemoryEngine=api;
})(typeof window==='object'?window:globalThis);
