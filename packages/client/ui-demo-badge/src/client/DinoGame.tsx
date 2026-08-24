/**
 * DinoGame: the Chrome offline dinosaur game, played in the composer dock
 * band, drawn from Chrome's own spritesheet.
 *
 * Sprite coordinates, frame sizes, obstacle metrics, and per-part collision
 * boxes are the upstream values (chromium `offline.js` / t-rex-runner), so the
 * art and the hitboxes match the original rather than approximating it. The
 * sheet ships inlined in `sprites.ts`.
 *
 * All game state lives in refs driven by one requestAnimationFrame loop and
 * painted to a canvas; React state carries only what the surrounding chrome
 * renders (score, high score, phase), so a 60fps loop never re-renders the
 * tree.
 *
 * The high score is the one durable fact: it is read from localStorage on
 * mount and written back whenever a run beats it, so it survives both a page
 * reload and a host process restart.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { SPRITE_1X, SPRITE_2X } from './sprites.ts'
import css from './DinoGame.module.css'

/** localStorage key holding the best score across runs. */
const HIGH_SCORE_KEY = 'dsh.demoBadge.dinoHighScore'

/**
 * Logical canvas size. Upstream is 600x150 with the ground at y=127; this
 * strip is wider and shorter, so the field is cropped vertically to the band
 * around the ground line while sprite sizes stay 1:1 with the sheet.
 */
const WIDTH = 900
const HEIGHT = 90
/**
 * Upstream y coordinate that this canvas's top edge corresponds to. Every
 * upstream yPos is drawn at `yPos - Y_OFFSET`, keeping the runner and the
 * obstacles on a common baseline.
 */
const Y_OFFSET = 62
/** Upstream ground y, where the horizon line is drawn. */
const HORIZON_Y = 127

/** Sprite atlas offsets in the 1x sheet (Runner.spriteDefinition.LDPI). */
const SHEET = {
  trex: { x: 848, y: 2 },
  cactusSmall: { x: 228, y: 2 },
  cactusLarge: { x: 332, y: 2 },
  pterodactyl: { x: 134, y: 2 },
  cloud: { x: 86, y: 2 },
  horizon: { x: 2, y: 54 },
}

/** T-Rex metrics (Trex.config). */
const TREX = { w: 44, h: 47, wDuck: 59, hDuck: 25 }
/** Frame x offsets within the T-Rex strip (Trex.animFrames). */
const TREX_FRAMES = {
  waiting: 44,
  running: [88, 132],
  crashed: 220,
  ducking: [264, 323],
} satisfies { waiting: number; running: [number, number]; crashed: number; ducking: [number, number] }

/** Horizon line metrics (HorizonLine.dimensions). */
const HORIZON = { w: 600, h: 12 }
/** Cloud metrics (Cloud.config). */
const CLOUD = { w: 46, h: 14 }

const TREX_X = 40
/** Upstream ground position for the standing runner. */
const TREX_GROUND_Y = 93

const GRAVITY = 0.6
const JUMP_V = -10
const DROP_V = -5
/** Multiplier applied to gravity while the player holds Down mid-air. */
const SPEED_DROP_COEFFICIENT = 3
const MAX_JUMP_HEIGHT = 30

const START_SPEED = 5
const MAX_SPEED = 13
const ACCELERATION = 0.001

/** Upstream scores 0.025 per unit distance travelled. */
const SCORE_COEFFICIENT = 0.025

/** One collision rectangle in sprite-local coordinates. */
interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** An obstacle kind with its upstream metrics and per-part collision boxes. */
interface ObstacleType {
  name: 'CACTUS_SMALL' | 'CACTUS_LARGE' | 'PTERODACTYL'
  sheet: { x: number; y: number }
  w: number
  h: number
  /** Upstream ground offsets; a bird has three flight altitudes. Never empty. */
  yPos: [number, ...number[]]
  /** Largest group size, so cacti can appear in clusters. */
  multipleSpeed: number
  minGap: number
  minSpeed: number
  boxes: Box[]
  frames: number
}

