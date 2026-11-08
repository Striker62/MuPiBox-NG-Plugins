/* MuPi Schach: offline touchscreen/controller presentation (MIT). */
(function () {
  'use strict';
  const C=window.MuPiChess, sdk=window.MuPiBoxSDK;
  const $=id=>document.getElementById(id);
  const els={board:$('board'),status:$('status'),mode:$('mode'),difficulty:$('difficulty'),color:$('player-color'),limit:$('turn-limit'),
    promotion:$('promotion'),promotionOptions:$('promotion-options'),history:$('history')};
  const translations={
    de:{title:'Schach',white:'Weiß',black:'Schwarz',cpu:'MuPi',two:'2 Spieler',opponent:'Gegner',difficulty:'Stärke',
      novice:'Anfänger',easy:'Leicht',normal:'Mittel',hard:'Schwer',yourColor:'Deine Farbe',limit:'Zeit pro Zug',unlimited:'Unbegrenzt',
      moves:'Züge',avg:'Ø/Zug',new:'Neue Partie',undo:'Zurücknehmen',history:'Zugfolge',exit:'Spiel verlassen',
      choose:'Figur wählen',cancel:'Abbrechen',claim:'Remis fordern',hint:'Figur antippen, dann markiertes Zielfeld wählen. Pfeile/A: Auswahl; B: Abbruch.',
      toMove:'am Zug',check:'Schach!',thinking:'MuPi überlegt …',mate:'Schachmatt',stalemate:'Patt – Remis',material:'Remis – zu wenig Material',
      draw:'Remis',timeout:'Zeit abgelaufen',wins:'gewinnt',threefold:'dreifache Wiederholung',fifty:'50-Züge-Regel',
      queen:'Dame',rook:'Turm',bishop:'Läufer',knight:'Springer',preview:'Im Browser bitte den Tab schließen.'},
    en:{title:'Chess',white:'White',black:'Black',cpu:'MuPi',two:'2 players',opponent:'Opponent',difficulty:'Level',
      novice:'Beginner',easy:'Easy',normal:'Medium',hard:'Hard',yourColor:'Your color',limit:'Time per move',unlimited:'Unlimited',
      moves:'moves',avg:'Avg/move',new:'New game',undo:'Undo',history:'Moves',exit:'Leave game',
      choose:'Choose promotion',cancel:'Cancel',claim:'Claim draw',hint:'Tap a piece, then its marked destination. Arrows/A: select; B: cancel.',
      toMove:'to move',check:'Check!',thinking:'MuPi is thinking …',mate:'Checkmate',stalemate:'Stalemate – draw',material:'Draw – insufficient material',
      draw:'Draw',timeout:'Time expired',wins:'wins',threefold:'threefold repetition',fifty:'50-move rule',
      queen:'Queen',rook:'Rook',bishop:'Bishop',knight:'Knight',preview:'Close the browser tab to leave.'},
    fr:{title:'Échecs',white:'Blancs',black:'Noirs',cpu:'MuPi',two:'2 joueurs',opponent:'Adversaire',difficulty:'Niveau',
      novice:'Débutant',easy:'Facile',normal:'Moyen',hard:'Difficile',yourColor:'Votre couleur',limit:'Temps par coup',unlimited:'Illimité',
      moves:'coups',avg:'Moy./coup',new:'Nouvelle partie',undo:'Annuler',history:'Coups joués',exit:'Quitter',
      choose:'Promotion',cancel:'Annuler',claim:'Réclamer la nulle',hint:'Touchez une pièce et une case marquée. Flèches/A: choisir; B: annuler.',
      toMove:'à jouer',check:'Échec !',thinking:'MuPi réfléchit …',mate:'Échec et mat',stalemate:'Pat – nulle',material:'Nulle – matériel insuffisant',
      draw:'Nulle',timeout:'Temps écoulé',wins:'gagne',threefold:'répétition',fifty:'règle des 50 coups',
      queen:'Dame',rook:'Tour',bishop:'Fou',knight:'Cavalier',preview:'Fermez cet onglet.'},
    es:{title:'Ajedrez',white:'Blancas',black:'Negras',cpu:'MuPi',two:'2 jugadores',opponent:'Rival',difficulty:'Nivel',
      novice:'Principiante',easy:'Fácil',normal:'Medio',hard:'Difícil',yourColor:'Tu color',limit:'Tiempo por jugada',unlimited:'Sin límite',
      moves:'jugadas',avg:'Prom./jugada',new:'Nueva partida',undo:'Deshacer',history:'Jugadas',exit:'Salir',
      choose:'Promoción',cancel:'Cancelar',claim:'Pedir tablas',hint:'Toca una pieza y la casilla marcada. Flechas/A: elegir; B: cancelar.',
      toMove:'juegan',check:'¡Jaque!',thinking:'MuPi piensa …',mate:'Jaque mate',stalemate:'Ahogado – tablas',material:'Tablas – material insuficiente',
      draw:'Tablas',timeout:'Tiempo agotado',wins:'gana',threefold:'repetición triple',fifty:'regla de 50 jugadas',
      queen:'Dama',rook:'Torre',bishop:'Alfil',knight:'Caballo',preview:'Cierra la pestaña.'},
    it:{title:'Scacchi',white:'Bianco',black:'Nero',cpu:'MuPi',two:'2 giocatori',opponent:'Avversario',difficulty:'Livello',
      novice:'Principiante',easy:'Facile',normal:'Medio',hard:'Difficile',yourColor:'Il tuo colore',limit:'Tempo per mossa',unlimited:'Illimitato',
      moves:'mosse',avg:'Media/mossa',new:'Nuova partita',undo:'Annulla',history:'Mosse',exit:'Esci',
      choose:'Promozione',cancel:'Annulla',claim:'Chiedi patta',hint:'Tocca un pezzo e poi la casella segnata. Frecce/A: scegli; B: annulla.',
      toMove:'muove',check:'Scacco!',thinking:'MuPi pensa …',mate:'Scacco matto',stalemate:'Stallo – patta',material:'Patta – materiale insufficiente',
      draw:'Patta',timeout:'Tempo scaduto',wins:'vince',threefold:'triplice ripetizione',fifty:'regola 50 mosse',
      queen:'Regina',rook:'Torre',bishop:'Alfiere',knight:'Cavallo',preview:'Chiudi la scheda.'},
    nl:{title:'Schaken',white:'Wit',black:'Zwart',cpu:'MuPi',two:'2 spelers',opponent:'Tegenstander',difficulty:'Niveau',
      novice:'Beginner',easy:'Makkelijk',normal:'Gemiddeld',hard:'Moeilijk',yourColor:'Jouw kleur',limit:'Tijd per zet',unlimited:'Onbeperkt',
      moves:'zetten',avg:'Gem./zet',new:'Nieuw spel',undo:'Ongedaan',history:'Zetten',exit:'Afsluiten',
      choose:'Promotie',cancel:'Annuleren',claim:'Remise claimen',hint:'Tik een stuk en dan het gemarkeerde veld. Pijlen/A: kiezen; B: annuleren.',
      toMove:'aan zet',check:'Schaak!',thinking:'MuPi denkt na …',mate:'Schaakmat',stalemate:'Pat – remise',material:'Remise – onvoldoende materiaal',
      draw:'Remise',timeout:'Tijd verstreken',wins:'wint',threefold:'drievoudige herhaling',fifty:'50-zettenregel',
      queen:'Dame',rook:'Toren',bishop:'Loper',knight:'Paard',preview:'Sluit dit tabblad.'},
    sv:{title:'Schack',white:'Vit',black:'Svart',cpu:'MuPi',two:'2 spelare',opponent:'Motståndare',difficulty:'Nivå',
      novice:'Nybörjare',easy:'Lätt',normal:'Medel',hard:'Svår',yourColor:'Din färg',limit:'Tid per drag',unlimited:'Obegränsad',
      moves:'drag',avg:'Snitt/drag',new:'Nytt parti',undo:'Ångra',history:'Drag',exit:'Avsluta',
      choose:'Välj pjäs',cancel:'Avbryt',claim:'Begär remi',hint:'Tryck på en pjäs och sedan markerad ruta. Pilar/A: välj; B: avbryt.',
      toMove:'att spela',check:'Schack!',thinking:'MuPi tänker …',mate:'Schackmatt',stalemate:'Patt – remi',material:'Remi – otillräckligt material',
      draw:'Remi',timeout:'Tiden ute',wins:'vinner',threefold:'trefaldig upprepning',fifty:'50-dragsregeln',
      queen:'Dam',rook:'Torn',bishop:'Löpare',knight:'Springare',preview:'Stäng fliken.'}
  };
  let language='de', text=translations.de;
  let positions=[C.fromFen(C.START_FEN)], moveNames=[], durations={1:[],'-1':[]};
  let selected=-1, pending=null, cursor=C.index('e2'), lastMove=null, finished=null, thinking=false, aiTimer=null;
  let turnStart=performance.now(), carried=0, paused=false, cachedStatus=null;
  const state=()=>positions[positions.length-1];
  const duration=()=>carried + (paused?0:Math.max(0,(performance.now()-turnStart)/1000));
  const limit=()=>Number(els.limit.value)||0;
  const playerColor=()=>Number(els.color.value);
  const aiTurn=()=>els.mode.value==='ai' && state().t===-playerColor();
  const currentStatus=()=>cachedStatus||(cachedStatus=C.status(positions));
  const isOver=()=>Boolean(finished)||currentStatus().done;
  const who=c=>c===1?text.white:text.black;
  const clockFormat=seconds=>{
    const total=Math.max(0,Math.floor(seconds));
    return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
  };
  const average=list=>!list.length?'–':(list.reduce((a,b)=>a+b,0)/list.length).toFixed(1)+' s';
  const elapsedFor=c=>state().t===c&&!isOver()?duration():(durations[c].at(-1)||0);
  function clearAI(){if(aiTimer!==null) clearTimeout(aiTimer);aiTimer=null;thinking=false;}
  function resetClock(){turnStart=performance.now();carried=0;paused=false;}
  function pause(){if(!paused){carried=duration();paused=true;}}
  function resume(){if(paused){turnStart=performance.now();paused=false;}}
  function label(s){
    if (finished) return finished;
    const result=currentStatus();
    if (result.reason==='checkmate') return text.mate+' – '+who(result.winner)+' '+text.wins;
    if (result.reason==='stalemate') return text.stalemate;
    if (result.reason==='material') return text.material;
    if (result.done) return text.draw;
    if (thinking) return text.thinking;
    return who(s.t)+' '+text.toMove+(result.check?' · '+text.check:'');
  }
  function renderClock(){
    const s=state(), max=limit();
    for(const c of [1,-1]){
      const id=c===1?'white':'black', card=$('card-'+id), active=s.t===c&&!isOver(), elapsed=elapsedFor(c);
      card.classList.toggle('active',active);card.classList.toggle('danger',active&&max>0&&max-elapsed<=5);
      $('timer-'+id).textContent=clockFormat(elapsed);
      $('average-'+id).textContent=average(durations[c]);
      $('moves-'+id).textContent=String(durations[c].length);
    }
  }
  function renderBoard(){
    const s=state(), moves=C.legal(s), targets=selected<0?[]:moves.filter(m=>m[0]===selected).map(m=>m[1]);
    const checkedKing=C.inCheck(s)?s.b.indexOf(s.t===1?'K':'k'):-1;
    const fragment=document.createDocumentFragment();
    for(let row=0;row<8;row++) for(let col=0;col<8;col++){
      const i=row*16+col,piece=s.b[i],color=C.colorOf(piece);
      const b=document.createElement('button');b.type='button';b.className='sq '+((row+col)%2?'dark':'light');
      b.dataset.i=String(i);
      if(selected===i)b.classList.add('selected');
      if(lastMove&&lastMove.includes(i))b.classList.add('last');
      if(targets.includes(i))b.classList.add(piece==='.'?'target':'capture');
      if(cursor===i)b.classList.add('cursor');
      if(checkedKing===i)b.classList.add('in-check');
      const notation=C.square(i);
      b.setAttribute('aria-label',notation+' '+(piece==='.'?'empty':(color===1?text.white:text.black)+' '+piece));
      b.setAttribute('aria-pressed',String(selected===i));
      if(piece!=='.'){
        const span=document.createElement('span');span.className='piece '+(color===1?'white':'black');
        span.textContent=C.GLYPHS[piece];b.appendChild(span);
      }
      if(col===0){const mark=document.createElement('span');mark.className='coord';mark.textContent=String(8-row);b.appendChild(mark);}
      if(row===7){const mark=document.createElement('span');mark.className='coord file';mark.textContent='abcdefgh'[col];b.appendChild(mark);}
      fragment.appendChild(b);
    }
    els.board.replaceChildren(fragment);
  }
  function render(){
    const s=state(), result=currentStatus();
    els.status.textContent=label(s);
    const split=[];
    for(let i=0;i<moveNames.length;i+=2)split.push((Math.floor(i/2)+1)+'. '+moveNames[i]+(moveNames[i+1]?' '+moveNames[i+1]:''));
    els.history.textContent=split.join('  ')||'–';
    $('undo').disabled=positions.length===1||thinking;
    $('claim').classList.toggle('hidden',!(result.claim&&!result.done&&!finished));
    els.promotion.classList.toggle('hidden',!pending);
    $('difficulty-wrap').classList.toggle('hidden',els.mode.value==='two');
    $('color-wrap').classList.toggle('hidden',els.mode.value==='two');
    renderBoard();renderClock();
  }
  function endOnTime(){
    if(isOver()||paused||!limit()||duration()<limit())return false;
    clearAI();
    const winner=-state().t;
    // A flag fall cannot win if the opponent cannot possibly checkmate.
    const canMate=state().b.some(p=>C.colorOf(p)===winner&&p.toLowerCase()!=='k');
    finished=canMate?text.timeout+' – '+who(winner)+' '+text.wins:text.draw;
    selected=-1;pending=null;render();return true;
  }
  function makeMove(move){
    if(endOnTime()||isOver()||pending)return;
    const s=state(), chosen=C.legal(s).find(m=>C.uci(m)===C.uci(move));
    if(!chosen)return;
    const time=duration();
    const notation=C.san(s,chosen);
    durations[s.t].push(time);
    positions.push(C.apply(s,chosen));moveNames.push(notation);cachedStatus=null;
    selected=-1;lastMove=[chosen[0],chosen[1]];resetClock();
    render();queueAI();
  }
  function promote(choices){
    pending=choices;
    const box=document.createDocumentFragment();
    for(const m of choices){
      const button=document.createElement('button');button.type='button';
      button.textContent=C.GLYPHS[state().t===1?m[2].toUpperCase():m[2]];
      button.setAttribute('aria-label',text[({q:'queen',r:'rook',b:'bishop',n:'knight'})[m[2]]]);
      button.addEventListener('click',()=>{pending=null;makeMove(m);});
      box.appendChild(button);
    }
    els.promotionOptions.replaceChildren(box);render();
  }
  function choose(i){
    if(isOver()||thinking||pending||aiTurn())return;
    const s=state(), moves=C.legal(s);
    if(C.colorOf(s.b[i])===s.t){selected=selected===i?-1:i;cursor=i;render();return;}
    const choices=moves.filter(m=>m[0]===selected&&m[1]===i);
    if(choices.length>1)promote(choices);
    else if(choices.length===1)makeMove(choices[0]);
    else {selected=-1;render();}
  }
  function queueAI(){
    if(isOver()||!aiTurn()||paused)return;
    clearAI();thinking=true;render();
    aiTimer=setTimeout(()=>{
      aiTimer=null;
      if(isOver()||paused||!aiTurn())return;
      const current=state(), before=positions.length;
      const remaining=limit()?Math.max(80,(limit()-duration())*1000-300):900;
      const move=C.bestMove(current,els.difficulty.value,{budgetMs:Math.min(900,remaining)});
      thinking=false;
      if(endOnTime())return;
      if(positions.length===before && move)makeMove(move);
    },220);
  }
  function newGame(){
    clearAI();positions=[C.fromFen(C.START_FEN)];moveNames=[];durations={1:[],'-1':[]};
    selected=-1;pending=null;lastMove=null;finished=null;cachedStatus=null;cursor=C.index('e2');
    resetClock();render();queueAI();
  }
  function undo(){
    if(positions.length===1)return;
    clearAI();
    // Undo human + MuPi's answer together, or a single pending human move.
    let n=els.mode.value==='ai' && state().t===playerColor() && positions.length>2 ? 2 : 1;
    while(n-- && positions.length>1){
      positions.pop();moveNames.pop();durations[state().t].pop();
    }
    selected=-1;pending=null;lastMove=null;finished=null;cachedStatus=null;resetClock();render();queueAI();
  }
  function claimDraw(){
    const claim=currentStatus().claim;
    if(!claim||isOver())return;
    finished=text.draw+' – '+(claim==='threefold'?text.threefold:text.fifty);
    clearAI();render();
  }
  function translate(){
    const dict={title:'title','mode-label':'opponent','difficulty-label':'difficulty','color-label':'yourColor',
      'limit-label':'limit','name-white':'white','name-black':'black','average-label-white':'avg','average-label-black':'avg',
      'moves-label-white':'moves','moves-label-black':'moves','new-game':'new',undo:'undo',claim:'claim',
      'history-label':'history','promotion-label':'choose','cancel-promotion':'cancel',help:'hint'};
    for(const [id,key] of Object.entries(dict))$(id).textContent=text[key];
    $('exit').setAttribute('aria-label',text.exit);
    $('exit').setAttribute('title',text.exit);
    els.mode.options[0].textContent=text.cpu;els.mode.options[1].textContent=text.two;
    const keys=['novice','easy','normal','hard'];
    [...els.difficulty.options].forEach((opt,i)=>opt.textContent=text[keys[i]]);
    els.color.options[0].textContent=text.white;els.color.options[1].textContent=text.black;
    els.limit.options[0].textContent=text.unlimited;
    document.title='MuPi '+text.title;
    render();
  }
  els.board.addEventListener('click',event=>{
    const btn=event.target.closest('button[data-i]');
    if(btn)choose(Number(btn.dataset.i));
  });
  $('cancel-promotion').addEventListener('click',()=>{pending=null;render();});
  $('exit').addEventListener('click',()=>{
    void sdk.exit().then(handled=>{if(!handled&&!sdk.isHosted)els.status.textContent=text.preview;}).catch(()=>{});
  });
  $('new-game').addEventListener('click',newGame);
  $('undo').addEventListener('click',undo);
  $('claim').addEventListener('click',claimDraw);
  [els.mode,els.color,els.limit,els.difficulty].forEach(control=>control.addEventListener('change',newGame));
  sdk.on('input',({button,action})=>{
    if(action!=='press')return;
    if(button==='BACK'){void sdk.exit();return;}
    if(button==='B'){if(pending)pending=null;selected=-1;render();return;}
    if(button==='X'){newGame();return;}
    if(button==='A'){choose(cursor);return;}
    const d={LEFT:-1,RIGHT:1,UP:-16,DOWN:16}[button];
    if(d){
      const col=cursor&7,row=cursor>>4;
      if((d===-1&&col===0)||(d===1&&col===7)||(d===-16&&row===0)||(d===16&&row===7))return;
      cursor+=d;renderBoard();
    }
  });
  sdk.on('lifecycle.pause',()=>{pause();clearAI();render();});
  sdk.on('lifecycle.resume',()=>{resume();render();queueAI();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){pause();clearAI();} else {resume();render();queueAI();}
  });
  document.addEventListener('keydown',e=>{
    if(e.code==='KeyR' && !['SELECT','INPUT'].includes(e.target.tagName)){e.preventDefault();newGame();}
  });
  window.setInterval(()=>{if(!endOnTime())renderClock();},150);
  (async()=>{
    try{
      const ctx=await sdk.getContext();
      const lang=String(ctx?.language||'de').split(/[-_]/)[0].toLowerCase();
      language=translations[lang]?lang:'de';text=translations[language];
      document.documentElement.lang=language;
    }catch(_) { /* no host context: German default */ }
    translate();newGame();
  })();
})();
