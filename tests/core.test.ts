import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FishboneDiagram from '../packages/vue/src/FishboneDiagram.vue'
import { validateTree, TREE_LIMITS } from '../packages/vue/src/tree'
import { layoutFishbone, wrapLabel, textWidth } from '../packages/vue/src/layout'
import { renderFishboneSvg } from '../packages/vue/src/svg'
import { fishboneThemes, resolveTheme } from '../packages/vue/src/themes'
import { exportSvgImage } from '../packages/vue/src/export'
import { fishboneAppearanceOptions, bonePoint } from '../packages/vue/src/appearance'
import type { FishboneNode, FishbonePreset, FishboneAppearance } from '../packages/vue/src/types'

const data: FishboneNode = {
  label: '项目延期',
  children: [
    {
      label: '需求',
      children: [
        { label: '需求变更', children: [{ label: '缺少评估' }, { label: '缺少验收标准' }] },
        { label: '优先级不明' }
      ]
    },
    { label: '资源', children: [{ label: '人力不足' }] },
    { label: '技术', children: [{ label: '外部接口不稳定' }] }
  ]
}

describe('tree validation', () => {
  it('accepts root-only and nested trees', () => {
    expect(() => validateTree(data)).not.toThrow()
    expect(() => validateTree({ label: '问题' })).not.toThrow()
  })
  it.each([
    null,
    [],
    { label: '' },
    { label: '问题', children: {} },
    { label: '问题', children: [{ label: 3 }] },
    { label: 'x'.repeat(121) }
  ])('rejects malformed input %j', (value) => {
    expect(() => validateTree(value)).toThrow()
  })
  it('rejects cycles and shared node references', () => {
    const root: FishboneNode = { label: 'cycle', children: [] }
    root.children!.push(root)
    expect(() => validateTree(root)).toThrow(/循环/)
    const child = { label: 'shared' }
    expect(() => validateTree({ label: 'root', children: [child, child] })).toThrow(/重复/)
  })
  it('enforces depth and node limits', () => {
    const root: FishboneNode = { label: 'root' }
    let cursor = root
    for (let i = 0; i < TREE_LIMITS.depth; i++) {
      cursor.children = [{ label: 'next' }]
      cursor = cursor.children[0]!
    }
    expect(() => validateTree(root)).toThrow(/层/)
    expect(() =>
      validateTree({
        label: 'root',
        children: Array.from({ length: 500 }, () => ({ label: 'child' }))
      })
    ).toThrow(/500/)
  })
})

