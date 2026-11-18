/* Bundled audio playback for browser preview.
 * MuPiBox-NG host does not route WebAudio/HTMLMedia through native PipeWire.
 * On the box the app uses the SDK's approved audio.note fallback instead.
 */
const WaterBattleAudio = (() => {
 "use strict";
 const SOUNDS=Object.freeze({
  miss:"assets/audio/miss.ogg",
  hit:"assets/audio/hit.ogg",
  sunk:"assets/audio/sunk.ogg",
  win:"assets/audio/win.ogg",
  lose:"assets/audio/lose.ogg"
 });
 const create=(src,loop=false)=>{
  if(typeof Audio==="undefined")return null;
  const a=new Audio(src);
  a.preload="auto";
  a.loop=loop;
  return a;
 };
 class Player {
  constructor(hosted=false){
   this.hosted=hosted;
   this.music=hosted?null:create("assets/audio/bg-music.ogg",true);
   this.sfx=hosted?{}:Object.fromEntries(Object.entries(SOUNDS).map(([key,url])=>[key,create(url)]));
   this.volume=40;this.musicVolume=20;this.muted=false;this.musicEnabled=true;
   this.musicStarted=false;
   this.sync();
  }
  sync(){
   if(this.music){
    this.music.volume=this.muted||!this.musicEnabled?0:Math.min(1,this.musicVolume/100);
    if(this.muted||!this.musicEnabled)this.music.pause();
    else if(this.musicStarted)this.music.play().catch(()=>{});
   }
   for(const element of Object.values(this.sfx))
    if(element)element.volume=this.muted?0:Math.min(1,this.volume/100);
  }
  configure({volume=this.volume,musicVolume=this.musicVolume,muted=this.muted,musicEnabled=this.musicEnabled}={}){
   this.volume=Math.max(0,Math.min(100,Number(volume)));
   this.musicVolume=Math.max(0,Math.min(100,Number(musicVolume)));
   this.muted=Boolean(muted);this.musicEnabled=Boolean(musicEnabled);this.sync();
  }
  startMusic(){
   this.musicStarted=true;
   if(this.music&&!this.muted&&this.musicEnabled)
    this.music.play().catch(()=>{});
  }
  stopMusic(){
   this.musicStarted=false;
   if(this.music){this.music.pause();this.music.currentTime=0;}
  }
  pause(){if(this.music)this.music.pause();}
  sound(name){
   const a=this.sfx[name];
   if(!a||this.muted||this.volume<=0)return false;
   try{a.pause();a.currentTime=0;const result=a.play();if(result&&result.catch)result.catch(()=>{});return true;}
   catch(error){return false;}
  }
 }
 return {Player,SOUNDS};
})();
if(typeof module!=="undefined")module.exports=WaterBattleAudio;
