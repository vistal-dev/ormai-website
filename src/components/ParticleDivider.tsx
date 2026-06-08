import { useEffect, useRef } from "react"

const SPACING = 14
const ROW_SPACING = 8
const ROWS = 3
const JITTER = 2
const CROSS_ARM = 1
const DOT_ALPHA = 0.5
const EDGE_FADE = 0.15
const REPULSION_RADIUS = 80
const REPULSION_FORCE = 2.5
const SPRING = 0.06
const DAMPING = 0.82
const RESOLUTION = 2

// Same Bayer matrix the other particle components use for dithered dropout.
const BAYER_8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
]

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    hx: number
    hy: number
    alpha: number
}

interface ParticleDividerProps {
    className?: string
}

export function ParticleDivider({ className = "h-12" }: ParticleDividerProps = {}) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const container = containerRef.current
        const canvas = canvasRef.current
        if (!container || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let width = container.clientWidth
        let height = container.clientHeight
        let particles: Particle[] = []
        let mouseX = -9999
        let mouseY = -9999
        let raf = 0

        const buildParticles = () => {
            const next: Particle[] = []
            const centerY = height / 2
            const cols = Math.max(1, Math.floor(width / SPACING))
            const offX = (width - (cols - 1) * SPACING) / 2
            const halfSpan = (ROWS - 1) / 2

            for (let r = 0; r < ROWS; r++) {
                const rowOffset = r - halfSpan
                const rowDist = halfSpan === 0 ? 0 : Math.abs(rowOffset) / halfSpan
                // Center row keeps everything; outer rows dither out.
                const rowIntensity = 1 - rowDist * 0.7
                // Outer rows also dim slightly on top of the dropout.
                const rowAlphaFactor = 1 - rowDist * 0.35

                for (let i = 0; i < cols; i++) {
                    const threshold = (BAYER_8[r % 8][i % 8] + 0.5) / 64
                    if (rowIntensity <= threshold) continue

                    const x = offX + i * SPACING
                    // Stable pseudo-random jitter — different seed per row.
                    const hash = Math.sin((i + r * 137) * 12.9898) * 43758.5453
                    const j = hash - Math.floor(hash)
                    const y = centerY + rowOffset * ROW_SPACING + (j - 0.5) * 2 * JITTER

                    const t = cols > 1 ? i / (cols - 1) : 0.5
                    const edgeFade =
                        t < EDGE_FADE ? t / EDGE_FADE :
                        t > 1 - EDGE_FADE ? (1 - t) / EDGE_FADE :
                        1

                    next.push({
                        x,
                        y,
                        vx: 0,
                        vy: 0,
                        hx: x,
                        hy: y,
                        alpha: DOT_ALPHA * edgeFade * rowAlphaFactor,
                    })
                }
            }
            particles = next
        }

        const resize = () => {
            width = container.clientWidth
            height = container.clientHeight
            const dpr = (window.devicePixelRatio || 1) * RESOLUTION
            canvas.width = Math.round(width * dpr)
            canvas.height = Math.round(height * dpr)
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            buildParticles()
        }

        const ro = new ResizeObserver(resize)
        ro.observe(container)

        const onMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            mouseX = e.clientX - rect.left
            mouseY = e.clientY - rect.top
        }

        const onLeave = () => {
            mouseX = -9999
            mouseY = -9999
        }

        window.addEventListener("mousemove", onMove)
        window.addEventListener("mouseleave", onLeave)

        const tick = () => {
            ctx.clearRect(0, 0, width, height)

            for (const p of particles) {
                const dx = p.x - mouseX
                const dy = p.y - mouseY
                const dist = Math.hypot(dx, dy)

                if (dist < REPULSION_RADIUS && dist > 0) {
                    const falloff = 1 - dist / REPULSION_RADIUS
                    const force = falloff * falloff * REPULSION_FORCE
                    p.vx += (dx / dist) * force
                    p.vy += (dy / dist) * force
                }

                p.vx += (p.hx - p.x) * SPRING
                p.vy += (p.hy - p.y) * SPRING
                p.vx *= DAMPING
                p.vy *= DAMPING
                p.x += p.vx
                p.y += p.vy

                ctx.fillStyle = `rgba(255,255,255,${p.alpha})`
                const px = Math.round(p.x)
                const py = Math.round(p.y)
                ctx.fillRect(px - CROSS_ARM, py, CROSS_ARM * 2 + 1, 1)
                ctx.fillRect(px, py - CROSS_ARM, 1, CROSS_ARM * 2 + 1)
            }

            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            window.removeEventListener("mousemove", onMove)
            window.removeEventListener("mouseleave", onLeave)
        }
    }, [])

    return (
        <div ref={containerRef} className={`w-full ${className}`}>
            <canvas ref={canvasRef} className="block" />
        </div>
    )
}
