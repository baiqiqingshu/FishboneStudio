<script setup lang="ts">
import { computed, watch } from 'vue'
import { renderFlowchartSvg } from './flowchart/svg'
import { exportSvgImage, downloadSvgImage } from './export'
import type { ExportOptions } from './types'
import type {
  FlowchartData,
  FlowchartPreset,
  FlowchartThemeOverrides,
  FlowchartLayoutOptions,
  FlowchartHandle
} from './flowchart/types'
const props = withDefaults(
  defineProps<{
    data: FlowchartData
    preset?: FlowchartPreset
    theme?: FlowchartThemeOverrides
    options?: Partial<FlowchartLayoutOptions>
  }>(),
  { preset: 'ocean', theme: () => ({}), options: () => ({}) }
)
const emit = defineEmits<{ error: [error: Error]; exported: [blob: Blob] }>()
const result = computed(() => {
  try {
    return {
      svg: renderFlowchartSvg(props.data, props.preset, props.theme, props.options),
      error: null
    }
  } catch (error) {
    return { svg: '', error: error instanceof Error ? error : new Error(String(error)) }
  }
})
watch(
  () => result.value.error,
  (error) => {
    if (error) emit('error', error)
  },
  { immediate: true }
)
function getSvg() {
  if (result.value.error) throw result.value.error
  return result.value.svg
}
async function exportImage(options?: ExportOptions) {
  try {
    const blob = await exportSvgImage(getSvg(), options)
    emit('exported', blob)
    return blob
  } catch (error) {
    emit('error', error as Error)
    throw error
  }
}
async function download(options?: ExportOptions) {
  try {
    await downloadSvgImage(getSvg(), { filename: 'flowchart', ...options })
  } catch (error) {
    emit('error', error as Error)
    throw error
  }
}
defineExpose<FlowchartHandle>({ getSvg, exportImage, download })
</script>
<template>
  <div class="flowchart-diagram">
    <div v-if="result.error" role="alert" style="padding: 24px; color: #b42318">
      {{ result.error.message }}
    </div>
    <div v-else v-html="result.svg" />
  </div>
</template>
