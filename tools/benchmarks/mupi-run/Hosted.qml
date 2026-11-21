import QtQuick
import QtQuick.Window
import "fixed-replay.js" as Replay
import "runner/RunPoses.js" as Poses

// Stage beside the checkout's CommunityQtScene.qml and RunnerGame.qml.
Window {
    id: win
    width:800; height:480; visible:true
    property var game:null
    property var panel:null
    property bool soak:Qt.application.arguments.indexOf("--soak")>=0
    property bool capture:Qt.application.arguments.indexOf("--capture")>=0
    property bool inputTrial:Qt.application.arguments.indexOf("--input")>=0
    property var inputSamples:[]
    property double pressedAt:0
    property double lastInput:0
    property string inputName:""
    property int shot:0
    property bool saving:false
    readonly property var labels:["menu","river","boardwalk","forest","dense","actions","endurance"]
    readonly property var distances:[0,22,208,372,430,36,135]
    property double opened:Date.now()
    property double started:0
    property int revision:-1
    property var swaps:[]

    function find(node,name) {
        if(!node || node.objectName===name) return node
        for(let child of node.children){let hit=find(child,name); if(hit)return hit}
        return null
    }
    function tryInput() {
        if(pressedAt || Date.now()-lastInput<120)return
        if(inputSamples.length===24){
            console.log("HOST_INPUT",JSON.stringify(inputSamples))
            panel.pad({connected:true,select:true})
            return
        }
        let action=["jump","right","duck","left"][inputSamples.length%4]
        if((action==="jump"||action==="duck") && (game.state.jumpAge>=0 || game.state.duckAge>=0))return
        const before=game.renderVersion
        let down={connected:true}
        down[action==="duck"?"music":action]=true
        inputName=action
        pressedAt=Date.now()
        panel.pad(down);panel.pad({connected:true})
        if(game.renderVersion===before) {console.error("INPUT_REJECTED",action);Qt.quit()}
    }
    function snapshot() {
        if(saving) return
        if(shot===labels.length) {panel.pad({connected:true,select:true}); return}
        saving=true
        if(shot>0) {
            let distance=distances[shot],g=game.game
            let s=Object.assign(g.fresh(0x643bd8),{phase:"running",distance:distance,speed:g.speedAt(distance),
                spawnIn:100,lastTerrain:g.terrainAt(distance)})
            const dense=shot===4 || shot===6
            s.notes=Array.from({length:dense?46:7},(_,i)=>({z:4+i*(dense?2.15:7),lane:dense?i%3-1:0}))
            s.obstacles=[{kind:"avoid",item:"stump",lane:-1,z:17},{kind:"avoid",item:"fox",lane:1,z:48}]
            if(shot===5){s.jumpAge=.33;s.entryPose=13}
            if(shot===6){s.duckAge=.47;s.entryPose=2}
            game.state=s
            game.sceneryCache=[]
            game.rebuildScene()
        }
        snap.restart()
    }
    Timer {
        id:snap;interval:450
        onTriggered:win.contentItem.grabToImage(result=>{
            const file=Qt.resolvedUrl("shots/"+win.labels[win.shot]+".png").toString().replace("file://","")
            console.log("BENCH_SCREEN",win.labels[win.shot],result.saveToFile(file))
            win.shot++;win.saving=false
        })
    }
    CommunityQtScene {
        id:page;anchors.fill:parent
        entry:"scene.json";appID:"community.mupi-run-native"
        onExitRequested:function(reason){console.log("HOST_EXIT",reason);Qt.quit()}
    }
    Timer {
        interval:20;repeat:true;running:true
        onTriggered:{
            if(!win.game)win.game=win.find(page,"mupibox-trusted-runner")
            if(!win.game || game.loading || !game.host.audioReady)return
            if(!started) {
                win.panel=game.host
                if(capture) {
                    game.game=Object.assign({},game.game,{advance:function(){}})
                    win.started=Date.now()
                    win.snapshot();return
                }
                game.state=game.game.fresh(414)
                game.seed=414
                game.autoPilot=soak
                if(inputTrial) game.state.spawnIn=100000
                if(!soak && !inputTrial) game.game=Replay.fixedReplay(game.game,Poses.MuPiPoses,key=>game.effect(key))
                panel.pad({connected:true,start:true});panel.pad({connected:true})
                win.started=Date.now()
                console.log("HOST_READY",started-opened);console.log("BENCH_READY_AT",started)
            }
            if(capture){win.snapshot();return}
            if(inputTrial){win.tryInput();return}
            let elapsed=Date.now()-started
            const running = game.phase === "running"
            const complete = soak ? running && elapsed >= 1800000 : running && game.game.finished()
            if (running && !complete && (soak || elapsed < 90000)) return
            stop()
            console.log("HOST_RESULT",JSON.stringify({complete:complete,elapsed:elapsed,times:swaps,distance:game.state.distance,
                notes:game.state.noteCount,waves:game.state.waves,phase:game.phase,collisions:game.overCount}))
            panel.pad({connected:true,start:true});panel.pad({connected:true})
            if(game.phase!=="paused")console.error("PAUSE_FAILED")
            panel.pad({connected:true,start:true});panel.pad({connected:true})
            panel.pad({connected:true,select:true})
        }
    }
    onFrameSwapped:{
        if(!started || capture || !game || revision===game.renderVersion)return
        revision=game.renderVersion
        if(inputTrial && pressedAt) {
            const now=Date.now()
            inputSamples.push({action:inputName,ms:now-pressedAt})
            pressedAt=0;lastInput=now
        }
        swaps.push(Date.now()-started)
    }
}
