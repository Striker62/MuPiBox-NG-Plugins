#!/bin/bash
set -eu
lab=$(cd "$(dirname "$0")" && pwd)
lib=/usr/lib/aarch64-linux-gnu
prefix=$lab/prefix$lib
cd "$lab"
if [ "$1" != inside ]; then exec unshare -m --propagation private -n "$0" inside "$@"; fi
shift
for kind in mnt net; do
    if [ "$(readlink /proc/self/ns/$kind)" = "$(readlink /proc/1/ns/$kind)" ];then
        echo "A private mount and network namespace is required." >&2
        exit 2
    fi
done
ip link set lo up
mkdir -p overlay/{upper,work}
mount -t overlay overlay -o lowerdir="$lib",upperdir="$lab/overlay/upper",workdir="$lab/overlay/work" "$lib"
for part in weston libweston-14; do mkdir -p "$lib/$part"; mount --bind "$prefix/$part" "$lib/$part"; done
export LD_LIBRARY_PATH="$prefix:$prefix/weston:$prefix/libweston-14"
export XDG_RUNTIME_DIR="$lab/runtime" QT_PLUGIN_PATH="$prefix/qt6/plugins" QT_QPA_PLATFORM=wayland-egl QT_WAYLAND_DISABLE_WINDOWDECORATION=1 WAYLAND_DISPLAY=run-gpu QSG_INFO=1 QSG_RHI_BACKEND=opengl
install -d -o mupibox -g mupibox -m 700 "$XDG_RUNTIME_DIR"
runuser -m -u mupibox -- "$lab/prefix/usr/bin/weston" --backend=headless --renderer=gl --shell=kiosk --socket=run-gpu --width=800 --height=480 --refresh-rate=60000 --no-config --log="$XDG_RUNTIME_DIR/weston.log" >"$lab/weston-std.log" 2>&1 &
weston=$!
trap 'kill "$weston" 2>/dev/null || :; wait "$weston" || :' EXIT
for i in $(seq 1 120); do [ -S "$XDG_RUNTIME_DIR/run-gpu" ] && break; sleep .1; done
test -S "$XDG_RUNTIME_DIR/run-gpu"
export PIPEWIRE_REMOTE=invalid-benchmark-endpoint PULSE_SERVER=unix:/nonexistent MUPIBOX_BENCH_MUTED=1
if [[ "$1" == *Web.qml || "$1" == *Hosted.qml ]]; then
  export RUN_BUNDLE=$lab/web-bench.mupiapp QTWEBENGINE_CHROMIUM_FLAGS=--mute-audio
  hostfile=$lab/nativehost
  if [[ " $* " == *" --pcm "* ]];then export RUN_BUNDLE=$lab/web-pcm.mupiapp;fi
  if [[ " $* " == *" --capture "* ]];then export RUN_BUNDLE=$lab/capture-web.mupiapp;fi
  if [[ "$1" == *Hosted.qml ]]; then hostfile=$lab/nativehost; export RUN_BUNDLE=$lab/preview.mupiapp; fi
  runuser -m -u mupibox -- "$hostfile" -test.run "^TestRendererBenchHost$" -test.v >"$lab/host.log" 2>&1 &
  hostpid=$!
  trap 'kill "$hostpid" "$weston" 2>/dev/null || :; wait || :' EXIT
  for n in $(seq 1 120); do grep -q BENCH_HOST_READY "$lab/host.log" && break; sleep .1; done
fi
echo "BENCH_QML_LAUNCH $(date +%s%3N)"
runuser -m -u mupibox -- /usr/lib/qt6/bin/qmlscene "$@"
