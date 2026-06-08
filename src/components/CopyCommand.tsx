import { useState } from "react"

interface CopyCommandProps {
  command: string
}

export function CopyCommand({ command }: CopyCommandProps) {
  const [copied, setCopied] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setHasInteracted(true)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable or blocked — silently no-op.
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="w-full h-[32px] text-white/60 hover:text-white/80 transition-all gap-3 cursor-pointer rounded-t-sm ring-[1px] ring-border bg-bg flex items-center justify-center"
    >
      <code className="text-xs font-mono">{command}</code>
      <i
        key={hasInteracted ? (copied ? "copied" : "not-copied") : "initial"}
        className={`ph ${copied ? "ph-check" : "ph-copy"} ${hasInteracted ? "motion-blur-in-xs" : ""}`}
      ></i>
    </button>
  )
}
