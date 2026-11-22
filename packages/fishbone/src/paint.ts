import type { DiagramBox, DiagramLayout, DiagramLine } from './layout'
import { bonePoint } from './appearance'
import { escapeXml as xml } from './xml'

// All geometry is local, standalone SVG: no CSS, external assets, filters or shared IDs.
const path = (d: string, attributes = '') => `<path d="${d}" ${attributes}/>`
const circle = (x: number, y: number, radius: number, attributes = '') =>
  `<circle cx="${x}" cy="${y}" r="${radius}" ${attributes}/>`
const rect = (box: DiagramBox, radius = box.radius) =>
  `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${radius}"/>`

function paintHead(box: DiagramBox, layout: DiagramLayout): string {
  const { x, y, width: w, height: h } = box
  const theme = layout.theme
  const p = (a: number, b: number) => `${x + w * a} ${y + h * b}`
  const style = theme.headStyle
  const anatomical = !['rounded', 'label'].includes(style)
  const group = `data-part="head" data-style="${style}" fill="${xml(box.fill)}" stroke="${anatomical ? xml(theme.headTextColor) : xml(box.stroke)}" stroke-opacity="${anatomical ? 0.4 : 1}" stroke-width="${anatomical ? Math.max(1, theme.lineWidth * 0.65) : theme.lineWidth}" stroke-linejoin="round"`
  let shape = ''
  let silhouette = ''
  if (style === 'fish') {
    silhouette = `M${p(0.11, 0.12)} C${p(0.23, 0.035)} ${p(0.65, 0.12)} ${p(0.9, 0.36)} Q${p(0.975, 0.44)} ${p(0.985, 0.52)} C${p(0.76, 0.72)} ${p(0.38, 0.955)} ${p(0.13, 0.92)} Q${p(0.045, 0.91)} ${p(0.065, 0.8)} C${p(0.13, 0.61)} ${p(0.13, 0.4)} ${p(0.065, 0.23)} Q${p(0.045, 0.16)} ${p(0.11, 0.12)} Z`
  } else if (style === 'slim') {
    silhouette = `M${p(0.075, 0.5)} C${p(0.075, 0.25)} ${p(0.29, 0.12)} ${p(0.56, 0.13)} C${p(0.8, 0.14)} ${p(0.965, 0.32)} ${p(0.98, 0.5)} C${p(0.965, 0.68)} ${p(0.8, 0.86)} ${p(0.56, 0.87)} C${p(0.29, 0.88)} ${p(0.075, 0.75)} ${p(0.075, 0.5)} Z`
  } else if (style === 'shark') {
    silhouette = `M${p(0.085, 0.085)} C${p(0.31, 0.025)} ${p(0.76, 0.12)} ${p(0.98, 0.43)} L${p(0.74, 0.5)} Q${p(0.83, 0.58)} ${p(0.935, 0.61)} C${p(0.745, 0.845)} ${p(0.43, 0.96)} ${p(0.095, 0.935)} Q${p(0.17, 0.5)} ${p(0.085, 0.085)} Z`
  } else if (style === 'roundfish') {
    silhouette = `M${p(0.13, 0.045)} C${p(0.37, 0.065)} ${p(0.745, 0.21)} ${p(0.955, 0.42)} Q${p(1, 0.5)} ${p(0.955, 0.58)} C${p(0.745, 0.79)} ${p(0.37, 0.935)} ${p(0.13, 0.955)} Q${p(0.055, 0.96)} ${p(0.055, 0.865)} L${p(0.055, 0.135)} Q${p(0.055, 0.04)} ${p(0.13, 0.045)} Z`
  } else if (style === 'carp') {
    silhouette = `M${p(0.075, 0.5)} C${p(0.075, 0.225)} ${p(0.225, 0.055)} ${p(0.44, 0.055)} C${p(0.67, 0.055)} ${p(0.88, 0.29)} ${p(0.975, 0.455)} Q${p(1, 0.5)} ${p(0.975, 0.545)} C${p(0.88, 0.71)} ${p(0.67, 0.945)} ${p(0.44, 0.945)} C${p(0.225, 0.945)} ${p(0.075, 0.775)} ${p(0.075, 0.5)} Z`
  } else if (style === 'sunfish') {
    silhouette = `M${p(0.1, 0.055)} C${p(0.43, 0.015)} ${p(0.76, 0.16)} ${p(0.98, 0.395)} L${p(0.65, 0.505)} Q${p(0.76, 0.6)} ${p(0.915, 0.65)} C${p(0.73, 0.865)} ${p(0.45, 0.98)} ${p(0.105, 0.945)} Q${p(0.2, 0.5)} ${p(0.1, 0.055)} Z`
  } else if (style === 'triangle') {
    silhouette = `M${p(0.12, 0.06)} L${p(0.965, 0.465)} Q${p(1, 0.5)} ${p(0.965, 0.535)} L${p(0.12, 0.94)} Q${p(0.075, 0.965)} ${p(0.075, 0.91)} L${p(0.075, 0.09)} Q${p(0.075, 0.035)} ${p(0.12, 0.06)} Z`
  } else if (style === 'rounded') {
    shape = rect(box, Math.min(h / 2, 38))
  } else shape = rect(box)
  if (anatomical) {
    let details = ''
    const notch = style === 'shark' || style === 'sunfish'
    if (style === 'fish' || style === 'slim' || notch || style === 'carp') {
      const eyeX = x + w * (notch ? 0.4 : style === 'slim' ? 0.84 : 0.67),
        eyeY = y + h * (style === 'slim' ? 0.32 : 0.25)
      const radius = style === 'slim' ? 3.2 : 4
      details += circle(
        eyeX,
        eyeY,
        radius,
        `data-feature="eye" fill="${xml(theme.headTextColor)}" stroke="none" opacity=".75"`
      )
    }
    if (!['triangle', 'roundfish'].includes(style)) {
      details += path(
        `M${p(0.15, 0.3)} C${p(0.12, 0.41)} ${p(0.12, 0.59)} ${p(0.15, 0.7)}`,
        `data-feature="gill" fill="none" stroke="${xml(theme.headTextColor)}" stroke-width="1.2" stroke-opacity=".27" stroke-linecap="round"`
      )
    }
    if (style === 'slim')
      details += path(
        `M${p(0.915, 0.58)} Q${p(0.946, 0.59)} ${p(0.97, 0.55)}`,
        `data-feature="mouth" fill="none" stroke="${xml(theme.headTextColor)}" stroke-width="1" stroke-opacity=".5" stroke-linecap="round"`
      )
    shape =
      path(silhouette, `data-feature="silhouette"${notch ? ' data-mouth="notch"' : ''}`) + details
  }
  return `<g ${group}>${shape}</g>`
}

