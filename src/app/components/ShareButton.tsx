import { useState } from "react";

type Props = {
  disabled: boolean;
  text: string;
};

export function ShareButton({ disabled, text }: Props) {
  const [copied, setCopied] = useState(false);

  async function onClick(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="share-btn" disabled={disabled} onClick={() => void onClick()}>
      {copied ? "Copied" : "Share"}
    </button>
  );
}

