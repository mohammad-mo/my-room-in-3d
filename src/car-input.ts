/**
 * One place the car reads its controls from, because there are two sources: the
 * keyboard and the on-screen joystick. Both write here and the car takes
 * whichever is pressed, so a phone and a keyboard can even be used together.
 */
import type { CarInput } from './car-physics'

const empty = (): CarInput => ({
  up: false,
  down: false,
  left: false,
  right: false,
  brake: false,
  boost: false,
})

const keyboard = empty()
const touch = empty()
const merged = empty()
const hornListeners = new Set<() => void>()

export type CarAction = keyof CarInput

export function setKeyboardAction(action: CarAction, pressed: boolean) {
  keyboard[action] = pressed
}

export function setTouchInput(next: Partial<CarInput>) {
  Object.assign(touch, next)
}

export function releaseTouchInput() {
  Object.assign(touch, empty())
}

export function readCarInput(): CarInput {
  for (const action of Object.keys(merged) as CarAction[]) {
    merged[action] = keyboard[action] || touch[action]
  }
  return merged
}

/** Honking also hops the car, the way Bruno's horn does. */
export function honk() {
  for (const listener of hornListeners) listener()
}

export function onHonk(listener: () => void) {
  hornListeners.add(listener)
  return () => {
    hornListeners.delete(listener)
  }
}
