//go:build js && wasm

package main

import (
    "syscall/js"
    "github.com/splitti/MuPiBox-NG-Plugins/examples/tic-tac-toe/game"
)

func toJS(s game.State) any {
    cells := make([]any, len(s.Cells))
    for i, v := range s.Cells { cells[i] = v }
    return map[string]any{
        "cells": cells, "next": s.Next, "winner": s.Winner,
        "finished": s.Finished, "error": s.Error,
    }
}

func main() {
    board := game.New()
    play := js.FuncOf(func(_ js.Value, args []js.Value) any {
        if len(args) == 0 || args[0].Type() != js.TypeNumber {
            return js.ValueOf(map[string]any{"error": "Missing numeric index"})
        }
        return js.ValueOf(toJS(board.Play(args[0].Int())))
    })
    reset := js.FuncOf(func(_ js.Value, _ []js.Value) any { return js.ValueOf(toJS(board.Reset())) })
    snapshot := js.FuncOf(func(_ js.Value, _ []js.Value) any { return js.ValueOf(toJS(board.State())) })
    js.Global().Set("mupiTicTacToePlay", play)
    js.Global().Set("mupiTicTacToeReset", reset)
    js.Global().Set("mupiTicTacToeState", snapshot)
    select {} // Keep Go callbacks alive for the lifetime of the web view.
}
