import * as THREE from 'three'

/**
 * Draws a shattered-glass overlay onto a canvas: branching cracks running out
 * of the impact point, a few rings across them, and a crushed patch where the
 * hit landed. Generated rather than shipped as an image so the break can land
 * wherever the car struck.
 */
const SIZE = 1024
const BRANCHES = 15
const RINGS = 4

type Path = [x: number, y: number][]

/** One crack: a wandering line that sheds thinner splinters as it travels. */
function growCrack(
  paths: Path[],
  x: number,
  y: number,
  angle: number,
  length: number,
  depth: number,
) {
  const steps = 5 + Math.floor(Math.random() * 4)
  const step = length / steps
  const path: Path = [[x, y]]
  let currentX = x
  let currentY = y
  let currentAngle = angle

  for (let i = 0; i < steps; i++) {
    currentAngle += (Math.random() - 0.5) * 0.55
    currentX += Math.cos(currentAngle) * step
    currentY += Math.sin(currentAngle) * step
    path.push([currentX, currentY])

    if (depth > 0 && i > 0 && Math.random() > 0.5) {
      growCrack(
        paths,
        currentX,
        currentY,
        currentAngle + (Math.random() > 0.5 ? 0.7 : -0.7),
        length * (0.2 + Math.random() * 0.3),
        depth - 1,
      )
    }
  }

  paths.push(path)
}

function ring(centerX: number, centerY: number, radius: number): Path {
  const path: Path = []
  for (let step = 0; step <= 24; step++) {
    const angle = (step / 24) * Math.PI * 2
    const wobble = radius * (0.82 + Math.random() * 0.3)
    path.push([centerX + Math.cos(angle) * wobble, centerY + Math.sin(angle) * wobble])
  }
  path.push(path[0])
  return path
}

/**
 * `hit` is where the car struck, in 0..1 texture space. The mirror hangs
 * flipped, so the default sits high in the canvas to land low on the glass,
 * which is the only height a toy car can reach.
 */
export function createGlassCracks(hit = { x: 0.5, y: 0.26 }) {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('cannot draw glass cracks without a 2d context')

  const centerX = hit.x * SIZE
  const centerY = hit.y * SIZE

  const cracks: Path[] = []
  for (let branch = 0; branch < BRANCHES; branch++) {
    const angle = (branch / BRANCHES) * Math.PI * 2 + Math.random() * 0.4
    growCrack(cracks, centerX, centerY, angle, SIZE * (0.16 + Math.random() * 0.34), 2)
  }
  for (let index = 1; index <= RINGS; index++) {
    cracks.push(ring(centerX, centerY, SIZE * 0.03 * index * index))
  }

  // Every crack is stroked twice: a dark seam so it reads against a bright
  // reflection, then a bright core along the middle of it.
  context.lineCap = 'round'
  context.lineJoin = 'round'
  for (const [stroke, width] of [
    ['rgba(14, 18, 22, 0.8)', 6],
    ['rgba(246, 251, 255, 0.95)', 2.2],
  ] as const) {
    context.strokeStyle = stroke
    context.lineWidth = width
    for (const path of cracks) {
      context.beginPath()
      context.moveTo(path[0][0], path[0][1])
      for (const [x, y] of path.slice(1)) context.lineTo(x, y)
      context.stroke()
    }
  }

  // The impact itself: a powdered patch of crushed glass.
  const crush = context.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    SIZE * 0.055,
  )
  crush.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
  crush.addColorStop(0.4, 'rgba(214, 232, 244, 0.45)')
  crush.addColorStop(1, 'rgba(214, 232, 244, 0)')
  context.fillStyle = crush
  context.beginPath()
  context.arc(centerX, centerY, SIZE * 0.055, 0, Math.PI * 2)
  context.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
