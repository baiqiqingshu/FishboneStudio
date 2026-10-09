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
  await expect(page.locator('.fishbone-diagram line').first()).toHaveAttribute('stroke', '#ff0000')
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
  await expect(page.locator('.fishbone-diagram line').first()).toHaveAttribute('stroke', '#cbd5e1')
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

test('renders desktop and integration guide without browser errors', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.reload()
  await expect(page.locator('.fishbone-diagram svg')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true })
  await page.getByRole('button', { name: '开发文档' }).click()
  await expect(page.getByRole('dialog')).toContainText(
    "import { FishboneDiagram } from '@fishbone/vue'"
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
