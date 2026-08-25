/**
 * Bakes the car's collision map out of `public/room.glb`.
 *
 * The room is a handful of merged meshes, so a mesh-level box per object would
 * cover the whole scene. Instead every triangle is rasterised into a grid: a
 * cell blocks the car when geometry crosses the slab the car actually occupies,
 * and the box then rises from the floor to the top of that geometry. Walls and
 * furniture block, floor stays clear, and the doorway stays open because only
 * the lintel is up there. Doing this offline keeps 66k triangles worth of
 * geometry work out of the browser.
 *
 * Run with `npm run build:car-collision` after changing the room model.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MODEL = path.join(root, 'public/room.glb')
const OUTPUT = path.join(root, 'src/car-collision.json')

/** Grid resolution in world units. Fine enough to keep the doorway open. */
const CELL = 0.125
/** Geometry this far above the floor is an obstacle rather than floor. */
const OBSTACLE_RISE = 0.06
/**
 * Only geometry below this height blocks the car: it has to reach high enough
 * to catch surfaces the car can end up sitting on (the bed at 0.9), and stay
 * well under the top of the door frame so driving out stays possible.
 */
const BLOCK_HEIGHT = 1.2
/** Tallest a generated box gets; anything above this is an unclimbable wall. */
const WALL_HEIGHT = 1.6
/** Surfaces this far above the floor are furniture tops, not obstacles. */
const PLATFORM_MIN = 0.35
const PLATFORM_MAX = 1.1
/** Meshes that must not take part in collision (hidden in the scene). */
const IGNORED = new Set(['mirror'])
/** The mirror's own mesh, reported separately so a car can crack the glass. */
const MIRROR = 'mirror'

const buffer = fs.readFileSync(MODEL)
const gltf = await new Promise((resolve, reject) => {
  new GLTFLoader().parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    '',
    resolve,
    reject,
  )
})

const room = gltf.scene
room.updateMatrixWorld(true)

const targets = []
room.traverse((child) => {
  if (child.isMesh && !IGNORED.has(child.name)) targets.push(child)
})

const bounds = new THREE.Box3()
for (const mesh of targets) bounds.union(new THREE.Box3().setFromObject(mesh))

const mirrorMesh = room.getObjectByName(MIRROR)
if (!mirrorMesh) throw new Error(`mirror mesh "${MIRROR}" not found`)
const mirrorBounds = new THREE.Box3().setFromObject(mirrorMesh)

const columns = Math.ceil((bounds.max.x - bounds.min.x) / CELL)
const rows = Math.ceil((bounds.max.z - bounds.min.z) / CELL)
const cellX = (ix) => bounds.min.x + (ix + 0.5) * CELL
const cellZ = (iz) => bounds.min.z + (iz + 0.5) * CELL

const corner = new THREE.Vector3()
const flat = [
  [0, 0],
  [0, 0],
  [0, 0],
]

/**
 * Separating-axis test between a triangle and a cell, both flattened onto the
 * ground plane. A triangle's bounding box would do, but a door frame is exactly
 * the case where the slack of a whole cell either side closes the opening.
 */
function overlapsCell(ix, iz) {
  const x0 = bounds.min.x + ix * CELL
  const z0 = bounds.min.z + iz * CELL
  const x1 = x0 + CELL
  const z1 = z0 + CELL

  const axes = [
    [1, 0],
    [0, 1],
  ]
  for (let i = 0; i < 3; i++) {
    const [ax, az] = flat[i]
    const [bx, bz] = flat[(i + 1) % 3]
    axes.push([-(bz - az), bx - ax])
  }

  for (const [nx, nz] of axes) {
    let triMin = Number.POSITIVE_INFINITY
    let triMax = Number.NEGATIVE_INFINITY
    for (const [x, z] of flat) {
      const projected = x * nx + z * nz
      triMin = Math.min(triMin, projected)
      triMax = Math.max(triMax, projected)
    }
    let cellMin = Number.POSITIVE_INFINITY
    let cellMax = Number.NEGATIVE_INFINITY
    for (const [x, z] of [
      [x0, z0],
      [x1, z0],
      [x0, z1],
      [x1, z1],
    ]) {
      const projected = x * nx + z * nz
      cellMin = Math.min(cellMin, projected)
      cellMax = Math.max(cellMax, projected)
    }
    if (triMax < cellMin || cellMax < triMin) return false
  }
  return true
}

