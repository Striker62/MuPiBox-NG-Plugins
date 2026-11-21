import QtQuick
import QtQuick.Window
Window {
 id:benchWindow
 visible:true;width:800;height:480
 title:'MuPi Run native – GPU scene stress (AUDIO MUTED 0%)'
 property var bins: ({river:[],boardwalk:[],forest:[]})
 MuPiRunNative {
  id:run;anchors.fill:parent
  autoStart:true;autoPilot:true;soundEnabled:false;showControls:false;seed:414
  onFrameRecorded: (ms)=> {
   var name=run.state.lastTerrain
   if(benchWindow.bins[name])benchWindow.bins[name].push(ms)
  }
 }
 Timer {
  running:true;repeat:false;interval:45000
  onTriggered: {
   var result={seconds:(Date.now()-run.startWallMs)/1000,guiFrames:run.guiFrames,
     paintFrames:run.paintFrames,distance:run.state.distance,notes:run.state.noteCount,
     overCount:run.overCount,audioVolumePercent:0,terrain:{}}
   for(var name in benchWindow.bins){
    var a=benchWindow.bins[name].slice().sort((x,y)=>x-y)
    function perc(p){return a.length?a[Math.floor((a.length-1)*p)]:0}
    result.terrain[name]={frames:a.length,p50:perc(.5),p95:perc(.95),p99:perc(.99),
      max:perc(1),over100:a.filter(x=>x>100).length}
   }
   result.sceneFps=run.paintFrames/result.seconds
   result.windowFps=run.guiFrames/result.seconds
   console.log('MUPI_NATIVE_ZONES_JSON '+JSON.stringify(result))
   Qt.quit()
  }
 }
}
