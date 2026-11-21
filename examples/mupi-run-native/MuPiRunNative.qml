import QtQuick
import "RunLogic.js" as Logic
import "RunWorld.js" as Geometry
import "RunTiles.js" as Tiles
import "RunPoses.js" as Poses

// First-party scene. NG ships this code and supplies scoped services via host.
Item {
    id: gameView
    objectName: "mupibox-trusted-runner"
    width: 800
    height: 480
    focus: true
    property bool autoStart: false
    property bool autoPilot: false
    property bool soundEnabled: false
    property var host: null
    property url assetsBase: Qt.resolvedUrl("assets/")
    function art(name) { return assetsBase.toString() + name + ".png" }
    property string phase: "ready"
    property real distanceMeters: 0
    property int visibleSlots: 0
    property bool measureTiming: false
    property bool settingsOpen: false
    property bool useGpuRoad: GraphicsInfo.api !== GraphicsInfo.Software
    function effect(name) { if (host && soundEnabled) host.effect(name) }
    function leave() { exitRequested("native_back") }
    property bool showControls: true
    property int seed: (Math.random()*2147483647) | 0
    property var game: Logic.MuPiRun
    property var state: Logic.MuPiRun.fresh(seed)
    property var sceneryCache: []
    property var displayObjects: []
    property int renderVersion: 0
    property string terrain: "river"
    property string spritePage: "mupi-running-24.ready.png"
    property var spriteRect: Qt.rect(0,0,125,128)
    property real contactX: 400
    property real jumpLift:0
    property real runnerX: 0
    property real runnerY: 0
    property real runnerW: 0
    property real runnerH: 0
    property int paintFrames: 0
    property int guiFrames: 0
    property double lastMeasuredFrameMs: -1
    property var timestamps: []
    property double startWallMs: 0
    property int best: 0
    property int overCount: 0
    property string loadError: ""
    property int loadedImages: 0
    property bool initialized: false
    readonly property var requiredImages: [
        "scenery-background","splash","title","notes","butterflies","shadow","hint-duck","hint-jump","hint-dodge","oak","pine","fern-bed",
        "moss-rock","sleeping-fox","timber-bridge","windfall","branch","vine","rail-post",
        "stump","reeds","stepping-stones","mupi-running-24.ready","jump-0.ready",
        "jump-1.ready","jump-2.ready","slide-0.ready","slide-1.ready","slide-2.ready"
    ].concat(useGpuRoad ? ["ground-atlas"] : [])
    readonly property bool loading: loadedImages < requiredImages.length || (host !== null && !host.audioReady)
    Repeater {
        model:gameView.requiredImages
        delegate:Image {
            required property int index
            required property string modelData
            visible:false; asynchronous:true;cache:true
            source:index<=gameView.loadedImages ? gameView.art(modelData) : ""
            onStatusChanged:{
                if(status===Image.Error) gameView.loadError=modelData
                if(status===Image.Ready && index===gameView.loadedImages)
                    Qt.callLater(function(){
                        if(index===gameView.loadedImages)gameView.loadedImages++
                    })
            }
        }
    }
    function whenReady(){
        if(!initialized || loading || loadError) return
        if(autoStart && phase==="ready") act("start")
        forceActiveFocus()
    }
    onLoadingChanged:whenReady()

    property real scaleToScreen: Math.min(width/800,height/480)
    property int roadPhase: 0
    signal exitRequested(string reason)
    signal frameRecorded(real ms)

    function pad2(n) { return n<10 ? "0"+n : String(n); }
    function restart() {
        state = game.fresh(autoPilot ? seed : (Date.now() >>> 0))
        sceneryCache = []
        game.act(state,'start')
        rebuildScene()
    }
    function act(name) {
        if(loading||loadError)return false
        if(settingsOpen && name!=="exit")return false
        if(name==='restart'){restart();return true}
        if(name==='exit'){exitRequested('native_exit');return true}
        if(name==='start'&&state.phase==='over'){restart();return true}
        var action = name === 'duck' ? 'slide' : name
        var animation = Poses.MuPiPoses.actions[action]
        var resume = animation ? animation.resume[Math.floor(state.runPose)] : null
        var changed=game.act(state,name,resume)
        if(changed && animation) effect(action)
        if(changed)rebuildScene()
        return changed
    }
    function rebuildScene() {
        var s=state
        phase=s.phase
        distanceMeters=s.distance
        terrain=game.terrainAt(s.distance)
        roadPhase=Math.floor(s.distance/2)%12
        displayObjects=Geometry.buildObjects(s,sceneryCache,game)
        visibleSlots=Math.max(visibleSlots,displayObjects.length)
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
        contactX=p.x
        jumpLift=game.jumpHeight(s)/45
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
            if(a)act(a)
        }
        if(state.phase==='running'){
            var before=state.phase
            var notesBefore=state.noteCount
            game.advance(state,seconds)
            if(state.noteCount>notesBefore)effect("collect")
            if(before==='running' && state.phase==='over'){
                overCount++
                if(Math.floor(state.distance)>best){
                    best=Math.floor(state.distance)
                    if(host)host.saveBest(best)
                }
                rebuildScene()
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
    property real simulationDebt: 0
    onPhaseChanged: simulationDebt=0
    onVisibleChanged: if(!visible && phase==="running") act("pause")

    FrameAnimation {
        running:gameView.visible && gameView.phase==="running" && !gameView.loading
        onTriggered: {
            gameView.guiFrames++
            var now=Date.now()
            if(gameView.measureTiming && gameView.lastMeasuredFrameMs>0) {
                var dt=now-gameView.lastMeasuredFrameMs
                gameView.timestamps.push(dt)
                gameView.frameRecorded(dt)
            }
            gameView.lastMeasuredFrameMs=now
            // Bound work on the GUI thread after a missed swap; retain owed ticks.
            gameView.simulationDebt+=Math.max(0,frameTime)
            let slice=Math.min(.125,gameView.simulationDebt)
            gameView.simulationDebt-=slice
            gameView.advance(slice)
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
        rebuildScene()
        initialized=true
        whenReady()
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
            x: -38+12*Math.sin(gameView.distanceMeters*.012)
            width:876;height:480
            source:gameView.art("scenery-background")
            fillMode:Image.Stretch
            asynchronous:false
            cache:true
        }
        // The software scene graph uses precomputed ground phases.
        Image {
            x:0;y:157;width:800;height:323
            visible:!gameView.useGpuRoad
            source:visible ? gameView.art('road-'+gameView.terrain+'-'+gameView.pad2(gameView.roadPhase)) : ""
            fillMode:Image.Stretch
            asynchronous:true
            cache:true
        }
        ShaderEffect {
            x:0;y:157;width:800;height:323
            visible:gameView.useGpuRoad
            property real distanceMeters:gameView.distanceMeters
            property var ground:Image {
                source:gameView.useGpuRoad ? gameView.art("ground-atlas") : ""
                visible:false;smooth:false
            }
            fragmentShader:Qt.resolvedUrl("road.frag.qsb")
        }
        Repeater {
            model: gameView.visibleSlots
            delegate:Item {
                id:worldItem
                required property int index
                property var obj: gameView.displayObjects[index] || null
                visible:!!obj
                x:obj?obj.x:0;y:obj?obj.y:0
                width:obj?obj.w:0;height:obj?obj.h:0
                z:obj?100-obj.worldZ:0
                property bool note:obj && obj.source==="notes"
                property bool wings:obj && obj.source==="butterflies"
                property bool rope:obj && obj.source==="rope"
                rotation:rope?obj.angle:0
                transformOrigin:Item.Left
                Rectangle {anchors.fill:parent;visible:worldItem.rope;color:"#72533b"}
                clip:note||wings
                Image {
                    width:worldItem.width*(worldItem.note?12:worldItem.wings?8:1)
                    height:worldItem.height*(worldItem.wings?3:1)
                    x:worldItem.obj?-worldItem.obj.frame*worldItem.width:0
                    y:worldItem.obj?-worldItem.obj.row*worldItem.height:0
                    source:worldItem.obj && !worldItem.rope ? gameView.art(worldItem.obj.source):""
                    fillMode:Image.Stretch
                    cache:true
                }
            }
        }
        Rectangle {
            x:gameView.contactX-width/2;y:431
            width:64-18*gameView.jumpLift;height:10-3.2*gameView.jumpLift
            radius:6;color:"#55212b1c";z:98.09
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
                source:gameView.assetsBase.toString()+gameView.spritePage
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
        Rectangle {z:201;x:16;y:12;width:289;height:55;radius:12;color:'#80203951';border.color:'#88cddd'}
        Image { z:202;x:20;y:14;width:72;height:52;source:gameView.art("title");fillMode:Image.PreserveAspectFit }
        Text {
            z:202;x:102;y:18;width:202;height:42
            text: {var frame=gameView.renderVersion;return Math.floor(gameView.state.distance)+' m   ♫ '+gameView.state.noteCount+'   ★ '+gameView.best}
            color:'#fff4d2';font.pixelSize:19;font.bold:true
            verticalAlignment:Text.AlignVCenter
        }
        Rectangle {
            z:202;x:720;y:13;width:60;height:48;radius:12;color:'#99305064';border.color:'#c6e8ff'
            Text {anchors.centerIn:parent;text:'Ⅱ';color:'white';font.pixelSize:28}
            MouseArea {anchors.fill:parent;onClicked:gameView.act('pause')}
        }
        Item {
            z:203;visible:gameView.showControls && gameView.phase==='running'
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
            z:204
            anchors.fill:parent
            color:'#9b0a1d31'
            visible:gameView.phase!=='running'&&!gameView.autoPilot
            Image {
                visible:gameView.phase==='ready'
                source:gameView.art('splash')
                anchors.fill:parent
                fillMode:Image.PreserveAspectCrop
            }
            Rectangle {visible:gameView.phase!=="ready";x:102;y:110;width:596;height:245;radius:32;color:'#dc19364e';border.color:'#ffe49b';border.width:2}
            Rectangle {visible:gameView.phase==="ready";x:0;y:0;width:478;height:480
                gradient:Gradient {orientation:Gradient.Horizontal;GradientStop {position:0;color:"#df071c14"} GradientStop {position:1;color:"transparent"}}}
            Text {
                x:145;y:125;width:510;height:84
                horizontalAlignment:Text.AlignHCenter
                visible:gameView.phase!=='ready'
                text:gameView.phase==='ready'?'MuPi RUN':gameView.phase==='paused'?'PAUSE':'AUSGELAUFEN!'
                font.bold:true;font.pixelSize:52;color:'#ffe49b'
            }
            Text {
                x:gameView.phase==='ready'?40:155;y:210;width:gameView.phase==='ready'?310:490;height:72;wrapMode:Text.WordWrap
                horizontalAlignment:Text.AlignHCenter
                text:gameView.loadError ? 'Bild konnte nicht geladen werden: '+gameView.loadError : gameView.phase==='ready'?'Laufen · Springen · Grätschen · Noten sammeln':
                     gameView.phase==='paused'?'Weiterlaufen oder zurück zum Menü':
                       Math.floor(gameView.state.distance)+' Meter  ·  ♫ '+gameView.state.noteCount
                font.pixelSize:18;color:'white'
            }
            Image { visible:gameView.phase==='ready';x:34;y:42;width:315;height:160;source:gameView.art("title");fillMode:Image.PreserveAspectFit }
            Rectangle {
                x:gameView.phase==='ready'?52:230;y:gameView.phase==='ready'?294:266;width:gameView.phase==='ready'?262:340;height:62;radius:24;color:gameView.phase==='ready'?'#ffd573':'#247b63';border.color:'#b9f1d5';border.width:2
                Text {anchors.centerIn:parent;text:gameView.loading?'LÄDT …':gameView.phase==='ready'?'LOS GEHT’S!':gameView.phase==='paused'?'WEITERLAUFEN':'NOCH MAL!';color:gameView.phase==='ready'?'#37260d':'white';font.pixelSize:26;font.bold:true}
                MouseArea {anchors.fill:parent;onClicked:gameView.phase==='over'?gameView.restart():gameView.act(gameView.phase==='ready'?'start':'pause')}
            }
        }
        Rectangle {
            z:206;x:12;y:411;width:108;height:55;radius:12;color:"#cf19364e"
            visible:gameView.phase!=="running" && !gameView.autoPilot
            Text {anchors.centerIn:parent;text:"Zurück";color:"white";font.pixelSize:21}
            MouseArea {anchors.fill:parent;onClicked:gameView.leave()}
        }
        Rectangle {
            z:206;x:626;y:411;width:162;height:55;radius:12;color:"#cf19364e"
            visible:!!gameView.host && gameView.phase!=="running"
            Text {anchors.centerIn:parent;text:gameView.settingsOpen?"Schließen":"Lautstärke";color:"white";font.pixelSize:21}
            MouseArea {anchors.fill:parent;onClicked:gameView.settingsOpen=!gameView.settingsOpen}
        }
        Rectangle {
            z:205;anchors.fill:parent;color:"#f219364e";visible:gameView.settingsOpen
            MouseArea {anchors.fill:parent}
            Repeater {
                model:["Musik","Effekte"]
                delegate:Item {
                    id:levelRow
                    required property int index
                    required property string modelData
                    x:135;y:135+index*86;width:530;height:65
                    Text {anchors.verticalCenter:parent.verticalCenter;color:"white";font.pixelSize:25
                        text:modelData+"   "+(gameView.host?(index===0?gameView.host.musicLevel:gameView.host.effectLevel):0)+" %"}
                    Row { x:300;spacing:12
                        Repeater {
                            model:[-5,5]
                            delegate:Rectangle {
                                required property int modelData
                                width:76;height:58;radius:12;color:"#356c72"
                                Text {anchors.centerIn:parent;text:parent.modelData>0?"+":"−";color:"white";font.pixelSize:32}
                                MouseArea {anchors.fill:parent;onClicked:gameView.host.changeLevel(levelRow.index===0,modelData)}
                            }
                        }
                    }
                }
            }
        }
    }
}