/** Obstacle table, transcribed from `Obstacle.types`. */
const OBSTACLES: ObstacleType[] = [
  {
    name: 'CACTUS_SMALL',
    sheet: SHEET.cactusSmall,
    w: 17,
    h: 35,
    yPos: [105],
    multipleSpeed: 4,
    minGap: 120,
    minSpeed: 0,
    boxes: [
      { x: 0, y: 7, w: 5, h: 27 },
      { x: 4, y: 0, w: 6, h: 34 },
      { x: 10, y: 4, w: 7, h: 14 },
    ],
    frames: 1,
  },
  {
    name: 'CACTUS_LARGE',
    sheet: SHEET.cactusLarge,
    w: 25,
    h: 50,
    yPos: [90],
    multipleSpeed: 7,
    minGap: 120,
    minSpeed: 0,
    boxes: [
      { x: 0, y: 12, w: 7, h: 38 },
      { x: 8, y: 0, w: 7, h: 49 },
      { x: 13, y: 10, w: 10, h: 38 },
    ],
    frames: 1,
  },
  {
    name: 'PTERODACTYL',
    sheet: SHEET.pterodactyl,
    w: 46,
    h: 40,
    yPos: [100, 75, 50],
    multipleSpeed: 999,
    minGap: 150,
    minSpeed: 8.5,
    boxes: [
      { x: 15, y: 15, w: 16, h: 5 },
      { x: 18, y: 21, w: 24, h: 6 },
      { x: 2, y: 14, w: 4, h: 3 },
      { x: 6, y: 10, w: 4, h: 7 },
      { x: 10, y: 8, w: 6, h: 9 },
    ],
    frames: 2,
  },
]

/** T-Rex collision boxes (Trex.collisionBoxes). */
const TREX_BOXES = {
  running: [
    { x: 22, y: 0, w: 17, h: 16 },
    { x: 1, y: 18, w: 30, h: 9 },
    { x: 10, y: 35, w: 14, h: 8 },
    { x: 1, y: 24, w: 29, h: 5 },
    { x: 5, y: 30, w: 21, h: 4 },
    { x: 9, y: 34, w: 15, h: 4 },
  ] satisfies Box[],
  ducking: [{ x: 1, y: 18, w: 55, h: 25 }] satisfies Box[],
}

type Phase = 'idle' | 'running' | 'over'

/** One obstacle instance on the field. */
interface Obstacle {
  type: ObstacleType
  x: number
  /** Chosen upstream ground offset. */
  y: number
  /** Repeat count for cactus clusters. */
  size: number
  frame: number
  frameTimer: number
}

/** One drifting cloud. */
interface CloudSprite {
  x: number
  y: number
}

/** Mutable game state, kept out of React so the loop never re-renders. */
interface GameState {
  phase: Phase
  /** Upstream y of the runner; TREX_GROUND_Y when grounded. */
  y: number
  vy: number
  jumping: boolean
  ducking: boolean
  /** Set while Down is held mid-jump, for the upstream fast fall. */
  speedDrop: boolean
  speed: number
  distance: number
  obstacles: Obstacle[]
  clouds: CloudSprite[]
  /** Scrolling offset of the two-segment horizon line. */
  horizonX: [number, number]
  /** Which horizon variant each segment shows (the sheet holds two). */
  horizonVariant: [number, number]
  frameTimer: number
  runFrame: number
}

/**
 * Read the stored high score.
 * @returns the persisted best score, or 0 when absent or unreadable.
 */
function loadHighScore(): number {
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY)
    if (raw === null) return 0
    const value = Number.parseInt(raw, 10)
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    // A browser with storage disabled still plays; only the record is lost.
    return 0
  }
}

/**
 * Persist a new high score.
 * @param value - the score to store.
 */
function saveHighScore(value: number): void {
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(value))
  } catch {
    // Storage disabled or full: the in-memory record still drives this page.
  }
}

/**
 * Random integer in an inclusive range.
 * @param min - lower bound.
 * @param max - upper bound.
 * @returns the drawn value.
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Build the state a fresh run starts from.
 * @returns a new idle game state.
 */
function freshState(): GameState {
  const clouds: CloudSprite[] = []
  for (let i = 0; i < 4; i += 1) {
    clouds.push({ x: randomInt(0, WIDTH), y: randomInt(Y_OFFSET + 2, Y_OFFSET + 22) })
  }
  return {
    phase: 'idle',
    y: TREX_GROUND_Y,
    vy: 0,
    jumping: false,
    ducking: false,
    speedDrop: false,
    speed: START_SPEED,
    distance: 0,
    obstacles: [],
    clouds,
    horizonX: [0, HORIZON.w],
    horizonVariant: [0, 1],
    frameTimer: 0,
    runFrame: 0,
  }
}

