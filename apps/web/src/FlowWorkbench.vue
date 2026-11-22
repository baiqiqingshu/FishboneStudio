<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  FlowchartDiagram,
  layoutFlowchart,
  validateFlowchart,
  resolveFlowchartTheme,
  resolveFlowchartOptions,
  flowchartThemes,
  type FlowchartData,
  type FlowchartHandle,
  type FlowchartPreset,
  type FlowchartThemeOverrides,
  type FlowchartLayoutOptions,
  type FlowchartNodeType,
  type ImageFormat
} from '@ui-studio/fishbone'
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  Diamond,
  Layers,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Workflow,
  X
} from '@lucide/vue'
import { flowExamples } from './flowExamples'
import ColorInput from './ColorInput.vue'
import './flowchart.css'

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const data = ref<FlowchartData>(clone(flowExamples[0]!.data))
const exampleIndex = ref(0),
  preset = ref<FlowchartPreset>('ocean')
const theme = ref<FlowchartThemeOverrides>({}),
  options = ref<Partial<FlowchartLayoutOptions>>({})
const saveStatus = ref('已自动保存'),
  notice = ref('')
let noticeTimer: ReturnType<typeof setTimeout> | undefined,
  saveTimer: ReturnType<typeof setTimeout> | undefined
const notify = (message: string) => {
  notice.value = message
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    notice.value = ''
  }, 4000)
}
try {
  const saved = localStorage.getItem('ui-studio:flowchart:v1')
  if (saved) {
    const state = JSON.parse(saved)
    validateFlowchart(state.data)
    resolveFlowchartTheme(state.preset, state.theme)
    resolveFlowchartOptions(state.options)
    data.value = state.data
    theme.value = state.theme ?? {}
    preset.value = state.preset
    options.value = state.options ?? {}
    if (Number.isInteger(state.exampleIndex) && flowExamples[state.exampleIndex])
      exampleIndex.value = state.exampleIndex
  }
} catch {
  saveStatus.value = '已恢复默认示例'
}
watch(
  [data, preset, theme, options, exampleIndex],
  () => {
    saveStatus.value = '正在保存…'
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(
          'ui-studio:flowchart:v1',
          JSON.stringify({
            data: data.value,
            preset: preset.value,
            theme: theme.value,
            options: options.value,
            exampleIndex: exampleIndex.value
          })
        )
        saveStatus.value = '已自动保存'
      } catch {
        saveStatus.value = '本地存储不可用'
      }
    }, 350)
  },
  { deep: true }
)

const editorTab = ref<'form' | 'json'>('form'),
  formTab = ref<'nodes' | 'regions' | 'edges'>('nodes')
const json = ref(JSON.stringify(data.value, null, 2)),
  jsonError = ref('')
const diagram = ref<FlowchartHandle | null>(null),
  canvas = ref<HTMLElement | null>(null)
const layout = computed(() => {
  try {
    return layoutFlowchart(data.value, preset.value, theme.value, options.value)
  } catch {
    return null
  }
})
const currentTheme = computed(() => resolveFlowchartTheme(preset.value, theme.value))
const currentOptions = computed(() => resolveFlowchartOptions(options.value))
const zoom = ref(100),
  canvasWidth = ref(800),
  canvasHeight = ref(600)
const fittedWidth = computed(() =>
  layout.value
    ? Math.min(
        canvasWidth.value - 48,
        ((canvasHeight.value - 44) * layout.value.width) / layout.value.height
      )
    : canvasWidth.value - 48
)
const shapeNames = { activity: '活动', decision: '判断', start: '开始', end: '结束' }
const themeNames: Record<FlowchartPreset, string> = {
  ocean: '清新海洋',
  classic: '经典极简',
  forest: '自然森林',
  sunset: '落日暖光',
  midnight: '深邃夜色'
}
const showCustom = ref(false),
  styleTarget = ref<'activity' | 'decision' | 'start' | 'end' | 'region' | 'edge'>('activity')
const targetStyle = computed(() => currentTheme.value[styleTarget.value])
const colorFields = computed(() =>
  styleTarget.value === 'edge'
    ? [
        { key: 'stroke', name: '连线颜色' },
        { key: 'textColor', name: '标注文字' }
      ]
    : styleTarget.value === 'region'
      ? [
          { key: 'fill', name: '区域色块' },
          { key: 'stroke', name: '区域边框' },
          { key: 'titleColor', name: '标题文字' },
          { key: 'textColor', name: '标注文字' }
        ]
      : [
          { key: 'fill', name: '图形色块' },
          { key: 'stroke', name: '图形边框' },
          { key: 'textColor', name: '图形文字' }
        ]
)
const showExport = ref(false),
  showDocs = ref(false),
  showTemplates = ref(false)
