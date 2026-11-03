package game

import "testing"

func TestRowWin(t *testing.T) {
    b := New()
    for _, index := range []int{0, 3, 1, 4, 2} { b.Play(index) }
    if state := b.State(); state.Winner != "X" || !state.Finished { t.Fatalf("unexpected result: %+v", state) }
}

func TestDiagonalWin(t *testing.T) {
    b := New()
    for _, index := range []int{0, 1, 4, 2, 8} { b.Play(index) }
    if state := b.State(); state.Winner != "X" || !state.Finished { t.Fatalf("unexpected result: %+v", state) }
}

func TestDraw(t *testing.T) {
    b := New()
    for _, index := range []int{0, 1, 2, 4, 3, 5, 7, 6, 8} { b.Play(index) }
    if state := b.State(); state.Winner != "" || !state.Finished { t.Fatalf("unexpected draw result: %+v", state) }
}

func TestInvalidMoveDoesNotChangeGame(t *testing.T) {
    b := New()
    if got := b.Play(-1); got.Error == "" { t.Fatal("negative position accepted") }
    b.Play(0)
    if got := b.Play(0); got.Error == "" || got.Cells[0] != "X" || got.Next != "O" { t.Fatalf("invalid move changed board: %+v", got) }
}

func TestReset(t *testing.T) {
    b := New()
    b.Play(0)
    if state := b.Reset(); state.Cells[0] != "" || state.Next != "X" || state.Finished { t.Fatalf("reset failed: %+v", state) }
}