/**
 * Append one obstacle at the right edge, honouring the upstream speed gates
 * and cluster rules.
 * @param state - the live game state to mutate.
 */
function spawn(state: GameState): void {
  const eligible = OBSTACLES.filter(t => state.speed >= t.minSpeed)
  const type = eligible[randomInt(0, eligible.length - 1)]
  // OBSTACLES' first entry has minSpeed 0, so `eligible` is never empty; the
  // guard keeps the spawn total rather than asserting that invariant.
  if (type === undefined) return
  // Clusters only appear below the type's multipleSpeed, as upstream.
  const size = state.speed < type.multipleSpeed ? randomInt(1, 3) : 1
  const y = type.yPos[randomInt(0, type.yPos.length - 1)] ?? type.yPos[0]
  state.obstacles.push({ type, x: WIDTH, y, size, frame: 0, frameTimer: 0 })
}

/**
 * Whether two rectangles overlap.
 * @param a - first rectangle in canvas coordinates.
 * @param b - second rectangle in canvas coordinates.
 * @returns true when they intersect.
 */
function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/**
 * Per-part collision test between the runner and one obstacle: a cheap
 * outer-box check first, then the upstream part boxes, exactly as upstream.
 * @param state - the live game state.
 * @param o - the obstacle to test.
 * @returns true when any part boxes intersect.
 */
function hits(state: GameState, o: Obstacle): boolean {
  const ducking = state.ducking && !state.jumping
  const tw = ducking ? TREX.wDuck : TREX.w
  const th = ducking ? TREX.hDuck : TREX.h
  const tx = TREX_X
  const ty = state.y - Y_OFFSET
  const ow = o.type.w * o.size
  const ox = o.x
  const oy = o.y - Y_OFFSET

  // Upstream insets the outer boxes by one pixel before the broad check.
  const outerTrex = { x: tx + 1, y: ty + 1, w: tw - 2, h: th - 2 }
  const outerOb = { x: ox + 1, y: oy + 1, w: ow - 2, h: o.type.h - 2 }
  if (!overlaps(outerTrex, outerOb)) return false

  const trexBoxes = ducking ? TREX_BOXES.ducking : TREX_BOXES.running
  for (const tb of trexBoxes) {
    const a = { x: tx + tb.x, y: ty + tb.y, w: tb.w, h: tb.h }
    // A cluster repeats its part boxes once per member.
    for (let i = 0; i < o.size; i += 1) {
      for (const ob of o.type.boxes) {
        const b = { x: ox + i * o.type.w + ob.x, y: oy + ob.y, w: ob.w, h: ob.h }
        if (overlaps(a, b)) return true
      }
    }
  }
  return false
}

/**
 * Source x of the runner's current frame within the T-Rex strip.
 * @param state - the live game state.
 * @returns the frame offset in sheet pixels.
 */
function trexFrameX(state: GameState): number {
  if (state.phase === 'over') return TREX_FRAMES.crashed
  if (state.phase === 'idle') return TREX_FRAMES.waiting
  const even = state.runFrame % 2 === 0
  if (state.ducking && !state.jumping) return even ? TREX_FRAMES.ducking[0] : TREX_FRAMES.ducking[1]
  if (state.jumping) return 0
  return even ? TREX_FRAMES.running[0] : TREX_FRAMES.running[1]
}

/**
 * Paint one frame from the spritesheet.
 * @param g - the 2D context to draw into.
 * @param sheet - the loaded spritesheet image.
 * @param scale - sheet pixels per logical pixel (2 for the 2x sheet).
 * @param state - the live game state.
 */
