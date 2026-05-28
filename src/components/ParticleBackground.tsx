import { useEffect, useRef } from "react"

const SPACING = 20
const CROSS_ARM = 1
const DOT_ALPHA = 0.28

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
const REPULSION_RADIUS = 110
const REPULSION_FORCE = 3.5
const SPRING = 0.06
const DAMPING = 0.82
const RESOLUTION = 2

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    hx: number
    hy: number
    alpha: number
}

interface ParticleBackgroundProps {
    flipped?: boolean
    className?: string
}

export function ParticleBackground({
    flipped = false,
    className = "h-screen",
}: ParticleBackgroundProps = {}) {
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
            const cx = width / 2
            const cy = flipped ? height : 0
            const maxR = Math.hypot(width / 2, height)
            const cols = Math.floor(width / SPACING)
            const rows = Math.floor(height / SPACING)
            const offX = (width - (cols - 1) * SPACING) / 2
            const offY = (height - (rows - 1) * SPACING) / 2
            for (let j = 0; j < rows; j++) {
                for (let i = 0; i < cols; i++) {
                    const x = offX + i * SPACING
                    const y = offY + j * SPACING
                    const radial = Math.min(1, Math.hypot(x - cx, y - cy) / maxR)
                    const vt = flipped ? 1 - y / height : y / height
                    const intensity = (1 - radial * radial) * (1 - vt * vt * 0.6)
                    const threshold = (BAYER_8[j % 8][i % 8] + 0.5) / 64
                    if (intensity <= threshold) continue
                    const baseAlpha = DOT_ALPHA * (1 - radial * 0.5) * (1 - vt * vt * 0.85)
                    next.push({
                        x,
                        y,
                        vx: 0,
                        vy: 0,
                        hx: x,
                        hy: y,
                        alpha: baseAlpha,
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
        <div
            ref={containerRef}
            className={`absolute inset-x-0 -z-10 ${flipped ? "bottom-0" : "top-0"} pointer-events-none ${className}`}
        >
            <canvas ref={canvasRef} className="block" />
        </div>
    )
}