function paintTail(spine: DiagramLine, layout: DiagramLayout): string {
  const { theme } = layout,
    x = spine.x1,
    y = spine.y1
  let shape = ''
  if (theme.tailStyle === 'fork') {
    shape = path(
      `M${x} ${y - 7} C${x - 18} ${y - 17} ${x - 40} ${y - 34} 15 ${y - 34} Q23 ${y - 13} 35 ${y} Q23 ${y + 13} 15 ${y + 34} C${x - 40} ${y + 34} ${x - 18} ${y + 17} ${x} ${y + 7} Z`
    )
    shape += path(
      `M${x - 4} ${y - 3} L26 ${y - 26} M${x - 4} ${y + 3} L26 ${y + 26}`,
      'fill="none" opacity=".35"'
    )
  } else if (theme.tailStyle === 'fan') {
    shape = path(
      `M${x} ${y - 6} Q45 ${y - 20} 23 ${y - 35} Q5 ${y} 23 ${y + 35} Q45 ${y + 20} ${x} ${y + 6} Z`
    )
    for (const offset of [-23, -11, 0, 11, 23])
      shape += path(`M${x - 3} ${y} L21 ${y + offset}`, 'fill="none" opacity=".3"')
  } else if (theme.tailStyle === 'crescent') {
    shape = path(
      `M${x} ${y - 6} Q40 ${y - 10} 15 ${y - 38} Q32 ${y} 15 ${y + 38} Q40 ${y + 10} ${x} ${y + 6} Z`
    )
    shape += path(`M${x - 6} ${y} H37`, 'fill="none" opacity=".3"')
  } else shape = path(`M28 ${y - 18} L${x} ${y} L28 ${y + 18}`, 'fill="none"')
  return `<g data-part="tail" data-style="${theme.tailStyle}" fill="${xml(theme.headBackground)}" stroke="${xml(theme.spineColor)}" stroke-width="${theme.lineWidth}" stroke-linecap="round" stroke-linejoin="round">${shape}</g>`
}

