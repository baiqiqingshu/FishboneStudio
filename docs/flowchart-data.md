# 流程图数据接口 v1

`FlowchartDiagram` 接收描述业务关系的数据，坐标由组件计算。可直接在 Demo 的「JSON 编辑」中使用以下格式。

```json
{
  "version": 1,
  "title": "任务审核流程",
  "regions": [{ "id": "team", "label": "业务处理", "description": "区域说明文字" }],
  "nodes": [
    { "id": "start", "type": "start", "label": "开始" },
    { "id": "task", "type": "activity", "label": "处理任务", "regionId": "team" },
    { "id": "check", "type": "decision", "label": "通过？", "regionId": "team" },
    { "id": "end", "type": "end", "label": "结束" }
  ],
  "edges": [
    { "source": "start", "target": "task" },
    { "source": "task", "target": "check" },
    { "source": "check", "target": "end", "label": "是" },
    {
      "source": "check",
      "target": "task",
      "label": "否",
      "sourcePort": "right",
      "targetPort": "right",
      "style": { "dashed": true }
    }
  ]
}
```

## 数据字段

| 字段      | 必需 | 说明                                                               |
| --------- | ---- | ------------------------------------------------------------------ |
| `version` | 是   | 固定为 `1`，用于将来的数据兼容                                     |
| `title`   | 否   | 流程名称；默认仅作为无障碍描述，`showTitle: true` 时显示于图片顶部 |
| `nodes`   | 是   | 节点数组，最多 200 个；可为空                                      |
| `regions` | 否   | 区域数组，最多 30 个；数组顺序决定横向区域顺序                     |
| `edges`   | 是   | 连接数组，最多 400 条；可为空                                      |

### 节点

| 字段       | 必需 | 说明                                                       |
| ---------- | ---- | ---------------------------------------------------------- |
| `id`       | 是   | 在 nodes 中唯一的非空字符串，最多 100 字符                 |
| `label`    | 是   | 显示文字，1–120 个 Unicode 字符，自动换行                  |
| `type`     | 是   | `activity` 活动、`decision` 判断、`start` 开始、`end` 结束 |
| `regionId` | 否   | 所属区域的 ID。活动和判断可设置；不设置则进入未分组列      |
| `shape`    | 否   | 仅 activity 使用：`rectangle`（默认）或 `ellipse`          |
| `order`    | 否   | 同区域的初始排序偏好；有限数值，越小优先                   |
| `style`    | 否   | 覆盖该节点的图形和文字样式                                 |

开始与结束为全局节点，最多各一个，不设置 regionId；可省略。判断固定为菱形，起止固定为胶囊形。支持同一个区域中的多个判断、多个活动及循环流程。

### 区域

`{ id, label, description?, style? }`：ID 在 regions 中唯一；label 为区域标题；description 为区域标注，最多 120 字符；style 可独立调整色块、边框、标题及说明文字颜色。空区域仍会显示。

### 连接

`{ id?, source, target, label?, sourcePort?, targetPort?, style? }`

- source / target 引用节点 ID；拒绝悬空引用。
- label 为连线标注，如「是」「否」「退回补充」，最多 120 字符。
- sourcePort / targetPort：`auto`（默认）、`top`、`right`、`bottom`、`left`。可控制上方连线、菱形分支方向、回流连接。
- 连线默认带箭头，以正交折线绕开节点及区域标题；支持回流、自环和多个节点共用目标。
- 同一组 source / target 可有多条连接，使用不同端口和标注区分。
- 自环默认选择不同出入口；手动设置时也需要使用不同端口。
- style 支持 stroke、textColor、lineWidth、dashed、arrow。arrow 默认 true。

## Vue 接入

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { FlowchartDiagram } from '@ui-studio/fishbone'
import type { FlowchartData, FlowchartHandle } from '@ui-studio/fishbone'

const chart = ref<FlowchartHandle | null>(null)
const data: FlowchartData = {
  version: 1,
  nodes: [{ id: 'task', type: 'activity', label: '处理任务' }],
  edges: []
}
</script>

<template>
  <FlowchartDiagram
    ref="chart"
    :data="data"
    preset="ocean"
    :options="{ maxNodesPerColumn: 5, terminalPlacement: 'aligned' }"
    :theme="{ fontFamily: 'Arial, Microsoft YaHei, sans-serif', decision: { fill: '#fff7e6' } }"
  />
  <button @click="chart?.download({ format: 'png', scale: 2 })">下载</button>
