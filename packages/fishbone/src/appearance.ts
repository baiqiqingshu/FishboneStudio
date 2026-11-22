import type { FishboneAppearance } from './types'

export const fishboneAppearanceOptions = {
  headStyle: [
    'fish',
    'slim',
    'shark',
    'roundfish',
    'carp',
    'sunfish',
    'triangle',
    'rounded',
    'label'
  ],
  tailStyle: ['fork', 'fan', 'crescent', 'chevron'],
  spineStyle: ['tapered', 'vertebrae', 'double', 'line'],
  boneStyle: ['curved', 'tapered', 'jointed', 'straight'],
  categoryStyle: ['fin', 'pill', 'ribbon', 'outline'],
  causeStyle: ['dot', 'card', 'underline']
} as const satisfies { [K in keyof FishboneAppearance]: readonly FishboneAppearance[K][] }

export function fishHeadMetrics(style: FishboneAppearance['headStyle']) {
  const tall = ['roundfish', 'carp', 'sunfish', 'triangle'].includes(style)
  const eye = ['fish', 'shark', 'sunfish'].includes(style)
  const notch = style === 'shark' || style === 'sunfish'
  return {
    width: tall ? 340 : 300,
    minHeight:
      style === 'sunfish'
        ? 260
        : style === 'carp'
          ? 230
          : tall
            ? 240
            : style === 'fish'
              ? 160
              : style === 'shark'
                ? 184
                : 108,
    textWidth:
      style === 'slim'
        ? 158
        : style === 'fish'
          ? 144
          : notch
            ? 132
            : style === 'triangle'
              ? 144
              : tall
                ? 158
                : 184,
    textCenter:
      style === 'fish'
        ? 0.465
        : style === 'slim'
          ? 0.445
          : notch
            ? 0.4
            : style === 'roundfish' || style === 'triangle'
              ? 0.36
              : style === 'carp'
                ? 0.43
                : 0.5,
    textY: style === 'fish' ? 0.57 : eye ? 0.6 : 0.5,
    textHeightRatio: style === 'fish' ? 0.3 : style === 'triangle' ? 0.4 : eye ? 0.36 : 0.52
  }
}

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