function paintSpine(spine: DiagramLine, layout: DiagramLayout): string {
  const { x1: x, x2: end, y1: y } = spine,
    { theme } = layout
  const length = end - x,
    half = Math.max(4, theme.lineWidth * 2.2)
  let shape = ''
  if (theme.spineStyle === 'tapered') {
    shape = path(
      `M${x} ${y} C${x + length * 0.25} ${y - half} ${end - length * 0.2} ${y - half} ${end} ${y - 2} L${end} ${y + 2} C${end - length * 0.2} ${y + half} ${x + length * 0.25} ${y + half} ${x} ${y} Z`,
      `fill="${xml(theme.spineColor)}" stroke="none" opacity=".85"`
    )
    shape += path(
      `M${x + 20} ${y} H${end}`,
      `fill="none" stroke-width="${Math.max(0.6, theme.lineWidth * 0.4)}"`
    )
  } else if (theme.spineStyle === 'vertebrae') {
    shape = path(`M${x} ${y} H${end}`, `stroke-width="${theme.lineWidth}"`)
    const count = Math.min(80, Math.floor(length / 27)),
      step = length / Math.max(1, count)
    for (let i = 1; i < count; i++) {
      const cx = x + step * i,
        radius = Math.min(6, step * 0.22)
      shape += path(
        `M${cx - radius} ${y - half} Q${cx} ${y - half - 2} ${cx + radius} ${y - half} Q${cx + radius - 2} ${y} ${cx + radius} ${y + half} Q${cx} ${y + half + 2} ${cx - radius} ${y + half} Q${cx - radius + 2} ${y} ${cx - radius} ${y - half} Z`,
        `fill="${xml(theme.headBackground)}" stroke-width="${theme.lineWidth * 0.65}"`
      )
    }
  } else if (theme.spineStyle === 'double') {
    shape = path(
      `M${x} ${y} Q${x} ${y - half} ${x + 10} ${y - half} H${end} M${x} ${y} Q${x} ${y + half} ${x + 10} ${y + half} H${end}`,
      `fill="none" stroke-width="${theme.lineWidth * 0.8}"`
    )
  } else shape = `<line x1="${x}" y1="${y}" x2="${end}" y2="${y}" stroke-width="${spine.width}"/>`
  return `<g data-part="spine" data-style="${theme.spineStyle}" stroke="${xml(theme.spineColor)}" stroke-linecap="round" fill="none">${shape}</g>`
}

function paintBone(line: DiagramLine, layout: DiagramLayout): string {
  const { x1, y1, x2, y2, width } = line,
    { theme } = layout
  const midpoint = bonePoint(x1, y1, x2, y2, 0.5, theme.boneStyle)
  let shape = ''
  if (theme.boneStyle === 'curved') {
    shape = path(
      `M${x1} ${y1} Q${(x1 + x2) / 2 + 30} ${(y1 + y2) / 2} ${x2} ${y2}`,
      `fill="none" stroke-width="${width}"`
    )
  } else if (theme.boneStyle === 'tapered') {
    const length = Math.hypot(x2 - x1, y2 - y1),
      thickness = Math.max(2.5, width * 1.5)
    const nx = (-(y2 - y1) / length) * thickness,
      ny = ((x2 - x1) / length) * thickness
    shape = path(
      `M${x1 + nx} ${y1 + ny} Q${(x1 + x2) / 2 + nx * 0.45} ${(y1 + y2) / 2 + ny * 0.45} ${x2} ${y2} Q${(x1 + x2) / 2 - nx * 0.45} ${(y1 + y2) / 2 - ny * 0.45} ${x1 - nx} ${y1 - ny} Z`,
      `fill="${xml(line.color)}" stroke="none" opacity=".8"`
    )
  } else if (theme.boneStyle === 'jointed') {
    shape = path(
      `M${x1} ${y1} L${midpoint.x} ${midpoint.y} L${x2} ${y2}`,
      `fill="none" stroke-width="${width}"`
    )
    shape += circle(
      midpoint.x,
      midpoint.y,
      Math.max(3, width * 1.6),
      `fill="${xml(theme.background)}" stroke-width="${width * 0.8}"`
    )
  } else shape = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${width}"/>`
  if (theme.boneStyle !== 'straight')
    shape += circle(
      x1,
      y1,
      Math.max(3, width * 1.7),
      `fill="${xml(theme.background)}" stroke-width="${width * 0.8}"`
    )
  return `<g data-part="bone" data-style="${theme.boneStyle}" stroke="${xml(line.color)}" stroke-linecap="round" stroke-linejoin="round">${shape}</g>`
}

