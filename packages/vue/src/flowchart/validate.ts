import { validateStyle } from './themes'
import type { FlowchartData } from './types'

export const FLOWCHART_LIMITS = { nodes: 200, edges: 400, regions: 30, labelLength: 120 }
const ports = ['auto', 'top', 'right', 'bottom', 'left']
function object(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path} 必须为对象`)
}
function label(value: unknown, path: string, optional = false) {
  if (value === undefined && optional) return
  if (typeof value !== 'string' || !value.trim() || Array.from(value).length > 120)
    throw new Error(`${path} 必须是 1–120 字符的非空字符串`)
}
function id(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 100)
    throw new Error(`${path} 必须是 1–100 字符的 ID`)
}
export function validateFlowchart(data: unknown): asserts data is FlowchartData {
  object(data, 'data')
  if (data.version !== 1) throw new Error('流程图 data.version 必须为 1')
  label(data.title, 'title', true)
  if (!Array.isArray(data.nodes) || data.nodes.length > FLOWCHART_LIMITS.nodes)
    throw new Error('nodes 必须是数组，最多 200 个节点')
  if (!Array.isArray(data.edges) || data.edges.length > FLOWCHART_LIMITS.edges)
    throw new Error('edges 必须是数组，最多 400 条连线')
  if (
    data.regions !== undefined &&
    (!Array.isArray(data.regions) || data.regions.length > FLOWCHART_LIMITS.regions)
  )
    throw new Error('regions 必须是数组，最多 30 个区域')
  const regionIds = new Set<string>(),
    nodeIds = new Set<string>(),
    edgeIds = new Set<string>(),
    terminals = new Set<string>()
  for (const value of (data.regions ?? []) as unknown[]) {
    object(value, 'region')
    id(value.id, 'region.id')
    label(value.label, 'region.label')
    label(value.description, 'region.description', true)
    if (regionIds.has(value.id)) throw new Error(`区域 ID 重复：${value.id}`)
    regionIds.add(value.id)
    if (value.style !== undefined) validateStyle(value.style, 'region')
  }
  for (const value of data.nodes) {
    object(value, 'node')
    id(value.id, 'node.id')
    label(value.label, 'node.label')
    if (nodeIds.has(value.id)) throw new Error(`节点 ID 重复：${value.id}`)
    nodeIds.add(value.id)
    if (!['start', 'end', 'activity', 'decision'].includes(String(value.type)))
      throw new Error(`节点 ${value.id} 的 type 无效`)
    if (value.regionId !== undefined) {
      id(value.regionId, 'node.regionId')
      if (!regionIds.has(value.regionId))
        throw new Error(`节点 ${value.id} 引用了不存在的区域 ${value.regionId}`)
    }
    if (value.type === 'start' || value.type === 'end') {
      if (terminals.has(value.type)) throw new Error(`最多支持一个 ${value.type} 节点`)
      terminals.add(value.type)
      if (value.regionId !== undefined) throw new Error('开始/结束是全局节点，不设置 regionId')
    }
    if (
      value.shape !== undefined &&
      (value.type !== 'activity' || !['rectangle', 'ellipse'].includes(String(value.shape)))
    )
      throw new Error('shape 仅用于 activity，支持 rectangle / ellipse')
    if (
      value.order !== undefined &&
      (typeof value.order !== 'number' || !Number.isFinite(value.order))
    )
      throw new Error('node.order 必须是有限数值')
    if (value.style !== undefined) validateStyle(value.style, 'shape')
  }
  for (const value of data.edges) {
    object(value, 'edge')
    id(value.source, 'edge.source')
    id(value.target, 'edge.target')
    label(value.label, 'edge.label', true)
    if (!nodeIds.has(value.source) || !nodeIds.has(value.target))
      throw new Error(`连线 ${value.source} → ${value.target} 引用了不存在的节点`)
    if (value.id !== undefined) {
      id(value.id, 'edge.id')
      if (edgeIds.has(value.id)) throw new Error(`连线 ID 重复：${value.id}`)
      edgeIds.add(value.id)
    }
    for (const key of ['sourcePort', 'targetPort'])
      if (value[key] !== undefined && !ports.includes(String(value[key])))
        throw new Error(`${key} 必须是 auto / top / right / bottom / left`)
    if (
      value.source === value.target &&
      value.sourcePort &&
      value.sourcePort !== 'auto' &&
      value.sourcePort === value.targetPort
    )
      throw new Error('自环连接需使用不同端口，或使用自动端口')
    if (value.style !== undefined) validateStyle(value.style, 'edge')
  }
}
