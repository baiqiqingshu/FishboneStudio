<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
const props = defineProps<{ modelValue: string; label: string; allowTransparent?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const root = ref<HTMLElement | null>(null),
  open = ref(false),
  draft = ref(props.modelValue)
const id = useId()
const error = ref(''),
  lastSolid = ref(
    props.modelValue === 'transparent' || props.modelValue === 'none' ? '#ffffff' : props.modelValue
  )
const transparent = computed(() => ['transparent', 'none'].includes(props.modelValue.toLowerCase()))
const pickerColor = computed(() => {
  const value = props.modelValue
  if (/^#[0-9a-f]{6}$/i.test(value)) return value
  if (/^#[0-9a-f]{3}$/i.test(value))
    return (
      '#' +
      value
        .slice(1)
        .split('')
        .map((char) => char + char)
        .join('')
    )
  return '#ffffff'
})
const colors = [
  ['薄荷', '#148b78'],
  ['松绿', '#35785b'],
  ['湖蓝', '#25869b'],
  ['雾蓝', '#6695e8'],
  ['靛蓝', '#5363ac'],
  ['薰衣草', '#a68bd2'],
  ['莓紫', '#a35d8f'],
  ['珊瑚', '#db7961'],
  ['玫瑰', '#ce718b'],
  ['琥珀', '#d7a044'],
  ['浅薄荷', '#eefaf5'],
  ['浅青', '#e5f3f4'],
  ['浅蓝', '#edf3ff'],
  ['浅紫', '#f2edfa'],
  ['浅粉', '#fff0f3'],
  ['浅杏', '#fff2e8'],
  ['奶油', '#fff7e6'],
  ['浅橄榄', '#f1f7ed'],
  ['雾灰', '#f1f5f9'],
  ['白色', '#ffffff'],
  ['墨绿', '#246f65'],
  ['深海', '#245367'],
  ['午夜', '#18212e'],
  ['石墨', '#334155'],
  ['岩灰', '#64748b'],
  ['灰蓝', '#94a3b8'],
  ['玉石', '#a3d5cb'],
  ['沙金', '#e3bd72'],
  ['柔紫', '#c4b5fd'],
  ['深褐', '#886225']
]
watch(
  () => props.modelValue,
  (value) => {
    draft.value = value
    error.value = ''
    if (!['transparent', 'none'].includes(value.toLowerCase())) lastSolid.value = value
  }
)
function valid(value: string) {
  return (
    value.trim() !== '' &&
    CSS.supports('color', value) &&
    !['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'currentcolor'].includes(
      value.toLowerCase()
    ) &&
    (props.allowTransparent || !['transparent', 'none'].includes(value.toLowerCase()))
  )
}
function input(value: string) {
  draft.value = value
  error.value = ''
  if (valid(value.trim())) emit('update:modelValue', value.trim())
}
function commit() {
  if (valid(draft.value.trim())) emit('update:modelValue', draft.value.trim())
  else error.value = '请输入有效色值，如 #148b78、rgb() 或颜色名称'
}
function choose(value: string) {
  draft.value = value
  error.value = ''
  emit('update:modelValue', value)
  open.value = false
}
function outside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
</script>
<template>
  <div ref="root" class="color-entry" @keydown.esc="open = false">
    <label :for="id" class="color-label">{{ label }}</label>
    <div class="color-control">
      <span
        class="color-sample"
        :class="{ 'is-transparent': transparent }"
        :style="transparent ? {} : { background: modelValue }"
      >
        <input
          type="color"
          :aria-label="`${label}调色盘`"
          :value="pickerColor"
          @input="choose(($event.target as HTMLInputElement).value)"
        />
      </span>
      <input
        :id="id"
        class="color-value"
        type="text"
        :aria-label="label"
        :value="draft"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
        placeholder="#148b78"
        spellcheck="false"
        @input="input(($event.target as HTMLInputElement).value)"
        @blur="commit"
        @keydown.enter="commit"
      />
      <button
        class="palette-trigger"
        :aria-label="`${label}预设色板`"
        :aria-expanded="open"
        @click="open = !open"
      >
        色板
      </button>
    </div>
    <button
      v-if="allowTransparent"
      class="transparent-toggle"
      :aria-label="`${label}无背景色`"
      :aria-pressed="transparent"
      @click="choose(transparent ? lastSolid : 'transparent')"
    >
      <span class="checker-chip" />{{ transparent ? '无背景 · 已启用' : '无背景色' }}
    </button>
    <small v-if="error" :id="`${id}-error`" class="color-error">{{ error }}</small>
    <div v-if="open" class="color-palette" role="group" :aria-label="`${label}预设颜色`">
      <div class="palette-heading">精选配色 <span>点击应用，也可粘贴色值</span></div>
      <div class="palette-swatches">
        <button
          v-for="[name, value] in colors"
          :key="value"
          :style="{ background: value }"
          :title="`${name} ${value}`"
          :aria-label="`${label} ${name} ${value}`"
          :aria-pressed="modelValue.toLowerCase() === value"
          @click="choose(value)"
        >
          <span v-if="modelValue.toLowerCase() === value">✓</span>
        </button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.color-entry {
  position: relative;
  min-width: 0;
  color: #8090a1;
  font-size: 10px;
}
.color-entry .color-label {
  display: block;
  margin-bottom: 8px;
  font-size: 10px;
  color: #8090a1;
}
.color-control {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 7px;
  min-height: 34px;
  border: 1px solid #dbe5eb;
  background: #fff;
  border-radius: 6px;
}
.color-control:focus-within {
  border-color: #83baad;
  box-shadow: 0 0 0 2px #eef8f5;
}
.color-sample {
  position: relative;
  flex: 0 0 21px;
  height: 21px;
  border: 1px solid #00000014;
  border-radius: 4px;
  overflow: hidden;
}
.color-sample input[type='color'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  margin: 0;
}
.color-control .color-value {
  width: 0;
  min-width: 0;
  flex: 1;
  padding: 2px 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #526477;
  font:
    11px/1.4 Consolas,
    monospace;
}
.palette-trigger {
  font-size: 9px;
  color: #148b78;
  padding: 3px 0;
  flex-shrink: 0;
}
.transparent-toggle {
  margin-top: 7px;
  font-size: 10px;
  color: #8796a3;
  display: flex;
  align-items: center;
  gap: 5px;
}
.transparent-toggle[aria-pressed='true'] {
  color: #148b78;
}
.is-transparent,
.checker-chip {
  background: repeating-conic-gradient(#dce3e8 0% 25%, #fff 0% 50%) 0 / 8px 8px;
}
.checker-chip {
  width: 12px;
  height: 12px;
  border: 1px solid #dbe5eb;
  border-radius: 2px;
}
.color-error {
  display: block;
  color: #b42318;
  margin-top: 5px;
  line-height: 1.5;
}
.color-palette {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 5px;
  width: 100%;
  padding: 11px;
  border: 1px solid #dfe8ed;
  border-radius: 9px;
  box-shadow: 0 10px 35px #1f3b4b24;
  background: #fff;
  z-index: 30;
}
.palette-heading {
  font-size: 11px;
  font-weight: 600;
  color: #526477;
  margin-bottom: 11px;
}
.palette-heading span {
  display: block;
  margin-top: 4px;
  font-size: 9px;
  font-weight: 400;
  color: #8a9eaf;
}
.palette-swatches {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}
.palette-swatches button {
  height: 20px;
  border-radius: 4px;
  border: 1px solid #00000012;
  display: grid;
  place-items: center;
  font-size: 10px;
}
.palette-swatches button:hover,
.palette-swatches button:focus-visible {
  outline: 2px solid #148b78;
  outline-offset: 2px;
}
.palette-swatches span {
  color: #fff;
  text-shadow:
    0 0 3px #18212e,
    0 0 3px #18212e;
}
</style>