function paintCategory(box: DiagramBox, layout: DiagramLayout): string {
  const { x, y, width: w, height: h } = box,
    { theme } = layout
  let shape = '',
    fill = box.fill
  if (theme.categoryStyle === 'fin') {
    const tip = x + w * 0.5
    shape =
      box.direction === -1
        ? path(
            `M${x + 18} ${y} H${x + w - 18} Q${x + w} ${y} ${x + w} ${y + 14} V${y + h - 24} Q${x + w} ${y + h - 12} ${x + w - 14} ${y + h - 12} H${tip + 18} L${tip} ${y + h} L${tip - 18} ${y + h - 12} H${x + 14} Q${x} ${y + h - 12} ${x} ${y + h - 24} V${y + 14} Q${x} ${y} ${x + 18} ${y} Z`
          )
        : path(
            `M${tip} ${y} L${tip + 18} ${y + 12} H${x + w - 14} Q${x + w} ${y + 12} ${x + w} ${y + 24} V${y + h - 14} Q${x + w} ${y + h} ${x + w - 18} ${y + h} H${x + 18} Q${x} ${y + h} ${x} ${y + h - 14} V${y + 24} Q${x} ${y + 12} ${x + 14} ${y + 12} H${tip - 18} Z`
          )
  } else if (theme.categoryStyle === 'pill') shape = rect(box, Math.min(h / 2, 28))
  else if (theme.categoryStyle === 'ribbon')
    shape = path(
      `M${x} ${y} H${x + w} L${x + w - 12} ${y + h / 2} L${x + w} ${y + h} H${x} L${x + 12} ${y + h / 2} Z`
    )
  else shape = rect(box)
  const wash =
    theme.categoryStyle === 'outline'
      ? ''
      : `<g fill="${xml(box.stroke)}" fill-opacity=".1" stroke="none">${shape}</g>`
  return `<g data-part="category" data-style="${theme.categoryStyle}" fill="${xml(fill)}" stroke="${xml(box.stroke)}" stroke-width="${theme.lineWidth * 0.75}" stroke-linejoin="round">${shape}${wash}</g>`
}

export function paintFishbone(layout: DiagramLayout): string {
  const spine = layout.lines.find((line) => line.kind === 'spine')!
  const bones = layout.lines
    .filter((line) => line.kind === 'bone')
    .map((line) => paintBone(line, layout))
    .join('')
  const connectors = layout.lines
    .filter((line) => line.kind === 'cause' || line.kind === 'connector')
    .map((line) => {
      const shape = `<line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}" stroke="${xml(line.color)}" stroke-width="${line.width}" opacity="${line.opacity}" stroke-linecap="round"/>`
      const dot =
        line.kind === 'cause' && layout.theme.causeStyle === 'dot'
          ? circle(line.x1, line.y1, 2.4, `fill="${xml(line.color)}"`)
          : ''
      return `<g data-part="${line.kind}"${line.kind === 'cause' ? ` data-style="${layout.theme.causeStyle}"` : ''}>${shape}${dot}</g>`
    })
    .join('')
  const boxes = layout.boxes
    .map((box) =>
      box.kind === 'head'
        ? paintHead(box, layout)
        : box.kind === 'category'
          ? paintCategory(box, layout)
          : `<g data-part="cause-card" fill="${xml(box.fill)}" stroke="${xml(box.stroke)}" stroke-opacity=".4" stroke-width=".8">${rect(box)}</g>`
    )
    .join('')
  return `${paintTail(spine, layout)}${bones}${paintSpine(spine, layout)}${connectors}${boxes}`
}
