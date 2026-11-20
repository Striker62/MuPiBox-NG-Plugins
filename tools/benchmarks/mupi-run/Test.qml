import QtQuick
import QtQuick.Window
import QtWebEngine
Window {
    id: root
    property bool gpuProbe: false
    property bool measuring: false
    property var swaps: []
    onFrameSwapped: { if (measuring) swaps.push(Date.now()) }
    width: 800; height: 480; visible: true
    WebEngineView {
        id: page
        anchors.fill: parent
        settings.webGLEnabled: root.gpuProbe
        settings.localContentCanAccessRemoteUrls: false
        profile: WebEngineProfile { offTheRecord: true }
        url: root.gpuProbe ? "chrome://gpu" : "http://127.0.0.1:8090/plugin-apps/touch?id=community.mupi-run"
        onJavaScriptConsoleMessage: function(level,message,line,source) {
            console.log(message)
            if(message.startsWith("MUPIBENCH READY"))root.measuring=true
            if(message.startsWith("MUPIBENCH DONE")){root.measuring=false;console.log("MUPIBENCH SWAPS "+JSON.stringify(root.swaps))}
            if(message.indexOf("MUPIBENCH SNAP ")===0){
                screenshot.label=JSON.parse(message.slice(15));screenshot.restart()
            }
            if(message.indexOf("MUPIBENCH DONE")===0 || message.indexOf("MUPIBENCH ERROR")===0) finish.start()
        }
        onLoadingChanged: function(info) {
            if(info.status === WebEngineView.LoadSucceededStatus && url.toString().indexOf("chrome://gpu")===0) probe.start()
        }
    }
    Timer {
        id: screenshot
        property string label: ""
        interval: 180
        onTriggered: root.contentItem.grabToImage(result=>{
            const path=Qt.resolvedUrl("shots/"+label+".png").toString().replace("file://","");
            console.log("BENCH_SCREEN", label, result.saveToFile(path))
        })
    }
    Timer {
        id: probe; interval: 4000
        onTriggered: page.runJavaScript("(()=>{function text(e){let a=e.shadowRoot?text(e.shadowRoot):'';for(const n of e.childNodes){a+=n.nodeType===3?n.textContent:n.nodeType===1&&n.nodeName!=='STYLE'&&n.nodeName!=='SCRIPT'?text(n):''}return a+'\\n'} return text(document.body).split('\\n').map(x=>x.trim()).filter(Boolean).join(' | ').slice(0,30000)})()",v=>{console.log('GPUINFO '+v);page.runJavaScript("['webgl','webgl2'].map(k=>{let gl=document.createElement('canvas').getContext(k);if(!gl)return [k,false];let ext=gl.getExtension('WEBGL_debug_renderer_info');return [k,gl.getParameter(gl.VERSION),ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)]})",v=>{console.log('WEBGL '+JSON.stringify(v));finish.start()})})
    }
    Timer {id: finish; interval: 450; onTriggered: Qt.quit()}
}
