import type {
  FlowchartBox,
  FlowchartPoint,
  FlowchartPlacedNode,
  FlowchartPort,
  FlowchartPlacedEdge,
  FlowchartEdge,
  FlowchartTheme,
  FlowchartPlacedRegion
} from './types'
import { wrapLabel, textWidth } from '../layout'

const CLEARANCE = 12
function inside(p: FlowchartPoint, b: FlowchartBox) {
  return (
    p.x > b.x - CLEARANCE &&
    p.x < b.x + b.width + CLEARANCE &&
    p.y > b.y - CLEARANCE &&
    p.y < b.y + b.height + CLEARANCE
  )
}
export function segmentHitsBox(
  a: FlowchartPoint,
  b: FlowchartPoint,
  box: FlowchartBox,
  clearance = 0
): boolean {
  const left = box.x - clearance,
    right = box.x + box.width + clearance,
    top = box.y - clearance,
    bottom = box.y + box.height + clearance
  if (a.x === b.x)
    return a.x > left && a.x < right && Math.max(a.y, b.y) > top && Math.min(a.y, b.y) < bottom
  if (a.y === b.y)
    return a.y > top && a.y < bottom && Math.max(a.x, b.x) > left && Math.min(a.x, b.x) < right
  return true
}
function intersects(a: FlowchartBox, b: FlowchartBox) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}
function port(node: FlowchartPlacedNode, side: Exclude<FlowchartPort, 'auto'>) {
  const p = { x: node.x + node.width / 2, y: node.y + node.height / 2 }
  if (side === 'left') p.x = node.x
  if (side === 'right') p.x = node.x + node.width
  if (side === 'top') p.y = node.y
  if (side === 'bottom') p.y = node.y + node.height
  const stem = { ...p }
  if (side === 'left') stem.x -= 18
  if (side === 'right') stem.x += 18
  if (side === 'top') stem.y -= 18
  if (side === 'bottom') stem.y += 18
  return { point: p, stem }
}
function choosePorts(
  a: FlowchartPlacedNode,
  b: FlowchartPlacedNode,
  edge: FlowchartEdge
): [Exclude<FlowchartPort, 'auto'>, Exclude<FlowchartPort, 'auto'>] {
  let source: Exclude<FlowchartPort, 'auto'>, target: Exclude<FlowchartPort, 'auto'>
  if (a.node.id === b.node.id) {
    source = 'right'
    target = 'bottom'
  } else if (a.node.type === 'start') {
    source = 'bottom'
    target = 'top'
  } else if (b.node.type === 'end') {
    source = 'bottom'
    target = 'top'
  } else if (a.x + a.width / 2 === b.x + b.width / 2) {
    source = a.y < b.y ? 'bottom' : 'top'
    target = a.y < b.y ? 'top' : 'bottom'
  } else {
    source = a.x < b.x ? 'right' : 'left'
    target = a.x < b.x ? 'left' : 'right'
  }
  const fixedSource = edge.sourcePort && edge.sourcePort !== 'auto',
    fixedTarget = edge.targetPort && edge.targetPort !== 'auto'
  if (fixedSource) source = edge.sourcePort as Exclude<FlowchartPort, 'auto'>
  if (fixedTarget) target = edge.targetPort as Exclude<FlowchartPort, 'auto'>
  // When only one self-loop port is fixed, keep its automatic counterpart distinct.
  if (a.node.id === b.node.id && source === target) {
    if (!fixedTarget) target = source === 'right' ? 'bottom' : 'right'
    else if (!fixedSource) source = target === 'right' ? 'bottom' : 'right'
  }
  return [source, target]
}
class Heap {
  private values: { state: number; score: number }[] = []
  push(item: { state: number; score: number }) {
    const a = this.values
    a.push(item)
    let i = a.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (a[parent]!.score <= item.score) break
      a[i] = a[parent]!
      i = parent
    }
    a[i] = item
  }
  pop() {
    const a = this.values,
      first = a[0],
      last = a.pop()
    if (!first || !last || !a.length) return first
    let i = 0
    while (i * 2 + 1 < a.length) {
      let child = i * 2 + 1
      if (child + 1 < a.length && a[child + 1]!.score < a[child]!.score) child++
      if (a[child]!.score >= last.score) break
      a[i] = a[child]!
      i = child
    }
    a[i] = last
    return first
  }
}
function simplify(points: FlowchartPoint[]): FlowchartPoint[] {
  const output: FlowchartPoint[] = []
  for (const point of points) {
    const last = output.at(-1),
      before = output.at(-2)
    if (last && last.x === point.x && last.y === point.y) continue
    if (
      before &&
      last &&
      ((before.x === last.x && last.x === point.x) || (before.y === last.y && last.y === point.y))
    )
      output.pop()
    output.push(point)
  }
  return output
}

