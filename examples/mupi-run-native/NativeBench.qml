import QtQuick
import QtQuick.Window
Window {
    id:benchWindow
    visible:true
    width:800;height:480
    title:'MuPi Run – Native Qt Quick Benchmark (sound output 0%)'
    property int benchDurationMs:15000
    MuPiRunNative {
        id:run
        anchors.fill:parent
        autoStart:true
        autoPilot:true;measureTiming:true
        soundEnabled:false  // EXPLICITLY NO AUDIO: quieter than requested <=5%
        showControls:false
        seed:414
    }
    Timer {
        running:true;repeat:false;interval:benchWindow.benchDurationMs
        onTriggered: {
            var samples=run.timestamps.slice(Math.floor(run.timestamps.length/10)).sort((a,b)=>a-b)
            function percentile(p){return samples[Math.min(samples.length-1,Math.max(0,Math.floor(p*(samples.length-1))))]||0}
            var spent=(Date.now()-run.startWallMs)/1000
            var output={kind:'mupi-run-native-qt',display:'offscreen?',seconds:spent,
                guiFrames:run.guiFrames,paintFrames:run.paintFrames,
                sceneFps:Math.round(run.paintFrames/spent*100)/100,
                windowFps:Math.round(run.guiFrames/spent*100)/100,
                p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),max:percentile(1),
                over100:samples.filter(x=>x>100).length, distance:run.state.distance,
                notes:run.state.noteCount,terrain:run.state.lastTerrain,
                overCount:run.overCount,audioVolumePercent:0}
            console.log('MUPI_NATIVE_BENCH_JSON '+JSON.stringify(output))
            Qt.quit()
        }
    }
}
