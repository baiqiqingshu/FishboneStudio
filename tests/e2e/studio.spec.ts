import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('edits nested nodes, adds and removes causes, and persists data', async ({ page }) => {
  const title = page.getByRole('textbox', { name: '节点名称 产品质量不达标', exact: true })
  await title.fill('质量问题复盘')
  await title.press('Tab')
  await expect(page.locator('.fishbone-diagram svg')).toHaveAttribute('aria-label', '质量问题复盘')
  const parent = page.getByRole('textbox', { name: '节点名称 操作熟练度不足', exact: true })
  await parent.hover()
  await page.getByRole('button', { name: '添加子节点 操作熟练度不足', exact: true }).click()
  await expect(page.locator('.fishbone-diagram')).toContainText('新的原因')
  await page.getByRole('textbox', { name: '节点名称 新的原因', exact: true }).hover()
  await page.getByRole('button', { name: '删除节点 新的原因', exact: true }).click()
  await expect(page.locator('.fishbone-diagram')).not.toContainText('新的原因')
  await expect(page.getByText('已自动保存', { exact: false })).toBeVisible()
  await page.reload()
  await expect(page.locator('.fishbone-diagram svg')).toHaveAttribute('aria-label', '质量问题复盘')
})

test('validates JSON without corrupting the current diagram, supports root-only and deep trees', async ({
  page
}) => {
  await page.getByRole('button', { name: 'JSON 编辑', exact: true }).click()
  await page.getByRole('textbox', { name: '树数据 JSON' }).fill('{broken')
  await page.getByRole('button', { name: '应用数据' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.locator('.fishbone-diagram svg')).toHaveAttribute(
    'aria-label',
    '产品质量不达标'
  )
  await page
    .getByRole('textbox', { name: '树数据 JSON' })
    .fill(JSON.stringify({ label: '单独的问题' }))
  await page.getByRole('button', { name: '应用数据' }).click()
  await expect(page.locator('.fishbone-diagram svg')).toHaveAttribute('aria-label', '单独的问题')
  const nested = {
    label: '复杂问题',
    children: [
      {
        label: '分类',
        children: [
          { label: '原因', children: [{ label: '子原因', children: [{ label: '更深的原因' }] }] }
        ]
      }
    ]
  }
  await page.getByRole('textbox', { name: '树数据 JSON' }).fill(JSON.stringify(nested))
  await page.getByRole('button', { name: '应用数据' }).click()
  await expect(page.locator('.fishbone-diagram')).toContainText('更深的原因')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('switches examples, presets, custom styles, zoom and overview', async ({ page }) => {
  await page.getByLabel('选择示例').selectOption('1')
  await expect(page.locator('.fishbone-diagram svg')).toHaveAttribute('aria-label', '项目交付延期')
  await page.getByRole('button', { name: '深邃夜色 沉静 · 聚焦' }).click()
  await expect(page.locator('.fishbone-diagram [data-background]')).toHaveAttribute(
    'fill',
    '#18212e'
  )
  await page.getByRole('button', { name: '自定义样式', exact: true }).click()
  await page.getByLabel('主骨颜色', { exact: true }).fill('#ff0000')
  await expect(page.locator('.fishbone-diagram [data-part="spine"]')).toHaveAttribute(
    'stroke',
    '#ff0000'
  )
  await page.getByLabel('字体大小', { exact: true }).fill('20')
  await expect(page.locator('.fishbone-diagram text').first()).toHaveAttribute('font-size', '21')
  await page.getByRole('button', { name: '放大', exact: true }).click()
  await expect(page.locator('.zoom-controls')).toContainText('125%')
  await page.getByRole('button', { name: '适应画布', exact: true }).click()
  await expect(page.locator('.zoom-controls')).toContainText('100%')
  await page.getByRole('button', { name: '数据概览', exact: true }).click()
  await expect(page.locator('.overview-stats')).toContainText('4')
  await expect(page.locator('.overview-heading')).toContainText('项目交付延期')
  await page.getByRole('button', { name: '鱼骨图', exact: true }).click()
  await page.getByRole('button', { name: '恢复主题默认', exact: true }).click()
  await expect(page.locator('.fishbone-diagram [data-part="spine"]')).toHaveAttribute(
    'stroke',
    '#cbd5e1'
  )
})

for (const format of ['png', 'jpeg', 'webp', 'svg']) {
  test(`downloads a genuine ${format.toUpperCase()} file`, async ({ page }, testInfo) => {
    await page.getByRole('button', { name: '导出图片', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: new RegExp(`^${format.toUpperCase()}`) })
      .click()
    const pending = page.waitForEvent('download')
    await page
      .getByRole('button', { name: `下载 ${format.toUpperCase()} 图片`, exact: true })
      .click()
    const download = await pending
    expect(download.suggestedFilename()).toBe(`鱼骨图分析.${format}`)
    const output = testInfo.outputPath(`diagram.${format}`)
    await download.saveAs(output)
    const bytes = await readFile(output)
    expect(bytes.length).toBeGreaterThan(500)
    if (format === 'png') {
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      expect(bytes.readUInt32BE(16)).toBeGreaterThan(2000)
    }
    if (format === 'jpeg') expect(bytes.subarray(0, 3).toString('hex')).toBe('ffd8ff')
    if (format === 'webp') {
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF')
      expect(bytes.subarray(8, 12).toString()).toBe('WEBP')
    }
    if (format === 'svg') {
      expect(bytes.toString()).toContain('<svg')
      expect(bytes.toString()).toContain('产品质量不达标')
      expect(bytes.toString()).toContain('data-part="head" data-style="fish"')
      expect(bytes.toString()).toContain('data-part="tail" data-style="fork"')
    }
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
}

test('mobile layout remains usable without page overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: '鱼骨图工作台 DEMO' })).toBeVisible()
  await page.getByRole('button', { name: '自定义样式', exact: true }).click()
  await expect(page.getByLabel('主骨颜色', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true })
})

test('mixes anatomy styles, persists choices and downloads the same SVG', async ({
  page
}, testInfo) => {
  await page.getByLabel('鱼头造型', { exact: true }).selectOption('shark')
  await page.getByLabel('鱼尾造型', { exact: true }).selectOption('fan')
  await page.getByLabel('主干造型', { exact: true }).selectOption('vertebrae')
  await page.getByLabel('骨刺造型', { exact: true }).selectOption('jointed')
  await page.getByLabel('分类鱼鳍', { exact: true }).selectOption('ribbon')
  await page.getByLabel('一级原因节点', { exact: true }).selectOption('card')
  for (const [part, style] of [
    ['head', 'shark'],
    ['tail', 'fan'],
    ['spine', 'vertebrae'],
    ['bone', 'jointed'],
    ['category', 'ribbon'],
    ['cause', 'card']
  ])
    await expect(page.locator(`.fishbone-diagram [data-part="${part}"]`).first()).toHaveAttribute(
      'data-style',
      style
    )
  await expect(page.getByText('已自动保存', { exact: false })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('鱼头造型', { exact: true })).toHaveValue('shark')
  await expect(page.getByLabel('鱼尾造型', { exact: true })).toHaveValue('fan')
  await page.getByRole('button', { name: '导出图片', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^SVG/ }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载 SVG 图片', exact: true }).click()
  const download = await pending
  const filename = testInfo.outputPath('custom-anatomy.svg')
  await download.saveAs(filename)
  const svg = await readFile(filename, 'utf8')
  expect(svg).toContain('data-part="head" data-style="shark"')
  expect(svg).toContain('data-part="spine" data-style="vertebrae"')
  await page.getByRole('button', { name: '清新海洋 轻盈 · 多彩' }).click()
  await expect(page.getByLabel('鱼头造型', { exact: true })).toHaveValue('fish')
})

test('renders desktop and integration guide without browser errors', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.reload()
  await expect(page.locator('.fishbone-diagram svg')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true })
  await page.getByRole('button', { name: '开发文档' }).click()
  await expect(page.getByRole('dialog')).toContainText(
    "import { FishboneDiagram } from '@ui-studio/fishbone'"
  )
  await page.getByRole('button', { name: '关闭指南' }).click()
  expect(errors).toEqual([])
})

test('long CJK and wide Latin labels stay within the SVG canvas', async ({ page }) => {
  await page.getByRole('button', { name: 'JSON 编辑', exact: true }).click()
  await page.getByRole('textbox', { name: '树数据 JSON' }).fill(
    JSON.stringify({
      label: '长'.repeat(120),
      children: [
        {
          label: 'W'.repeat(120),
          children: [{ label: '测试'.repeat(60) }, { label: 'W'.repeat(120) }]
        },
        { label: '分析'.repeat(60), children: [{ label: '测试原因' }] }
      ]
    })
  )
  await page.getByRole('button', { name: '应用数据' }).click()
  await page.getByRole('button', { name: '自定义样式', exact: true }).click()
  await page.getByLabel('字体大小', { exact: true }).fill('24')
  const overflow = await page.locator('.fishbone-diagram svg').evaluate((svg) => {
    const { width, height } = (svg as SVGSVGElement).viewBox.baseVal
    return Array.from(svg.querySelectorAll('text'))
      .filter((text) => {
        const box = text.getBBox()
        return box.x < 0 || box.y < 0 || box.x + box.width > width || box.y + box.height > height
      })
      .map((text) => text.textContent)
  })
  expect(overflow).toEqual([])
})

test('fish heads blend pale fills with gills and reference silhouettes and render the preview board', async ({
  page
}, testInfo) => {
  const head = page.locator('.fishbone-diagram [data-part="head"]')
  await expect(head.locator('[data-feature="eye"]')).toHaveCount(1)
  await expect(head).toHaveAttribute('fill', '#edf6f5')
  await expect(head.locator('[data-feature="gill"]')).toHaveCount(1)
  await expect(head.locator('[data-feature="mouth"]')).toHaveCount(0)
  await page.getByLabel('鱼头造型', { exact: true }).selectOption('shark')
  await expect(head.locator('[data-feature="silhouette"]')).toHaveAttribute('data-mouth', 'notch')
  await expect(head.locator('[data-feature="eye"]')).toHaveCount(1)
  await page.getByLabel('鱼头造型', { exact: true }).selectOption('slim')
  await expect(head.locator('[data-feature="mouth"]')).toHaveAttribute('stroke-linecap', 'round')
  await expect(head.locator('[data-feature="gill"]')).toHaveCount(1)
  const preview = await readFile(new URL('../../docs/head-styles.svg', import.meta.url), 'utf8')
  await page.setContent(preview)
  await page.locator('body > svg').screenshot({ path: testInfo.outputPath('head-styles.png') })
})

test('offers larger fish heads and text color input with curated swatches', async ({
  page
}, info) => {
  const head = page.locator('.fishbone-diagram [data-part="head"]')
  const initial = await head.evaluate((node) => {
    const box = (node as SVGGraphicsElement).getBBox()
    return box.width * box.height
  })
  for (const style of ['roundfish', 'carp', 'sunfish']) {
    await page.getByLabel('鱼头造型', { exact: true }).selectOption(style)
    await expect(head).toHaveAttribute('data-style', style)
    expect(
      await head.evaluate((node) => {
        const box = (node as SVGGraphicsElement).getBBox()
        return box.width * box.height
      })
    ).toBeGreaterThan(initial * 1.2)
  }
  await page.getByRole('button', { name: '自定义样式', exact: false }).click()
  await page.getByLabel('鱼头色块', { exact: true }).fill('#eefaf5')
  await expect(head).toHaveAttribute('fill', '#eefaf5')
  await page.getByRole('button', { name: '鱼头色块预设色板', exact: true }).click()
  await page.getByRole('button', { name: '鱼头色块 浅杏 #fff2e8', exact: true }).click()
  await expect(head).toHaveAttribute('fill', '#fff2e8')
  await page.getByRole('button', { name: '画布背景无背景色', exact: true }).click()
  await expect(page.locator('.fishbone-diagram [data-background]')).toHaveAttribute(
    'fill',
    'transparent'
  )
  await page.screenshot({ path: info.outputPath('high-fish-head.png'), fullPage: true })
})

test('keeps short and long text within fish head contours and apart from eyes and gills', async ({
  page
}) => {
  await page.getByRole('button', { name: 'JSON 编辑', exact: true }).click()
  for (const label of ['产品质量不达标', '问题分析文字'.repeat(20)]) {
    await page.getByLabel('树数据 JSON', { exact: true }).fill(JSON.stringify({ label }))
    await page.getByRole('button', { name: '应用数据', exact: true }).click()
    for (const style of ['fish', 'slim', 'shark', 'roundfish', 'carp', 'sunfish', 'triangle']) {
      await page.getByLabel('鱼头造型', { exact: true }).selectOption(style)
      const result = await page.locator('.fishbone-diagram svg').evaluate((svg) => {
        const body = svg.querySelector('[data-feature="silhouette"]') as SVGGeometryElement
        const label = [...svg.querySelectorAll(':scope > text')].at(-1)!
        const features = [
          ...svg.querySelectorAll('[data-feature="eye"], [data-feature="gill"]')
        ].map((feature) => (feature as SVGGraphicsElement).getBBox())
        const outside = [...label.querySelectorAll('tspan')]
          .filter((span) => {
            const box = (span as SVGGraphicsElement).getBBox()
            return (
              [
                [box.x, box.y],
                [box.x + box.width, box.y],
                [box.x, box.y + box.height],
                [box.x + box.width, box.y + box.height]
              ].some(([x, y]) => !body.isPointInFill(new DOMPoint(x, y))) ||
              features.some(
                (feature) =>
                  box.x < feature.x + feature.width + 3 &&
                  box.x + box.width > feature.x - 3 &&
                  box.y < feature.y + feature.height + 3 &&
                  box.y + box.height > feature.y - 3
              )
            )
          })
          .map((span) => span.textContent)
        return { outside }
      })
      expect(result.outside, `${style}: text outside contour or overlapping features`).toEqual([])
    }
  }
})
