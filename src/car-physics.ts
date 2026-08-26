import * as CANNON from 'cannon-es'
import collision from './car-collision.json'

/**
 * Car physics ported from Bruno Simon's folio-2019 (`World/Physics.js`): a
 * cannon RaycastVehicle with his tuning values, driving in his Z-up space.
 *
 * The room's floor and walls come from `car-collision.json`, baked out of
 * `public/room.glb` by `npm run build:car-collision`. Physics units are car
 * sized like his, so world units are physics units times `CAR_SCALE`; local
 * physics axes map to world as x -> x, y -> -z, z -> y.
 */
export const CAR_SCALE = 0.32

/**
 * Where the rig sits in the room. Physics z = 0 is the room floor, so the rig
 * stays at floor level even though the car starts parked on the bed.
 */
export const SPAWN = {
  x: collision.spawn[0],
  y: collision.floorY,
  z: collision.spawn[1],
}

/** Ride height above whatever surface the car starts on. */
const REST_HEIGHT = 0.3

/** Physics height the car starts (and respawns) at, on top of the bed. */
const SPAWN_HEIGHT =
  (collision.spawnSurfaceY - collision.floorY) / CAR_SCALE + REST_HEIGHT

/** Yaw on the bed (Z-up physics), so the car sits angled instead of square. */
const SPAWN_YAW = -Math.PI / 2
const UP = new CANNON.Vec3(0, 0, 1)
const SPAWN_QUAT = new CANNON.Quaternion().setFromAxisAngle(UP, SPAWN_YAW)

/**
 * How far past the room the car may roam. The doorway is open, so driving out
 * is allowed: the car gets this much room outside and then runs into an
 * invisible fence, instead of being teleported back to the bed. This is the one
 * knob for how big that outdoor yard is.
 */
const ROAM_MARGIN = 10

const ROAM = {
  minX: (collision.room.min[0] - ROAM_MARGIN - SPAWN.x) / CAR_SCALE,
  maxX: (collision.room.max[0] + ROAM_MARGIN - SPAWN.x) / CAR_SCALE,
  minY: -(collision.room.max[1] + ROAM_MARGIN - SPAWN.z) / CAR_SCALE,
  maxY: -(collision.room.min[1] - ROAM_MARGIN - SPAWN.z) / CAR_SCALE,
}

/**
 * The fence around `ROAM`, in physics units. Tall enough that a hop (about half
 * a unit of air) can't clear it, and thick enough that a boosted step (under a
 * unit of travel) can't tunnel through it.
 */
const FENCE_HALF_HEIGHT = 3
const FENCE_HALF_THICKNESS = 2

export const OPTIONS = {
  chassisWidth: 1.02,
  chassisHeight: 1.16,
  chassisDepth: 2.03,
  chassisOffset: new CANNON.Vec3(0, 0, 0.41),
  chassisMass: 40,
  wheelFrontOffsetDepth: 0.635,
  wheelBackOffsetDepth: -0.475,
  wheelOffsetWidth: 0.39,
  wheelRadius: 0.25,
  wheelHeight: 0.24,
  wheelSuspensionStiffness: 50,
  wheelSuspensionRestLength: 0.1,
  wheelFrictionSlip: 10,
  wheelDampingRelaxation: 1.8,
  wheelDampingCompression: 1.5,
  wheelMaxSuspensionForce: 100000,
  wheelRollInfluence: 0.01,
  wheelMaxSuspensionTravel: 0.3,
  wheelCustomSlidingRotationalSpeed: -30,
  wheelMass: 5,
  controlsSteeringSpeed: 0.005 * 3,
  controlsSteeringMax: Math.PI * 0.17,
  controlsAcceleratinMaxSpeed: (0.055 * 3) / 17,
  controlsAcceleratinMaxSpeedBoost: (0.11 * 3) / 17,
  controlsAcceleratingSpeed: 2 * 4 * 2,
  controlsAcceleratingSpeedBoost: 3.5 * 4 * 2,
  controlsBrakeStrength: 0.45 * 3,
}

export type CarInput = {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  brake: boolean
  boost: boolean
}

export type CarPhysics = {
  world: CANNON.World
  vehicle: CANNON.RaycastVehicle
  chassisBody: CANNON.Body
  wheelBodies: CANNON.Body[]
}

