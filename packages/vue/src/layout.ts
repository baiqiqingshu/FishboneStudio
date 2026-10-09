import { validateTree } from './tree'
import { resolveTheme } from './themes'
import type { FishboneNode, FishboneTheme, FishbonePreset } from './types'
export interface DiagramLine {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  width: number
  opacity?: number
}
export interface DiagramLabel {
  x: number
  y: number
  lines: string[]
  color: string
  size: number
  weight: number
  anchor: 'start' | 'middle'
}
export interface DiagramBox {
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  radius: number
}
export interface DiagramLayout {
  width: number
  height: number
  lines: DiagramLine[]
  labels: DiagramLabel[]
  boxes: DiagramBox[]
  theme: FishboneTheme
}
export function textWidth(value: string, size: number): number {
  return Array.from(value).reduce((width, char) => {
    const factor = /[MW@%]/.test(char)
      ? 1
      : /[A-Z]/.test(char)
        ? 0.78
        : /[\u0000-\u00ff]/.test(char)
          ? 0.65
          : 1.05
    return width + factor * size
  }, 0)
}
export function wrapLabel(value: string, maxWidth: number, size: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const char of value) {
    if (char === '\n' || (line && textWidth(line + char, size) > maxWidth)) {
      lines.push(line)
      line = char === '\n' ? '' : char
    } else line += char
  }
  lines.push(line)
  return lines
}
interface Row {
  node: FishboneNode
  depth: number
  parent: number
  text: string[]
  offset: number
}
export function layoutFishbone(
  data: FishboneNode,
  preset: FishbonePreset = 'ocean',
  custom: Partial<FishboneTheme> = {}
): DiagramLayout {
  validateTree(data)
  const theme = resolveTheme(preset, custom)
  const { fontSize: size } = theme
  const leading = size * 1.4
  const categories = (data.children ?? []).map((node, index) => {
    const rows: Row[] = []
    let offset = 0,
      maxDepth = 0
    const visit = (child: FishboneNode, depth: number, parent: number) => {
      const text = wrapLabel(child.label, 210, size),
        rowIndex = rows.length
      rows.push({ node: child, depth, parent, text, offset })
      offset += text.length * leading + 20
      maxDepth = Math.max(maxDepth, depth)
      child.children?.forEach((item) => visit(item, depth + 1, rowIndex))
    }
    node.children?.forEach((child) => visit(child, 0, -1))
    return { node, index, rows, span: Math.max(145, offset + 60), width: 400 + maxDepth * 20 }
  })
  const topSpan = Math.max(145, ...categories.filter((c) => c.index % 2 === 0).map((c) => c.span))
  const bottomSpan = Math.max(
    145,
    ...categories.filter((c) => c.index % 2 === 1).map((c) => c.span)
  )
  const titleSize = size + 1
  const titleSpace = Math.max(
    60,
    ...categories.map((c) => wrapLabel(c.node.label, 230, titleSize).length * titleSize * 1.4 + 34)
  )
  const headText = wrapLabel(data.label, 184, size + 3)
  const headHeight = Math.max(76, headText.length * (size + 3) * 1.4 + 30)
  const spineY = Math.max(titleSpace + topSpan, headHeight / 2 + 20)
  const height = Math.max(spineY + bottomSpan + titleSpace, spineY + headHeight / 2 + 20)
  const lanes: number[] = []
  for (let i = 0; i < Math.ceil(categories.length / 2); i++)
    lanes.push(Math.max(categories[i * 2]?.width ?? 0, categories[i * 2 + 1]?.width ?? 0))
  const width = Math.max(800, lanes.reduce((sum, item) => sum + item, 0) + 310)
  const lines: DiagramLine[] = [],
    labels: DiagramLabel[] = [],
    boxes: DiagramBox[] = []
  const line = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    thickness = theme.lineWidth,
    opacity = 1
  ) => lines.push({ x1, y1, x2, y2, color, width: thickness, opacity })
  line(40, spineY, width - 236, spineY, theme.spineColor, theme.lineWidth + 1)
  line(40, spineY, 23, spineY - 14, theme.spineColor)
  line(40, spineY, 23, spineY + 14, theme.spineColor)
  line(width - 236, spineY, width - 247, spineY - 7, theme.spineColor)
  line(width - 236, spineY, width - 247, spineY + 7, theme.spineColor)
  for (const category of categories) {
    const lane = Math.floor(category.index / 2)
    const start = 58 + lanes.slice(0, lane).reduce((sum, item) => sum + item, 0),
      laneWidth = lanes[lane]!
    const direction = category.index % 2 === 0 ? -1 : 1,
      span = direction === -1 ? topSpan : bottomSpan
    const anchorX = start + laneWidth - 18,
      tipX = anchorX - 135,
      tipY = spineY + direction * span
    const color = theme.branchColors[category.index % theme.branchColors.length]!
    line(anchorX, spineY, tipX, tipY, color)
    const title = wrapLabel(category.node.label, 230, titleSize),
      titleHeight = title.length * titleSize * 1.4 + 20
    const boxY = direction === -1 ? tipY - titleHeight - 8 : tipY + 8
    const boxWidth = Math.max(95, Math.min(262, textWidth(category.node.label, titleSize) + 32))
    boxes.push({
      x: tipX - boxWidth / 2,
      y: boxY,
      width: boxWidth,
      height: titleHeight,
      fill: theme.background,
      stroke: color,
      radius: theme.nodeRadius
    })
    labels.push({
      x: tipX,
      y: boxY + titleSize + 8,
      lines: title,
      color,
      size: titleSize,
      weight: 600,
      anchor: 'middle'
    })
    const regionTop = direction === -1 ? tipY + 26 : spineY + 30
    const positions = category.rows.map((row) => ({
      x: start + row.depth * 20,
      y: regionTop + row.offset
    }))
    category.rows.forEach((row, rowIndex) => {
      const pos = positions[rowIndex]!,
        y = pos.y + row.text.length * leading + 3
      labels.push({
        x: pos.x + 5,
        y: pos.y + size,
        lines: row.text,
        color: row.depth === 0 ? theme.textColor : theme.mutedColor,
        size,
        weight: row.depth === 0 ? 500 : 400,
        anchor: 'start'
      })
      if (row.parent === -1) {
        const ribX = anchorX - (Math.abs(y - spineY) / span) * 135
        line(pos.x, y, ribX, y, color, theme.lineWidth * 0.65, 0.7)
      } else {
        const parent = positions[row.parent]!,
          parentRow = category.rows[row.parent]!
        const parentY = parent.y + parentRow.text.length * leading + 3,
          connectorX = pos.x - 10
        line(connectorX, parentY, connectorX, y, color, theme.lineWidth * 0.6, 0.45)
        line(
          connectorX,
          y,
          pos.x + Math.max(...row.text.map((t) => textWidth(t, size))) + 8,
          y,
          color,
          theme.lineWidth * 0.6,
          0.45
        )
      }
    })
  }
  boxes.push({
    x: width - 224,
    y: spineY - headHeight / 2,
    width: 208,
    height: headHeight,
    fill: theme.headBackground,
    stroke: theme.spineColor,
    radius: theme.nodeRadius + 4
  })
  labels.push({
    x: width - 120,
    y: spineY - (headText.length - 1) * (size + 3) * 0.7 + 5,
    lines: headText,
    color: theme.headTextColor,
    size: size + 3,
    weight: 600,
    anchor: 'middle'
  })
  return { width, height, lines, labels, boxes, theme }
}