describe('layout and serialization', () => {
  it('renders every nested label exactly once', () => {
    const layout = layoutFishbone(data)
    expect(layout.labels.map((label) => label.lines.join(''))).toEqual(
      expect.arrayContaining(['项目延期', '缺少评估', '缺少验收标准', '资源'])
    )
    expect(layout.labels).toHaveLength(10)
    expect(layout.boxes).toHaveLength(4)
    for (const line of layout.lines)
      for (const coordinate of [line.x1, line.x2, line.y1, line.y2])
        expect(Number.isFinite(coordinate)).toBe(true)
  })
  it('wraps CJK, emoji, and long labels without dropping characters', () => {
    const label = '长文本🦴测试中文与English'.repeat(5)
    const lines = wrapLabel(label, 210, 18)
    expect(lines.join('')).toBe(label)
    expect(lines.every((line) => textWidth(line, 18) <= 210)).toBe(true)
  })
  it('keeps long titles and tall root inside the canvas at maximum font size', () => {
    const layout = layoutFishbone(
      {
        label: '长'.repeat(120),
        children: [{ label: '分'.repeat(120) }, { label: '类'.repeat(120) }]
      },
      'ocean',
      { fontSize: 40 }
    )
    for (const box of layout.boxes) {
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(layout.height)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(layout.width)
    }
  })
  it.each(Object.keys(fishboneThemes) as FishbonePreset[])(
    'renders standalone XML for theme %s',
    (preset) => {
      const svg = renderFishboneSvg(data, preset)
      const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
      expect(document.querySelector('parsererror')).toBeNull()
      expect(document.documentElement.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg')
      expect(document.querySelector('[data-background]')?.getAttribute('fill')).toBe(
        fishboneThemes[preset].background
      )
    }
  )
  it('escapes labels and custom attributes to prevent SVG injection', () => {
    const label = '<script>alert("x")</script> & <image onerror="x">'
    const svg = renderFishboneSvg({ label }, 'ocean', { textColor: '"><script>bad</script>' })
    const xml = new DOMParser().parseFromString(svg, 'image/svg+xml')
    expect(xml.querySelector('script,image')).toBeNull()
    expect(xml.querySelector('title')?.textContent).toContain(label)
  })
  it('applies partial themes without mutating presets', () => {
    const theme = resolveTheme('ocean', { fontSize: 20, branchColors: ['#123456'] })
    expect(theme.fontSize).toBe(20)
    expect(theme.spineColor).toBe(fishboneThemes.ocean.spineColor)
    theme.branchColors.push('#654321')
    expect(fishboneThemes.ocean.branchColors).toHaveLength(6)
    expect(() => resolveTheme('ocean', { branchColors: [] })).toThrow()
    expect(() => resolveTheme('ocean', { fontSize: NaN })).toThrow()
    expect(resolveTheme('ocean', { textColor: undefined }).textColor).toBe(
      fishboneThemes.ocean.textColor
    )
    expect(() => resolveTheme('ocean', { fontFamily: '' })).toThrow()
  })
})

describe('Vue integration and exports', () => {
  it('reacts to data and preset updates', async () => {
    const wrapper = mount(FishboneDiagram, { props: { data } })
    expect(wrapper.find('svg').attributes('aria-label')).toBe('项目延期')
    await wrapper.setProps({ data: { label: '新问题' }, preset: 'midnight' })
    expect(wrapper.find('svg').attributes('aria-label')).toBe('新问题')
    expect(wrapper.find('[data-background]').attributes('fill')).toBe('#18212e')
  })
  it('shows a recoverable validation error and emits it', async () => {
    const wrapper = mount(FishboneDiagram, { props: { data: { label: '' } } })
    expect(wrapper.find('[role=alert]').text()).toContain('非空字符串')
    expect(wrapper.emitted('error')).toHaveLength(1)
    await wrapper.setProps({ data })
    expect(wrapper.find('svg').exists()).toBe(true)
  })
  it('exports SVG and rejects invalid export parameters', async () => {
    const svg = renderFishboneSvg(data)
    const blob = await exportSvgImage(svg, { format: 'svg' })
    expect(blob.type).toContain('image/svg+xml')
    expect(blob.size).toBeGreaterThan(100)
    await expect(exportSvgImage(svg, { scale: 0 })).rejects.toThrow(/倍率/)
    await expect(exportSvgImage(svg, { quality: 2 })).rejects.toThrow(/质量/)
    await expect(exportSvgImage(svg, { format: 'gif' as 'png' })).rejects.toThrow(/格式/)
  })
})

describe('SVG anatomy styles', () => {
  it('offers larger pale heads with minimal eyes and gills and reserves the text area', () => {
    const base = layoutFishbone({ label: '产品质量分析' }).boxes.find((box) => box.kind === 'head')!
    for (const headStyle of ['roundfish', 'carp', 'sunfish'] as const) {
      const layout = layoutFishbone({ label: '产品质量分析' }, 'ocean', { headStyle })
      const box = layout.boxes.find((box) => box.kind === 'head')!
      expect(box.height).toBeGreaterThan(base.height)
      expect(box.width * box.height).toBeGreaterThan(base.width * base.height * 1.2)
      const xml = new DOMParser().parseFromString(
        renderFishboneSvg({ label: '产品质量分析' }, 'ocean', { headStyle }),
        'image/svg+xml'
      )
      expect(xml.querySelector('[data-feature="mouth"]')).toBeNull()
      expect(xml.querySelector('[data-feature="silhouette"]')).not.toBeNull()
      if (headStyle !== 'roundfish')
        expect(xml.querySelector('[data-feature="gill"]')).not.toBeNull()
      const eye = xml.querySelector('[data-feature="eye"]')
      if (eye) {
        const eyeBottom = Number(eye.getAttribute('cy')) + Number(eye.getAttribute('r'))
        const label = layout.labels.at(-1)!
        expect(label.y - label.size).toBeGreaterThan(eyeBottom + 5)
      }
    }
  })
  it('preserves a slender head with restrained details and coordinated theme colors', () => {
    const slim = layoutFishbone({ label: '问题分析' }, 'ocean', { headStyle: 'slim' })
    expect(slim.boxes.at(-1)!.height).toBeLessThan(120)
    const xml = new DOMParser().parseFromString(
      renderFishboneSvg({ label: '问题分析' }, 'ocean', { headStyle: 'slim' }),
      'image/svg+xml'
    )
    expect(xml.querySelector('[data-feature="gill"]')).not.toBeNull()
    expect(xml.querySelector('[data-feature="eye"]')?.getAttribute('r')).toBe('3.2')
    expect(xml.querySelector('[data-part="head"]')?.getAttribute('fill')).toBe('#edf6f5')
    expect(xml.querySelector('[data-part="head"]')?.getAttribute('stroke')).toBe('#246f65')
  })
  const choices = Object.entries(fishboneAppearanceOptions).flatMap(([key, values]) =>
    values.map((value) => ({ key: key as keyof FishboneAppearance, value }))
  )
  it.each(choices)('serializes $key=$value without external dependencies', ({ key, value }) => {
    const svg = renderFishboneSvg(data, 'ocean', { [key]: value })
    const xml = new DOMParser().parseFromString(svg, 'image/svg+xml')
    expect(xml.querySelector('parsererror')).toBeNull()
    expect(xml.querySelector('defs, image, style, foreignObject')).toBeNull()
    const parts = {
      headStyle: 'head',
      tailStyle: 'tail',
      spineStyle: 'spine',
      boneStyle: 'bone',
      categoryStyle: 'category',
      causeStyle: 'cause'
    }
    expect(xml.querySelector(`[data-part="${parts[key]}"]`)?.getAttribute('data-style')).toBe(value)
    expect(svg).not.toMatch(/NaN|Infinity|undefined/)
  })
  it('rejects unknown styles and preserves defaults for old partial themes', () => {
    expect(() => resolveTheme('ocean', { headStyle: '<script>' as 'fish' })).toThrow(/headStyle/)
    expect(resolveTheme('ocean', { fontSize: 18 }).headStyle).toBe('fish')
    expect(resolveTheme('ocean', { headStyle: undefined }).headStyle).toBe('fish')
  })
  it.each(['curved', 'jointed', 'straight', 'tapered'] as const)(
    'attaches horizontal causes exactly to %s ribs',
    (boneStyle) => {
      const layout = layoutFishbone(data, 'ocean', { boneStyle })
      for (const rib of layout.lines.filter((line) => line.kind === 'bone')) {
        const attached = layout.lines.filter(
          (line) =>
            line.kind === 'cause' &&
            line.x1 < rib.x1 &&
            line.x1 > rib.x1 - 400 &&
            Math.sign(line.y1 - rib.y1) === Math.sign(rib.y2 - rib.y1)
        )
        for (const cause of attached) {
          const t = (cause.y1 - rib.y1) / (rib.y2 - rib.y1)
          expect(cause.x2).toBeCloseTo(bonePoint(rib.x1, rib.y1, rib.x2, rib.y2, t, boneStyle).x)
        }
      }
    }
  )
  it('keeps every anatomical style inside the layout at large font sizes', () => {
    for (const choice of choices) {
      const layout = layoutFishbone(
        {
          label: '问题'.repeat(60),
          children: [{ label: '原因'.repeat(60), children: [{ label: 'W'.repeat(120) }] }]
        },
        'ocean',
        { [choice.key]: choice.value, fontSize: 40 }
      )
      for (const box of layout.boxes) {
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(layout.width)
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.y + box.height).toBeLessThanOrEqual(layout.height)
      }
    }
  })
})