function draw(
  g: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  scale: number,
  state: GameState,
): void {
  g.clearRect(0, 0, WIDTH, HEIGHT)

  /**
   * Blit one sheet region, converting sheet coordinates by the sheet scale.
   * @param sx - source x in 1x sheet pixels.
   * @param sy - source y in 1x sheet pixels.
   * @param sw - source width in 1x sheet pixels.
   * @param sh - source height in 1x sheet pixels.
   * @param dx - destination x in logical pixels.
   * @param dy - destination y in logical pixels.
   */
  const blit = (sx: number, sy: number, sw: number, sh: number, dx: number, dy: number) => {
    g.drawImage(sheet, sx * scale, sy * scale, sw * scale, sh * scale, dx, dy, sw, sh)
  }

  for (const cloud of state.clouds) {
    blit(SHEET.cloud.x, SHEET.cloud.y, CLOUD.w, CLOUD.h, cloud.x, cloud.y - Y_OFFSET)
  }

  // The horizon is two alternating segments scrolling left, as upstream.
  for (const [i, x] of state.horizonX.entries()) {
    blit(
      SHEET.horizon.x + (state.horizonVariant[i] ?? 0) * HORIZON.w,
      SHEET.horizon.y,
      HORIZON.w,
      HORIZON.h,
      x,
      HORIZON_Y - Y_OFFSET,
    )
  }

  for (const o of state.obstacles) {
    // A cluster repeats the same sprite side by side; the sheet holds one
    // cactus per type, so each repeat is its own blit.
    const sx = o.type.sheet.x + o.frame * o.type.w
    for (let i = 0; i < o.size; i += 1) {
      blit(sx, o.type.sheet.y, o.type.w, o.type.h, o.x + i * o.type.w, o.y - Y_OFFSET)
    }
  }

  const ducking = state.ducking && !state.jumping
  blit(
    SHEET.trex.x + trexFrameX(state),
    SHEET.trex.y,
    ducking ? TREX.wDuck : TREX.w,
    ducking ? TREX.hDuck : TREX.h,
    TREX_X,
    state.y - Y_OFFSET,
  )
}

/**
 * Render the dock game.
 * @param props - the standard locale seat carrying this namespace's translator.
 * @returns the dock column wrapping the game canvas and its readouts.
 */
