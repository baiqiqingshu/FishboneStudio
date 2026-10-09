# @fishbone/vue

Vue 3 鱼骨图组件，支持嵌套树数据、五套内置主题、自定义样式和 PNG / JPEG / WebP / SVG 导出。

v1.1 同时提供 `FlowchartDiagram`，支持活动 / 判断、区域分组、正交箭头连线、按连接优化的自动布局与多列分拆。输入格式为 `{ version: 1, nodes, regions?, edges }`。完整数据接口文档见仓库 `docs/flowchart-data.md`，包内 `schema/flowchart.schema.json` 提供 JSON Schema，可通过 `@fishbone/vue/schema` 访问。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { FlowchartDiagram } from '@fishbone/vue'
import type { FlowchartData, FlowchartHandle } from '@fishbone/vue'
const chart = ref<FlowchartHandle | null>(null)
const flowData: FlowchartData = {
  version: 1,
  regions: [{ id: 'team', label: '处理区域', description: '业务办理' }],
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
    { source: 'check', target: 'task', label: '否', sourcePort: 'right', targetPort: 'right' }
  ]
}
</script>
<template>
  <FlowchartDiagram
    ref="chart"
    :data="flowData"
    preset="ocean"
    :options="{ maxNodesPerColumn: 5, terminalPlacement: 'aligned' }"
    :theme="{ fontFamily: 'Arial, Microsoft YaHei, sans-serif', activity: { fill: '#eefaf5' } }"
  />
  <button @click="chart?.download({ format: 'png', scale: 2 })">下载流程图</button>
</template>
```

流程图 Ref 同样提供 getSvg / exportImage / download；支持 `renderFlowchartSvg` 和 `layoutFlowchart` 纯函数及 Vue SSR。全局安装会注册两种组件。

流程图 `options` 可设置 `showTitle`（默认 false）、`maxNodeWidth`（默认 360）、`maxNodeHeight`（默认 320）、`regionGap`（默认 56）。图形尺寸超过上限时，文字先缩小再省略；全文保留在节点提示中。无背景使用 `theme.background: 'transparent'`。

```vue
<script setup>
import { ref } from 'vue'
import { FishboneDiagram } from '@fishbone/vue'
const diagram = ref(null)
const data = {
  label: '项目延期',
  children: [
    { label: '需求', children: [{ label: '变更频繁' }] },
    { label: '资源', children: [{ label: '人力不足' }] }
  ]
}
</script>
<template>
  <FishboneDiagram ref="diagram" :data="data" preset="ocean" :theme="{ fontSize: 16 }" />
  <button @click="diagram.download({ format: 'png', scale: 2 })">下载</button>
</template>
```

Vue >= 3.5；无需引入 CSS。支持 ESM、CommonJS 和 TypeScript 声明。

Props：`data: FishboneNode`、`preset: 'ocean' | 'classic' | 'forest' | 'sunset' | 'midnight'`、`theme: Partial<FishboneTheme>`。

`theme` 可独立覆盖六项 SVG 造型：

- `headStyle`: `fish` / `slim` / `shark` / `roundfish` / `carp` / `sunfish` / `triangle` / `rounded` / `label`
- `tailStyle`: `fork` / `fan` / `crescent` / `chevron`
- `spineStyle`: `tapered` / `vertebrae` / `double` / `line`
- `boneStyle`: `curved` / `tapered` / `jointed` / `straight`
- `categoryStyle`: `fin` / `pill` / `ribbon` / `outline`（一级分类）
- `causeStyle`: `dot` / `card` / `underline`（分类下第一层原因）

造型可任意组合，随 PNG / JPEG / WebP / SVG 一起导出。`FishboneAppearance` 类型和 `fishboneAppearanceOptions` 可供外部界面集成使用。

鱼头以浅色填充和细描边协调分支配色；`slim` 保留细长风格，`roundfish` / `carp` / `sunfish` / `triangle` 提供较高的大面积轮廓。眼睛使用小圆点，鱼鳃使用轻淡曲线；开口类型的嘴部融入轮廓。可通过 `headBackground` / `headTextColor` 调整鱼头和文字配色。

Ref：`getSvg(): string`、`exportImage(options): Promise<Blob>`、`download(options): Promise<void>`。

导出选项：`format: 'png' | 'jpeg' | 'webp' | 'svg'`（默认 png）、`scale: 0.1–4`（默认 2）、`quality: 0–1`（默认 0.92）、`filename`、`background`。

事件：`error(Error)`、`exported(Blob)`（调用 exportImage 成功后）。

也提供不依赖 DOM 的 `renderFishboneSvg(data, preset?, theme?)` 纯渲染函数，用于服务端；浏览器可用 `exportSvgImage` / `downloadSvgImage` 对生成的 SVG 做导出。

数据节点 `{ id?: string, label: string, children?: FishboneNode[] }`。最多 500 节点、12 层、每个标签 120 字符。CSS 颜色、字体族、字体大小、线宽、圆角、分支色均可覆盖。位图最大 32M 像素，超大图使用 SVG。

MIT License。
