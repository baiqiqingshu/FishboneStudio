import type { FishboneNode } from './types'
export const TREE_LIMITS = { nodes: 500, depth: 12, labelLength: 120 }
export function validateTree(data: unknown): asserts data is FishboneNode {
  let count = 0
  const visited = new WeakSet<object>()
  const walk = (value: unknown, depth: number, path: string) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error(`${path} 必须是节点对象`)
    if (visited.has(value)) throw new Error(`${path} 包含循环或重复节点引用`)
    visited.add(value)
    if (++count > TREE_LIMITS.nodes) throw new Error(`最多支持 ${TREE_LIMITS.nodes} 个节点`)
    if (depth > TREE_LIMITS.depth) throw new Error(`最多支持 ${TREE_LIMITS.depth} 层树结构`)
    const node = value as Record<string, unknown>
    if (typeof node.label !== 'string' || !node.label.trim())
      throw new Error(`${path}.label 必须是非空字符串`)
    if (Array.from(node.label).length > TREE_LIMITS.labelLength)
      throw new Error(`${path}.label 最多 ${TREE_LIMITS.labelLength} 个字符`)
    if (node.id !== undefined && typeof node.id !== 'string')
      throw new Error(`${path}.id 必须是字符串`)
    if (node.children !== undefined) {
      if (!Array.isArray(node.children)) throw new Error(`${path}.children 必须是数组`)
      node.children.forEach((child, i) => walk(child, depth + 1, `${path}.children[${i}]`))
    }
  }
  walk(data, 1, 'data')
}
export function countNodes(node: FishboneNode): number {
  return 1 + (node.children ?? []).reduce((sum, child) => sum + countNodes(child), 0)
}
