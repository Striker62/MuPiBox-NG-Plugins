// Injected into an instrumented copy before the unchanged Web app boots.
(() => {
    let state, first=0;
    const clock = fixedReplay(window.MuPiRun,window.MuPiPoses,key=>window.MuPiRunSession.play(key));
    window.MuPiRun = clock;
    const create = window.createRunWorld, times=[];
    window.createRunWorld=(...args)=>{
        const world=create(...args),draw=world.render;
        world.render=(s,...rest)=>{
            draw(s,...rest);
            state=s;
            if(first && s.phase==="running") times.push(performance.now());
        };
        return world;
    };
    const nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    async function run() {
        while(!state || document.querySelector("#primary").disabled) await nap(20);
        Object.assign(state,clock.fresh(414));
        console.log("MUPIBENCH READY "+JSON.stringify({pageMs:performance.now()}));
        document.querySelector("#primary").click();
        first=performance.now();
        while(!clock.finished() && state.phase==="running" && performance.now()-first<90000) await nap(20);
        console.log("MUPIBENCH FIXED "+JSON.stringify({distance:state.distance,notes:state.noteCount,waves:state.waves,phase:state.phase,
            elapsed:performance.now()-first,times:times.map(t=>Math.round((t-first)*100)/100)}));
        document.querySelector("#exit").click();
        console.log("MUPIBENCH DONE "+clock.finished());
    }
    run().catch(e=>console.log("MUPIBENCH ERROR "+String(e)));
})();
