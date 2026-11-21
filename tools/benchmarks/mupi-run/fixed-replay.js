// Test fixture shared by Chromium and QML. One input schedule for both runtimes.
function fixedReplay(rules, poses, sound) {
    const inputs = {209:"left",390:"jump",612:"duck",722:"duck",1246:"duck",1286:"right",1287:"right",
        1445:"duck",1676:"left",1819:"jump",1995:"duck",2160:"jump",2200:"left",2323:"duck",2443:"right",2555:"jump"};
    let tick = 0;
    return Object.assign({}, rules, {
        advance(state, elapsed) {
            if (state.phase !== "running" || tick >= 2880) return;
            const total = state.simulationRemainder + elapsed;
            const ticks = Math.min(2880 - tick, Math.floor(total * 60 + 1e-9));
            state.simulationRemainder = Math.max(0, total - ticks / 60);
            for (let i = 0; i < ticks && state.phase === "running"; i++, tick++) {
                const input = inputs[tick];
                if (input) {
                    const key = input === "duck" ? "slide" : input;
                    const pose = poses.actions[key];
                    const accepted = rules.act(state,input,pose ? pose.resume[Math.floor(state.runPose)] : null);
                    if (!accepted) throw Error("replay rejected input at " + tick);
                    if (pose) sound(key);
                }
                rules.step(state,1/60);
            }
        },
        finished() { return tick === 2880; }
    });
}
