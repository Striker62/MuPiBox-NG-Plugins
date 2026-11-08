/* MuPi Schach: self-contained 0x88 chess rules + bounded offline AI (MIT). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MuPiChess = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const DIRECTIONS = {n:[-33,-31,-18,-14,14,18,31,33],b:[-17,-15,15,17],r:[-16,-1,1,16],q:[-17,-16,-15,-1,1,15,16,17],k:[-17,-16,-15,-1,1,15,16,17]};
  const VALUES = {p:100,n:320,b:330,r:500,q:900,k:0};
  const GLYPHS = {K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'\u265F\uFE0E','.':''};
  const inside = i => i >= 0 && i < 128 && !(i & 0x88);
  const colorOf = p => !p || p === '.' ? 0 : p === p.toUpperCase() ? 1 : -1;
  const square = i => 'abcdefgh'[i & 7] + (8 - (i >> 4));
  const index = str => (8 - Number(str[1])) * 16 + 'abcdefgh'.indexOf(str[0]);
  const uci = m => square(m[0]) + square(m[1]) + (m[2] || '');

  function fromFen(fen) {
    const f = fen.trim().split(/\s+/), rows = f[0].split('/'), b = Array(128).fill('.');
    if (rows.length !== 8 || !/^[wb]$/.test(f[1]) || !/^(?:-|K?Q?k?q?)$/.test(f[2]) || !/^(?:-|[a-h][36])$/.test(f[3])) throw Error('Invalid FEN');
    rows.forEach((row, r) => {
      let c = 0;
      for (const p of row) {
        if (/^[1-8]$/.test(p)) c += Number(p);
        else { if (!/^[prnbqkPRNBQK]$/.test(p) || c >= 8) throw Error('Invalid FEN rank'); b[r*16+c++] = p; }
      }
      if (c !== 8) throw Error('Invalid FEN rank');
    });
    if (b.filter(x => x === 'K').length !== 1 || b.filter(x => x === 'k').length !== 1) throw Error('FEN needs both kings');
    return {b, t:f[1]==='w'?1:-1,
      c:(f[2].includes('K')?1:0)|(f[2].includes('Q')?2:0)|(f[2].includes('k')?4:0)|(f[2].includes('q')?8:0),
      ep:f[3]==='-'?-1:index(f[3]), half:Number(f[4]||0), full:Number(f[5]||1)};
  }

  function attacked(s, target, by) {
    for (let f=0; f<128; f++) {
      if (!inside(f) || colorOf(s.b[f]) !== by) continue;
      const p=s.b[f].toLowerCase();
      if (p==='p') {if (target===f-16*by-1 || target===f-16*by+1) return true;continue;}
      for (const d of DIRECTIONS[p]) {
        for (let to=f+d; inside(to); to+=d) {
          if (to===target) return true;
          if (s.b[to]!=='.' || p==='n' || p==='k') break;
        }
      }
    }
    return false;
  }
  function inCheck(s, c=s.t) {return attacked(s, s.b.indexOf(c===1?'K':'k'), -c);}

  function apply(s, m) {
    const [f, to, promote, flag] = m, b=s.b.slice(), piece=b[f], captured=b[to];
    let c=s.c;
    b[f]='.';
    b[to]=promote ? (s.t===1?promote.toUpperCase():promote) : piece;
    if (flag==='ep') b[to+16*s.t]='.';
    if (flag==='castle') {
      const rf=to>f?f+3:f-4, rt=to>f?f+1:f-1;
      b[rt]=b[rf]; b[rf]='.';
    }
    if (piece==='K') c &= ~3;
    if (piece==='k') c &= ~12;
    const rooks={119:1,112:2,7:4,0:8};
    if (piece.toLowerCase()==='r') c &= ~(rooks[f]||0);
    if (captured.toLowerCase()==='r') c &= ~(rooks[to]||0);
    const pawn=piece.toLowerCase()==='p';
    return {b,t:-s.t,c,ep:pawn&&Math.abs(to-f)===32?(to+f)/2:-1,
      half:pawn||captured!=='.'||flag==='ep'?0:s.half+1,
      full:s.full+(s.t===-1?1:0)};
  }

  function pseudo(s) {
    const out=[];
    for (let f=0; f<128; f++) {
      if (!inside(f) || colorOf(s.b[f])!==s.t) continue;
      const p=s.b[f].toLowerCase();
      const add=(to, flag='') => {
        if (s.b[to].toLowerCase()==='k') return;
        if (p==='p' && (to>>4===0 || to>>4===7)) {
          for (const promotion of ['q','r','b','n']) out.push([f,to,promotion,flag]);
        } else out.push([f,to,'',flag]);
      };
      if (p==='p') {
        const to=f-16*s.t;
        if (inside(to) && s.b[to]==='.') {
          add(to);
          const twice=to-16*s.t;
          if ((f>>4)===(s.t===1?6:1) && s.b[twice]==='.') add(twice);
        }
        for (const dx of [-1,1]) {
          const target=to+dx;
          if (!inside(target)) continue;
          if (colorOf(s.b[target])===-s.t) add(target);
          else if (target===s.ep && s.b[target]==='.' && s.b[target+16*s.t]===(s.t===1?'p':'P')) add(target,'ep');
        }
      } else {
        for (const d of DIRECTIONS[p]) {
          for (let to=f+d; inside(to); to+=d) {
            if (colorOf(s.b[to])===s.t) break;
            add(to);
            if (s.b[to]!=='.' || p==='n' || p==='k') break;
          }
        }
        const home=s.t===1?116:4, rook=s.t===1?'R':'r', bits=s.t===1?[1,2]:[4,8];
        if (p==='k' && f===home && !inCheck(s)) {
          if ((s.c&bits[0]) && s.b[f+3]===rook && s.b[f+1]==='.' && s.b[f+2]==='.' &&
              !attacked(s,f+1,-s.t) && !attacked(s,f+2,-s.t)) add(f+2,'castle');
          if ((s.c&bits[1]) && s.b[f-4]===rook && s.b[f-1]==='.' && s.b[f-2]==='.' && s.b[f-3]==='.' &&
              !attacked(s,f-1,-s.t) && !attacked(s,f-2,-s.t)) add(f-2,'castle');
        }
      }
    }
    return out;
  }
  const legal = s => pseudo(s).filter(m => !inCheck(apply(s,m),s.t));
  const findMove = (s, move) => legal(s).find(m => uci(m)===move);

  function san(s,m) {
    const [f,to,promote,flag]=m, kind=s.b[f].toUpperCase(), takes=s.b[to]!=='.'||flag==='ep';
    let name='';
    if (flag==='castle') name=to>f?'O-O':'O-O-O';
    else {
      if (kind!=='P') {
        name=kind;
        const others=legal(s).filter(x=>x[0]!==f&&x[1]===to&&s.b[x[0]]===s.b[f]);
        if (others.length) name+=!others.some(x=>(x[0]&7)===(f&7))?square(f)[0]:
          !others.some(x=>(x[0]>>4)===(f>>4))?square(f)[1]:square(f);
      } else if (takes) name=square(f)[0];
      name+=(takes?'x':'')+square(to)+(promote?'='+promote.toUpperCase():'');
    }
    const next=apply(s,m);
    return name + (inCheck(next) ? (legal(next).length?'+':'#'):'');
  }
  const moveLabel=(s,m)=>s.full+(s.t===1?'. ':'... ')+san(s,m);

  function positionKey(s) {
    // EP is relevant only if an en-passant capture is actually legal.
    const activeEp=s.ep>=0 && legal(s).some(m=>m[3]==='ep') ? s.ep : -1;
    return s.b.join('')+':'+s.t+':'+s.c+':'+activeEp;
  }
  function insufficient(s) {
    const pieces=[];
    for (let i=0;i<128;i++) if (inside(i) && s.b[i]!=='.' && s.b[i].toLowerCase()!=='k')
      pieces.push([s.b[i].toLowerCase(), ((i>>4)+(i&7))%2]);
    return pieces.length===0 || (pieces.length===1 && ['b','n'].includes(pieces[0][0])) ||
      (pieces.every(p=>p[0]==='b') && new Set(pieces.map(p=>p[1])).size===1);
  }
  function status(history) {
    const s=history[history.length-1], moves=legal(s), check=inCheck(s);
    if (!moves.length) return {done:true,reason:check?'checkmate':'stalemate',winner:check?-s.t:0,claim:null,check};
    if (insufficient(s)) return {done:true,reason:'material',winner:0,claim:null,check};
    const repetitions=history.filter(p=>positionKey(p)===positionKey(s)).length;
    if (s.half>=150 || repetitions>=5) return {done:true,reason:s.half>=150?'seventyfive':'fivefold',winner:0,claim:null,check};
    return {done:false,reason:null,winner:null,claim:repetitions>=3?'threefold':s.half>=100?'fifty':null,check};
  }
  function evaluate(s) {
    let score=0;
    for (let i=0;i<128;i++) {
      if (!inside(i)) continue;
      const p=s.b[i], c=colorOf(p);
      if (!c) continue;
      const type=p.toLowerCase(), file=i&7, rank=8-(i>>4);
      const center=3.5-Math.abs(file-3.5) + 3.5-Math.abs(rank-4.5);
      let bonus=(type==='n'?center*7:type==='b'?center*4:type==='q'?center*2:0);
      if (type==='p') bonus += (c===1?rank-2:7-rank)*7 + (3.5-Math.abs(file-3.5))*3;
      if (type==='k' && s.full<20) bonus += ((file===2||file===6)?24:0);
      score += c*(VALUES[type]+bonus);
    }
    return score;
  }
  const captureScore = (s,m) => {
    const target=m[3]==='ep'?'p':s.b[m[1]].toLowerCase();
    return (VALUES[target]||0)*12-(VALUES[s.b[m[0]].toLowerCase()]||0)+(m[2]?VALUES[m[2]]*8:0);
  };
  function bestMove(s, difficulty='normal', options={}) {
    const available=legal(s);
    if (!available.length) return null;
    if (difficulty==='easy') {
      const top=available.map(m=>({m,score:captureScore(s,m)+Math.random()*650})).sort((a,b)=>b.score-a.score);
      return top[Math.floor(Math.random()*Math.min(5,top.length))].m;
    }
    const maxDepth=({normal:2,hard:3,expert:4})[difficulty]||2;
    const budget=Math.max(70,Math.min(options.budgetMs||550,1800));
    const start=Date.now(), deadline=start+budget;
    let nodes=0, chosen=available[0];
    const ordered=(state,list)=>list.sort((a,b)=>captureScore(state,b)-captureScore(state,a));
    const search=(state,depth,alpha,beta)=>{
      if ((++nodes&127)===0 && Date.now()>deadline) throw Error('search-timeout');
      const possibilities=legal(state);
      if (!possibilities.length) return inCheck(state)?-100000-depth:0;
      if (depth===0) return state.t*evaluate(state);
      let best=-Infinity;
      for (const move of ordered(state,possibilities)) {
        const val=-search(apply(state,move),depth-1,-beta,-alpha);
        if (val>best) best=val;
        if (best>alpha) alpha=best;
        if (alpha>=beta) break;
      }
      return best;
    };
    for (let depth=1;depth<=maxDepth;depth++) {
      let top=chosen, topScore=-Infinity, finished=false;
      try {
        const sorted=ordered(s,available.slice());
        // Preserve the previous principal variation as a useful first guess.
        sorted.sort((a,b)=>(uci(a)===uci(chosen)?-1:0)-(uci(b)===uci(chosen)?-1:0));
        for (const move of sorted) {
          const val=-search(apply(s,move),depth-1,-Infinity,Infinity);
          if (val>topScore) {topScore=val;top=move;}
        }
        finished=true;
      } catch (e) {if (e.message!=='search-timeout') throw e;}
      if (finished) chosen=top;
      if (Date.now()>deadline) break;
    }
    return chosen;
  }
  return Object.freeze({START_FEN,GLYPHS,fromFen,inside,index,square,uci,colorOf,apply,legal,findMove,inCheck,san,moveLabel,positionKey,insufficient,status,bestMove});
});