export function createCarPhysics(): CarPhysics {
  const world = new CANNON.World()
  world.gravity.set(0, 0, -3.25 * 4)
  world.allowSleep = false
  world.defaultContactMaterial.friction = 0
  world.defaultContactMaterial.restitution = 0.2
  world.broadphase = new CANNON.SAPBroadphase(world)

  const floorMaterial = new CANNON.Material('floorMaterial')
  const wheelMaterial = new CANNON.Material('wheelMaterial')
  world.addContactMaterial(
    new CANNON.ContactMaterial(floorMaterial, wheelMaterial, {
      friction: 0.3,
      restitution: 0,
      contactEquationStiffness: 1000,
    }),
  )

  world.addBody(
    new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: floorMaterial }),
  )

  // Baked room obstacles: everything off the drivable floor, merged along x.
  // Each run rises from the floor to the real surface height, so the bed and
  // the shelves read as platforms while the room shell stays a solid fence.
  // Boxes overlap by a hair sideways: a wheel ray that lands exactly on the
  // seam between two boxes can slip between both, and the wheels start out
  // spaced exactly one cell apart.
  const overlap = 0.02 / CAR_SCALE
  for (const [minX, maxX, minZ, maxZ, top] of collision.walls) {
    const halfHeight = (top - collision.floorY) / 2 / CAR_SCALE
    const body = new CANNON.Body({
      mass: 0,
      material: floorMaterial,
      shape: new CANNON.Box(
        new CANNON.Vec3(
          (maxX - minX) / 2 / CAR_SCALE + overlap,
          (maxZ - minZ) / 2 / CAR_SCALE + overlap,
          halfHeight,
        ),
      ),
    })
    body.position.set(
      ((minX + maxX) / 2 - SPAWN.x) / CAR_SCALE,
      -((minZ + maxZ) / 2 - SPAWN.z) / CAR_SCALE,
      halfHeight,
    )
    // cannon only refreshes a body's bounds when it moves, and these never do.
    // Without this their bounds stay stuck around the origin, and since ray
    // tests are filtered by bounds the wheels would drive straight through.
    body.updateAABB()
    world.addBody(body)
  }

  // Invisible fence around the roam area. Past the doorway the car keeps going
  // for `ROAM_MARGIN` and then simply can't go any further, so it is never taken
  // away from wherever it was left. The side slabs run long so the corners are
  // sealed too.
  const fenceSpanX = (ROAM.maxX - ROAM.minX) / 2
  const fenceSpanY = (ROAM.maxY - ROAM.minY) / 2
  const fenceMidX = (ROAM.minX + ROAM.maxX) / 2
  const fenceMidY = (ROAM.minY + ROAM.maxY) / 2
  const fences: [CANNON.Vec3, CANNON.Vec3][] = [
    [
      new CANNON.Vec3(FENCE_HALF_THICKNESS, fenceSpanY, FENCE_HALF_HEIGHT),
      new CANNON.Vec3(ROAM.minX - FENCE_HALF_THICKNESS, fenceMidY, FENCE_HALF_HEIGHT),
    ],
    [
      new CANNON.Vec3(FENCE_HALF_THICKNESS, fenceSpanY, FENCE_HALF_HEIGHT),
      new CANNON.Vec3(ROAM.maxX + FENCE_HALF_THICKNESS, fenceMidY, FENCE_HALF_HEIGHT),
    ],
    [
      new CANNON.Vec3(
        fenceSpanX + FENCE_HALF_THICKNESS * 2,
        FENCE_HALF_THICKNESS,
        FENCE_HALF_HEIGHT,
      ),
      new CANNON.Vec3(fenceMidX, ROAM.minY - FENCE_HALF_THICKNESS, FENCE_HALF_HEIGHT),
    ],
    [
      new CANNON.Vec3(
        fenceSpanX + FENCE_HALF_THICKNESS * 2,
        FENCE_HALF_THICKNESS,
        FENCE_HALF_HEIGHT,
      ),
      new CANNON.Vec3(fenceMidX, ROAM.maxY + FENCE_HALF_THICKNESS, FENCE_HALF_HEIGHT),
    ],
  ]
  for (const [halfExtents, position] of fences) {
    const body = new CANNON.Body({
      mass: 0,
      material: floorMaterial,
      shape: new CANNON.Box(halfExtents),
    })
    body.position.copy(position)
    body.updateAABB()
    world.addBody(body)
  }

  const chassisBody = new CANNON.Body({ mass: OPTIONS.chassisMass })
  chassisBody.allowSleep = false
  chassisBody.addShape(
    new CANNON.Box(
      new CANNON.Vec3(
        OPTIONS.chassisDepth * 0.5,
        OPTIONS.chassisWidth * 0.5,
        OPTIONS.chassisHeight * 0.5,
      ),
    ),
    OPTIONS.chassisOffset,
  )
  // Parked on the bed at its resting ride height, so it doesn't slam down.
  chassisBody.position.set(0, 0, SPAWN_HEIGHT)
  chassisBody.quaternion.copy(SPAWN_QUAT)

  // cannon-es defaults these to Y-up; his world (and everything below) is Z-up.
  const vehicle = new CANNON.RaycastVehicle({
    chassisBody,
    indexForwardAxis: 0,
    indexRightAxis: 1,
    indexUpAxis: 2,
  })
  const wheelOptions = {
    radius: OPTIONS.wheelRadius,
    suspensionStiffness: OPTIONS.wheelSuspensionStiffness,
    suspensionRestLength: OPTIONS.wheelSuspensionRestLength,
    frictionSlip: OPTIONS.wheelFrictionSlip,
    dampingRelaxation: OPTIONS.wheelDampingRelaxation,
    dampingCompression: OPTIONS.wheelDampingCompression,
    maxSuspensionForce: OPTIONS.wheelMaxSuspensionForce,
    rollInfluence: OPTIONS.wheelRollInfluence,
    maxSuspensionTravel: OPTIONS.wheelMaxSuspensionTravel,
    customSlidingRotationalSpeed: OPTIONS.wheelCustomSlidingRotationalSpeed,
    useCustomSlidingRotationalSpeed: true,
    directionLocal: new CANNON.Vec3(0, 0, -1),
    axleLocal: new CANNON.Vec3(0, 1, 0),
    chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
  }

  const connections: [number, number][] = [
    [OPTIONS.wheelFrontOffsetDepth, OPTIONS.wheelOffsetWidth],
    [OPTIONS.wheelFrontOffsetDepth, -OPTIONS.wheelOffsetWidth],
    [OPTIONS.wheelBackOffsetDepth, OPTIONS.wheelOffsetWidth],
    [OPTIONS.wheelBackOffsetDepth, -OPTIONS.wheelOffsetWidth],
  ]
  for (const [depth, width] of connections) {
    wheelOptions.chassisConnectionPointLocal.set(depth, width, 0)
    vehicle.addWheel(wheelOptions)
  }

  const wheelBodies = vehicle.wheelInfos.map((info) => {
    const body = new CANNON.Body({ mass: OPTIONS.wheelMass, material: wheelMaterial })
    const upright = new CANNON.Quaternion()
    upright.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2)
    body.type = CANNON.BODY_TYPES.KINEMATIC
    body.addShape(
      new CANNON.Cylinder(info.radius, info.radius, OPTIONS.wheelHeight, 20),
      new CANNON.Vec3(),
      upright,
    )
    return body
  })

  return { world, vehicle, chassisBody, wheelBodies }
}

