// Package game implements the portable MuPi Kreuz & Kreis rules without host dependencies.
package game

// State is a complete JSON-friendly snapshot of the board.
type State struct {
    Cells    [9]string `json:"cells"`
    Next     string    `json:"next"`
    Winner   string    `json:"winner"`
    Finished bool      `json:"finished"`
    Error    string    `json:"error,omitempty"`
}

type Board struct {
    state State
    moves int
}

func New() *Board { b := &Board{}; b.Reset(); return b }

func (b *Board) Reset() State {
    b.state = State{Next: "X"}
    b.moves = 0
    return b.State()
}

func (b *Board) State() State {
    s := b.state
    s.Error = ""
    return s
}

func (b *Board) Play(index int) State {
    s := b.State()
    switch {
    case index < 0 || index >= len(s.Cells):
        s.Error = "Invalid position"
        return s
    case s.Finished:
        s.Error = "Game already finished"
        return s
    case s.Cells[index] != "":
        s.Error = "Position already occupied"
        return s
    }
    b.state.Cells[index] = b.state.Next
    b.moves++
    for _, trio := range [][3]int{
        {0, 1, 2}, {3, 4, 5}, {6, 7, 8},
        {0, 3, 6}, {1, 4, 7}, {2, 5, 8},
        {0, 4, 8}, {2, 4, 6},
    } {
        if v := b.state.Cells[trio[0]]; v != "" && v == b.state.Cells[trio[1]] && v == b.state.Cells[trio[2]] {
            b.state.Winner = v
            b.state.Finished = true
            break
        }
    }
    if b.moves == 9 { b.state.Finished = true }
    if !b.state.Finished {
        if b.state.Next == "X" { b.state.Next = "O" } else { b.state.Next = "X" }
    }
    return b.State()
}
