(() => {
  'use strict';
  const sdk=window.MuPiBoxSDK, engine=window.MemoryEngine, $=id=>document.getElementById(id);
  let mode='covers',theme='mixed',pairs=6,state=null,ticket=0,timeout=0,seconds=0,paused=false,loading=false,won=false,english=false;
  const board=$('board'),status=$('status');
  const tr=(de,en)=>english?en:de;
  function labels(){
    document.documentElement.lang=english?'en':'de';
    $('shuffle').textContent=tr('Neu mischen','Shuffle');
    const labels={covers:'My covers',classic:'Classic',mixed:'Mixed',shapes:'Shapes',animals:'Animals',numbers:'Numbers'};
    if(english)for(const el of document.querySelectorAll('[data-mode],[data-theme]'))el.textContent=labels[el.dataset.mode||el.dataset.theme];
  }
  function stats(){ $('stats').textContent=tr('Züge','Moves')+': '+(state?.attempts||0)+' · '+tr('Paare','Pairs')+': '+(state?.matches||0)+'/'+(state?.cards.length/2||0)+' · '+seconds+' s'; }
  function render(){
    $('themes').hidden=mode!=='classic';
    for(const el of document.querySelectorAll('[data-mode],[data-theme],[data-pairs]')){
      el.setAttribute('aria-pressed',String(el.dataset.mode===mode||el.dataset.theme===theme||Number(el.dataset.pairs)===pairs));
    }
    $('shuffle').disabled=loading;
    stats();
    if(!state){board.replaceChildren();return;}
    board.dataset.count=state.cards.length;
    if(board.children.length!==state.cards.length){
      board.replaceChildren(...state.cards.map((_,i)=>{
        const b=document.createElement('button');b.type='button';b.className='card';b.addEventListener('click',()=>turn(i));return b;
      }));
    }
    state.cards.forEach((card,i)=>{
      const b=board.children[i];b.classList.toggle('open',card.open);b.classList.toggle('matched',card.matched);
      b.setAttribute('aria-label',card.open?(card.glyph||tr('Cover aufgedeckt','Cover revealed')):tr('Karte','Card')+' '+(i+1));
      b.disabled=card.matched||loading||won||paused;
      if(card.open&&(card.image||card.art)){
        const img=document.createElement('img');img.alt='';img.src=card.image||card.art;b.replaceChildren(img);
      }else b.textContent=card.open?card.glyph:'?';
    });
  }
  function turn(i){
    if(!state||loading||paused||won)return;
    const result=engine.flip(state,i);
    if(result==='miss'){
      const current=ticket;
      timeout=setTimeout(()=>{if(current===ticket){engine.close(state);render();}},850);
    }
    if(result==='won'){won=true;status.textContent=tr('Super! Alle Paare gefunden!','Great! All pairs found!');}
    render();
  }
  async function start(){
    const current=++ticket;clearTimeout(timeout);state=null;won=false;loading=true;seconds=0;
    status.textContent=mode==='covers'?tr('Cover werden geladen …','Loading covers …'):'';
    render();
    let pool=[];
    if(mode==='covers'){
      try{
        if(await sdk.supports('covers.sample'))pool=(await sdk.covers.sample()).map((image,i)=>({key:'cover'+i,image}));
      }catch(_){}
      if(current!==ticket)return;
      if(pool.length<2){mode='classic';status.textContent=tr('Nicht genug freigegebene Cover – klassisches Memory.','Not enough approved covers – classic memory.');}
      else status.textContent=pool.length<pairs?tr('Weniger Cover verfügbar.','Fewer covers available.'):'';
    }
    if(mode==='classic')pool=engine.classic(theme);
    if(current!==ticket)return;
    state=engine.board(pool,pairs);loading=false;render();
  }
  for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{mode=button.dataset.mode;void start();});
  for(const button of document.querySelectorAll('[data-theme]'))button.addEventListener('click',()=>{theme=button.dataset.theme;void start();});
  for(const button of document.querySelectorAll('[data-pairs]'))button.addEventListener('click',()=>{pairs=Number(button.dataset.pairs);void start();});
  $('shuffle').addEventListener('click',()=>void start());
  sdk.on('lifecycle.pause',()=>{paused=true;clearTimeout(timeout);if(state)engine.close(state);render();});
  sdk.on('lifecycle.resume',()=>{paused=false;render();});
  setInterval(()=>{if(!paused&&!loading&&!won&&state){seconds++;stats();}},1000);
  void sdk.getContext().then(ctx=>{english=!String(ctx.language||'de').startsWith('de');labels();return start();}).catch(()=>start());
})();