/**
 * The vehicle has to be attached separately: attaching inside
 * `createCarPhysics` and detaching on unmount leaves the car detached for good
 * once React's dev double-mount fires the cleanup, and a detached chassis is
 * never simulated. Pairing both sides here keeps it symmetric.
 */
export function attachCarPhysics(physics: CarPhysics) {
  physics.vehicle.addToWorld(physics.world)
  return () => {
    physics.vehicle.removeFromWorld(physics.world)
  }
}

/**
 * The mirror's footprint, grown by half a car, in physics space. The glass sits
 * flat against a wall the car collides with, so being here during a hard bump
 * is as close to hitting the mirror as the car can get.
 */
const MIRROR = {
  minX: (collision.mirror.min[0] - 0.25 - SPAWN.x) / CAR_SCALE,
  maxX: (collision.mirror.max[0] + 0.25 - SPAWN.x) / CAR_SCALE,
  minY: -(collision.mirror.max[1] + 0.45 - SPAWN.z) / CAR_SCALE,
  maxY: -(collision.mirror.min[1] - 0.45 - SPAWN.z) / CAR_SCALE,
}

export function isCarAtMirror(physics: CarPhysics) {
  const { x, y } = physics.chassisBody.position
  return x > MIRROR.minX && x < MIRROR.maxX && y > MIRROR.minY && y < MIRROR.maxY
}

/**
 * True only when the car has dropped out of the world entirely, which the fence
 * and the floor plane should never allow. Straying outside the room no longer
 * counts: the car stays wherever it was driven to.
 */
export function isCarLost(physics: CarPhysics) {
  return physics.chassisBody.position.z < -5
}

/** Puts the car back where it started, parked on the bed. */
export function resetCar(physics: CarPhysics, state: CarDriveState) {
  const { chassisBody, vehicle } = physics
  chassisBody.position.set(0, 0, SPAWN_HEIGHT)
  chassisBody.quaternion.copy(SPAWN_QUAT)
  chassisBody.velocity.setZero()
  chassisBody.angularVelocity.setZero()
  chassisBody.force.setZero()
  chassisBody.torque.setZero()
  for (let index = 0; index < vehicle.wheelInfos.length; index++) {
    vehicle.applyEngineForce(0, index)
    vehicle.setBrake(0, index)
    vehicle.updateWheelTransform(index)
  }
  state.steering = 0
  state.accelerating = 0
  state.speed = 0
  state.forwardSpeed = 0
  state.grounded = false
  state.hopCooldown = 0
  state.upsideDownSince = 0
  state.oldPosition.copy(chassisBody.position)
}

