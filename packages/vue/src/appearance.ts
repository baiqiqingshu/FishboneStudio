import type { FishboneAppearance } from './types'

export const fishboneAppearanceOptions = {
  headStyle: ['fish', 'shark', 'rounded', 'label'],
  tailStyle: ['fork', 'fan', 'crescent', 'chevron'],
  spineStyle: ['tapered', 'vertebrae', 'double', 'line'],
  boneStyle: ['curved', 'tapered', 'jointed', 'straight'],
  categoryStyle: ['fin', 'pill', 'ribbon', 'outline'],
  causeStyle: ['dot', 'card', 'underline']
} as const satisfies { [K in keyof FishboneAppearance]: readonly FishboneAppearance[K][] }

/** Same interpolation used by the painted rib and its cause attachments. */
export function bonePoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
  style: FishboneAppearance['boneStyle']
) {
  const bend =
    style === 'curved' ? 60 * t * (1 - t) : style === 'jointed' ? 18 * (1 - Math.abs(2 * t - 1)) : 0
  return { x: x1 + (x2 - x1) * t + bend, y: y1 + (y2 - y1) * t }
}
