/* Bundled sounds, via HTMLAudio in preview and PipeWire SDK on the box.
 * Native sample levels are updated without decoding/restarting the music.
 */
const WaterBattleAudio=(()=>{
 "use strict";
 const SOUNDS=Object.freeze({
  miss:"assets/audio/miss.ogg",hit:"assets/audio/hit.ogg",
  sunk:"assets/audio/sunk.ogg",win:"assets/audio/win.ogg",lose:"assets/audio/lose.ogg"
 });
 const MUSIC="assets/audio/bg-music.ogg";
 const create=(src,loop=false)=>{
  if(typeof Audio==="undefined")return null;
  const a=new Audio(src);a.preload="auto";a.loop=loop;return a;
 };
 class Player{
  constructor(hosted=false,nativeAudio=null){
   this.hosted=hosted;this.native=nativeAudio;
   this.music=hosted?null:create(MUSIC,true);
   this.sfx=hosted?{}:Object.fromEntries(Object.entries(SOUNDS).map(([k,v])=>[k,create(v)]));
   this.volume=40;this.musicVolume=20;this.muted=false;this.musicEnabled=true;
   this.musicStarted=false;this.nativeMusicState="off";this.nativeMusicVolume=-1;
   this.nativeAvailable=false;this.nativeVolumeControl=false;this.warned=false;
   this.nativeMethodsExist=!!(nativeAudio&&typeof nativeAudio.playMusic==="function"&&typeof nativeAudio.playSample==="function");
   this.musicQueue=Promise.resolve();this.musicTimer=null;this.sampleTimer=null;
   this.sync();
  }
  report(error){
   if(!this.warned&&typeof console!=="undefined"&&console.warn){
    console.warn("MuPi Water Battle: audio bridge",error);this.warned=true;
   }
  }
  queueMusic(operation){
   this.musicQueue=this.musicQueue.catch(()=>{}).then(operation);
   this.musicQueue.catch(e=>this.report(e));
   return this.musicQueue;
  }
  setNativeAvailable(enabled,volumeControl=false){
   const available=!!(enabled&&this.nativeMethodsExist);
   const controls=!!(available&&volumeControl&&typeof this.native.setMusicVolume==="function"&&typeof this.native.setSampleVolume==="function");
   if(available===this.nativeAvailable&&controls===this.nativeVolumeControl)return;
   this.nativeAvailable=available;this.nativeVolumeControl=controls;this.sync();
  }
  scheduleMusicLevel(){
   clearTimeout(this.musicTimer);
   if(!this.nativeVolumeControl)return;
   this.musicTimer=setTimeout(()=>{
    this.musicTimer=null;
    const requested=this.muted||!this.musicEnabled?0:this.musicVolume;
    if(this.nativeMusicState==="playing"){
     this.queueMusic(()=>this.native.setMusicVolume(requested,{relative:true}));
    }
   },95);
  }
  scheduleEffectLevel(){
   clearTimeout(this.sampleTimer);
   if(!this.nativeVolumeControl)return;
   this.sampleTimer=setTimeout(()=>{
    this.sampleTimer=null;
    const requested=this.muted?0:this.volume;
    Promise.resolve().then(()=>this.native.setSampleVolume(requested,{relative:true})).catch(e=>this.report(e));
   },95);
  }
  flushVolumes(){
   if(!this.nativeVolumeControl)return;
   clearTimeout(this.musicTimer);this.musicTimer=null;
   clearTimeout(this.sampleTimer);this.sampleTimer=null;
   if(this.nativeMusicState==="playing"){
    const requested=this.muted||!this.musicEnabled?0:this.musicVolume;
    this.queueMusic(()=>this.native.setMusicVolume(requested,{relative:true}));
   }
   const effectVolume=this.muted?0:this.volume;
   Promise.resolve().then(()=>this.native.setSampleVolume(effectVolume,{relative:true})).catch(e=>this.report(e));
  }
  sync(){
   const active=this.musicStarted&&!this.muted&&this.musicEnabled&&(this.nativeVolumeControl||this.musicVolume>0);
   if(this.hosted&&this.nativeAvailable){
    if(!active){
     clearTimeout(this.musicTimer);this.musicTimer=null;
     if(this.nativeMusicState!=="off"){
      this.nativeMusicState="off";this.nativeMusicVolume=-1;
      this.queueMusic(()=>this.native.stopMusic());
     }
    }else if(this.nativeMusicState!=="playing"){
     const requested=this.musicVolume;
     this.nativeMusicState="playing";this.nativeMusicVolume=requested;
     this.queueMusic(()=>this.native.playMusic(MUSIC,requested,{relative:true}));
    }else if(this.nativeMusicVolume!==this.musicVolume){
     this.nativeMusicVolume=this.musicVolume;
     if(this.nativeVolumeControl)this.scheduleMusicLevel();
     else this.queueMusic(()=>this.native.playMusic(MUSIC,this.musicVolume,{relative:true}));
    }
    if(this.nativeVolumeControl)this.scheduleEffectLevel();
   }
   if(this.music){
    this.music.volume=this.muted||!this.musicEnabled?0:Math.min(1,this.musicVolume/100);
    if(!active)this.music.pause();
    else this.music.play().catch(()=>{});
   }
   for(const e of Object.values(this.sfx))if(e)e.volume=this.muted?0:Math.min(1,this.volume/100);
  }
  configure({volume=this.volume,musicVolume=this.musicVolume,muted=this.muted,musicEnabled=this.musicEnabled}={}){
   this.volume=Math.max(0,Math.min(100,Number(volume)));
   this.musicVolume=Math.max(0,Math.min(100,Number(musicVolume)));
   this.muted=Boolean(muted);this.musicEnabled=Boolean(musicEnabled);this.sync();
  }
  startMusic(){this.musicStarted=true;this.sync();}
  stopMusic(){
   this.musicStarted=false;this.sync();
   if(this.music){this.music.pause();this.music.currentTime=0;}
  }
  pause(){this.stopMusic();}
  sound(kind){
   if(!SOUNDS[kind]||this.muted||this.volume<=0)return Promise.resolve(false);
   if(this.hosted){
    if(!this.nativeAvailable)return Promise.resolve(false);
    return Promise.resolve().then(()=>this.native.playSample(SOUNDS[kind],this.volume,{relative:true}))
     .then(value=>value!==false).catch(e=>{this.report(e);return false;});
   }
   const a=this.sfx[kind];if(!a)return Promise.resolve(false);
   try{a.pause();a.currentTime=0;const result=a.play();if(result&&result.catch)result.catch(()=>{});return Promise.resolve(true);}
   catch(e){return Promise.resolve(false);}
  }
 }
 return {Player,SOUNDS,MUSIC};
})();
if(typeof module!=="undefined")module.exports=WaterBattleAudio;