/** Walks every triangle, handing its cell footprint and height range over. */
function rasterize(visit) {
  for (const mesh of targets) {
    const position = mesh.geometry.attributes.position
    const index = mesh.geometry.index
    const count = index ? index.count : position.count

    for (let i = 0; i < count; i += 3) {
      let minX = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      let minZ = Number.POSITIVE_INFINITY
      let maxZ = Number.NEGATIVE_INFINITY
      let minY = Number.POSITIVE_INFINITY
      let maxY = Number.NEGATIVE_INFINITY

      for (let vertex = 0; vertex < 3; vertex++) {
        const at = index ? index.getX(i + vertex) : i + vertex
        corner.fromBufferAttribute(position, at).applyMatrix4(mesh.matrixWorld)
        flat[vertex][0] = corner.x
        flat[vertex][1] = corner.z
        minX = Math.min(minX, corner.x)
        maxX = Math.max(maxX, corner.x)
        minZ = Math.min(minZ, corner.z)
        maxZ = Math.max(maxZ, corner.z)
        minY = Math.min(minY, corner.y)
        maxY = Math.max(maxY, corner.y)
      }

      const ix0 = Math.max(Math.floor((minX - bounds.min.x) / CELL), 0)
      const ix1 = Math.min(Math.floor((maxX - bounds.min.x) / CELL), columns - 1)
      const iz0 = Math.max(Math.floor((minZ - bounds.min.z) / CELL), 0)
      const iz1 = Math.min(Math.floor((maxZ - bounds.min.z) / CELL), rows - 1)

      for (let iz = iz0; iz <= iz1; iz++) {
        for (let ix = ix0; ix <= ix1; ix++) {
          if (overlapsCell(ix, iz)) visit(iz * columns + ix, minY, maxY)
        }
      }
    }
  }
}

/** Highest geometry per cell, which is what the floor height comes out of. */
const surface = new Float32Array(columns * rows).fill(Number.NEGATIVE_INFINITY)
rasterize((cell, _minY, maxY) => {
  if (maxY > surface[cell]) surface[cell] = maxY
})

// The floor is whatever height covers most of the room.
const histogram = new Map()
for (const height of surface) {
  if (!Number.isFinite(height)) continue
  const bucket = Math.round(height / 0.05)
  histogram.set(bucket, (histogram.get(bucket) ?? 0) + 1)
}
let floorBucket = null
let floorCount = 0
for (const [bucket, count] of histogram) {
  if (count > floorCount) {
    floorCount = count
    floorBucket = bucket
  }
}
if (floorBucket === null) throw new Error('no floor found in room model')
const floorY = floorBucket * 0.05

/** Highest geometry per cell that reaches into the slab the car drives in. */
const blocking = new Float32Array(columns * rows).fill(Number.NEGATIVE_INFINITY)
rasterize((cell, minY, maxY) => {
  if (minY > floorY + BLOCK_HEIGHT) return
  if (maxY > blocking[cell]) blocking[cell] = maxY
})

/**
 * Top of the box standing in for a cell, or 0 where the car may drive. The
 * floor itself is an endless plane in the physics world, so open floor and the
 * ground outside the room need no box at all: the car drives out of the door
 * and gets teleported home once it strays too far.
 */
const tops = new Float32Array(columns * rows)
for (let cell = 0; cell < tops.length; cell++) {
  const blocked = blocking[cell]
  if (!Number.isFinite(blocked) || blocked - floorY < OBSTACLE_RISE) continue
  const top = Math.min(Math.max(surface[cell], blocked), floorY + WALL_HEIGHT)
  tops[cell] = Math.round(top / 0.05) * 0.05
}

// Merge cells into as few boxes as possible: first into runs along x, then
// stacking identical runs across rows so a wall is one box instead of hundreds.
const runs = []
for (let iz = 0; iz < rows; iz++) {
  let start = null
  for (let ix = 0; ix <= columns; ix++) {
    const top = ix < columns ? tops[iz * columns + ix] : 0
    const previous = start === null ? 0 : tops[iz * columns + start]
    if (start !== null && top !== previous) {
      runs.push({ iz, x0: start, x1: ix, top: previous, merged: false })
      start = null
    }
    if (top !== 0 && start === null) start = ix
  }
}

const runsByRow = new Map()
for (const run of runs) {
  if (!runsByRow.has(run.iz)) runsByRow.set(run.iz, [])
  runsByRow.get(run.iz).push(run)
}

const walls = []
const round = (value) => Number(value.toFixed(3))
for (const run of runs) {
  if (run.merged) continue
  let lastRow = run.iz
  for (let iz = run.iz + 1; iz < rows; iz++) {
    const match = (runsByRow.get(iz) ?? []).find(
      (other) =>
        !other.merged &&
        other.x0 === run.x0 &&
        other.x1 === run.x1 &&
        other.top === run.top,
    )
    if (!match) break
    match.merged = true
    lastRow = iz
  }
  walls.push([
    round(bounds.min.x + run.x0 * CELL),
    round(bounds.min.x + run.x1 * CELL),
    round(bounds.min.z + run.iz * CELL),
    round(bounds.min.z + (lastRow + 1) * CELL),
    round(run.top),
  ])
}

