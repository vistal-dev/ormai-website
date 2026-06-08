import { useEffect, useRef } from "react"

const MAX_WIDTH = 720
const ASPECT = 720 / 240
const BASE_FONT_SIZE = 220
const RESOLUTION = 3
const SPACING = 4
const CROSS_ARM = 1
const REPULSION_RADIUS = 110
const REPULSION_FORCE = 3.5
const SPRING = 0.06
const DAMPING = 0.82
const TEXT = "riptide"

const WAVE_SPEED = 5
const WAVE_MAX_RADIUS = 280
const WAVE_BAND = 22
const WAVE_FORCE = 2.5

// Entry shockwave: expands from center, spawning particles as it passes over
// their home positions and giving each an outward velocity kick so they snap
// back into place via the spring.
const ENTRY_DURATION = 700
const ENTRY_KICK = 8

const COLOR_RADIUS = REPULSION_RADIUS
const HOT_R = 30
const HOT_G = 20
const HOT_B = 180

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

interface Wave {
    x: number
    y: number
    radius: number
}

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    hx: number
    hy: number
    spawned: boolean
}

export function ParticleField() {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const container = containerRef.current
        const canvas = canvasRef.current
        if (!container || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let width = MAX_WIDTH
        let height = MAX_WIDTH / ASPECT
        let scale = 1
        let particles: Particle[] = []
        let waves: Wave[] = []
        let mouseX = -9999
        let mouseY = -9999
        let raf = 0
        let entryStart: number | null = null
        // Wait until the canvas is actually intersecting the viewport AND the
        // tab is visible before starting the entry. After becoming eligible we
        // defer one more frame so the browser has guaranteed a paint before the
        // shockwave timer begins.
        let inViewport = false
        let entryReady = false

        const buildParticles = () => {
            const off = document.createElement("canvas")
            off.width = width
            off.height = height
            const offCtx = off.getContext("2d", { willReadFrequently: true })
            if (!offCtx) return

            offCtx.fillStyle = "#fff"
            offCtx.font = `700 ${BASE_FONT_SIZE * scale}px "InterVariable", system-ui, sans-serif`
            offCtx.textAlign = "center"
            offCtx.textBaseline = "middle"
            offCtx.fillText(TEXT, width / 2, height / 2)

            const { data } = offCtx.getImageData(0, 0, width, height)
            const next: Particle[] = []

            let minY = height
            let maxY = 0
            for (let y = 0; y < height; y += SPACING) {
                for (let x = 0; x < width; x += SPACING) {
                    if (data[(y * width + x) * 4 + 3] > 128) {
                        if (y < minY) minY = y
                        if (y > maxY) maxY = y
                    }
                }
            }
            const textHeight = Math.max(1, maxY - minY)

            // If the entry has already finished, new particles (from a resize)
            // should start in their settled state rather than re-triggering.
            const entryDone =
                entryStart !== null && performance.now() - entryStart >= ENTRY_DURATION

            for (let y = 0; y < height; y += SPACING) {
                const vt = (y - minY) / textHeight
                const centerY = 0.4
                const intensity =
                    vt < centerY
                        ? 1 - ((centerY - vt) / centerY) * 0.2
                        : 1 - ((vt - centerY) / (1 - centerY)) * 0.7
                for (let x = 0; x < width; x += SPACING) {
                    if (data[(y * width + x) * 4 + 3] <= 128) continue
                    const bi = (y / SPACING) | 0
                    const bj = (x / SPACING) | 0
                    const threshold = (BAYER_8[bi % 8][bj % 8] + 0.5) / 64
                    if (intensity <= threshold) continue
                    next.push({ x, y, vx: 0, vy: 0, hx: x, hy: y, spawned: entryDone })
                }
            }
            particles = next
        }

        const resize = () => {
            width = Math.min(MAX_WIDTH, container.clientWidth)
            height = width / ASPECT
            scale = width / MAX_WIDTH

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

        const io = new IntersectionObserver(
            ([entry]) => {
                inViewport = entry.isIntersecting
            },
            { threshold: 0.05 },
        )
        io.observe(canvas)

        const startTick = () => {
            if (!raf) raf = requestAnimationFrame(tick)
        }

        if (document.fonts?.ready) {
            document.fonts.ready.then(() => {
                buildParticles()
                startTick()
            })
        } else {
            startTick()
        }

        const onMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            mouseX = e.clientX - rect.left
            mouseY = e.clientY - rect.top
        }

        const onLeave = () => {
            mouseX = -9999
            mouseY = -9999
        }

        const onClick = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            waves.push({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                radius: 0,
            })
        }

        window.addEventListener("mousemove", onMove)
        window.addEventListener("mouseleave", onLeave)
        canvas.addEventListener("click", onClick)

        const tick = () => {
            ctx.clearRect(0, 0, width, height)

            const waveSpeed = WAVE_SPEED * scale
            const waveBand = WAVE_BAND * scale
            const waveMax = WAVE_MAX_RADIUS * scale
            const colorRadius = COLOR_RADIUS * scale
            const repulsionRadius = REPULSION_RADIUS * scale

            for (const w of waves) w.radius += waveSpeed
            waves = waves.filter(w => w.radius < waveMax)

            // Expanding entry shockwave from canvas center. Hold the timer
            // until the canvas is actually visible and the tab is in focus, and
            // then defer one more frame so a paint has guaranteed happened.
            if (entryStart === null && inViewport && !document.hidden) {
                if (entryReady) entryStart = performance.now()
                else entryReady = true
            }
            const cx = width / 2
            const cy = height / 2
            const entryMaxRadius = Math.hypot(width, height) / 2 + 20
            const entryRadius =
                entryStart === null
                    ? 0
                    : Math.min(1, (performance.now() - entryStart) / ENTRY_DURATION) * entryMaxRadius

            for (const p of particles) {
                if (!p.spawned) {
                    const ehx = p.hx - cx
                    const ehy = p.hy - cy
                    const homeDist = Math.hypot(ehx, ehy)
                    if (entryRadius < homeDist) continue
                    p.spawned = true
                    const len = Math.max(1, homeDist)
                    p.vx = (ehx / len) * ENTRY_KICK
                    p.vy = (ehy / len) * ENTRY_KICK
                }

                const dx = p.x - mouseX
                const dy = p.y - mouseY
                const dist = Math.hypot(dx, dy)

                const linear = Math.min(1, dist / colorRadius)
                const t = linear * linear * (3 - 2 * linear)
                const r = Math.round(HOT_R + (255 - HOT_R) * t)
                const g = Math.round(HOT_G + (255 - HOT_G) * t)
                const b = Math.round(HOT_B + (255 - HOT_B) * t)
                ctx.fillStyle = `rgb(${r},${g},${b})`

                if (dist < repulsionRadius && dist > 0) {
                    const falloff = 1 - dist / repulsionRadius
                    const force = falloff * falloff * REPULSION_FORCE
                    p.vx += (dx / dist) * force
                    p.vy += (dy / dist) * force
                }

                for (const w of waves) {
                    const wdx = p.x - w.x
                    const wdy = p.y - w.y
                    const wdist = Math.hypot(wdx, wdy)
                    const delta = Math.abs(wdist - w.radius)
                    if (delta < waveBand && wdist > 0) {
                        const bandFalloff = 1 - delta / waveBand
                        const lifeFalloff = 1 - w.radius / waveMax
                        const force = bandFalloff * lifeFalloff * WAVE_FORCE
                        p.vx += (wdx / wdist) * force
                        p.vy += (wdy / wdist) * force
                    }
                }

                p.vx += (p.hx - p.x) * SPRING
                p.vy += (p.hy - p.y) * SPRING
                p.vx *= DAMPING
                p.vy *= DAMPING
                p.x += p.vx
                p.y += p.vy

                const px = Math.round(p.x)
                const py = Math.round(p.y)
                ctx.fillRect(px - CROSS_ARM, py, CROSS_ARM * 2 + 1, 1)
                ctx.fillRect(px, py - CROSS_ARM, 1, CROSS_ARM * 2 + 1)
            }

            raf = requestAnimationFrame(tick)
        }

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            io.disconnect()
            window.removeEventListener("mousemove", onMove)
            window.removeEventListener("mouseleave", onLeave)
            canvas.removeEventListener("click", onClick)
        }
    }, [])

    return (
        <div
            ref={containerRef}
            className="w-full max-w-[720px] mx-auto"
            style={{ aspectRatio: ASPECT }}
        >
            <canvas ref={canvasRef} className="block mx-auto touch-manipulation" />
        </div>
    )
}
