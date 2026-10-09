import { wrapLabel, textWidth } from '../layout'
import { resolveFlowchartOptions, resolveFlowchartTheme } from './themes'
import { validateFlowchart } from './validate'
import { routeFlowchartEdges } from './router'
import type {
  FlowchartData,
  FlowchartPreset,
  FlowchartThemeOverrides,
  FlowchartLayoutOptions,
  FlowchartPlacedNode,
  FlowchartPlacedRegion,
  FlowchartLayout,
  FlowchartNode
} from './types'

interface Cell {
  node: FlowchartNode
  column: number
  row: number
  initialRow: number
}
function orderNodes(nodes: FlowchartNode[], edges: FlowchartData['edges']): FlowchartNode[] {
  const local = new Set(nodes.map((node) => node.id)),
    incoming = new Map(nodes.map((node) => [node.id, 0]))
  const links = edges.filter(
    (edge) => edge.source !== edge.target && local.has(edge.source) && local.has(edge.target)
  )
  for (const edge of links) incoming.set(edge.target, incoming.get(edge.target)! + 1)
  const sort = (a: FlowchartNode, b: FlowchartNode) =>
    (a.order ?? nodes.indexOf(a)) - (b.order ?? nodes.indexOf(b))
  const ready = nodes.filter((node) => incoming.get(node.id) === 0).sort(sort),
    output: FlowchartNode[] = []
  while (ready.length) {
    const node = ready.shift()!
    output.push(node)
    for (const edge of links.filter((edge) => edge.source === node.id)) {
      incoming.set(edge.target, incoming.get(edge.target)! - 1)
      if (incoming.get(edge.target) === 0) {
        ready.push(nodes.find((item) => item.id === edge.target)!)
        ready.sort(sort)
      }
    }
  }
  // Cyclic subgraphs retain stable input ordering; routing handles their feedback edges.
  return [...output, ...nodes.filter((node) => !output.includes(node)).sort(sort)]
}
function optimizeRows(columns: Cell[][], edges: FlowchartData['edges'], rows: number) {
  const byId = new Map(columns.flat().map((cell) => [cell.node.id, cell]))
  const incident = new Map<string, typeof edges>()
  for (const edge of edges) {
    for (const id of new Set([edge.source, edge.target])) {
      const list = incident.get(id) ?? []
      list.push(edge)
      incident.set(id, list)
    }
  }
  function cost(cells: Cell[]) {
    const affected = new Set(cells.flatMap((cell) => incident.get(cell.node.id) ?? []))
    let value = 0
    for (const edge of affected) {
      const a = byId.get(edge.source),
        b = byId.get(edge.target)
      if (!a || !b) continue
      if (a.column !== b.column) value += Math.abs(a.row - b.row) * 6
      else {
        value += Math.abs(a.row - b.row) * 0.5
        if (Math.sign(a.row - b.row) !== Math.sign(a.initialRow - b.initialRow)) value += 40
      }
    }
    for (const cell of cells) value += Math.abs(cell.row - cell.initialRow) * 0.25
    return value
  }
  for (let pass = 0; pass < 4; pass++) {
    let changed = false
    for (const column of pass % 2 ? [...columns].reverse() : columns)
      for (const cell of column) {
        for (let target = 0; target < rows; target++) {
          if (target === cell.row) continue
          const other = column.find((item) => item.row === target),
            affected = other ? [cell, other] : [cell],
            before = cost(affected),
            old = cell.row
          cell.row = target
          if (other) other.row = old
          if (cost(affected) < before - 0.01) {
            changed = true
            break
          }
          cell.row = old
          if (other) other.row = target
        }
      }
    if (!changed) break
  }
}

