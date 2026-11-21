import QtQuick
import "RunLogic.js" as Logic
import "RunWorld.js" as Geometry
import "RunTiles.js" as Tiles
import "RunPoses.js" as Poses

// Trusted FIRST-PARTY Qt Quick port of the ORIGINAL MuPi Run 0.8.7 physics.
// This is NOT executable QML from an installed Community App: the alpha.70
// host intentionally forbids that. Runs standalone for controlled benchmarks.
Item {
    id: gameView
    objectName: "mupi-run-native-prototype"
    width: 800
    height: 480
    focus: true
    property bool autoStart: false
    property bool autoPilot: false
    property bool soundEnabled: false  // Intentionally disabled for quiet hardware QA.
    property bool showControls: true
    property bool benchSkipScenery: false
    property bool benchFreezeRoad: false
    property int seed: 414
    property var game: Logic.MuPiRun
    property var state: Logic.MuPiRun.fresh(seed)
    property var sceneryCache: []
    property var displayObjects: []
    property int renderVersion: 0
    property string terrain: "river"
    property string spritePage: "mupi-running-24.ready.png"
    property var spriteRect: Qt.rect(0,0,125,128)
    property real runnerX: 0
    property real runnerY: 0
    property real runnerW: 0
    property real runnerH: 0
    property int paintFrames: 0
    property int swapFrames: 0
    property int guiFrames: 0
    property double lastMeasuredFrameMs: -1
    property var timestamps: []
    property double startWallMs: 0
    property int best: 0
    property int overCount: 0
    property bool loading: true
    property real scaleToScreen: Math.min(width/800,height/480)
    property int roadPhase: 0
    signal exitRequested(string reason)
    signal frameRecorded(real ms)

    function pad2(n) { return n<10 ? "0"+n : String(n); }
    function restart() {
        state = game.fresh(seed)
        sceneryCache = []
        game.act(state,'start')
        rebuildScene()
    }
    function act(name) {
        if(name==='restart'){restart();return true}
        if(name==='exit'){exitRequested('native_exit');return true}
        if(name==='start'&&state.phase==='over'){restart();return true}
        var changed=game.act(state,name)
        if(changed)rebuildScene()
        return changed
    }
    function rebuildScene() {
        var s=state
        terrain=game.terrainAt(s.distance)
        roadPhase=Math.floor(s.distance/2)%12
        displayObjects=Geometry.buildObjects(s,sceneryCache,game)
        var name='mupi-running-24',tile=Math.floor(s.runPose)%24
        var spec=null,ox=256,oy=486,dw=512,dh=512
        var age=s.jumpAge>=0?s.jumpAge:s.duckAge
        if(age>=0){
            var action=s.jumpAge>=0?'jump':'slide'
            var frame=Math.max(0,Math.min(34,Math.floor(age*30+1e-8)))
            spec=Poses.MuPiPoses.actions[action]
            var absolute=spec.clips[s.entryPose][frame]
            name=action+'-'+Math.floor(absolute/60)
            tile=absolute%60
            ox=spec.origin[0];oy=spec.origin[1]
            dw=spec.draw[0];dh=spec.draw[1]
        }
        var tilePage=Tiles.MuPiRunTiles[name]
        if(!tilePage||!tilePage.tiles[tile]){
            console.warn('MUPI_RUN_NATIVE_BAD_ATLAS: '+name+'/'+tile)
            return
        }
        var rect=tilePage.tiles[tile]  // [dx,dy,sourceX,sourceY,cropW,cropH]
        var p=Geometry.project(1.9,s.visualLane*.555,s.distance)
        var xscale=dw*205/512/tilePage.w
        var yscale=dh*205/512/tilePage.h
        spritePage=name+'.ready.png'
        spriteRect=Qt.rect(rect[2],rect[3],rect[4],rect[5])
        runnerX=p.x-ox*205/512+rect[0]*xscale
        runnerY=p.y-oy*205/512+rect[1]*yscale
        runnerW=rect[4]*xscale
        runnerH=rect[5]*yscale
        renderVersion++
        paintFrames++
    }
    function advance(seconds) {
        if(autoPilot && state.phase==='running') {
            var a=Geometry.autopilot(game,state)
            if(a)game.act(state,a)
        }
        if(state.phase==='running'){
            var before=state.phase
            game.advance(state,seconds)
            if(before==='running' && state.phase==='over'){
                overCount++
                best=Math.max(best,Math.floor(state.distance))
                if(autoPilot)restart()
            }
        }
        // Original 60-Hz simulation, 30-Hz rendered pose updates.
        var slot=Math.floor(Math.round(state.time*60)/2)
        if(slot!==previousPaintSlot){
            previousPaintSlot=slot
            rebuildScene()
        }
    }
    property int previousPaintSlot: -1

    FrameAnimation {
        running: gameView.visible
        onTriggered: {
            gameView.guiFrames++
            var now=Date.now()
            if(gameView.lastMeasuredFrameMs>0) {
                var dt=now-gameView.lastMeasuredFrameMs
                gameView.timestamps.push(dt)
                gameView.frameRecorded(dt)
            }
            gameView.lastMeasuredFrameMs=now
            var dt2=Math.min(.075,Math.max(0,frameTime))
            // Like the web game, a huge display stall pauses, never teleports.
            if(frameTime>1 && gameView.state.phase==='running')gameView.act('pause')
            else gameView.advance(dt2)
        }
    }

    Keys.onPressed: (event) => {
        var code=event.key
        if(code===Qt.Key_Left||code===Qt.Key_A) act('left')
        else if(code===Qt.Key_Right||code===Qt.Key_D) act('right')
        else if(code===Qt.Key_Up||code===Qt.Key_W||code===Qt.Key_Space) act('jump')
        else if(code===Qt.Key_Down||code===Qt.Key_S) act('duck')
        else if(code===Qt.Key_P||code===Qt.Key_Return) {
            if(state.phase==='ready')act('start')
            else if(state.phase==='over')restart()
            else act('pause')
        }
        else if(code===Qt.Key_Escape||code===Qt.Key_Back) exitRequested('native_back')
        else return
        event.accepted=true
    }
    Component.onCompleted: {
        // Do not play samples/music during benchmarking (0% output <=5%).
        if(soundEnabled)console.warn('MUPI_RUN_NATIVE_AUDIO: prototype has no active audio output')
        rebuildScene()
        if(autoStart)game.act(state,'start')
        rebuildScene()
        forceActiveFocus()
        loading=false
        startWallMs=Date.now()
    }

    Item {
        id: scaled
        width:800;height:480
        x:(gameView.width-800*gameView.scaleToScreen)/2
        y:(gameView.height-480*gameView.scaleToScreen)/2
        transform:Scale {origin.x:0;origin.y:0;xScale:gameView.scaleToScreen;yScale:gameView.scaleToScreen}
        clip:true
        Rectangle {anchors.fill:parent;color:'#122b35'}
        Image {
            anchors.fill:parent
            source:'assets/scenery-background.png'
            fillMode:Image.Stretch
            asynchronous:false
            cache:true
        }
        // Same authored 3 terrain textures and perspective projection, but
        // precomputed into 2m ground phases instead of WebEngine per-pixel CPU.
        Image {
            x:0;y:157;width:800;height:323
            source:'assets/road-'+gameView.terrain+'-'+gameView.pad2(gameView.roadPhase)+'.png'
            fillMode:Image.Stretch
            asynchronous:true
            cache:true
        }
        Repeater {
            model: gameView.benchSkipScenery?0:80
            delegate:Item {
                id:worldItem
                property var o: {var f=gameView.renderVersion;return index<gameView.displayObjects.length?gameView.displayObjects[index]:null}
                visible:!!o && o.w>0 && o.h>0 && o.x+o.w>=0 && o.x<=800 && o.y+o.h>=0 && o.y<=480
                x:visible?o.x:0;y:visible?o.y:0
                width:visible?o.w:1;height:visible?o.h:1
                z:o?100-o.worldZ:0
                Image {
                    anchors.fill:parent
                    visible:worldItem.visible && o && o.source!=='note' && o.source!=='butterfly'
                    source:visible?'assets/'+o.source+'.png':''
                    fillMode:Image.PreserveAspectFit
                    asynchronous:true;cache:true
                }
                Text {
                    anchors.fill:parent
                    visible:worldItem.visible && o && (o.source==='note'||o.source==='butterfly')
                    text:o && o.source==='butterfly'?'✦':'♫'
                    color:o && o.source==='butterfly'?'#eebbff':'#ffdf70'
                    font.bold:true
                    font.pixelSize:Math.max(3,worldItem.height)
                    horizontalAlignment:Text.AlignHCenter
                    verticalAlignment:Text.AlignVCenter
                }
            }
        }
        Item {
            id:runner
            x:gameView.runnerX;y:gameView.runnerY
            width:gameView.runnerW;height:gameView.runnerH
            z:100-1.9
            visible:true
            // Keep each atlas page on the GPU. Moving a clipped texture is
            // cheaper than requesting a new sourceClipRect/decode each frame.
            clip:true
            Image {
                id:atlasImage
                source:'assets/'+gameView.spritePage
                width:Math.max(1,implicitWidth)*gameView.runnerW/Math.max(1,gameView.spriteRect.width)
                height:Math.max(1,implicitHeight)*gameView.runnerH/Math.max(1,gameView.spriteRect.height)
                x:-gameView.spriteRect.x*gameView.runnerW/Math.max(1,gameView.spriteRect.width)
                y:-gameView.spriteRect.y*gameView.runnerH/Math.max(1,gameView.spriteRect.height)
                fillMode:Image.Stretch
                asynchronous:false
                cache:true
                smooth:true
            }
        }
        // Game HUD: native touch/keys. Controller input may be forwarded by
        // the trusted host, not read from /dev/input by third-party QML.
        Rectangle {x:16;y:12;width:270;height:55;radius:12;color:'#80203951';border.color:'#88cddd'}
        Text {
            x:24;y:18;width:250;height:42
            text: {var frame=gameView.renderVersion;return 'MuPi RUN  '+Math.floor(gameView.state.distance)+' m  ♫ '+gameView.state.noteCount}
            color:'#fff4d2';font.pixelSize:19;font.bold:true
            verticalAlignment:Text.AlignVCenter
        }
        Rectangle {
            x:720;y:13;width:60;height:48;radius:12;color:'#99305064';border.color:'#c6e8ff'
            Text {anchors.centerIn:parent;text:'Ⅱ';color:'white';font.pixelSize:28}
            MouseArea {anchors.fill:parent;onClicked:gameView.act('pause')}
        }
        Item {
            visible:gameView.showControls && gameView.state.phase==='running'
            anchors.fill:parent
            Rectangle {x:14;y:393;width:73;height:70;radius:20;color:'#99345976';border.color:'#bbdeed'
                Text {anchors.centerIn:parent;text:'◀';color:'white';font.pixelSize:30}
                MouseArea {anchors.fill:parent;onClicked:gameView.act('left')}
            }
            Rectangle {x:96;y:393;width:73;height:70;radius:20;color:'#99345976';border.color:'#bbdeed'
                Text {anchors.centerIn:parent;text:'▶';color:'white';font.pixelSize:30}
                MouseArea {anchors.fill:parent;onClicked:gameView.act('right')}
            }
            Rectangle {x:614;y:393;width:80;height:70;radius:20;color:'#99605c36';border.color:'#ffe49b'
                Text {anchors.centerIn:parent;text:'↑';color:'white';font.pixelSize:35}
                MouseArea {anchors.fill:parent;onClicked:gameView.act('jump')}
            }
            Rectangle {x:704;y:393;width:80;height:70;radius:20;color:'#99605c36';border.color:'#ffe49b'
                Text {anchors.centerIn:parent;text:'↓';color:'white';font.pixelSize:35}
                MouseArea {anchors.fill:parent;onClicked:gameView.act('duck')}
            }
        }
        Rectangle {
            id:menu
            anchors.fill:parent
            color:'#9b0a1d31'
            visible:gameView.state.phase!=='running'&&!gameView.autoPilot
            Image {
                visible:gameView.state.phase==='ready'
                source:'assets/scenery-background.png'
                anchors.fill:parent;opacity:.35
                fillMode:Image.PreserveAspectCrop
            }
            Rectangle {x:102;y:110;width:596;height:245;radius:32;color:'#dc19364e';border.color:'#ffe49b';border.width:2}
            Text {
                x:145;y:125;width:510;height:84
                horizontalAlignment:Text.AlignHCenter
                text:gameView.state.phase==='ready'?'MuPi RUN':gameView.state.phase==='paused'?'PAUSE':'AUSGELAUFEN!'
                font.bold:true;font.pixelSize:52;color:'#ffe49b'
            }
            Text {
                x:155;y:210;width:490;height:38
                horizontalAlignment:Text.AlignHCenter
                text:gameView.state.phase==='ready'?'Laufen · Springen · Grätschen · Noten sammeln':
                     gameView.state.phase==='paused'?'Weiterlaufen oder zurück zum Menü':
                       Math.floor(gameView.state.distance)+' Meter  ·  ♫ '+gameView.state.noteCount
                font.pixelSize:18;color:'white'
            }
            Rectangle {
                x:230;y:266;width:340;height:68;radius:24;color:'#247b63';border.color:'#b9f1d5';border.width:2
                Text {anchors.centerIn:parent;text:gameView.state.phase==='ready'?'LOS GEHT’S!':gameView.state.phase==='paused'?'WEITERLAUFEN':'NOCH MAL!';color:'white';font.pixelSize:26;font.bold:true}
                MouseArea {anchors.fill:parent;onClicked:gameView.state.phase==='over'?gameView.restart():gameView.act(gameView.state.phase==='ready'?'start':'pause')}
            }
        }
    }
}
