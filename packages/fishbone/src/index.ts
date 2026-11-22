import type { App } from 'vue'
import FishboneDiagram from './FishboneDiagram.vue'
import FlowchartDiagram from './FlowchartDiagram.vue'
export { FlowchartDiagram }
export { layoutFlowchart } from './flowchart/layout'
export { renderFlowchartSvg } from './flowchart/svg'
export { validateFlowchart, FLOWCHART_LIMITS } from './flowchart/validate'
export {
  flowchartThemes,
  resolveFlowchartTheme,
  defaultFlowchartOptions,
  resolveFlowchartOptions
} from './flowchart/themes'
export type * from './flowchart/types'
export { FishboneDiagram }
export { fishboneThemes, resolveTheme } from './themes'
export { fishboneAppearanceOptions } from './appearance'
export { validateTree, countNodes, TREE_LIMITS } from './tree'
export { layoutFishbone } from './layout'
export { renderFishboneSvg } from './svg'
export { exportSvgImage, downloadSvgImage } from './export'
export type * from './types'
export default {
  install(app: App) {
    app.component('FishboneDiagram', FishboneDiagram)
    app.component('FlowchartDiagram', FlowchartDiagram)
  }
}
