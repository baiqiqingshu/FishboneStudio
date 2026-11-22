import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const require = createRequire(import.meta.url)
const esm = await import('../packages/fishbone/dist/fishbone.js')
const cjs = require('../packages/fishbone/dist/fishbone.cjs')
const data = { label: '独立包验证', children: [{ label: '原因', children: [{ label: '根因' }] }] }
for (const library of [esm, cjs]) {
  assert.equal(typeof library.default.install, 'function')
  assert.ok(library.renderFishboneSvg(data).includes('独立包验证'))
  const html = await renderToString(
    createSSRApp({ render: () => h(library.FishboneDiagram, { data, preset: 'forest' }) })
  )
  assert.ok(html.includes('<svg'))
  assert.ok(html.includes('根因'))
  const flow = {
    version: 1,
    nodes: [{ id: 'task', label: '流程组件验证', type: 'activity' }],
    edges: []
  }
  assert.ok(library.renderFlowchartSvg(flow).includes('流程组件验证'))
  const flowHtml = await renderToString(
    createSSRApp({ render: () => h(library.FlowchartDiagram, { data: flow }) })
  )
  assert.ok(flowHtml.includes('data-node-id="task"'))
}
console.log('ESM, CommonJS and Vue SSR package checks passed.')
