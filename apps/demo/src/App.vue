<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  FishboneDiagram,
  fishboneThemes,
  resolveTheme,
  validateTree,
  countNodes,
  renderFishboneSvg,
  type FishboneAppearance,
  type FishboneNode,
  type FishbonePreset,
  type FishboneTheme,
  type FishboneHandle,
  type ImageFormat
} from '@fishbone/vue'
import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Code2,
  Fish,
  FolderOpen,
  GitBranch,
  Layers,
  LayoutDashboard,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X,
  ZoomIn
} from '@lucide/vue'
import TreeEditor from './TreeEditor.vue'
import { examples } from './examples'

const STORAGE_KEY = 'fishbone-studio:v1'
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const selectedExample = ref(0)
const data = ref<FishboneNode>(clone(examples[0]!.data))
const preset = ref<FishbonePreset>('ocean')
const custom = ref<Partial<FishboneTheme>>({})
const saveStatus = ref('已自动保存')
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function notify(message: string) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 4000)
}
try {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const state = JSON.parse(saved)
    validateTree(state.data)
    resolveTheme(state.preset, state.custom)
    data.value = state.data
    preset.value = state.preset
    custom.value = state.custom ?? {}
    if (Number.isInteger(state.example) && examples[state.example])
      selectedExample.value = state.example
  }
} catch {
  saveStatus.value = '已恢复默认示例'
}

const editorTab = ref<'tree' | 'json'>('tree')
const jsonText = ref(JSON.stringify(data.value, null, 2))
const jsonError = ref('')
const diagram = ref<FishboneHandle | null>(null)
const preview = ref<HTMLElement | null>(null)
const previewTab = ref<'diagram' | 'overview'>('diagram')
const zoom = ref(100)
const showExport = ref(false)
const showTemplates = ref(false)
const showDocs = ref(false)
const showCustom = ref(false)
let previousFocus: HTMLElement | null = null
watch([showExport, showTemplates, showDocs], async ([exportOpen, templatesOpen, docsOpen]) => {
  if (exportOpen || templatesOpen || docsOpen) {
    previousFocus = document.activeElement as HTMLElement
    await nextTick()
    document.querySelector<HTMLElement>('[role="dialog"] button')?.focus()
  } else {
    previousFocus?.focus()
  }
})
function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !(showExport.value || showTemplates.value || showDocs.value)) return
  const controls = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="dialog"] button:not(:disabled), [role="dialog"] input, [role="dialog"] select, [role="dialog"] textarea'
    )
  )
  const first = controls[0],
    last = controls.at(-1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
const exporting = ref(false)
const format = ref<ImageFormat>('png')
const exportScale = ref(2)
const quality = ref(0.92)
const filename = ref('鱼骨图分析')
const currentTheme = computed(() => resolveTheme(preset.value, custom.value))
const totalNodes = computed(() => countNodes(data.value))
const categories = computed(() => data.value.children ?? [])
const customCount = computed(() => Object.keys(custom.value).length)
const themeList: { key: FishbonePreset; name: string; description: string }[] = [
  { key: 'ocean', name: '清新海洋', description: '轻盈 · 多彩' },
  { key: 'classic', name: '经典极简', description: '克制 · 专业' },
  { key: 'forest', name: '自然森林', description: '柔和 · 生机' },
  { key: 'sunset', name: '落日暖光', description: '温暖 · 灵感' },
  { key: 'midnight', name: '深邃夜色', description: '沉静 · 聚焦' }
]
const themePreviews = Object.fromEntries(
  themeList.map((theme) => [
    theme.key,
    renderFishboneSvg(
      {
        label: '问题',
        children: [
          { label: '原因', children: [{ label: '因素' }] },
          { label: '原因', children: [{ label: '因素' }] }
        ]
      },
      theme.key
    )
  ])
)
const appearanceFields: {
  key: keyof FishboneAppearance
  title: string
  options: { value: string; label: string }[]
}[] = [
  {
    key: 'headStyle',
    title: '鱼头造型',
    options: [
      { value: 'fish', label: '仿生鱼头' },
      { value: 'shark', label: '锐角鲨鱼' },
      { value: 'rounded', label: '圆润胶囊' },
      { value: 'label', label: '经典方框' }
    ]
  },
  {
    key: 'tailStyle',
    title: '鱼尾造型',
    options: [
      { value: 'fork', label: '双叉鱼尾' },
      { value: 'fan', label: '扇形鱼尾' },
      { value: 'crescent', label: '月牙鱼尾' },
      { value: 'chevron', label: '极简折线' }
    ]
  },
  {
    key: 'categoryStyle',
    title: '分类鱼鳍',
    options: [
      { value: 'fin', label: '鱼鳍标签' },
      { value: 'pill', label: '圆润胶囊' },
      { value: 'ribbon', label: '燕尾丝带' },
      { value: 'outline', label: '经典描边' }
    ]
  },
  {
    key: 'spineStyle',
    title: '主干造型',
    options: [
      { value: 'tapered', label: '流线脊骨' },
      { value: 'vertebrae', label: '分节脊椎' },
      { value: 'double', label: '双线骨架' },
      { value: 'line', label: '简约单线' }
    ]
  },
  {
    key: 'boneStyle',
    title: '骨刺造型',
    options: [
      { value: 'curved', label: '弧形骨刺' },
      { value: 'tapered', label: '渐细骨刺' },
      { value: 'jointed', label: '关节骨刺' },
      { value: 'straight', label: '直线骨刺' }
    ]
  },
  {
    key: 'causeStyle',
    title: '一级原因节点',
    options: [
      { value: 'dot', label: '圆点连接' },
      { value: 'card', label: '独立卡片' },
      { value: 'underline', label: '下划线连接' }
    ]
  }
]
let saveTimer: ReturnType<typeof setTimeout> | undefined
watch(
  [data, preset, custom, selectedExample],
  () => {
    saveStatus.value = '正在保存…'
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            data: data.value,
            preset: preset.value,
            custom: custom.value,
            example: selectedExample.value
          })
        )
        saveStatus.value = '已自动保存'
      } catch {
        saveStatus.value = '本地存储不可用'
        notify('浏览器本地存储不可用，请下载数据保存')
      }
    }, 350)
  },
  { deep: true }
)
onBeforeUnmount(() => {
  clearTimeout(saveTimer)
  clearTimeout(toastTimer)
})