/** Grid A* searches visible orthogonal channels around inflated node and header bounds. */
export function routeFlowchartEdges(
  nodes: FlowchartPlacedNode[],
  regions: FlowchartPlacedRegion[],
  edges: FlowchartEdge[],
  width: number,
  height: number,
  theme: FlowchartTheme
): FlowchartPlacedEdge[] {
  const byId = new Map(nodes.map((node) => [node.node.id, node]))
  const headers = regions.map((region) => ({
    x: region.x + 10,
    y: region.y + 8,
    width: region.width - 20,
    height: region.headerHeight - 12
  }))
  const obstacles: FlowchartBox[] = [...nodes, ...headers]
  const prepared = edges.map((edge) => {
    const a = byId.get(edge.source)!,
      b = byId.get(edge.target)!,
      [sourceSide, targetSide] = choosePorts(a, b, edge)
    return { edge, a, b, from: port(a, sourceSide), to: port(b, targetSide) }
  })
  const xs = new Set<number>([12, width - 12]),
    ys = new Set<number>([12, height - 12])
  for (const box of obstacles) {
    xs.add(box.x - 18)
    xs.add(box.x + box.width + 18)
    xs.add(box.x + box.width / 2)
    ys.add(box.y - 18)
    ys.add(box.y + box.height + 18)
    ys.add(box.y + box.height / 2)
  }
  for (const { from, to } of prepared)
    for (const point of [from.stem, to.stem]) {
      xs.add(point.x)
      ys.add(point.y)
    }
  const xValues = [...xs].sort((a, b) => a - b),
    yValues = [...ys].sort((a, b) => a - b)
  const xIndex = new Map(xValues.map((x, index) => [x, index])),
    yIndex = new Map(yValues.map((y, index) => [y, index]))
  const nx = xValues.length,
    ny = yValues.length,
    size = nx * ny
  const blocked = new Uint8Array(size)
  for (let yi = 0; yi < ny; yi++)
    for (let xi = 0; xi < nx; xi++) {
      const point = { x: xValues[xi]!, y: yValues[yi]! }
      if (obstacles.some((box) => inside(point, box))) blocked[yi * nx + xi] = 1
    }
  const neighbors = new Map<
    number,
    { index: number; direction: number; distance: number; key: string }[]
  >()
  const usage = new Map<string, number>()
  const pointAt = (index: number) => ({
    x: xValues[index % nx]!,
    y: yValues[Math.floor(index / nx)]!
  })
  function adjacent(index: number) {
    if (neighbors.has(index)) return neighbors.get(index)!
    const xi = index % nx,
      yi = Math.floor(index / nx),
      point = pointAt(index)
    const candidates = [
      [xi - 1, yi, 1],
      [xi + 1, yi, 1],
      [xi, yi - 1, 2],
      [xi, yi + 1, 2]
    ]
    const result: { index: number; direction: number; distance: number; key: string }[] = []
    for (const [x, y, direction] of candidates) {
      if (x! < 0 || y! < 0 || x! >= nx || y! >= ny) continue
      const next = y! * nx + x!,
        nextPoint = pointAt(next)
      if (
        blocked[next] ||
        obstacles.some((box) => segmentHitsBox(point, nextPoint, box, CLEARANCE))
      )
        continue
      result.push({
        index: next,
        direction: direction!,
        distance: Math.abs(point.x - nextPoint.x) + Math.abs(point.y - nextPoint.y),
        key: `${Math.min(index, next)}:${Math.max(index, next)}`
      })
    }
    neighbors.set(index, result)
    return result
  }
  const labels: FlowchartBox[] = []
  return prepared.map(({ edge, a, b, from, to }) => {
    const start = yIndex.get(from.stem.y)! * nx + xIndex.get(from.stem.x)!,
      goal = yIndex.get(to.stem.y)! * nx + xIndex.get(to.stem.x)!
    const distances = new Float64Array(size * 3).fill(Infinity),
      previous = new Int32Array(size * 3).fill(-1)
    const heap = new Heap(),
      initial = start * 3
    distances[initial] = 0
    heap.push({ state: initial, score: 0 })
    let final = -1
    while (true) {
      const item = heap.pop()
      if (!item) break
      const index = Math.floor(item.state / 3),
        direction = item.state % 3,
        point = pointAt(index)
      const heuristic = Math.abs(point.x - to.stem.x) + Math.abs(point.y - to.stem.y)
      if (item.score > distances[item.state]! + heuristic + 0.001) continue
      if (index === goal) {
        final = item.state
        break
      }
      for (const next of adjacent(index)) {
        const state = next.index * 3 + next.direction
        const score =
          distances[item.state]! +
          next.distance +
          (direction && direction !== next.direction ? 22 : 0) +
          (usage.get(next.key) ?? 0) * (next.distance * 0.7 + 14)
        if (score < distances[state]!) {
          distances[state] = score
          previous[state] = item.state
          const nextPoint = pointAt(next.index)
          heap.push({
            state,
            score: score + Math.abs(nextPoint.x - to.stem.x) + Math.abs(nextPoint.y - to.stem.y)
          })
        }
      }
    }
    if (final < 0)
      throw new Error(
        `无法为 ${edge.source} → ${edge.target} 找到避障路径，请增大节点/区域间距或调整连接端口`
      )
    const path: FlowchartPoint[] = []
    let state = final
    while (state >= 0) {
      const index = Math.floor(state / 3)
      path.push(pointAt(index))
      const prev = previous[state]!
      if (prev >= 0) {
        const previousIndex = Math.floor(prev / 3),
          key = `${Math.min(index, previousIndex)}:${Math.max(index, previousIndex)}`
        usage.set(key, (usage.get(key) ?? 0) + 1)
      }
      state = prev
    }
    path.reverse()
    const points = simplify([from.point, ...path, to.point])
    const style = { ...theme.edge, ...edge.style }
    const placed: FlowchartPlacedEdge = { edge, points, style }
    if (edge.label) {
      const lines = wrapLabel(edge.label, 120, 12),
        labelWidth = Math.max(...lines.map((line) => textWidth(line, 12))) + 16,
        labelHeight = lines.length * 17 + 8
      const segments = points
        .slice(1)
        .map((point, i) => ({ a: points[i]!, b: point }))
        .sort(
          (s, t) =>
            Math.abs(t.a.x - t.b.x) +
            Math.abs(t.a.y - t.b.y) -
            (Math.abs(s.a.x - s.b.x) + Math.abs(s.a.y - s.b.y))
        )
      search: for (const segment of segments)
        for (const fraction of [0.5, 0.3, 0.7])
          for (const offset of [0, -labelHeight - 6, labelHeight + 6]) {
            const center = {
              x: segment.a.x + (segment.b.x - segment.a.x) * fraction,
              y: segment.a.y + (segment.b.y - segment.a.y) * fraction
            }
            const box = {
              x: center.x - labelWidth / 2,
              y: center.y - labelHeight / 2 + offset,
              width: labelWidth,
              height: labelHeight
            }
            if (
              box.x < 4 ||
              box.y < 4 ||
              box.x + box.width > width - 4 ||
              box.y + box.height > height - 4 ||
              [...obstacles, ...labels].some((item) => intersects(box, item))
            )
              continue
            placed.label = { ...box, lines }
            labels.push(box)
            break search
          }
      if (!placed.label)
        throw new Error(
          `连线 ${edge.source} → ${edge.target} 标注空间不足，请缩短标注或增大布局间距`
        )
    }
    return placed
  })
}
