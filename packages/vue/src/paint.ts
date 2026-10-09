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
  const cy = y + h / 2,
    theme = layout.theme
  const group = `data-part="head" data-style="${theme.headStyle}" fill="${xml(box.fill)}" stroke="${xml(box.stroke)}" stroke-width="${theme.lineWidth}" stroke-linejoin="round"`
  let shape: string
  if (theme.headStyle === 'fish') {
    shape = path(
      `M${x + 18} ${y + 14} C${x + 58} ${y + 2} ${x + 188} ${y + 2} ${x + 248} ${y + 20} C${x + 279} ${y + 30} ${x + w} ${cy - 20} ${x + w} ${cy} C${x + w} ${cy + 18} ${x + 273} ${y + h - 18} ${x + 243} ${y + h - 12} C${x + 179} ${y + h + 2} ${x + 58} ${y + h - 2} ${x + 18} ${y + h - 14} Q${x + 34} ${cy} ${x + 18} ${y + 14} Z`
    )
    shape += path(
      `M${x + 34} ${cy - 24} Q${x + 45} ${cy} ${x + 34} ${cy + 24}`,
      'data-feature="gill" fill="none" opacity=".3" stroke-width="1.3" stroke-linecap="round"'
    )
    shape += path(
      `M${x + w - 24} ${cy + 10} Q${x + w - 14} ${cy + 16} ${x + w - 4} ${cy + 5}`,
      `data-feature="mouth" fill="none" stroke="${xml(theme.headTextColor)}" stroke-width="1.4" stroke-linecap="round" opacity=".65"`
    )
  } else if (theme.headStyle === 'shark') {
    shape = path(
      `M${x + 12} ${y + 18} L${x + 56} ${y + 6} Q${x + 182} ${y + 1} ${x + 245} ${y + 26} L${x + w} ${cy} L${x + 258} ${y + h - 18} Q${x + 162} ${y + h + 3} ${x + 51} ${y + h - 5} L${x + 12} ${y + h - 16} L${x + 23} ${cy} Z`
    )
    for (let i = 0; i < 3; i++)
      shape += path(
        `M${x + 30 + i * 7} ${cy - 13} q-5 12 -4 26`,
        'data-feature="gill" fill="none" opacity=".3" stroke-width="1.2" stroke-linecap="round"'
      )
    shape += path(
      `M${x + w - 29} ${cy + 10} Q${x + w - 16} ${cy + 9} ${x + w - 6} ${cy + 2}`,
      `data-feature="mouth" fill="none" stroke="${xml(theme.headTextColor)}" stroke-width="1.3" stroke-linecap="round" opacity=".65"`
    )
  } else if (theme.headStyle === 'rounded') {
    shape = rect(box, Math.min(h / 2, 38))
    shape += path(
      `M${x + 17} ${cy - 16} V${cy + 16}`,
      `stroke="${xml(theme.headTextColor)}" stroke-width="3" opacity=".4"`
    )
  } else shape = rect(box)
  if (theme.headStyle === 'fish' || theme.headStyle === 'shark') {
    const shark = theme.headStyle === 'shark'
    const eyeY = cy - (shark ? 14 : 20),
      eyeX = x + (shark ? 250 : 255)
    const outline = shark
      ? path(
          `M${eyeX - 8} ${eyeY + 1} Q${eyeX} ${eyeY - 7} ${eyeX + 8} ${eyeY - 1} Q${eyeX} ${eyeY + 7} ${eyeX - 8} ${eyeY + 1} Z`
        )
      : `<ellipse cx="${eyeX}" cy="${eyeY}" rx="7.5" ry="6.5"/>`
    shape += `<g data-feature="eye" fill="${xml(theme.background)}" stroke="${xml(theme.headTextColor)}" stroke-width="1.15">${outline}${circle(eyeX + 1, eyeY, shark ? 2.6 : 3.1, `fill="${xml(theme.headTextColor)}" stroke="none"`)}${circle(eyeX + 1.8, eyeY - 1.1, 1.1, `fill="${xml(theme.background)}" stroke="none"`)}</g>`
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
