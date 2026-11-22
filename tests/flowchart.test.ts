import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { flowExamples } from '../apps/web/src/flowExamples'
import { validateFlowchart } from '../packages/fishbone/src/flowchart/validate'
import { layoutFlowchart } from '../packages/fishbone/src/flowchart/layout'
import { renderFlowchartSvg } from '../packages/fishbone/src/flowchart/svg'
import { segmentHitsBox } from '../packages/fishbone/src/flowchart/router'
import {
  resolveFlowchartOptions,
  resolveFlowchartTheme,
  flowchartThemes
} from '../packages/fishbone/src/flowchart/themes'
import FlowchartDiagram from '../packages/fishbone/src/FlowchartDiagram.vue'
import type { FlowchartData, FlowchartPreset } from '../packages/fishbone/src/flowchart/types'

describe('flowchart contract and layout', () => {
  it.each(flowExamples)(
    'routes $name orthogonally without passing through unrelated nodes',
    ({ data }) => {
      const layout = layoutFlowchart(data)
      expect(layout.nodes).toHaveLength(data.nodes.length)
      expect(layout.edges).toHaveLength(data.edges.length)
      const start = layout.nodes.find((node) => node.node.type === 'start')!,
        end = layout.nodes.find((node) => node.node.type === 'end')!
      expect(start.x + start.width / 2).toBe(end.x + end.width / 2)
      expect(start.y).toBeLessThan(
        Math.min(
          ...layout.nodes
            .filter((node) => !['start', 'end'].includes(node.node.type))
            .map((node) => node.y)
        )
      )
      expect(end.y).toBeGreaterThan(
        Math.max(
          ...layout.nodes
            .filter((node) => !['start', 'end'].includes(node.node.type))
            .map((node) => node.y + node.height)
        )
      )
      for (const edge of layout.edges)
        for (let i = 1; i < edge.points.length; i++) {
          const a = edge.points[i - 1]!,
            b = edge.points[i]!
          expect(a.x === b.x || a.y === b.y).toBe(true)
          for (const node of layout.nodes.filter(
            (node) => ![edge.edge.source, edge.edge.target].includes(node.node.id)
          ))
            expect(
              segmentHitsBox(a, b, node),
              `${edge.edge.source}→${edge.edge.target} crosses ${node.node.id}`
            ).toBe(false)
        }
      for (const node of layout.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(0)
        expect(node.y).toBeGreaterThanOrEqual(0)
        expect(node.x + node.width).toBeLessThanOrEqual(layout.width)
        expect(node.y + node.height).toBeLessThanOrEqual(layout.height)
      }
      for (const region of layout.regions)
        for (const node of layout.nodes.filter((node) => node.node.regionId === region.region.id)) {
          expect(node.x).toBeGreaterThan(region.x)
          expect(node.y).toBeGreaterThan(region.y + region.headerHeight)
          expect(node.x + node.width).toBeLessThan(region.x + region.width)
          expect(node.y + node.height).toBeLessThan(region.y + region.height)
        }
    }
  )
  it('splits dense regions and aligns a direct cross-column chain at the boundary', () => {
    const data: FlowchartData = {
      version: 1,
      regions: [{ id: 'r', label: '区域' }],
      nodes: Array.from({ length: 6 }, (_, i) => ({
        id: `n${i}`,
        label: `步骤${i}`,
        type: 'activity',
        regionId: 'r'
      })),
      edges: Array.from({ length: 5 }, (_, i) => ({ source: `n${i}`, target: `n${i + 1}` }))
    }
    const layout = layoutFlowchart(
      data,
      'ocean',
      {},
      { maxNodesPerColumn: 3, balanceRegions: false }
    )
    expect(layout.regions[0]!.columns).toBe(2)
    expect(layout.nodes.find((node) => node.node.id === 'n2')!.y).toBe(
      layout.nodes.find((node) => node.node.id === 'n3')!.y
    )
    expect(Math.max(...layout.nodes.map((node) => node.row))).toBeLessThan(3)
  })
  it('orders an unordered acyclic graph by its connections', () => {
    const data: FlowchartData = {
      version: 1,
      nodes: [
        { id: 'b', type: 'activity', label: '后' },
        { id: 'a', type: 'activity', label: '前' }
      ],
      edges: [{ source: 'a', target: 'b' }]
    }
    const layout = layoutFlowchart(data)
    expect(layout.nodes.find((node) => node.node.id === 'a')!.y).toBeLessThan(
      layout.nodes.find((node) => node.node.id === 'b')!.y
    )
  })
  it('aligns directly connected nodes across regions while preserving local chains', () => {
    const data: FlowchartData = {
      version: 1,
      regions: [
        { id: 'left', label: '左侧' },
        { id: 'right', label: '右侧' }
      ],
      nodes: [
        { id: 'a', label: '活动 A', type: 'activity', regionId: 'left' },
        { id: 'b', label: '活动 B', type: 'activity', regionId: 'left' },
        { id: 'c', label: '活动 C', type: 'activity', regionId: 'right' }
      ],
      edges: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' }
      ]
    }
    const layout = layoutFlowchart(data)
    const [a, b, c] = ['a', 'b', 'c'].map((id) => layout.nodes.find((node) => node.node.id === id)!)
    expect(a!.row).toBeLessThan(b!.row)
    expect(b!.row).toBe(c!.row)
    const unoptimized = layoutFlowchart(data, 'ocean', {}, { optimizeAlignment: false })
    expect(unoptimized.nodes.find((node) => node.node.id === 'b')!.row).not.toBe(
      unoptimized.nodes.find((node) => node.node.id === 'c')!.row
    )
  })
  it('reserves space for long titles and keeps long edge annotations on their route', () => {
    for (const terminalOnly of [true, false]) {
      const data: FlowchartData = {
        version: 1,
        title: '长标题用于验证自动换行与开始节点之间保留足够空间'.repeat(4),
        nodes: terminalOnly
          ? [
              { id: 'a', label: '开始', type: 'start' },
              { id: 'b', label: '结束', type: 'end' }
            ]
          : [
              { id: 'a', label: '活动 A', type: 'activity' },
              { id: 'b', label: '活动 B', type: 'activity' }
            ],
        edges: [{ source: 'a', target: 'b', label: '长连线标注自动换行'.repeat(12) }]
      }
      const layout = layoutFlowchart(data, 'ocean', {}, { showTitle: true })
      const edge = layout.edges[0]!,
        box = edge.label!
      expect(box.lines.length).toBeGreaterThan(1)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThan(layout.width)
      expect(box.y + box.height).toBeLessThan(layout.height)
      for (const node of layout.nodes) {
        expect(
          box.x >= node.x + node.width ||
            box.x + box.width <= node.x ||
            box.y >= node.y + node.height ||
            box.y + box.height <= node.y
        ).toBe(true)
      }
      expect(
        edge.points.slice(1).some((point, i) => segmentHitsBox(edge.points[i]!, point, box))
      ).toBe(true)
      const xml = new DOMParser().parseFromString(
        renderFlowchartSvg(data, 'ocean', {}, { showTitle: true }),
        'image/svg+xml'
      )
      const lines = xml.querySelectorAll('[data-flow-title] tspan')
      expect(lines.length).toBeGreaterThan(1)
      expect(layout.options.padding + 18 + (lines.length - 1) * 26 + 6).toBeLessThan(
        Math.min(...layout.nodes.map((node) => node.y))
      )
    }
  })
  it('supports empty regions, disconnected nodes, self loops, and terminal-only graphs', () => {
    for (const data of [
      { version: 1, nodes: [], edges: [], regions: [{ id: 'empty', label: '空区域' }] },
      {
        version: 1,
        nodes: [{ id: 'a', label: '活动', type: 'activity' }],
        edges: [{ source: 'a', target: 'a', label: '重试' }]
      },
      {
        version: 1,
        nodes: [
          { id: 'start', label: '开始', type: 'start' },
          { id: 'end', label: '结束', type: 'end' }
        ],
        edges: [{ source: 'start', target: 'end' }]
      }
    ] as FlowchartData[])
      expect(() => layoutFlowchart(data)).not.toThrow()
  })
  it('hides the visual heading by default without reserving space and preserves accessible metadata', () => {
    const data = flowExamples[0]!.data
    const hidden = layoutFlowchart(data),
      shown = layoutFlowchart(data, 'ocean', {}, { showTitle: true })
    const xml = new DOMParser().parseFromString(renderFlowchartSvg(data), 'image/svg+xml')
    expect(xml.querySelector('[data-flow-title]')).toBeNull()
    expect(xml.documentElement.getAttribute('aria-label')).toBe(data.title)
    expect(hidden.height).toBeLessThan(shown.height)
    expect(renderFlowchartSvg(data, 'ocean', {}, { showTitle: true })).toContain('data-flow-title')
    expect(() => resolveFlowchartOptions({ showTitle: 'yes' as unknown as boolean })).toThrow()
  })
  it('caps every shape including decisions and terminals, fitting long labels inside', () => {
    const data: FlowchartData = {
      version: 1,
      nodes: (['start', 'activity', 'decision', 'end'] as const).map((type, i) => ({
        id: String(i),
        type,
        label: '流程图尺寸测试文字'.repeat(12)
      })),
      edges: [
        { source: '0', target: '1' },
        { source: '1', target: '2' },
        { source: '2', target: '3' }
      ]
    }
    for (const maxNodeHeight of [64, 120, 320]) {
      const layout = layoutFlowchart(
        data,
        'ocean',
        { fontSize: 32 },
        { maxNodeWidth: 140, maxNodeHeight }
      )
      for (const node of layout.nodes) {
        expect(node.width).toBeLessThanOrEqual(140)
        expect(node.height).toBeLessThanOrEqual(maxNodeHeight)
        const factor = node.node.type === 'decision' ? 2 : 1
        expect(node.lines.length * node.style.fontSize * 1.45 * factor).toBeLessThan(node.height)
        for (const line of node.lines) expect(line.length).toBeGreaterThan(0)
      }
      const xml = new DOMParser().parseFromString(
        renderFlowchartSvg(data, 'ocean', { fontSize: 32 }, { maxNodeWidth: 140, maxNodeHeight }),
        'image/svg+xml'
      )
      expect(xml.querySelector('[data-node-id="2"] title')?.textContent).toBe(data.nodes[2]!.label)
      if (maxNodeHeight === 64)
        expect(xml.querySelector('[data-node-id="2"] text')?.textContent).toContain('…')
    }
    expect(() => resolveFlowchartOptions({ maxNodeWidth: 0 })).toThrow()
    expect(() => resolveFlowchartOptions({ maxNodeHeight: 63 })).toThrow()
  })
  it('applies region spacing and retains an explicitly transparent canvas', () => {
    const data = flowExamples[0]!.data
    const compact = layoutFlowchart(data, 'ocean', {}, { regionGap: 48 }),
      spacious = layoutFlowchart(data, 'ocean', {}, { regionGap: 180 })
    expect(spacious.width - compact.width).toBeCloseTo(
      (spacious.options.regionGap - compact.options.regionGap) * 2
    )
    expect(spacious.regions[1]!.x - spacious.regions[0]!.x - spacious.regions[0]!.width).toBe(180)
    const xml = new DOMParser().parseFromString(
      renderFlowchartSvg(data, 'ocean', { background: 'transparent' }),
      'image/svg+xml'
    )
    expect(xml.querySelector('[data-background]')?.getAttribute('fill')).toBe('transparent')
  })
  it('rejects dangling references, duplicate IDs, bad ports, styles, and version', () => {
    const valid = flowExamples[0]!.data
    for (const data of [
      { ...valid, version: 2 },
      { ...valid, nodes: [...valid.nodes, valid.nodes[0]] },
      { ...valid, edges: [{ source: 'missing', target: 'end' }] },
      { ...valid, nodes: [{ id: 'x', type: 'activity', label: 'x', regionId: 'missing' }] },
      { ...valid, edges: [{ source: 'start', target: 'end', sourcePort: 'bad' }] }
    ])
      expect(() => validateFlowchart(data)).toThrow()
    expect(() => resolveFlowchartTheme('ocean', { activity: { fontSize: -1 } })).toThrow()
    expect(() => resolveFlowchartOptions({ maxNodesPerColumn: 0 })).toThrow()
  })
  it('keeps self-loop paths visible when one port is fixed', () => {
    for (const ports of [{ sourcePort: 'bottom' as const }, { targetPort: 'right' as const }]) {
      const data: FlowchartData = {
        version: 1,
        nodes: [{ id: 'a', label: '重试活动', type: 'activity' }],
        edges: [{ source: 'a', target: 'a', ...ports }]
      }
      const points = layoutFlowchart(data).edges[0]!.points
      expect(points.length).toBeGreaterThan(2)
      expect(points[0]).not.toEqual(points.at(-1))
      expect(() =>
        validateFlowchart({
          ...data,
          edges: [{ source: 'a', target: 'a', sourcePort: 'bottom', targetPort: 'bottom' }]
        })
      ).toThrow('不同端口')
    }
  })
})
describe('flowchart themes, rendering and Vue', () => {
  it.each(Object.keys(flowchartThemes) as FlowchartPreset[])(
    'renders valid standalone SVG for %s',
    (preset) => {
      const xml = new DOMParser().parseFromString(
        renderFlowchartSvg(flowExamples[0]!.data, preset),
        'image/svg+xml'
      )
      expect(xml.querySelector('parsererror')).toBeNull()
      expect(xml.querySelectorAll('[data-node-id]')).toHaveLength(11)
      expect(xml.querySelectorAll('[data-region-id]')).toHaveLength(3)
      expect(xml.querySelector('[data-node-type=decision] polygon')).not.toBeNull()
    }
  )
  it('escapes labels, IDs, and style attributes', () => {
    const data: FlowchartData = {
      version: 1,
      nodes: [
        {
          id: '<bad>',
          type: 'activity',
          label: '<script>bad</script>&"',
          style: { fill: '"><script>bad</script>' }
        }
      ],
      edges: []
    }
    const xml = new DOMParser().parseFromString(renderFlowchartSvg(data), 'image/svg+xml')
    expect(xml.querySelector('script')).toBeNull()
    expect(xml.querySelector('text')?.textContent).toContain('<script>bad</script>')
  })
  it('deep-merges global and per-shape typography without changing presets', () => {
    const theme = resolveFlowchartTheme('ocean', {
      fontFamily: 'serif',
      fontSize: 20,
      decision: { fill: '#ff0000', fontSize: 22 }
    })
    expect(theme.activity.fontFamily).toBe('serif')
    expect(theme.activity.fontSize).toBe(20)
    expect(theme.decision.fontSize).toBe(22)
    expect(flowchartThemes.ocean.activity.fontSize).toBe(15)
  })
  it('updates data and recovers from invalid input', async () => {
    const wrapper = mount(FlowchartDiagram, { props: { data: flowExamples[0]!.data } })
    expect(wrapper.find('svg').exists()).toBe(true)
    await wrapper.setProps({
      data: { version: 1, nodes: [], edges: [{ source: 'bad', target: 'bad' }] }
    })
    expect(wrapper.find('[role=alert]').exists()).toBe(true)
    expect(wrapper.emitted('error')).toHaveLength(1)
    await wrapper.setProps({ data: flowExamples[1]!.data, preset: 'midnight' })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('[data-background]').attributes('fill')).toBe('#18212e')
  })
})