const format = ref<ImageFormat>('png'),
  filename = ref('流程图分析'),
  scale = ref(2),
  quality = ref(0.92),
  exporting = ref(false)
const anyModal = computed(() => showExport.value || showDocs.value || showTemplates.value)
let previousFocus: HTMLElement | null = null
watch(anyModal, async (open) => {
  if (open) {
    previousFocus = document.activeElement as HTMLElement
    await nextTick()
    document.querySelector<HTMLElement>('.flow-modal button')?.focus()
  } else previousFocus?.focus()
})
function closeModals() {
  showExport.value = false
  showDocs.value = false
  showTemplates.value = false
}
function trapFocus(event: KeyboardEvent) {
  if (event.key === 'Escape') closeModals()
  if (event.key !== 'Tab' || !anyModal.value) return
  const controls = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.flow-modal button:not(:disabled), .flow-modal input, .flow-modal select, .flow-modal textarea'
      )
    ),
    first = controls[0],
    last = controls.at(-1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (rect) {
      canvasWidth.value = rect.width
      canvasHeight.value = rect.height
    }
  })
  if (canvas.value) observer.observe(canvas.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(saveTimer)
  clearTimeout(noticeTimer)
})
function mutate(update: (next: FlowchartData) => void) {
  const next = clone(data.value)
  update(next)
  try {
    validateFlowchart(next)
    data.value = next
    jsonError.value = ''
    if (editorTab.value === 'form') json.value = JSON.stringify(next, null, 2)
  } catch (error) {
    notify((error as Error).message)
  }
}
function changeNode(id: string, key: string, value: string) {
  mutate((next) => {
    const node = next.nodes.find((node) => node.id === id)!
    Object.assign(node, { [key]: value || undefined })
    if (node.type !== 'activity') delete node.shape
    if (['start', 'end'].includes(node.type)) delete node.regionId
  })
}
function addNode(type: FlowchartNodeType = 'activity') {
  mutate((next) => {
    const id = `node-${crypto.randomUUID().slice(0, 8)}`
    next.nodes.push({
      id,
      type,
      label: type === 'decision' ? '判断条件？' : '新的活动',
      regionId: next.regions?.[0]?.id
    })
  })
}
function deleteNode(id: string) {
  mutate((next) => {
    next.nodes = next.nodes.filter((node) => node.id !== id)
    next.edges = next.edges.filter((edge) => edge.source !== id && edge.target !== id)
  })
}
function addRegion() {
  mutate((next) => {
    next.regions ??= []
    next.regions.push({
      id: `region-${crypto.randomUUID().slice(0, 8)}`,
      label: '新的区域',
      description: '填写区域说明'
    })
  })
}
function deleteRegion(id: string) {
  mutate((next) => {
    next.regions = next.regions?.filter((region) => region.id !== id)
    next.nodes
      .filter((node) => node.regionId === id)
      .forEach((node) => {
        delete node.regionId
      })
  })
}
function changeRegion(id: string, key: string, value: string) {
  mutate((next) =>
    Object.assign(
      next.regions!.find((region) => region.id === id)!,
      { [key]: value || undefined }
    )
  )
}
function addEdge() {
  mutate((next) => {
    if (!next.nodes.length) return
    next.edges.push({
      id: `edge-${crypto.randomUUID().slice(0, 8)}`,
      source: next.nodes[0]!.id,
      target: next.nodes.at(-1)!.id
    })
  })
}
function changeEdge(index: number, key: string, value: string | boolean) {
  mutate((next) => {
    if (key === 'dashed')
      next.edges[index]!.style = { ...next.edges[index]!.style, dashed: Boolean(value) }
    else Object.assign(next.edges[index]!, { [key]: value || undefined })
  })
}
function switchEditor(tab: 'form' | 'json') {
  if (tab === 'json') json.value = JSON.stringify(data.value, null, 2)
  editorTab.value = tab
}
function applyJson() {
  try {
    const next: unknown = JSON.parse(json.value)
    validateFlowchart(next)
    data.value = next
    jsonError.value = ''
    notify('流程图数据已更新')
  } catch (error) {
    jsonError.value = (error as Error).message
  }
}
function loadExample(index: number) {
  exampleIndex.value = index
  data.value = clone(flowExamples[index]!.data)
  json.value = JSON.stringify(data.value, null, 2)
  jsonError.value = ''
  zoom.value = 100
  showTemplates.value = false
}
function setOption(key: keyof FlowchartLayoutOptions, value: number | boolean | string) {
  const next = { ...options.value, [key]: value }
  try {
    resolveFlowchartOptions(next)
    options.value = next
  } catch (error) {
    notify((error as Error).message)
  }
}
function setGlobalStyle(key: 'fontFamily' | 'fontSize' | 'background', value: string | number) {
  const next = { ...theme.value, [key]: value }
  try {
    resolveFlowchartTheme(preset.value, next)
    theme.value = next
  } catch (error) {
    notify((error as Error).message)
  }
}
function setShapeStyle(key: string, value: string | number) {
  const next = {
    ...theme.value,
    [styleTarget.value]: { ...theme.value[styleTarget.value], [key]: value }
  }
  try {
    resolveFlowchartTheme(preset.value, next)
    theme.value = next
  } catch (error) {
    notify((error as Error).message)
  }
}
function styleValue(key: string): string | number {
  return (targetStyle.value as unknown as Record<string, string | number>)[key] ?? ''
}
function changePreset(key: FlowchartPreset) {
  preset.value = key
  theme.value = {}
}
function downloadJson() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data.value, null, 2)], { type: 'application/json' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'flowchart-data.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
async function download() {
  exporting.value = true
  try {
    await diagram.value?.download({
      format: format.value,
      scale: scale.value,
      quality: quality.value,
      filename: filename.value
    })
    showExport.value = false
    notify(`${format.value.toUpperCase()} 流程图已导出`)
  } catch (error) {
    notify((error as Error).message)
  } finally {
    exporting.value = false
  }
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await canvas.value?.requestFullscreen()
  } catch {
    notify('当前浏览器无法进入全屏')
  }
}
const code = `<script setup lang="ts">
import { ref } from 'vue'
import { FlowchartDiagram } from '@ui-studio/fishbone'
import type { FlowchartData, FlowchartHandle } from '@ui-studio/fishbone'
const diagram = ref<FlowchartHandle | null>(null)
const data: FlowchartData = {
  version: 1,
  regions: [{ id: 'team', label: '处理区域', description: '区域标注' }],
  nodes: [
    { id: 'start', type: 'start', label: '开始' },
    { id: 'task', type: 'activity', label: '处理任务', regionId: 'team' },
    { id: 'check', type: 'decision', label: '通过？', regionId: 'team' },
    { id: 'end', type: 'end', label: '结束' }
  ],
  edges: [
    { source: 'start', target: 'task' },
    { source: 'task', target: 'check' },
    { source: 'check', target: 'end', label: '是' },
    { source: 'check', target: 'task', label: '否',
      sourcePort: 'right', targetPort: 'right' }
  ]
}
<\/script>
<template>
  <FlowchartDiagram ref="diagram" :data="data" preset="ocean"
    :options="{ maxNodesPerColumn: 5, optimizeAlignment: true }"
    :theme="{ decision: { fill: '#fff7e6', textColor: '#886225' } }" />
  <button @click="diagram?.download({ format: 'png', scale: 2 })">下载</button>
</template>`
async function copyCode() {
  try {
    await navigator.clipboard.writeText(code)
    notify('流程图集成代码已复制')
  } catch {
    notify('请手动复制集成代码')
  }
}
defineExpose({
  openDocs: () => {
    showDocs.value = true
  },
  openTemplates: () => {
    showTemplates.value = true
  }
})
</script>