/**
 * His hop, but only from the ground and one at a time: without both guards a
 * held (auto-repeating) key stacks impulses and the car simply flies away.
 */
export function hopCar(physics: CarPhysics, state: CarDriveState) {
  if (!state.grounded || state.hopCooldown > 0) return false
  physics.chassisBody.applyLocalImpulse(
    new CANNON.Vec3(0, 0, 150),
    new CANNON.Vec3(0, 0, 0),
  )
  state.grounded = false
  state.hopCooldown = 0.9
  return true
}

export type CarDriveState = ReturnType<typeof createCarDriveState>

export function createCarDriveState() {
  return {
    steering: 0,
    accelerating: 0,
    speed: 0,
    forwardSpeed: 0,
    goingForward: true,
    worldForward: new CANNON.Vec3(),
    oldPosition: new CANNON.Vec3(),
    upsideDownSince: 0,
    grounded: false,
    hopCooldown: 0,
  }
}

const FORWARD = new CANNON.Vec3(1, 0, 0)
const WHEELS = [0, 1, 2, 3]
const REAR_WHEELS = [2, 3]
const scratchUp = new CANNON.Vec3()
const scratchSlowDown = new CANNON.Vec3()

const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value

/** One tick of his controls plus a world step. */
export function stepCarPhysics(
  physics: CarPhysics,
  state: CarDriveState,
  input: CarInput,
  delta: number,
) {
  const { world, vehicle, chassisBody } = physics
  const deltaMs = delta * 1000
  state.hopCooldown = Math.max(state.hopCooldown - delta, 0)

  const positionDelta = chassisBody.position.vsub(state.oldPosition)
  state.oldPosition.copy(chassisBody.position)
  // His speed is units per millisecond, which is what the max speeds compare to.
  state.speed = deltaMs > 0 ? positionDelta.length() / deltaMs : 0

  chassisBody.vectorToWorldFrame(FORWARD, state.worldForward)
  state.forwardSpeed = state.worldForward.dot(positionDelta)
  state.goingForward = state.forwardSpeed > 0

  const steerStrength = deltaMs * OPTIONS.controlsSteeringSpeed
  if (input.right) state.steering += steerStrength
  else if (input.left) state.steering -= steerStrength
  else if (Math.abs(state.steering) > steerStrength)
    state.steering -= steerStrength * Math.sign(state.steering)
  else state.steering = 0

  state.steering = clamp(
    state.steering,
    -OPTIONS.controlsSteeringMax,
    OPTIONS.controlsSteeringMax,
  )
  vehicle.setSteeringValue(-state.steering, 0)
  vehicle.setSteeringValue(-state.steering, 1)

  const acceleratingSpeed = input.boost
    ? OPTIONS.controlsAcceleratingSpeedBoost
    : OPTIONS.controlsAcceleratingSpeed
  const accelerateStrength = 17 * acceleratingSpeed
  const maxSpeed = input.boost
    ? OPTIONS.controlsAcceleratinMaxSpeedBoost
    : OPTIONS.controlsAcceleratinMaxSpeed

  if (input.up) {
    state.accelerating =
      state.speed < maxSpeed || !state.goingForward ? accelerateStrength : 0
  } else if (input.down) {
    state.accelerating =
      state.speed < maxSpeed || state.goingForward ? -accelerateStrength : 0
  } else {
    state.accelerating = 0
  }

  // Rear wheel drive, like his (his quad-drive option is off).
  for (const index of REAR_WHEELS) {
    vehicle.applyEngineForce(-state.accelerating, index)
  }
  for (const index of WHEELS) {
    vehicle.setBrake(input.brake ? OPTIONS.controlsBrakeStrength : 0, index)
  }

  world.step(delta)

  // Read straight after the step: rendering calls `updateWheelTransform`, which
  // clears the contact flags again.
  state.grounded = vehicle.wheelInfos.some((wheel) => wheel.isInContact)

  // Coast down when off throttle, like his slow-down impulse.
  if (!input.up && !input.down) {
    scratchSlowDown.copy(state.worldForward)
    if (state.goingForward) scratchSlowDown.negate(scratchSlowDown)
    scratchSlowDown.scale(chassisBody.velocity.length() * 0.1, scratchSlowDown)
    chassisBody.applyImpulse(scratchSlowDown, chassisBody.position)
  }

  // Flip back over after staying upside down for a second.
  chassisBody.vectorToWorldFrame(UP, scratchUp)
  if (scratchUp.z < 0.1) {
    state.upsideDownSince += delta
    if (state.upsideDownSince > 1) {
      state.upsideDownSince = 0
      chassisBody.quaternion.setFromAxisAngle(UP, 0)
      chassisBody.angularVelocity.setZero()
      chassisBody.velocity.setZero()
      chassisBody.position.z += 1
    }
  } else {
    state.upsideDownSince = 0
  }
}
