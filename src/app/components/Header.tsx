import { useState } from "react";

type Props = {
  puzzleNo: number;
};

export function Header({ puzzleNo }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <header className="page-header">
      <div>
        <h1>DevGuess</h1>
        <p>#{puzzleNo}</p>
      </div>
      <button type="button" className="ghost-btn" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        How it works
      </button>
      {open ? (
        <div className="help-panel">
          <p>Green means exact match, yellow is related, gray is no match.</p>
          <p>Year cell arrows: ↑ means answer is newer, ↓ means answer is older.</p>
          <p>Icons: ✓ match, • partial, × no match.</p>
        </div>
      ) : null}
    </header>
  );
}

