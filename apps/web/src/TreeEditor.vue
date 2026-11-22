<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, ChevronRight, Plus, X } from '@lucide/vue'
import type { FishboneNode } from '@ui-studio/fishbone'
defineOptions({ name: 'TreeEditor' })
defineProps<{ node: FishboneNode; path: number[]; depth?: number }>()
const emit = defineEmits<{
  rename: [path: number[], label: string]
  add: [path: number[]]
  remove: [path: number[]]
}>()
const expanded = ref(true)
</script>
<template>
  <div class="tree-node">
    <div
      class="tree-row"
      :class="{ 'category-row': path.length === 1, 'root-row': path.length === 0 }"
      :style="{ paddingLeft: `${10 + (depth ?? 0) * 16}px` }"
    >
      <button
        v-if="node.children?.length"
        class="icon-button collapse-button"
        :aria-label="`${expanded ? '折叠' : '展开'} ${node.label}`"
        @click="expanded = !expanded"
      >
        <ChevronDown v-if="expanded" :size="13" /><ChevronRight v-else :size="13" />
      </button>
      <span v-else class="node-dot" />
      <input
        :value="node.label"
        :aria-label="`节点名称 ${node.label}`"
        maxlength="120"
        @change="emit('rename', path, ($event.target as HTMLInputElement).value)"
      />
      <div class="tree-actions">
        <button
          class="icon-button"
          :aria-label="`添加子节点 ${node.label}`"
          @click="emit('add', path)"
        >
          <Plus :size="13" /></button
        ><button
          v-if="path.length"
          class="icon-button delete-button"
          :aria-label="`删除节点 ${node.label}`"
          @click="emit('remove', path)"
        >
          <X :size="12" />
        </button>
      </div>
    </div>
    <template v-if="expanded"
      ><TreeEditor
        v-for="(child, i) in node.children"
        :key="i"
        :node="child"
        :path="[...path, i]"
        :depth="(depth ?? 0) + 1"
        @rename="(p, l) => emit('rename', p, l)"
        @add="(p) => emit('add', p)"
        @remove="(p) => emit('remove', p)"
    /></template>
  </div>
</template>