// The car starts parked on the biggest piece of furniture it can sit on top of
// (the bed), so pick that platform and the cell furthest from its edges.
const platformSet = new Set()
for (let cell = 0; cell < tops.length; cell++) {
  const rise = tops[cell] - floorY
  if (tops[cell] === 0 || rise < PLATFORM_MIN || rise > PLATFORM_MAX) continue
  platformSet.add(cell)
}

const levelOf = (cell) => Math.round(tops[cell] / 0.05)
const seen = new Set()
let platform = null

for (const start of platformSet) {
  if (seen.has(start)) continue
  const level = levelOf(start)
  const group = []
  const stack = [start]
  seen.add(start)
  while (stack.length > 0) {
    const cell = stack.pop()
    group.push(cell)
    const ix = cell % columns
    const iz = (cell - ix) / columns
    for (const [nx, nz] of [
      [ix + 1, iz],
      [ix - 1, iz],
      [ix, iz + 1],
      [ix, iz - 1],
    ]) {
      if (nx < 0 || nz < 0 || nx >= columns || nz >= rows) continue
      const neighbour = nz * columns + nx
      if (seen.has(neighbour) || !platformSet.has(neighbour)) continue
      if (levelOf(neighbour) !== level) continue
      seen.add(neighbour)
      stack.push(neighbour)
    }
  }
  if (!platform || group.length > platform.cells.length) {
    platform = { cells: group, level }
  }
}
if (!platform) throw new Error('no platform found to park the car on')

const platformArea = new Set(platform.cells)
// Distance transform: grow inwards from the platform edge and keep the last
// cell reached, which is the one with the most room around it.
let ring = platform.cells.filter((cell) => {
  const ix = cell % columns
  const iz = (cell - ix) / columns
  return (
    !platformArea.has(iz * columns + ix + 1) ||
    !platformArea.has(iz * columns + ix - 1) ||
    !platformArea.has((iz + 1) * columns + ix) ||
    !platformArea.has((iz - 1) * columns + ix)
  )
})
const reached = new Set(ring)
let deepest = ring[0]
while (ring.length > 0) {
  const next = []
  for (const cell of ring) {
    const ix = cell % columns
    const iz = (cell - ix) / columns
    for (const [nx, nz] of [
      [ix + 1, iz],
      [ix - 1, iz],
      [ix, iz + 1],
      [ix, iz - 1],
    ]) {
      const neighbour = nz * columns + nx
      if (!platformArea.has(neighbour) || reached.has(neighbour)) continue
      reached.add(neighbour)
      next.push(neighbour)
    }
  }
  if (next.length > 0) deepest = next[0]
  ring = next
}

const spawn = [deepest % columns, Math.floor(deepest / columns)]
const spawnSurfaceY = platform.level * 0.05

const pair = (a, b) => `[${round(a)}, ${round(b)}]`

// Written by hand so the arrays stay on one line each, matching biome's format.
const json = `{
  "floorY": ${round(floorY)},
  "cell": ${CELL},
  "wallHeight": ${WALL_HEIGHT},
  "spawn": ${pair(cellX(spawn[0]), cellZ(spawn[1]))},
  "spawnSurfaceY": ${round(spawnSurfaceY)},
  "room": { "min": ${pair(bounds.min.x, bounds.min.z)}, "max": ${pair(bounds.max.x, bounds.max.z)} },
  "mirror": { "min": ${pair(mirrorBounds.min.x, mirrorBounds.min.z)}, "max": ${pair(mirrorBounds.max.x, mirrorBounds.max.z)} },
  "walls": [
${walls.map((wall) => `    [${wall.join(', ')}]`).join(',\n')}
  ]
}
`

fs.writeFileSync(OUTPUT, json)

console.log(
  `floor y=${round(floorY)} cells=${columns}x${rows} boxes=${walls.length} ` +
    `ground x=[${round(bounds.min.x)}, ${round(bounds.max.x)}] ` +
    `z=[${round(bounds.min.z)}, ${round(bounds.max.z)}]`,
)
console.log(
  `platform y=${round(spawnSurfaceY)} cells=${platform.cells.length} ` +
    `spawn=${pair(cellX(spawn[0]), cellZ(spawn[1]))}`,
)
console.log(`written to ${path.relative(root, OUTPUT)}`)