export function DinoGame({ t }: PropsLocale<'demoBadge'>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef<GameState>(freshState())
  const highRef = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [high, setHigh] = useState(0)

  useEffect(() => {
    const stored = loadHighScore()
    highRef.current = stored
    setHigh(stored)
  }, [])

  /** Jump, or start a run when the game is idle or finished. */
  const jump = useCallback(() => {
    const state = stateRef.current
    if (state.phase !== 'running') {
      const next = freshState()
      next.phase = 'running'
      stateRef.current = next
      setScore(0)
      setPhase('running')
      return
    }
    if (!state.jumping) {
      state.jumping = true
      state.vy = JUMP_V
      state.speedDrop = false
    }
  }, [])

  /** Duck, or cut a jump short into a fast fall. */
  const duck = useCallback((down: boolean) => {
    const state = stateRef.current
    if (!down) {
      state.ducking = false
      state.speedDrop = false
      return
    }
    if (state.jumping) {
      state.speedDrop = true
      state.vy = DROP_V
    } else {
      state.ducking = true
    }
  }, [])

  // The animation loop owns physics, collision, scoring, and painting. It
  // reads phase from the ref, so it survives re-renders without restarting.
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    const g = canvas.getContext('2d')
    if (g === null) return

    const ratio = window.devicePixelRatio || 1
    canvas.width = WIDTH * ratio
    canvas.height = HEIGHT * ratio
    g.scale(ratio, ratio)
    // The sheet is pixel art: keep block edges hard at every scale.
    g.imageSmoothingEnabled = false

    // The 2x sheet on a high-density display keeps the art sharp.
    const useHd = ratio > 1
    const sheet = new Image()
    sheet.src = useHd ? SPRITE_2X : SPRITE_1X
    const sheetScale = useHd ? 2 : 1

    let raf = 0
    let ready = false
    let last = 0
    let lastScore = -1
    let nextSpawnGap = 0

    sheet.addEventListener('load', () => { ready = true })

    const tick = (now: number) => {
      raf = window.requestAnimationFrame(tick)
      if (!ready) return

      const state = stateRef.current
      // Upstream runs on 60fps deltas; clamp so a background tab cannot
      // teleport the runner through an obstacle on return.
      const delta = last === 0 ? 1 : Math.min((now - last) / (1000 / 60), 3)
      last = now

      if (state.phase === 'running') {
        state.speed = Math.min(MAX_SPEED, state.speed + ACCELERATION * delta)
        const moved = state.speed * delta
        state.distance += moved

        // Run/duck cycle: two frames at upstream's rates.
        state.frameTimer += delta * (1000 / 60)
        const framePeriod = state.ducking && !state.jumping ? 1000 / 8 : 1000 / 12
        if (state.frameTimer > framePeriod) {
          state.frameTimer = 0
          state.runFrame += 1
        }

        if (state.jumping) {
          const gravity = GRAVITY * (state.speedDrop ? SPEED_DROP_COEFFICIENT : 1)
          state.y += state.vy * delta
          state.vy += gravity * delta
          // Upstream caps the rise so a held jump cannot float away.
          if (state.y < TREX_GROUND_Y - MAX_JUMP_HEIGHT && state.vy < 0) state.vy = 0
          if (state.y >= TREX_GROUND_Y) {
            state.y = TREX_GROUND_Y
            state.jumping = false
            state.vy = 0
            state.speedDrop = false
          }
        }

        for (const cloud of state.clouds) {
          cloud.x -= Math.floor(state.speed * 0.2 * delta * 10) / 10
        }
        state.clouds = state.clouds.filter(c => c.x + CLOUD.w > 0)
        if (state.clouds.length < 4 && Math.random() < 0.01) {
          state.clouds.push({ x: WIDTH, y: randomInt(Y_OFFSET + 2, Y_OFFSET + 22) })
        }

        for (const i of [0, 1] as const) {
          const next = state.horizonX[i] - moved
          if (next <= -HORIZON.w) {
            // Recycle the offscreen segment behind its sibling, reshuffling
            // which variant it shows so the ground does not visibly repeat.
            state.horizonX[i] = next + HORIZON.w * 2
            state.horizonVariant[i] = randomInt(0, 1)
          } else {
            state.horizonX[i] = next
          }
        }

        for (const o of state.obstacles) {
          o.x -= moved
          if (o.type.frames > 1) {
            o.frameTimer += delta * (1000 / 60)
            if (o.frameTimer > 1000 / 6) {
              o.frameTimer = 0
              o.frame = (o.frame + 1) % o.type.frames
            }
          }
        }
        state.obstacles = state.obstacles.filter(o => o.x + o.type.w * o.size > 0)

        // Spawn once the trailing obstacle has cleared its type's minimum gap.
        const last2 = state.obstacles[state.obstacles.length - 1]
        if (last2 === undefined) {
          if (nextSpawnGap <= 0) {
            spawn(state)
            nextSpawnGap = randomInt(60, 140)
          } else {
            nextSpawnGap -= moved
          }
        } else {
          const tail = last2.x + last2.type.w * last2.size
          const gap = last2.type.minGap * (state.speed / START_SPEED) * 0.6
          if (WIDTH - tail > gap) spawn(state)
        }

        if (state.obstacles.some(o => hits(state, o))) {
          state.phase = 'over'
          const final = Math.floor(state.distance * SCORE_COEFFICIENT)
          if (final > highRef.current) {
            highRef.current = final
            saveHighScore(final)
            setHigh(final)
          }
          setPhase('over')
        }

        const shown = Math.floor(state.distance * SCORE_COEFFICIENT)
        if (shown !== lastScore) {
          lastScore = shown
          setScore(shown)
        }
      }

      draw(g, sheet, sheetScale, state)
    }

    raf = window.requestAnimationFrame(tick)
    return () => { window.cancelAnimationFrame(raf) }
  }, [])

  // Space and the arrow keys drive the game, but only while it holds focus, so
  // typing in the composer is never intercepted.
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') {
      e.preventDefault()
      jump()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      duck(true)
    }
  }, [duck, jump])

  const onKeyUp = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') duck(false)
  }, [duck])

  return (
    <div className={css.dock}>
      <div
        className={css.game}
        role="button"
        tabIndex={0}
        aria-label={t('game.aria')}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onPointerDown={jump}
      >
        <canvas ref={canvasRef} className={css.canvas} />
        <div className={css.hud}>
          <span className={css.score}>{String(score).padStart(5, '0')}</span>
          <span className={css.high}>{t('game.high')} {String(high).padStart(5, '0')}</span>
        </div>
        {phase !== 'running' && (
          <div className={css.overlay}>
            <span className={css.message}>
              {phase === 'over' ? t('game.over') : t('game.start')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
