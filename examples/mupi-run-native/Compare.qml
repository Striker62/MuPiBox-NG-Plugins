import QtQuick
import QtQuick.Window
Window {
    id: window
    width: 800; height: 480; visible: true
    property double opened: Date.now()
    property double startTime: 0
    property double lastSwap: 0
    property int lastRevision: -1
    property int delivered: 0
    property var gaps: []
    property int duration: Qt.application.arguments.indexOf("--soak") >= 0 ? 1800000 : 48000
    MuPiRunNative {
        id: run
        anchors.fill: parent
        autoPilot: true
        autoStart: true
        soundEnabled: false
        seed: 414
    }
    onFrameSwapped: {
        if (run.loading || run.renderVersion === lastRevision) return
        lastRevision = run.renderVersion
        let now = Date.now()
        if (startTime === 0) {
            startTime = now
            console.log("RUN_READY",now-opened)
        } else {
            gaps.push(now-lastSwap)
            delivered++
        }
        lastSwap = now
    }
    Timer {
        interval: window.duration; running: true
        onTriggered: {
            let end = Date.now()
            let sorted = window.gaps.slice().sort((a,b)=>a-b)
            function quantile(q) { return sorted[Math.floor((sorted.length-1)*q)] }
            console.log("RUN_MEASURE",JSON.stringify({fps:window.delivered*1000/(end-window.startTime),
                frames:window.delivered,p50:quantile(.5),p95:quantile(.95),p99:quantile(.99),
                max:quantile(1),over100:sorted.filter(x=>x>100).length,over33:sorted.filter(x=>x>33.3).length,
                meters:run.state.distance,notes:run.state.noteCount,collisions:run.overCount,outputVolume:0}))
            Qt.quit()
        }
    }
}