</template>
```

也可 `app.use(FishbonePlugin)` 全局注册两种图表。组件不需要额外引入 CSS。

## 自动布局参数

参数通过 `options: Partial<FlowchartLayoutOptions>` 传入，默认配置可从 `defaultFlowchartOptions` 获取。

| 参数                | 默认    | 范围 / 说明                                                                         |
| ------------------- | ------- | ----------------------------------------------------------------------------------- |
| `maxNodesPerColumn` | 5       | 1–20 整数；每列最大节点数                                                           |
| `balanceRegions`    | true    | 参考其他区域节点数量，将明显较长的区域适当分列                                      |
| `optimizeAlignment` | true    | 根据跨列连接优化行位置，优先使直接连接的节点同行                                    |
| `terminalPlacement` | aligned | aligned：开始置顶、结束置底、纵向对齐；left：共用左侧轴线；auto：按普通节点纳入布局 |
| `nodeWidth`         | 220     | 160–360 像素                                                                        |
| `showTitle`         | false   | 是否显示图表标题；隐藏时不占用顶部空间，预览与导出保持一致                          |
| `maxNodeWidth`      | 360     | 120–600 像素；所有图形的最大宽度，实际宽度取 `nodeWidth` 与此值的较小值             |
| `maxNodeHeight`     | 320     | 64–600 像素；所有图形的最大高度，包括起止、判断与椭圆                               |
| `columnGap`         | 64      | 48–200 像素，同区域列间距                                                           |
| `rowGap`            | 54      | 48–200 像素，节点行间距                                                             |
| `regionGap`         | 56      | 48–200 像素，区域间距                                                               |
| `padding`           | 40      | 32–120 像素                                                                         |

区域横向排列，区域内以连接的拓扑顺序竖向布局；环内保留稳定输入顺序。超过容量后采用折返分列，连续流程在列边界优先同行。之后使用连接代价优化行位置，并在节点周边通道中寻找带折弯代价的避障路径。

行对齐是启发式优化：节点占位、分支、回流及区域顺序可能冲突，不保证所有直接连接都同行，也不保证所有连线零交叉。对于密集流程可调整端口、间距和每列容量。

布局间距为下限，较长的连线标注会自动增加行距 / 列距以留出文字空间；极密集的标注仍可能需要缩短文字或进一步增大间距。

尺寸上限以 SVG 像素为单位，预览缩放和位图导出倍率不改变布局尺寸。文字先换行，超过高度上限时逐步缩小字号（最低 10 px）；仍无法完整容纳时显示省略号。完整节点文字保留在 SVG `<title>` 中，可悬停查看。标题开关、尺寸上限和区域间距均可在 Demo 自动布局面板调整。

## 自定义样式与字体

`preset` 支持 ocean / classic / forest / sunset / midnight，`theme` 可深度覆盖其分类样式。

```ts
const theme = {
  background: '#ffffff',
  fontFamily: 'Georgia, SimSun, serif',
  fontSize: 16,
  activity: { fill: '#eefaf5', stroke: '#6ca990', textColor: '#315f4d', radius: 12 },
  decision: { fill: '#fff1d8', textColor: '#8d6427', fontWeight: 700, fontSize: 18 },
  start: { fill: '#148b78', textColor: '#ffffff' },
  end: { fill: '#eef2f7', textColor: '#536579' },
  region: { fill: '#f5f8fa', stroke: '#dbe5eb', titleColor: '#5b7182', textColor: '#8495a4' },
  edge: { stroke: '#8298aa', textColor: '#647c8e', lineWidth: 1.8, arrow: true }
}
```

活动 / 判断 / 起止支持 fill、stroke、textColor、fontFamily、fontSize（10–32）、fontWeight（100–900）、lineWidth（0.5–8）、radius（0–40）。菱形及起止形状保持语义，radius 主要用于方形活动。字号变化会重新计算尺寸、换行及布局。

优先级：**单个对象的 style > theme 对应分类设置 > 全局字体 > 内置主题**。全局 fontSize 用于节点，全局 fontFamily 同时用于区域和连线文字。设置 `background: 'transparent'` 可导出透明 PNG / WebP / SVG；JPEG 自动垫白。字体依赖运行设备，不嵌入字体。

Demo 的颜色控件支持直接粘贴 HEX / RGB / HSL / CSS 颜色名称、系统调色盘与 30 种预设色；背景可一键设为「无背景色」。棋盘格仅用于演示透明区域，不会进入导出的图片。

## 图片导出与 SSR

Ref 方法同鱼骨图：`getSvg()`、`exportImage(options): Promise<Blob>`、`download(options): Promise<void>`，支持 png / jpeg / webp / svg。scale 为 0.1–4，quality 为 0–1，filename 默认为 flowchart。`error(Error)` 报告错误；`exported(Blob)` 在 exportImage 成功后触发。

```ts
import {
  renderFlowchartSvg,
  layoutFlowchart,
  validateFlowchart,
  exportSvgImage
} from '@ui-studio/fishbone'
validateFlowchart(data)
const svg = renderFlowchartSvg(data, 'ocean', theme, { maxNodesPerColumn: 4 })
const geometry = layoutFlowchart(data) // 节点、区域、连线路径坐标
const blob = await exportSvgImage(svg, { format: 'webp' }) // 浏览器端
```

布局和 SVG 渲染为不依赖 DOM 的纯函数，Vue SSR 可用。位图导出依赖 Canvas，最大单边 16,384 像素、总像素 32M，大图建议导出 SVG。结构校验失败不生成图片；Demo 错误 JSON 不覆盖当前数据。

可机读格式：[flowchart.schema.json](../packages/fishbone/schema/flowchart.schema.json)。JSON Schema 描述字段类型，节点 ID 唯一、引用完整、起止唯一等跨字段规则由 `validateFlowchart()` 检查。
