import type { App } from 'vue'
import FishboneDiagram from './FishboneDiagram.vue'
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
  }
}
