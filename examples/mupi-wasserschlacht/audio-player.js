/* MuPi Water Battle audio: verified bundled sounds.
 * In a browser preview, HTMLAudio plays them locally. On the Box the
 * sandboxed SDK routes samples and music through the host PipeWire mixer.
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
 const MUSIC="assets/audio/bg-music.ogg";
 const create=(src,loop=false)=>{
  if(typeof Audio==="undefined")return null;
  const a=new Audio(src);
  a.preload="auto";a.loop=loop;return a;
 };
 class Player {
  constructor(hosted=false,nativeAudio=null){
   this.hosted=hosted;
   this.native=nativeAudio;
   this.music=hosted?null:create(MUSIC,true);
   this.sfx=hosted?{}:Object.fromEntries(Object.entries(SOUNDS).map(([key,url])=>[key,create(url)]));
   this.volume=40;this.musicVolume=20;this.muted=false;this.musicEnabled=true;
   this.musicStarted=false;this.nativeMusicState="off";this.nativeMusicVolume=-1;
   this.nativeAvailable=false; // enabled only after trusted host.context capability report
   this.nativeMethodsExist=Boolean(this.native&&typeof this.native.playMusic==="function"&&typeof this.native.playSample==="function");
   this.warned=false;
   this.sync();
  }
  setNativeAvailable(enabled){
   const next=Boolean(enabled&&this.nativeMethodsExist);
   if(next===this.nativeAvailable)return;
   this.nativeAvailable=next;
   this.sync();
  }
  report(error){
   if(!this.warned&&typeof console!=="undefined"&&console.warn){
    console.warn("MuPi Water Battle: native audio not supported by this NG version",error);
    this.warned=true;
   }
  }
  sync(){
   const active=this.musicStarted&&!this.muted&&this.musicEnabled&&this.musicVolume>0;
   if(this.hosted&&this.nativeAvailable){
    if(!active){
     if(this.nativeMusicState!=="off"){
      this.nativeMusicState="off";
      this.nativeMusicVolume=-1;
      Promise.resolve(this.native.stopMusic()).catch(e=>this.report(e));
     }
    }else if(this.nativeMusicState!=="playing"||this.nativeMusicVolume!==this.musicVolume){
     const expectedVolume=this.musicVolume;
     this.nativeMusicState="playing";this.nativeMusicVolume=expectedVolume;
     Promise.resolve().then(()=>this.native.playMusic(MUSIC,expectedVolume,{relative:true})).catch(e=>{
      if(this.nativeMusicVolume===expectedVolume)this.nativeMusicState="off";
      this.report(e);
     });
    }
   }
   if(this.music){
    this.music.volume=this.muted||!this.musicEnabled?0:Math.min(1,this.musicVolume/100);
    if(!active)this.music.pause();
    else this.music.play().catch(()=>{});
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
   this.musicStarted=true;this.sync();
  }
  stopMusic(){
   this.musicStarted=false;this.sync();
   if(this.music){this.music.pause();this.music.currentTime=0;}
  }
  pause(){this.stopMusic();}
  sound(name){
   if(!SOUNDS[name]||this.muted||this.volume<=0)return Promise.resolve(false);
   if(this.hosted){
    if(!this.nativeAvailable)return Promise.resolve(false);
    return Promise.resolve().then(()=>this.native.playSample(SOUNDS[name],this.volume,{relative:true}))
      .then(result=>result!==false).catch(e=>{this.report(e);return false;});
   }
   const a=this.sfx[name];if(!a)return Promise.resolve(false);
   try{a.pause();a.currentTime=0;const result=a.play();if(result&&result.catch)result.catch(()=>{});return Promise.resolve(true);}
   catch(error){return Promise.resolve(false);}
  }
 }
 return {Player,SOUNDS,MUSIC};
})();
if(typeof module!=="undefined")module.exports=WaterBattleAudio;
