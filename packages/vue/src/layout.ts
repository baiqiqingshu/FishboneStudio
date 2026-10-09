import { validateTree } from './tree'
import { resolveTheme } from './themes'
import { bonePoint } from './appearance'
import type { FishboneNode, FishboneTheme, FishbonePreset, ResolvedFishboneTheme } from './types'
export interface DiagramLine {
  kind: 'spine' | 'bone' | 'cause' | 'connector'
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
  kind: 'head' | 'category' | 'cause'
  direction?: number
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
  theme: ResolvedFishboneTheme
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
    78,
    ...categories.map((c) => wrapLabel(c.node.label, 230, titleSize).length * titleSize * 1.4 + 48)
  )
  const headText = wrapLabel(data.label, 184, size + 3)
  const headHeight = Math.max(108, headText.length * (size + 3) * 1.4 + 50)
  const spineY = Math.max(titleSpace + topSpan, headHeight / 2 + 20)
  const height = Math.max(spineY + bottomSpan + titleSpace, spineY + headHeight / 2 + 20)
  const lanes: number[] = []
  for (let i = 0; i < Math.ceil(categories.length / 2); i++)
    lanes.push(Math.max(categories[i * 2]?.width ?? 0, categories[i * 2 + 1]?.width ?? 0))
  const width = Math.max(850, lanes.reduce((sum, item) => sum + item, 0) + 430)
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
    opacity = 1,
    kind: DiagramLine['kind'] = 'connector'
  ) => lines.push({ x1, y1, x2, y2, color, width: thickness, opacity, kind })
  line(74, spineY, width - 284, spineY, theme.spineColor, theme.lineWidth + 1, 1, 'spine')
  for (const category of categories) {
    const lane = Math.floor(category.index / 2)
    const start = 100 + lanes.slice(0, lane).reduce((sum, item) => sum + item, 0),
      laneWidth = lanes[lane]!
    const direction = category.index % 2 === 0 ? -1 : 1,
      span = direction === -1 ? topSpan : bottomSpan
    const anchorX = start + laneWidth - 18,
      tipX = anchorX - 135,
      tipY = spineY + direction * span
    const color = theme.branchColors[category.index % theme.branchColors.length]!
    line(anchorX, spineY, tipX, tipY, color, theme.lineWidth, 1, 'bone')
    const title = wrapLabel(category.node.label, 230, titleSize),
      titleHeight = title.length * titleSize * 1.4 + 32
    const boxY = direction === -1 ? tipY - titleHeight - 8 : tipY + 8
    const boxWidth = Math.max(110, Math.min(294, textWidth(category.node.label, titleSize) + 64))
    boxes.push({
      kind: 'category',
      direction,
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
      y: boxY + titleSize + (direction === 1 && theme.categoryStyle === 'fin' ? 18 : 8),
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
        const rib = bonePoint(
          anchorX,
          spineY,
          tipX,
          tipY,
          Math.abs(y - spineY) / span,
          theme.boneStyle
        )
        const labelWidth = Math.max(...row.text.map((t) => textWidth(t, size)))
        if (theme.causeStyle === 'card')
          boxes.push({
            kind: 'cause',
            x: pos.x - 2,
            y: pos.y - 6,
            width: labelWidth + 18,
            height: row.text.length * leading + 12,
            fill: theme.background,
            stroke: color,
            radius: Math.min(theme.nodeRadius, 8)
          })
        line(
          theme.causeStyle === 'card' ? pos.x + labelWidth + 16 : pos.x,
          y,
          rib.x,
          y,
          color,
          theme.lineWidth * 0.65,
          0.75,
          'cause'
        )
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
    kind: 'head',
    x: width - 316,
    y: spineY - headHeight / 2,
    width: 300,
    height: headHeight,
    fill: theme.headBackground,
    stroke: theme.spineColor,
    radius: theme.nodeRadius + 4
  })
  labels.push({
    x: width - (theme.headStyle === 'fish' || theme.headStyle === 'shark' ? 182 : 166),
    y: spineY - (headText.length - 1) * (size + 3) * 0.7 + 5,
    lines: headText,
    color: theme.headTextColor,
    size: size + 3,
    weight: 600,
    anchor: 'middle'
  })
  return { width, height, lines, labels, boxes, theme }
}