/** Deterministic, DOM-free region grid layout with connection-aware row refinement. */
export function layoutFlowchart(
  data: FlowchartData,
  preset: FlowchartPreset = 'ocean',
  overrides: FlowchartThemeOverrides = {},
  layoutOptions: Partial<FlowchartLayoutOptions> = {}
): FlowchartLayout {
  validateFlowchart(data)
  const theme = resolveFlowchartTheme(preset, overrides)
  const configured = resolveFlowchartOptions(layoutOptions)
  const annotations = data.edges
    .filter((edge) => edge.label)
    .map((edge) => wrapLabel(edge.label!, 120, 12))
  const labelHeight = Math.max(0, ...annotations.map((lines) => lines.length * 17.4 + 8))
  const labelWidth = Math.max(0, ...annotations.flat().map((line) => textWidth(line, 12) + 16))
  // Requested gaps are lower bounds; long annotations reserve their own space.
  const options = {
    ...configured,
    rowGap: Math.max(configured.rowGap, labelHeight + 18),
    columnGap: Math.max(configured.columnGap, labelWidth + 20),
    regionGap: Math.max(configured.regionGap, labelWidth - 32)
  }
  const pinned = options.terminalPlacement !== 'auto'
  const start = pinned ? data.nodes.find((node) => node.type === 'start') : undefined
  const end = pinned ? data.nodes.find((node) => node.type === 'end') : undefined
  const normal = data.nodes.filter((node) => node !== start && node !== end)
  const regions = data.regions ?? []
  const ungrouped = normal.filter((node) => !node.regionId)
  const groups = [
    ...(ungrouped.length ? [{ region: undefined, nodes: ungrouped }] : []),
    ...regions.map((region) => ({
      region,
      nodes: normal.filter((node) => node.regionId === region.id)
    }))
  ]
  const nonempty = groups
    .filter((group) => group.nodes.length)
    .map((group) => group.nodes.length)
    .sort((a, b) => a - b)
  const typicalRows = nonempty.length ? nonempty[Math.floor((nonempty.length - 1) / 2)]! : 1
  const capacity = Math.max(
    1,
    Math.min(
      options.maxNodesPerColumn,
      options.balanceRegions ? Math.max(3, typicalRows) : options.maxNodesPerColumn
    )
  )
  let columnIndex = 0
  const columns: Cell[][] = []
  const preparedGroups = groups.map((group) => {
    const sorted = orderNodes(group.nodes, data.edges)
    const count = Math.max(1, Math.ceil(sorted.length / capacity))
    const localColumns: Cell[][] = []
    for (let c = 0; c < count; c++) {
      const chunk = sorted.slice(c * capacity, (c + 1) * capacity)
      const cells = chunk.map((node, row) => ({
        node,
        column: columnIndex,
        row: c % 2 ? capacity - 1 - row : row,
        initialRow: c % 2 ? capacity - 1 - row : row
      }))
      localColumns.push(cells)
      columns.push(cells)
      columnIndex++
    }
    return { ...group, count, cells: localColumns.flat() }
  })
  const rows = Math.max(1, ...columns.flat().map((cell) => cell.row + 1))
  if (options.optimizeAlignment) optimizeRows(columns, data.edges, rows)
  const styles = new Map(
    data.nodes.map((node) => [node.id, { ...theme[node.type], ...node.style }])
  )
  const text = new Map(
    data.nodes.map((node) => [
      node.id,
      wrapLabel(
        node.label,
        options.nodeWidth *
          (node.type === 'decision' ? 0.47 : node.shape === 'ellipse' ? 0.68 : 0.8),
        styles.get(node.id)!.fontSize
      )
    ])
  )
  const heights = new Map(
    data.nodes.map((node) => {
      const lines = text.get(node.id)!,
        style = styles.get(node.id)!,
        textHeight = lines.length * style.fontSize * 1.45
      return [
        node.id,
        Math.ceil(
          node.type === 'start' || node.type === 'end'
            ? Math.max(44, textHeight + 22)
            : node.type === 'decision'
              ? Math.max(90, textHeight * 2 + 28)
              : node.shape === 'ellipse'
                ? Math.max(72, textHeight * 1.6 + 28)
                : Math.max(64, textHeight + 32)
        )
      ]
    })
  )
  const rowHeight = Math.max(64, ...normal.map((node) => heights.get(node.id)!))
  const anticipatedWidth = Math.max(
    options.nodeWidth + options.padding * 2 + 52,
    options.padding * 2 +
      preparedGroups.reduce(
        (sum, group) =>
          sum + group.count * options.nodeWidth + (group.count - 1) * options.columnGap + 52,
        0
      ) +
      Math.max(0, preparedGroups.length - 1) * options.regionGap
  )
  const titleBand = data.title
    ? wrapLabel(data.title, anticipatedWidth - options.padding * 2, 18).length * 26 + 22
    : 0
  const terminalGap = Math.max(48, labelHeight + 18)
  const startBand = start ? heights.get(start.id)! + terminalGap : 0
  const regionTop = options.padding + titleBand + startBand
  const groupPadding = 26
  let cursorX = options.padding
  const placedRegions: FlowchartPlacedRegion[] = []
  const positions: { cells: Cell[]; x: number }[] = []
  let headerHeight = 44
  for (const group of preparedGroups)
    if (group.region) {
      const groupWidth =
        group.count * options.nodeWidth + (group.count - 1) * options.columnGap + groupPadding * 2
      headerHeight = Math.max(
        headerHeight,
        wrapLabel(group.region.label, groupWidth - 44, 16).length * 23 +
          (group.region.description
            ? wrapLabel(group.region.description, groupWidth - 44, 12).length * 18
            : 0) +
          28
      )
    }
  const regionHeight =
    headerHeight + 28 + rows * rowHeight + (rows - 1) * options.rowGap + groupPadding
  for (const group of preparedGroups) {
    const width =
      group.count * options.nodeWidth + (group.count - 1) * options.columnGap + groupPadding * 2
    positions.push({ cells: group.cells, x: cursorX + groupPadding })
    if (group.region)
      placedRegions.push({
        region: group.region,
        x: cursorX,
        y: regionTop,
        width,
        height: regionHeight,
        style: { ...theme.region, ...group.region.style },
        titleLines: wrapLabel(group.region.label, width - 44, 16),
        descriptionLines: group.region.description
          ? wrapLabel(group.region.description, width - 44, 12)
          : [],
        headerHeight,
        columns: group.count
      })
    cursorX += width + options.regionGap
  }
  const width = Math.max(
    options.nodeWidth + options.padding * 2 + 52,
    cursorX - (preparedGroups.length ? options.regionGap : 0) + options.padding
  )
  const nodeY = regionTop + headerHeight + 28
  const placedNodes: FlowchartPlacedNode[] = []
  for (const position of positions) {
    const firstColumn = position.cells[0]?.column ?? 0
    for (const cell of position.cells) {
      const height = heights.get(cell.node.id)!
      placedNodes.push({
        node: cell.node,
        x: position.x + (cell.column - firstColumn) * (options.nodeWidth + options.columnGap),
        y: nodeY + cell.row * (rowHeight + options.rowGap) + (rowHeight - height) / 2,
        width: options.nodeWidth,
        height,
        style: styles.get(cell.node.id)!,
        lines: text.get(cell.node.id)!,
        row: cell.row,
        column: cell.column
      })
    }
  }
  const normalBottom = preparedGroups.length
    ? regionTop + regionHeight
    : options.padding + titleBand + startBand
  const terminalX =
    options.terminalPlacement === 'left'
      ? options.padding + groupPadding
      : (width - options.nodeWidth) / 2
  if (start)
    placedNodes.push({
      node: start,
      x: terminalX,
      y: options.padding + titleBand,
      width: options.nodeWidth,
      height: heights.get(start.id)!,
      style: styles.get(start.id)!,
      lines: text.get(start.id)!,
      row: -1,
      column: -1
    })
  if (end)
    placedNodes.push({
      node: end,
      x: terminalX,
      y: normalBottom + terminalGap,
      width: options.nodeWidth,
      height: heights.get(end.id)!,
      style: styles.get(end.id)!,
      lines: text.get(end.id)!,
      row: rows,
      column: -1
    })
  const height = Math.max(
    180,
    normalBottom + (end ? terminalGap + heights.get(end.id)! : 0) + options.padding
  )
  const placedEdges = routeFlowchartEdges(
    placedNodes,
    placedRegions,
    data.edges,
    width,
    height,
    theme
  )
  return {
    width,
    height,
    nodes: placedNodes,
    regions: placedRegions,
    edges: placedEdges,
    theme,
    options
  }
}