<template>
  <main class="flow-workbench" @keydown="trapFocus">
    <section class="page-heading">
      <div>
        <div class="eyebrow"><span />让流程自然成形</div>
        <h1>流程图工作台<span class="demo-tag">NEW</span></h1>
        <p>用结构化数据描述业务，让布局与连线自动完成。</p>
      </div>
      <div class="heading-actions">
        <button class="button secondary" @click="loadExample(exampleIndex)">
          <RotateCcw :size="15" />重置示例</button
        ><button class="button primary" :disabled="!layout" @click="showExport = true">
          <ArrowDownToLine :size="16" />导出流程图<ChevronDown :size="14" />
        </button>
      </div>
    </section>
    <section class="example-bar">
      <Layers :size="18" /><span class="example-label">当前示例</span
      ><label class="select-wrapper"
        ><select
          aria-label="选择流程图示例"
          :value="exampleIndex"
          @change="loadExample(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="(example, i) in flowExamples" :key="i" :value="i">
            {{ example.name }}
          </option></select
        ><ChevronDown :size="14" /></label
      ><span class="example-description">{{ flowExamples[exampleIndex]!.description }}</span
      ><button class="text-button" @click="showDocs = true">
        数据接口<ArrowUpRight :size="14" />
      </button>
    </section>
    <div class="flow-studio-grid">
      <section class="card flow-editor">
        <div class="panel-header">
          <div>
            <Code2 :size="17" />
            <h2>结构化数据</h2>
            <span class="count-badge">v1</span>
          </div>
          <button class="icon-button" aria-label="下载流程图 JSON" @click="downloadJson">
            <ArrowDownToLine :size="16" />
          </button>
        </div>
        <div class="editor-tabs">
          <button :class="{ selected: editorTab === 'form' }" @click="switchEditor('form')">
            <Workflow :size="14" />结构编辑</button
          ><button :class="{ selected: editorTab === 'json' }" @click="switchEditor('json')">
            <Code2 :size="14" />JSON 编辑
          </button>
        </div>
        <template v-if="editorTab === 'form'"
          ><div class="flow-form-tabs">
            <button
              v-for="tab in ['nodes', 'regions', 'edges'] as const"
              :key="tab"
              :class="{ active: formTab === tab }"
              @click="formTab = tab"
            >
              {{ { nodes: '节点', regions: '区域', edges: '连线' }[tab]
              }}<span>{{
                tab === 'nodes'
                  ? data.nodes.length
                  : tab === 'regions'
                    ? (data.regions?.length ?? 0)
                    : data.edges.length
              }}</span>
            </button>
          </div>
          <div class="flow-form-content">
            <template v-if="formTab === 'nodes'"
              ><p class="flow-hint">节点 ID 用于连接，修改名称后失焦应用。</p>
              <div v-for="node in data.nodes" :key="node.id" class="flow-form-item">
                <div class="flow-item-heading">
                  <Diamond v-if="node.type === 'decision'" :size="13" /><Workflow
                    v-else
                    :size="13"
                  /><span>{{ shapeNames[node.type] }}</span
                  ><code>{{ node.id }}</code
                  ><button
                    class="icon-button delete-button"
                    :aria-label="`删除流程节点 ${node.id}`"
                    @click="deleteNode(node.id)"
                  >
                    <X :size="12" />
                  </button>
                </div>
                <input
                  class="flow-field"
                  :aria-label="`流程节点名称 ${node.id}`"
                  :value="node.label"
                  maxlength="120"
                  @change="changeNode(node.id, 'label', ($event.target as HTMLInputElement).value)"
                />
                <div class="flow-inline-fields">
                  <select
                    :aria-label="`节点类型 ${node.id}`"
                    :value="node.type"
                    @change="
                      changeNode(node.id, 'type', ($event.target as HTMLSelectElement).value)
                    "
                  >
                    <option v-for="(name, key) in shapeNames" :key="key" :value="key">
                      {{ name }}
                    </option></select
                  ><select
                    v-if="!['start', 'end'].includes(node.type)"
                    :aria-label="`所属区域 ${node.id}`"
                    :value="node.regionId ?? ''"
                    @change="
                      changeNode(node.id, 'regionId', ($event.target as HTMLSelectElement).value)
                    "
                  >
                    <option value="">未分组</option>
                    <option v-for="region in data.regions" :key="region.id" :value="region.id">
                      {{ region.label }}
                    </option></select
                  ><select
                    v-if="node.type === 'activity'"
                    :aria-label="`活动形状 ${node.id}`"
                    :value="node.shape ?? 'rectangle'"
                    @change="
                      changeNode(node.id, 'shape', ($event.target as HTMLSelectElement).value)
                    "
                  >
                    <option value="rectangle">方形</option>
                    <option value="ellipse">椭圆</option>
                  </select>
                </div>
              </div>
              <div class="flow-add-actions">
                <button class="add-category" @click="addNode('activity')">
                  <Plus :size="14" />添加活动</button
                ><button class="add-category" @click="addNode('decision')">
                  <Plus :size="14" />添加判断
                </button>
              </div></template
            >
            <template v-else-if="formTab === 'regions'"
              ><p class="flow-hint">区域横向排列，删除区域会保留其中的节点。</p>
              <div v-for="region in data.regions" :key="region.id" class="flow-form-item">
                <div class="flow-item-heading">
                  <Layers :size="13" /><code>{{ region.id }}</code
                  ><button
                    class="icon-button delete-button"
                    :aria-label="`删除流程区域 ${region.id}`"
                    @click="deleteRegion(region.id)"
                  >
                    <X :size="12" />
                  </button>
                </div>
                <label
                  >区域名称<input
                    class="flow-field"
                    :aria-label="`区域名称 ${region.id}`"
                    :value="region.label"
                    maxlength="120"
                    @change="
                      changeRegion(region.id, 'label', ($event.target as HTMLInputElement).value)
                    " /></label
                ><label
                  >标注文字<input
                    class="flow-field"
                    :aria-label="`区域标注 ${region.id}`"
                    :value="region.description"
                    maxlength="120"
                    placeholder="可选的区域说明"
                    @change="
                      changeRegion(
                        region.id,
                        'description',
                        ($event.target as HTMLInputElement).value
                      )
                    "
                /></label>
              </div>
              <button class="add-category" @click="addRegion">
                <Plus :size="14" />添加区域
              </button></template
            >
            <template v-else
              ><p class="flow-hint">默认带箭头，可标注判断分支并指定连接方向。</p>
              <div
                v-for="(edge, index) in data.edges"
                :key="edge.id ?? index"
                class="flow-form-item"
              >
                <div class="flow-item-heading">
                  <span>连接 {{ index + 1 }}</span
                  ><button
                    class="icon-button delete-button"
                    :aria-label="`删除连线 ${index + 1}`"
                    @click="mutate((next) => next.edges.splice(index, 1))"
                  >
                    <X :size="12" />
                  </button>
                </div>
                <div class="flow-inline-fields">
                  <select
                    :aria-label="`连线起点 ${index + 1}`"
                    :value="edge.source"
                    @change="
                      changeEdge(index, 'source', ($event.target as HTMLSelectElement).value)
                    "
                  >
                    <option v-for="node in data.nodes" :key="node.id" :value="node.id">
                      {{ node.label }}
                    </option></select
                  ><span>→</span
                  ><select
                    :aria-label="`连线终点 ${index + 1}`"
                    :value="edge.target"
                    @change="
                      changeEdge(index, 'target', ($event.target as HTMLSelectElement).value)
                    "
                  >
                    <option v-for="node in data.nodes" :key="node.id" :value="node.id">
                      {{ node.label }}
                    </option>
                  </select>
                </div>
                <input
                  class="flow-field"
                  :aria-label="`连线标注 ${index + 1}`"
                  :value="edge.label"
                  maxlength="120"
                  placeholder="标注（如：是 / 否）"
                  @change="changeEdge(index, 'label', ($event.target as HTMLInputElement).value)"
                />
                <div class="flow-inline-fields">
                  <select
                    :aria-label="`起点方向 ${index + 1}`"
                    :value="edge.sourcePort ?? 'auto'"
                    @change="
                      changeEdge(index, 'sourcePort', ($event.target as HTMLSelectElement).value)
                    "
                  >
                    <option
                      v-for="(label, key) in {
                        auto: '自动出口',
                        top: '从上方',
                        bottom: '从下方',
                        left: '从左侧',
                        right: '从右侧'
                      }"
                      :key="key"
                      :value="key"
                    >
                      {{ label }}
                    </option></select
                  ><select
                    :aria-label="`终点方向 ${index + 1}`"
                    :value="edge.targetPort ?? 'auto'"
                    @change="
                      changeEdge(index, 'targetPort', ($event.target as HTMLSelectElement).value)
                    "
                  >
                    <option
                      v-for="(label, key) in {
                        auto: '自动入口',
                        top: '到上方',
                        bottom: '到下方',
                        left: '到左侧',
                        right: '到右侧'
                      }"
                      :key="key"
                      :value="key"
                    >
                      {{ label }}
                    </option></select
                  ><label class="flow-checkbox"
                    ><input
                      type="checkbox"
                      :checked="edge.style?.dashed"
                      @change="
                        changeEdge(index, 'dashed', ($event.target as HTMLInputElement).checked)
                      "
                    />虚线</label
                  >
                </div>
              </div>
              <button class="add-category" :disabled="!data.nodes.length" @click="addEdge">
                <Plus :size="14" />添加连线
              </button></template
            >
          </div></template
        >
        <div v-else class="json-content flow-json">
          <textarea v-model="json" aria-label="流程图结构化 JSON" spellcheck="false" />
          <div v-if="jsonError" class="json-error" role="alert">{{ jsonError }}</div>
          <button class="button primary" @click="applyJson">
            <Check :size="15" />应用流程数据
          </button>
          <p>必需字段：version、nodes、edges。regions 可选。</p>
        </div>
        <div class="editor-footer">
          <span class="status-dot" />{{ saveStatus
          }}<span class="local-label">仅保存在此浏览器</span>
        </div>
      </section>
      <div class="visual-column">
        <section class="card flow-preview">
          <div class="preview-toolbar">
            <div class="preview-tabs">
              <button class="selected"><Workflow :size="15" />流程图预览</button>
            </div>
            <span class="live-badge"><span />自动布局 · 正交连线</span>
          </div>
          <div ref="canvas" class="flow-canvas">
            <div class="flow-canvas-scroll">
              <div
                class="flow-canvas-surface"
                :class="{
                  'transparent-surface': ['transparent', 'none'].includes(currentTheme.background)
                }"
                :style="{ width: `${(Math.max(120, fittedWidth) * zoom) / 100}px` }"
              >
                <FlowchartDiagram
                  ref="diagram"
                  :data="data"
                  :preset="preset"
                  :theme="theme"
                  :options="options"
                  @error="(error) => notify(error.message)"
                />
              </div>
            </div>
          </div>
          <div class="canvas-footer">
            <div class="canvas-info">
              {{ data.regions?.length ?? 0 }} 个区域<span class="divider-dot">·</span
              >{{ data.nodes.length }} 个节点<span class="divider-dot">·</span
              >{{ data.edges.length }} 条连线
            </div>
            <div class="zoom-controls">
              <button
                class="icon-button"
                aria-label="缩小流程图"
                :disabled="zoom <= 50"
                @click="zoom = Math.max(50, zoom - 25)"
              >
                <Minus :size="15" /></button
              ><span>{{ zoom }}%</span
              ><button
                class="icon-button"
                aria-label="放大流程图"
                :disabled="zoom >= 400"
                @click="zoom = Math.min(400, zoom + 25)"
              >
                <Plus :size="15" /></button
              ><i /><button
                class="icon-button"
                aria-label="流程图适应画布"
                title="适应画布"
                @click="zoom = 100"
              >
                <Maximize2 :size="15" /></button
              ><button class="icon-button" aria-label="流程图全屏" title="全屏" @click="fullscreen">
                <ArrowUpRight :size="17" />
              </button>
            </div>
          </div>
        </section>
        <section class="card flow-layout-panel">
          <div class="panel-header">
            <div>
              <Settings2 :size="17" />
              <h2>自动布局</h2>
              <span class="subtle-label">在秩序与效率之间取得平衡</span>
            </div>
            <button class="text-button" @click="options = {}">恢复默认</button>
          </div>
          <div class="flow-layout-fields">
            <label class="flow-toggle flow-title-toggle"
              ><input
                type="checkbox"
                aria-label="显示流程图标题"
                :checked="currentOptions.showTitle"
                @change="setOption('showTitle', ($event.target as HTMLInputElement).checked)"
              /><span>显示流程图标题<small>默认隐藏，导出遵循此设置</small></span></label
            >
            <label
              >图形最大宽度<input
                type="number"
                aria-label="流程图图形最大宽度"
                min="120"
                max="600"
                :value="currentOptions.maxNodeWidth"
                @change="
                  setOption('maxNodeWidth', Number(($event.target as HTMLInputElement).value))
                "
            /></label>
            <label
              >图形最大高度<input
                type="number"
                aria-label="流程图图形最大高度"
                min="64"
                max="600"
                :value="currentOptions.maxNodeHeight"
                @change="
                  setOption('maxNodeHeight', Number(($event.target as HTMLInputElement).value))
                "
            /></label>
            <label
              >区域间距<input
                type="number"
                aria-label="流程图区域间距"
                min="48"
                max="200"
                :value="currentOptions.regionGap"
                @change="setOption('regionGap', Number(($event.target as HTMLInputElement).value))"
            /></label>
            <label
              >每列最多节点<input
                type="number"
                aria-label="区域内纵向最大节点数量"
                min="1"
                max="20"
                :value="currentOptions.maxNodesPerColumn"
                @change="
                  setOption('maxNodesPerColumn', Number(($event.target as HTMLInputElement).value))
                " /></label
            ><label
              >开始 / 结束位置<select
                aria-label="开始结束布局"
                :value="currentOptions.terminalPlacement"
                @change="setOption('terminalPlacement', ($event.target as HTMLSelectElement).value)"
              >
                <option value="aligned">置顶 / 置底，纵向对齐</option>
                <option value="left">固定在左侧轴线</option>
                <option value="auto">随节点自动布局</option>
              </select></label
            ><label
              >纵向间距<input
                type="number"
                aria-label="流程图纵向间距"
                min="48"
                max="200"
                :value="currentOptions.rowGap"
                @change="
                  setOption('rowGap', Number(($event.target as HTMLInputElement).value))
                " /></label
            ><label class="flow-toggle"
              ><input
                type="checkbox"
                aria-label="优化连接对齐"
                :checked="currentOptions.optimizeAlignment"
                @change="
                  setOption('optimizeAlignment', ($event.target as HTMLInputElement).checked)
                "
              /><span>优化连接对齐<small>跨列直接连接优先同行</small></span></label
            ><label class="flow-toggle"
              ><input
                type="checkbox"
                aria-label="自动均衡分列"
                :checked="currentOptions.balanceRegions"
                @change="setOption('balanceRegions', ($event.target as HTMLInputElement).checked)"
              /><span>自动均衡分列<small>较长区域参考其他区域拆分</small></span></label
            >
            <div class="flow-layout-summary">
              <strong>{{
                layout?.regions.reduce((sum, region) => sum + region.columns, 0) ?? 0
              }}</strong
              ><span>区域列数<br /><small>按连接关系优化</small></span>
            </div>
          </div>
          <p class="flow-hint flow-layout-hint">
            尺寸以 px
            为单位；间距为最小值，长连线标注会自动预留空间。超过尺寸的文字缩小或省略，可悬停查看全文。
          </p>
        </section>
        <section class="styles-panel card">
          <div class="panel-header">
            <div>
              <SlidersHorizontal :size="17" />
              <h2>流程图样式</h2>
            </div>
            <button class="text-button" @click="showCustom = !showCustom">
              自定义图形与文字<ChevronDown :size="14" :class="{ rotated: showCustom }" />
            </button>
          </div>
          <div class="theme-grid">
            <button
              v-for="(name, key) in themeNames"
              :key="key"
              class="theme-option"
              :class="{ chosen: preset === key }"
              :aria-pressed="preset === key"
              @click="changePreset(key)"
            >
              <div class="theme-thumbnail" :style="{ background: flowchartThemes[key].background }">
                <svg viewBox="0 0 130 62" aria-hidden="true">
                  <rect
                    x="10"
                    y="6"
                    width="75"
                    height="50"
                    rx="5"
                    :fill="flowchartThemes[key].region.fill"
                    :stroke="flowchartThemes[key].region.stroke"
                  />
                  <path d="M39 21v18h45" fill="none" :stroke="flowchartThemes[key].edge.stroke" />
                  <rect
                    x="25"
                    y="13"
                    width="28"
                    height="13"
                    rx="3"
                    :fill="flowchartThemes[key].activity.fill"
                    :stroke="flowchartThemes[key].activity.stroke"
                  />
                  <path
                    d="M85 28l17 11-17 11-17-11z"
                    :fill="flowchartThemes[key].decision.fill"
                    :stroke="flowchartThemes[key].decision.stroke"
                  /></svg
                ><span v-if="preset === key" class="theme-check"><Check :size="11" /></span>
              </div>
              <strong>{{ name }}</strong
              ><span>{{ key === 'midnight' ? '深色画布' : '图形与区域配色' }}</span>
            </button>
          </div>
          <div v-if="showCustom" class="custom-settings">
            <div class="custom-top">
              <span>全局设置与分类样式</span
              ><button class="text-button" @click="theme = {}">恢复主题默认</button>
            </div>
            <div class="flow-global-styles">
              <ColorInput
                label="流程图背景"
                :model-value="currentTheme.background"
                allow-transparent
                @update:model-value="setGlobalStyle('background', $event)"
              />
              <label
                >文字字体<select
                  aria-label="流程图文字字体"
                  :value="currentTheme.fontFamily"
                  @change="setGlobalStyle('fontFamily', ($event.target as HTMLSelectElement).value)"
                >
                  <option :value="flowchartThemes[preset].fontFamily">主题默认字体</option>
                  <option value="Arial, 'Microsoft YaHei', sans-serif">Arial / 微软雅黑</option>
                  <option value="Georgia, SimSun, serif">Georgia / 宋体</option>
                  <option value="Consolas, 'Microsoft YaHei', monospace">Consolas 等宽字体</option>
                </select></label
              ><label
                >全局字号 <span>{{ currentTheme.fontSize }} px</span
                ><input
                  type="range"
                  aria-label="流程图全局字号"
                  min="10"
                  max="24"
                  :value="currentTheme.fontSize"
                  @input="
                    setGlobalStyle('fontSize', Number(($event.target as HTMLInputElement).value))
                  "
              /></label>
            </div>
            <div class="flow-target-tabs">
              <button
                v-for="(name, key) in {
                  activity: '活动',
                  decision: '判断',
                  start: '开始',
                  end: '结束',
                  region: '区域',
                  edge: '连线'
                }"
                :key="key"
                :class="{ active: styleTarget === key }"
                @click="styleTarget = key"
              >
                {{ name }}
              </button>
            </div>
            <div class="custom-fields">
              <ColorInput
                v-for="field in colorFields"
                :key="`${styleTarget}-${field.key}`"
                :label="field.name"
                :model-value="String(styleValue(field.key))"
                @update:model-value="setShapeStyle(field.key, $event)"
              />
              <template v-if="!['region', 'edge'].includes(styleTarget)"
                ><label
                  >分类字号 <span>{{ styleValue('fontSize') }} px</span
                  ><input
                    type="range"
                    aria-label="流程图分类字号"
                    min="10"
                    max="24"
                    :value="styleValue('fontSize')"
                    @input="
                      setShapeStyle('fontSize', Number(($event.target as HTMLInputElement).value))
                    " /></label
                ><label
                  >文字字重<select
                    aria-label="流程图文字字重"
                    :value="styleValue('fontWeight')"
                    @change="
                      setShapeStyle(
                        'fontWeight',
                        Number(($event.target as HTMLSelectElement).value)
                      )
                    "
                  >
                    <option :value="400">常规</option>
                    <option :value="500">中等</option>
                    <option :value="600">半粗</option>
                    <option :value="700">加粗</option>
                  </select></label
                ><label
                  >图形线宽 <span>{{ styleValue('lineWidth') }} px</span
                  ><input
                    type="range"
                    aria-label="流程图图形线宽"
                    min="0.5"
                    max="5"
                    step="0.5"
                    :value="styleValue('lineWidth')"
                    @input="
                      setShapeStyle('lineWidth', Number(($event.target as HTMLInputElement).value))
                    " /></label
              ></template>
            </div>
            <p class="flow-hint">
              数据中单个节点、区域或连线的 style 优先于主题；可在 JSON 中独立设置。
            </p>
          </div>
        </section>
      </div>
    </div>
    <footer class="page-footer">
      <span
        ><Workflow :size="15" />结构化数据<span class="divider-dot">→</span>自动布局<span
          class="divider-dot"
          >→</span
        >图片导出</span
      ><button class="text-button" @click="showDocs = true">
        流程图组件集成指南<ArrowUpRight :size="12" />
      </button>
    </footer>
    <div v-if="notice" class="toast" role="status"><Check :size="17" />{{ notice }}</div>
    <div v-if="showExport" class="modal-backdrop" @click.self="closeModals">
      <section
        class="modal flow-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flow-export-title"
      >
        <div class="modal-heading">
          <div>
            <h2 id="flow-export-title">导出流程图</h2>
            <p>导出完整内容，包含区域色块、判断分支与标注。</p>
          </div>
          <button class="icon-button" aria-label="关闭流程图导出" @click="closeModals">
            <X :size="19" />
          </button>
        </div>
        <label class="field-label"
          >文件名称<input v-model="filename" aria-label="流程图文件名称" maxlength="100"
        /></label>
        <div class="format-grid">
          <button
            v-for="f in ['png', 'jpeg', 'webp', 'svg'] as const"
            :key="f"
            :class="{ selected: format === f }"
            @click="format = f"
          >
            <strong>{{ f.toUpperCase() }}</strong
            ><span>{{
              f === 'svg'
                ? '矢量图形'
                : f === 'png'
                  ? '无损高清'
                  : f === 'jpeg'
                    ? '通用格式'
                    : '体积更小'
            }}</span>
          </button>
        </div>
        <label v-if="format !== 'svg'" class="field-label"
          >导出倍率<select v-model.number="scale" aria-label="流程图导出倍率">
            <option v-for="n in 4" :key="n" :value="n">
              {{ n }}× {{ n === 2 ? '· 高清（推荐）' : '' }}
            </option>
          </select></label
        ><label v-if="format === 'jpeg' || format === 'webp'" class="field-label"
          >编码质量 {{ Math.round(quality * 100) }}%<input
            v-model.number="quality"
            aria-label="流程图图片质量"
            type="range"
            min="0.2"
            max="1"
            step="0.01"
        /></label>
        <p class="export-note">大图优先使用 SVG；位图过大时可降低导出倍率。</p>
        <button
          class="button primary export-confirm"
          :disabled="exporting || !layout"
          @click="download"
        >
          {{ exporting ? '正在导出…' : `下载 ${format.toUpperCase()} 流程图` }}
        </button>
      </section>
    </div>
    <div v-if="showDocs" class="modal-backdrop" @click.self="closeModals">
      <section
        class="modal docs-modal flow-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flow-docs-title"
      >
        <div class="modal-heading">
          <div>
            <h2 id="flow-docs-title">流程图数据接口 · v1</h2>
            <p>节点独立定义，以 ID 建立区域归属和连接关系。</p>
          </div>
          <button class="icon-button" aria-label="关闭流程图指南" @click="closeModals">
            <X :size="19" />
          </button>
        </div>
        <div class="flow-contract">
          <span><strong>nodes</strong>活动 / 判断 / 起止</span
          ><span><strong>regions</strong>区域 / 说明 / 配色</span
          ><span><strong>edges</strong>起点 / 终点 / 方向</span>
        </div>
        <pre><code>{{ code }}</code></pre>
        <div class="docs-bottom">
          <p>开始 / 结束为全局节点，默认纵向对齐。<br />支持最多 200 节点、400 连线、30 区域。</p>
          <button class="button primary" @click="copyCode">复制流程图集成代码</button>
        </div>
      </section>
    </div>
    <div v-if="showTemplates" class="modal-backdrop" @click.self="closeModals">
      <section
        class="modal templates-modal flow-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flow-templates-title"
      >
        <div class="modal-heading">
          <div>
            <h2 id="flow-templates-title">流程图示例模板</h2>
            <p>从业务审批到多列布局，选择一个流程开始探索。</p>
          </div>
          <button class="icon-button" aria-label="关闭流程图模板" @click="closeModals">
            <X :size="19" />
          </button>
        </div>
        <button
          v-for="(example, i) in flowExamples"
          :key="i"
          class="template-item"
          @click="loadExample(i)"
        >
          <span class="template-icon"><Workflow :size="22" /></span
          ><span
            ><strong>{{ example.name }}</strong
            ><small>{{ example.description }}</small
            ><em
              >{{ example.data.nodes.length }} 个节点 · {{ example.data.edges.length }} 条连线</em
            ></span
          ><ArrowUpRight :size="18" />
        </button>
      </section>
    </div>
  </main>
</template>
