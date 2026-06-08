import { useEffect, useRef, useState, type ReactNode } from "react"

type Preset = "fade" | "none"

interface RevealProps {
  children: ReactNode
  className?: string
  /** Built-in animation preset. "fade" applies a subtle fade + blur + lift. "none" applies nothing. Default "fade". */
  preset?: Preset
  /** Stop observing after first intersection. Default true. */
  once?: boolean
  /** IntersectionObserver threshold. Default 0.15. */
  threshold?: number
  /** IntersectionObserver rootMargin. Default "0px". */
  rootMargin?: string
}

const PRESETS: Record<Preset, string> = {
  fade:
    "opacity-0 data-[in-view=true]:opacity-100 data-[in-view=true]:motion-blur-in-xs data-[in-view=true]:motion-translate-y-in-[10%] motion-duration-700",
  none: "",
}

/**
 * Wraps children in a div that gets `data-in-view="true"` once it scrolls into
 * view. Comes with a default fade preset; opt out with preset="none" and drive
 * any animation yourself via Tailwind's data-attribute variants:
 *
 * <Reveal>...</Reveal>                                    // default fade
 * <Reveal preset="none" className="opacity-0 data-[in-view=true]:opacity-100 ...">...</Reveal>
 */
export function Reveal({
  children,
  className = "",
  preset = "fade",
  once = true,
  threshold = 0.4,
  rootMargin = "0px",
}: RevealProps) {
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) obs.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold, rootMargin },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [once, threshold, rootMargin])

  const presetCls = PRESETS[preset]
  const finalCls = [presetCls, className].filter(Boolean).join(" ")

  return (
    <div ref={ref} data-in-view={inView} className={finalCls}>
      {children}
    </div>
  )
}