function commitTree(next: FishboneNode) {
  try {
    validateTree(next)
    data.value = next
    jsonError.value = ''
    if (editorTab.value === 'tree') jsonText.value = JSON.stringify(next, null, 2)
  } catch (error) {
    notify((error as Error).message)
  }
}
function nodeAt(next: FishboneNode, path: number[]) {
  return path.reduce((node, index) => node.children![index]!, next)
}
function renameNode(path: number[], label: string) {
  const next = clone(data.value)
  nodeAt(next, path).label = label.trim() || '未命名节点'
  commitTree(next)
}
function addNode(path: number[]) {
  const next = clone(data.value),
    node = nodeAt(next, path)
  node.children ??= []
  node.children.push({
    id: crypto.randomUUID(),
    label: path.length === 0 ? '新的原因分类' : '新的原因'
  })
  commitTree(next)
}
function removeNode(path: number[]) {
  const next = clone(data.value)
  nodeAt(next, path.slice(0, -1)).children!.splice(path.at(-1)!, 1)
  commitTree(next)
}
function switchEditor(tab: 'tree' | 'json') {
  if (tab === 'json' && editorTab.value !== 'json')
    jsonText.value = JSON.stringify(data.value, null, 2)
  editorTab.value = tab
}
function applyJson() {
  try {
    const next: unknown = JSON.parse(jsonText.value)
    validateTree(next)
    data.value = next
    jsonError.value = ''
    notify('树数据已更新')
  } catch (error) {
    jsonError.value = (error as Error).message
  }
}
function loadExample(index: number) {
  selectedExample.value = index
  data.value = clone(examples[index]!.data)
  jsonText.value = JSON.stringify(data.value, null, 2)
  jsonError.value = ''
  zoom.value = 100
  showTemplates.value = false
}
function changeTheme(key: FishbonePreset) {
  preset.value = key
  custom.value = {}
}
function setCustom(key: keyof FishboneTheme, value: string | number) {
  const next = { ...custom.value, [key]: value }
  try {
    resolveTheme(preset.value, next)
    custom.value = next
  } catch (error) {
    notify((error as Error).message)
  }
}
function setBranchColor(index: number, value: string) {
  const colors = [...currentTheme.value.branchColors]
  colors[index] = value
  custom.value = { ...custom.value, branchColors: colors }
}
async function download() {
  if (!diagram.value) return
  exporting.value = true
  try {
    await diagram.value.download({
      format: format.value,
      scale: exportScale.value,
      quality: quality.value,
      filename: filename.value
    })
    showExport.value = false
    notify(`${format.value.toUpperCase()} 图片已导出`)
  } catch (error) {
    notify((error as Error).message)
  } finally {
    exporting.value = false
  }
}
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await preview.value?.requestFullscreen()
  } catch {
    notify('当前浏览器无法进入全屏')
  }
}
function downloadData() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data.value, null, 2)], { type: 'application/json' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'fishbone-data.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const integrationCode = `<script setup lang="ts">
import { ref } from 'vue'
import { FishboneDiagram } from '@fishbone/vue'
import type { FishboneHandle } from '@fishbone/vue'

const diagram = ref<FishboneHandle | null>(null)
const data = {
  label: '项目交付延期',
  children: [
    { label: '需求', children: [{ label: '需求频繁变更' }] },
    { label: '资源', children: [{ label: '人力不足' }] }
  ]
}
const save = () => diagram.value?.download({ format: 'png', scale: 2 })
<\/script>

<template>
  <FishboneDiagram ref="diagram" :data="data" preset="ocean"
    :theme="{ fontSize: 16, spineColor: '#138b7c' }" />
  <button @click="save">下载图片</button>
</template>`
async function copyCode() {
  try {
    await navigator.clipboard.writeText(integrationCode)
    notify('Vue 集成代码已复制')
  } catch {
    notify('无法访问剪贴板，请手动复制代码')
  }
}
function closePanels() {
  showExport.value = false
  showDocs.value = false
  showTemplates.value = false
}
function resetExample() {
  loadExample(selectedExample.value)
  notify('已恢复当前示例')
}
function openExport() {
  previewTab.value = 'diagram'
  showExport.value = true
}
</script>

<template>
  <div class="app-shell" @keydown="trapFocus" @keydown.esc="closePanels">
    <aside class="sidebar">
      <a class="brand" href="#" @click.prevent="closePanels"
        ><span class="brand-mark"><Fish :size="25" :stroke-width="1.7" /></span
        ><span>Fishbone<span class="brand-sub">STUDIO</span></span></a
      >
      <div class="workspace-switch">
        <span class="workspace-avatar">F</span>
        <div>我的工作空间<small>本地工作台</small></div>
        <ChevronDown :size="14" />
      </div>
      <div class="nav-caption">工作空间</div>
      <nav>
        <button class="nav-item active" @click="closePanels">
          <GitBranch :size="18" />鱼骨图工作台<span class="nav-dot" />
        </button>
        <button class="nav-item" @click="showTemplates = true">
          <Layers :size="18" />示例模板<span class="nav-count">3</span>
        </button>
        <button class="nav-item" @click="showDocs = true">
          <Code2 :size="18" />Vue 集成指南<ArrowUpRight class="nav-arrow" :size="14" />
        </button>
      </nav>
      <div class="sidebar-note">
        <div class="sidebar-note-icon"><Sparkles :size="18" /></div>
        <h3>把复杂问题，理清楚。</h3>
        <p>从一个问题出发，<br />让每一条原因都有迹可循。</p>
        <button @click="showTemplates = true">探索示例模板 <ArrowUpRight :size="14" /></button>
      </div>
      <div class="sidebar-bottom">
        <span class="vue-logo">V</span><span>为 Vue 3 而构建<small>开源组件 · v1.0.0</small></span
        ><button class="icon-button" aria-label="查看集成帮助" @click="showDocs = true">
          <CircleHelp :size="17" />
        </button>
      </div>
    </aside>

    <div class="main-shell">
      <header class="topbar">
        <div class="breadcrumb">
          <FolderOpen :size="16" /><span>工作空间</span><ChevronRight :size="13" /><strong
            >鱼骨图工作台</strong
          >
        </div>
        <div class="topbar-right">
          <span class="version-tag">v1.0.0</span
          ><button class="text-button" @click="showDocs = true">
            <BookOpen :size="16" />开发文档 <ArrowUpRight :size="13" />
          </button>
        </div>
      </header>
      <main>
        <section class="page-heading">
          <div>
            <div class="eyebrow"><span />让思考更有条理</div>
            <h1>鱼骨图工作台<span class="demo-tag">DEMO</span></h1>
            <p>将问题拆解为原因，让复杂关系一目了然。</p>
          </div>
          <div class="heading-actions">
            <button class="button secondary" @click="resetExample">
              <RotateCcw :size="15" />重置示例</button
            ><button class="button primary" @click="openExport">
              <ArrowDownToLine :size="16" />导出图片<ChevronDown :size="14" />
            </button>
          </div>
        </section>

        <section class="example-bar">
          <div class="example-icon"><Layers :size="18" /></div>
          <span class="example-label">当前示例</span
          ><label class="select-wrapper"
            ><select
              aria-label="选择示例"
              :value="selectedExample"
              @change="loadExample(Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="(example, i) in examples" :key="i" :value="i">
                {{ example.name }}
              </option></select
            ><ChevronDown :size="14" /></label
          ><span class="example-description">{{ examples[selectedExample]!.description }}</span
          ><button class="text-button" @click="showTemplates = true">
            全部示例<ArrowUpRight :size="14" />
          </button>
        </section>

        <div class="studio-grid">
          <section class="editor-panel card">
            <div class="panel-header">
              <div>
                <GitBranch :size="17" />
                <h2>树数据</h2>
                <span class="count-badge">{{ totalNodes }}</span>
              </div>
              <button
                class="icon-button"
                aria-label="下载树数据 JSON"
                title="下载树数据 JSON"
                @click="downloadData"
              >
                <ArrowDownToLine :size="16" />
              </button>
            </div>
            <div class="editor-tabs">
              <button :class="{ selected: editorTab === 'tree' }" @click="switchEditor('tree')">
                <GitBranch :size="14" />结构编辑</button
              ><button :class="{ selected: editorTab === 'json' }" @click="switchEditor('json')">
                <Code2 :size="14" />JSON 编辑
              </button>
            </div>
            <div v-if="editorTab === 'tree'" class="tree-content">
              <div class="editor-hint">点击名称编辑，悬停节点添加或删除</div>
              <TreeEditor
                :node="data"
                :path="[]"
                @rename="renameNode"
                @add="addNode"
                @remove="removeNode"
              /><button class="add-category" @click="addNode([])">
                <Plus :size="15" />添加原因分类
              </button>
            </div>
            <div v-else class="json-content">
              <textarea v-model="jsonText" aria-label="树数据 JSON" spellcheck="false" />
              <div v-if="jsonError" class="json-error" role="alert">{{ jsonError }}</div>
              <button class="button primary" @click="applyJson">
                <Check :size="15" />应用数据
              </button>
              <p>修改后点击应用，校验通过后更新图表。</p>
            </div>
            <div class="editor-footer">
              <span class="status-dot" />{{ saveStatus
              }}<span class="local-label">仅保存在此浏览器</span>
            </div>
          </section>

          <div class="visual-column">
            <section ref="preview" class="preview-panel card">
              <div class="preview-toolbar">
                <div class="preview-tabs">
                  <button
                    :class="{ selected: previewTab === 'diagram' }"
                    @click="previewTab = 'diagram'"
                  >
                    <GitBranch :size="15" />鱼骨图</button
                  ><button
                    :class="{ selected: previewTab === 'overview' }"
                    @click="previewTab = 'overview'"
                  >
                    <LayoutDashboard :size="15" />数据概览
                  </button>
                </div>
                <span class="live-badge"><span />实时预览</span>
              </div>
              <div v-show="previewTab === 'diagram'" class="diagram-viewport">
                <div class="diagram-scroll">
                  <div class="diagram-surface" :style="{ width: `${zoom}%`, minWidth: `${zoom}%` }">
                    <FishboneDiagram
                      ref="diagram"
                      :data="data"
                      :preset="preset"
                      :theme="custom"
                      @error="(error) => notify(error.message)"
                    />
                  </div>
                </div>
                <div class="canvas-caption">CAUSE & EFFECT DIAGRAM</div>
              </div>
              <div v-if="previewTab === 'overview'" class="overview">
                <div class="overview-heading">
                  <span>核心问题</span>
                  <h3>{{ data.label }}</h3>
                </div>
                <div class="overview-stats">
                  <div>
                    <strong>{{ categories.length }}</strong
                    ><span>原因分类</span>
                  </div>
                  <div>
                    <strong>{{ totalNodes }}</strong
                    ><span>全部节点</span>
                  </div>
                  <div>
                    <strong>{{ totalNodes - categories.length - 1 }}</strong
                    ><span>细分原因</span>
                  </div>
                </div>
                <div class="category-summary" v-for="(category, i) in categories" :key="i">
                  <span
                    :style="{
                      background: currentTheme.branchColors[i % currentTheme.branchColors.length]
                    }"
                  />{{ category.label }}<strong>{{ countNodes(category) - 1 }} 个原因</strong>
                </div>
                <p v-if="!categories.length">暂无分类，请在左侧添加原因分类。</p>
              </div>
              <div class="canvas-footer">
                <div class="canvas-info">
                  <span class="status-dot" />{{ categories.length }} 个分类<span class="divider-dot"
                    >·</span
                  >{{ totalNodes }} 个节点
                </div>
                <div class="zoom-controls">
                  <button
                    class="icon-button"
                    aria-label="缩小"
                    :disabled="zoom <= 50"
                    @click="zoom = Math.max(50, zoom - 25)"
                  >
                    <Minus :size="15" /></button
                  ><span>{{ zoom }}%</span
                  ><button
                    class="icon-button"
                    aria-label="放大"
                    :disabled="zoom >= 400"
                    @click="zoom = Math.min(400, zoom + 25)"
                  >
                    <Plus :size="15" /></button
                  ><i /><button
                    class="icon-button"
                    aria-label="适应画布"
                    title="适应画布"
                    @click="zoom = 100"
                  >
                    <ZoomIn :size="16" /></button
                  ><button
                    class="icon-button"
                    aria-label="全屏预览"
                    title="全屏预览"
                    @click="toggleFullscreen"
                  >
                    <Maximize2 :size="15" />
                  </button>
                </div>
              </div>
            </section>

            <section class="styles-panel card">
              <div class="panel-header">
                <div>
                  <SlidersHorizontal :size="17" />
                  <h2>图表样式</h2>
                  <span class="subtle-label">找到适合你的表达</span>
                </div>
                <button
                  class="text-button"
                  :class="{ 'custom-active': showCustom }"
                  @click="showCustom = !showCustom"
                >
                  <SlidersHorizontal :size="14" />自定义样式<ChevronDown
                    :size="14"
                    :class="{ rotated: showCustom }"
                  />
                </button>
              </div>
              <div class="theme-grid">
                <button
                  v-for="theme in themeList"
                  :key="theme.key"
                  class="theme-option"
                  :class="{ chosen: preset === theme.key }"
                  :aria-pressed="preset === theme.key"
                  @click="changeTheme(theme.key)"
                >
                  <div
                    class="theme-thumbnail"
                    :style="{ background: fishboneThemes[theme.key].background }"
                  >
                    <div
                      class="theme-miniature"
                      aria-hidden="true"
                      v-html="themePreviews[theme.key]"
                    />
                    <span v-if="preset === theme.key" class="theme-check"
                      ><Check :size="11"
                    /></span>
                  </div>
                  <strong>{{ theme.name }}</strong
                  ><span>{{ theme.description }}</span>
                </button>
              </div>
              <div class="appearance-settings">
                <div class="appearance-heading">
                  <Fish :size="15" /><strong>鱼骨造型</strong
                  ><span>每个部位，都可以有自己的表达</span>
                </div>
                <div class="appearance-grid">
                  <label v-for="field in appearanceFields" :key="field.key"
                    ><span>{{ field.title }}</span
                    ><select
                      :aria-label="field.title"
                      :value="currentTheme[field.key]"
                      @change="setCustom(field.key, ($event.target as HTMLSelectElement).value)"
                    >
                      <option
                        v-for="option in field.options"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select></label
                  >
                </div>
                <div class="appearance-note">
                  分类鱼鳍对应一级分类，原因节点对应分类下的第一层原因。造型会随图片一起导出。
                </div>
              </div>
              <div v-if="showCustom" class="custom-settings">
                <div class="custom-top">
                  <span
                    >在当前主题基础上调整
                    <small v-if="customCount">· 已修改 {{ customCount }} 项</small></span
                  ><button class="text-button" @click="custom = {}">恢复主题默认</button>
                </div>
                <div class="custom-fields">
                  <label
                    >画布背景<input
                      type="color"
                      aria-label="画布背景"
                      :value="currentTheme.background"
                      @input="
                        setCustom('background', ($event.target as HTMLInputElement).value)
                      " /></label
                  ><label
                    >主骨颜色<input
                      type="color"
                      aria-label="主骨颜色"
                      :value="currentTheme.spineColor"
                      @input="
                        setCustom('spineColor', ($event.target as HTMLInputElement).value)
                      " /></label
                  ><label
                    >文字颜色<input
                      type="color"
                      aria-label="文字颜色"
                      :value="currentTheme.textColor"
                      @input="
                        setCustom('textColor', ($event.target as HTMLInputElement).value)
                      " /></label
                  ><label
                    >字体大小 <span>{{ currentTheme.fontSize }} px</span
                    ><input
                      type="range"
                      aria-label="字体大小"
                      min="10"
                      max="24"
                      :value="currentTheme.fontSize"
                      @input="
                        setCustom('fontSize', Number(($event.target as HTMLInputElement).value))
                      " /></label
                  ><label
                    >线条粗细 <span>{{ currentTheme.lineWidth }} px</span
                    ><input
                      type="range"
                      aria-label="线条粗细"
                      min="1"
                      max="5"
                      step="0.5"
                      :value="currentTheme.lineWidth"
                      @input="
                        setCustom('lineWidth', Number(($event.target as HTMLInputElement).value))
                      " /></label
                  ><label
                    >节点圆角 <span>{{ currentTheme.nodeRadius }} px</span
                    ><input
                      type="range"
                      aria-label="节点圆角"
                      min="0"
                      max="24"
                      :value="currentTheme.nodeRadius"
                      @input="
                        setCustom('nodeRadius', Number(($event.target as HTMLInputElement).value))
                      "
                  /></label>
                </div>
                <div class="branch-colors">
                  <span>分支配色</span
                  ><input
                    v-for="(color, index) in currentTheme.branchColors"
                    :key="index"
                    type="color"
                    :aria-label="`分支颜色 ${index + 1}`"
                    :value="color"
                    @input="setBranchColor(index, ($event.target as HTMLInputElement).value)"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
        <footer class="page-footer">
          <span
            ><Fish :size="15" />Fishbone Studio
            <span class="divider-dot">/</span> 从原因，到答案。</span
          ><span
            >SVG 矢量渲染<span class="divider-dot">·</span>Vue 3 + TypeScript<span
              class="divider-dot"
              >·</span
            ><button @click="showDocs = true">组件集成指南<ArrowUpRight :size="12" /></button
          ></span>
        </footer>
      </main>
    </div>

    <div v-if="toast" class="toast" role="status"><Check :size="17" />{{ toast }}</div>
    <div v-if="showExport" class="modal-backdrop" @click.self="showExport = false">
      <section
        class="modal export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
      >
        <div class="modal-heading">
          <div>
            <div class="modal-icon"><ArrowDownToLine :size="22" /></div>
            <h2 id="export-title">导出你的鱼骨图</h2>
            <p>将想法带到文档、汇报和下一次讨论。</p>
          </div>
          <button class="icon-button" aria-label="关闭导出" @click="showExport = false">
            <X :size="19" />
          </button>
        </div>
        <label class="field-label"
          >文件名称<input
            v-model="filename"
            aria-label="文件名称"
            maxlength="100"
            placeholder="鱼骨图分析"
        /></label>
        <div class="field-label">图片格式</div>
        <div class="format-grid">
          <button
            v-for="f in ['png', 'jpeg', 'webp', 'svg'] as const"
            :key="f"
            :class="{ selected: format === f }"
            @click="format = f"
          >
            <strong>{{ f.toUpperCase() }}</strong
            ><span>{{
              { png: '无损高清', jpeg: '通用照片', webp: '体积更小', svg: '矢量图形' }[f]
            }}</span
            ><Check v-if="format === f" :size="13" />
          </button>
        </div>
        <label v-if="format !== 'svg'" class="field-label"
          >导出倍率<select v-model.number="exportScale" aria-label="导出倍率">
            <option :value="1">1× · 标准清晰度</option>
            <option :value="2">2× · 高清（推荐）</option>
            <option :value="3">3× · 超高清</option>
            <option :value="4">4× · 精细输出</option>
          </select></label
        ><label v-if="format === 'jpeg' || format === 'webp'" class="field-label"
          >图片质量 · {{ Math.round(quality * 100) }}%<input
            v-model.number="quality"
            aria-label="图片质量"
            type="range"
            min="0.2"
            max="1"
            step="0.01"
        /></label>
        <p class="export-note">
          <Sparkles :size="14" />{{
            format === 'svg'
              ? '矢量格式可无限放大，适合设计与印刷。'
              : '图片将包含完整图表，画布缩放不会影响导出。'
          }}
        </p>
        <button class="button primary export-confirm" :disabled="exporting" @click="download">
          <ArrowDownToLine :size="16" />{{
            exporting ? '正在生成图片…' : `下载 ${format.toUpperCase()} 图片`
          }}
        </button>
      </section>
    </div>
    <div v-if="showTemplates" class="modal-backdrop" @click.self="showTemplates = false">
      <section
        class="modal templates-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="templates-title"
      >
        <div class="modal-heading">
          <div>
            <h2 id="templates-title">从一个好例子开始</h2>
            <p>选择示例后，可以自由编辑每个节点。</p>
          </div>
          <button class="icon-button" aria-label="关闭模板" @click="showTemplates = false">
            <X :size="19" />
          </button>
        </div>
        <button
          v-for="(example, index) in examples"
          :key="index"
          class="template-item"
          @click="loadExample(index)"
        >
          <span class="template-icon"><Layers :size="22" /></span
          ><span
            ><strong>{{ example.name }}</strong
            ><small>{{ example.description }}</small
            ><em
              >{{ example.data.children?.length }} 个分类 ·
              {{ countNodes(example.data) }} 个节点</em
            ></span
          ><ArrowUpRight :size="18" />
        </button>
      </section>
    </div>
    <div v-if="showDocs" class="modal-backdrop" @click.self="showDocs = false">
      <section
        class="modal docs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="docs-title"
      >
        <div class="modal-heading">
          <div>
            <h2 id="docs-title">在 Vue 中，几行代码即可开始。</h2>
            <p>组件支持按需导入或通过 app.use() 全局注册。</p>
          </div>
          <button class="icon-button" aria-label="关闭指南" @click="showDocs = false">
            <X :size="19" />
          </button>
        </div>
        <div class="docs-package">
          <Code2 :size="16" /><code>@fishbone/vue</code><span>Vue 3.5+ · TypeScript</span>
        </div>
        <pre><code>{{ integrationCode }}</code></pre>
        <div class="docs-bottom">
          <p>
            支持 ocean / classic / forest / sunset / midnight 主题。<br />theme
            属性可覆盖颜色、字体、线宽与圆角。
          </p>
          <button class="button primary" @click="copyCode">复制集成代码</button>
        </div>
      </section>
    </div>
  </div>
</template>
