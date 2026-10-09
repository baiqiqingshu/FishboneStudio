# @fishbone/vue

Vue 3 鱼骨图组件，支持嵌套树数据、五套内置主题、自定义样式和 PNG / JPEG / WebP / SVG 导出。

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

Ref：`getSvg(): string`、`exportImage(options): Promise<Blob>`、`download(options): Promise<void>`。

导出选项：`format: 'png' | 'jpeg' | 'webp' | 'svg'`（默认 png）、`scale: 0.1–4`（默认 2）、`quality: 0–1`（默认 0.92）、`filename`、`background`。

事件：`error(Error)`、`exported(Blob)`（调用 exportImage 成功后）。

也提供不依赖 DOM 的 `renderFishboneSvg(data, preset?, theme?)` 纯渲染函数，用于服务端；浏览器可用 `exportSvgImage` / `downloadSvgImage` 对生成的 SVG 做导出。

数据节点 `{ id?: string, label: string, children?: FishboneNode[] }`。最多 500 节点、12 层、每个标签 120 字符。CSS 颜色、字体族、字体大小、线宽、圆角、分支色均可覆盖。位图最大 32M 像素，超大图使用 SVG。

MIT License。
