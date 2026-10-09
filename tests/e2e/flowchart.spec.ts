import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.beforeEach(async ({ page }) => {
  await page.goto('/#flowchart')
})
test('edits structured nodes, regions and edges and preserves independent workbench data', async ({
  page
}) => {
  await expect(page.locator('.flowchart-diagram svg')).toHaveAttribute(
    'aria-label',
    '采购申请与审批'
  )
  await page.getByLabel('流程节点名称 draft', { exact: true }).fill('填写业务申请')
  await page.getByLabel('流程节点名称 draft', { exact: true }).press('Tab')
  await expect(page.locator('[data-node-id="draft"]')).toContainText('填写业务申请')
  await page.getByRole('button', { name: '添加活动', exact: true }).click()
  await expect(page.locator('.flowchart-diagram [data-node-id]')).toHaveCount(12)
  const added = await page
    .locator('.flowchart-diagram [data-node-id]')
    .filter({ hasText: '新的活动' })
    .getAttribute('data-node-id')
  await page.getByRole('button', { name: `删除流程节点 ${added}`, exact: true }).click()
  await expect(page.locator('.flowchart-diagram [data-node-id]')).toHaveCount(11)
  await page.getByRole('button', { name: '区域3', exact: true }).click()
  await page.getByLabel('区域标注 request', { exact: true }).fill('修改后的区域说明')
  await page.getByLabel('区域标注 request', { exact: true }).press('Tab')
  await expect(page.locator('[data-region-id="request"]')).toContainText('修改后的区域说明')
  await page.getByRole('button', { name: '连线12', exact: true }).click()
  await page.getByLabel('连线标注 3', { exact: true }).fill('进入审核')
  await page.getByLabel('连线标注 3', { exact: true }).press('Tab')
  await expect(page.locator('.flowchart-diagram')).toContainText('进入审核')
  await expect(page.getByText('已自动保存', { exact: false })).toBeVisible()
  await page.getByLabel('选择图表类型').selectOption('fishbone')
  await expect(page.locator('.fishbone-diagram svg')).toHaveAttribute(
    'aria-label',
    '产品质量不达标'
  )
  await page.getByLabel('选择图表类型').selectOption('flowchart')
  await expect(page.locator('[data-node-id="draft"]')).toContainText('填写业务申请')
})
test('validates JSON and retains the last good diagram', async ({ page }) => {
  await page.getByRole('button', { name: 'JSON 编辑', exact: true }).click()
  await page
    .getByLabel('流程图结构化 JSON')
    .fill(JSON.stringify({ version: 1, nodes: [], edges: [{ source: 'bad', target: 'bad' }] }))
  await page.getByRole('button', { name: '应用流程数据', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('不存在')
  await expect(page.locator('.flowchart-diagram [data-node-id]')).toHaveCount(11)
  await page.getByLabel('流程图结构化 JSON').fill(
    JSON.stringify({
      version: 1,
      nodes: [{ id: 'hello', type: 'activity', label: '自定义活动', shape: 'ellipse' }],
      edges: []
    })
  )
  await page.getByRole('button', { name: '应用流程数据', exact: true }).click()
  await expect(page.locator('[data-node-id="hello"] ellipse')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
test('changes themes, per-shape colors and fonts, and splits dense regions', async ({ page }) => {
  await page.getByLabel('选择流程图示例').selectOption('1')
  const initial = Number(await page.locator('.flowchart-diagram svg').getAttribute('width'))
  await page.getByLabel('区域内纵向最大节点数量').fill('2')
  await page.getByLabel('区域内纵向最大节点数量').press('Tab')
  await expect
    .poll(async () => Number(await page.locator('.flowchart-diagram svg').getAttribute('width')))
    .toBeGreaterThan(initial)
  await page.getByRole('button', { name: '深邃夜色 深色画布', exact: true }).click()
  await expect(page.locator('.flowchart-diagram [data-background]')).toHaveAttribute(
    'fill',
    '#18212e'
  )
  await page.getByRole('button', { name: '自定义图形与文字', exact: true }).click()
  await page.getByLabel('图形色块', { exact: true }).fill('#ff0000')
  await expect(page.locator('[data-node-type="activity"] rect').first()).toHaveAttribute(
    'fill',
    '#ff0000'
  )
  await page.getByLabel('流程图文字字体', { exact: true }).selectOption('Georgia, SimSun, serif')
  await expect(page.locator('[data-node-type="activity"] text').first()).toHaveAttribute(
    'font-family',
    'Georgia, SimSun, serif'
  )
  await page.getByLabel('流程图文字字重', { exact: true }).selectOption('700')
  await expect(page.locator('[data-node-type="activity"] text').first()).toHaveAttribute(
    'font-weight',
    '700'
  )
  await page.getByLabel('开始结束布局', { exact: true }).selectOption('auto')
  await expect(page.getByRole('alert')).toHaveCount(0)
})
test('controls title visibility, shape limits and region spacing with persistent settings', async ({
  page
}) => {
  await expect(page.locator('[data-flow-title]')).toHaveCount(0)
  const initialHeight = Number(await page.locator('.flowchart-diagram svg').getAttribute('height'))
  await page.getByLabel('显示流程图标题', { exact: true }).check()
  await expect(page.locator('[data-flow-title]')).toContainText('采购申请与审批')
  expect(
    Number(await page.locator('.flowchart-diagram svg').getAttribute('height'))
  ).toBeGreaterThan(initialHeight)
  await page.getByLabel('流程图图形最大宽度', { exact: true }).fill('160')
  await page.getByLabel('流程图图形最大宽度', { exact: true }).press('Tab')
  await page.getByLabel('流程图图形最大高度', { exact: true }).fill('80')
  await page.getByLabel('流程图图形最大高度', { exact: true }).press('Tab')
  const dimensions = await page.locator('.flowchart-diagram [data-node-id]').evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = (node as SVGGraphicsElement).getBBox()
      return { width: box.width, height: box.height }
    })
  )
  for (const box of dimensions) {
    expect(box.width).toBeLessThanOrEqual(160)
    expect(box.height).toBeLessThanOrEqual(80)
  }
  const initialWidth = Number(await page.locator('.flowchart-diagram svg').getAttribute('width'))
  await page.getByLabel('流程图区域间距', { exact: true }).fill('180')
  await page.getByLabel('流程图区域间距', { exact: true }).press('Tab')
  expect(
    Number(await page.locator('.flowchart-diagram svg').getAttribute('width'))
  ).toBeGreaterThan(initialWidth)
  await expect(page.getByText('已自动保存', { exact: false })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('显示流程图标题', { exact: true })).toBeChecked()
  await expect(page.getByLabel('流程图图形最大宽度', { exact: true })).toHaveValue('160')
})
test('accepts typed colors, validates errors and provides curated swatches without mobile overflow', async ({
  page
}, info) => {
  await page.getByRole('button', { name: '自定义图形与文字', exact: true }).click()
  await page.getByLabel('图形色块', { exact: true }).fill('rgb(37, 134, 155)')
  await page.getByLabel('图形色块', { exact: true }).press('Tab')
  await expect(page.locator('[data-node-type="activity"] rect').first()).toHaveAttribute(
    'fill',
    'rgb(37, 134, 155)'
  )
  await page.getByLabel('图形色块', { exact: true }).fill('wrong-color')
  await page.getByLabel('图形色块', { exact: true }).press('Tab')
  await expect(page.getByText('请输入有效色值', { exact: false })).toBeVisible()
  await expect(page.locator('[data-node-type="activity"] rect').first()).toHaveAttribute(
    'fill',
    'rgb(37, 134, 155)'
  )
  await page.getByRole('button', { name: '图形色块预设色板', exact: true }).click()
  await expect(
    page.getByRole('group', { name: '图形色块预设颜色' }).getByRole('button')
  ).toHaveCount(30)
  await page.getByRole('button', { name: '图形色块 浅蓝 #edf3ff', exact: true }).click()
  await expect(page.getByLabel('图形色块', { exact: true })).toHaveValue('#edf3ff')
  await expect(page.getByText('请输入有效色值', { exact: false })).toHaveCount(0)
  await page.getByRole('button', { name: '流程图背景无背景色', exact: true }).click()
  await expect(page.locator('.flowchart-diagram [data-background]')).toHaveAttribute(
    'fill',
    'transparent'
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '图形色块预设色板', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('color-mobile.png'), fullPage: true })
})
test('exports transparent PNG and white-backed JPEG backgrounds', async ({ page }, info) => {
  await page.getByRole('button', { name: '自定义图形与文字', exact: true }).click()
  await page.getByRole('button', { name: '流程图背景无背景色', exact: true }).click()
  for (const format of ['png', 'jpeg']) {
    await page.getByRole('button', { name: '导出流程图', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: new RegExp(`^${format.toUpperCase()}`) })
      .click()
    const pending = page.waitForEvent('download')
    await page
      .getByRole('button', { name: `下载 ${format.toUpperCase()} 流程图`, exact: true })
      .click()
    const download = await pending,
      output = info.outputPath(`transparent.${format}`)
    await download.saveAs(output)
    const bytes = await readFile(output)
    const pixel = await page.evaluate(
      async ({ source }) => {
        const img = new Image()
        img.src = source
        await img.decode()
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const context = canvas.getContext('2d')!
        context.drawImage(img, 0, 0)
        return [...context.getImageData(0, 0, 1, 1).data]
      },
      { source: `data:image/${format};base64,${bytes.toString('base64')}` }
    )
    expect(pixel).toEqual(format === 'png' ? [0, 0, 0, 0] : [255, 255, 255, 255])
  }
})
for (const format of ['png', 'jpeg', 'webp', 'svg'])
  test(`exports real ${format.toUpperCase()} flowcharts`, async ({ page }, info) => {
    await page.getByRole('button', { name: '导出流程图', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: new RegExp(`^${format.toUpperCase()}`) })
      .click()
    const pending = page.waitForEvent('download')
    await page
      .getByRole('button', { name: `下载 ${format.toUpperCase()} 流程图`, exact: true })
      .click()
    const download = await pending,
      output = info.outputPath(`flowchart.${format}`)
    await download.saveAs(output)
    const bytes = await readFile(output)
    expect(bytes.length).toBeGreaterThan(500)
    if (format === 'png') expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    if (format === 'jpeg') expect(bytes.subarray(0, 3).toString('hex')).toBe('ffd8ff')
    if (format === 'webp') expect(bytes.subarray(8, 12).toString()).toBe('WEBP')
    if (format === 'svg') {
      expect(bytes.toString()).toContain('data-region-id')
      expect(bytes.toString()).toContain('polygon')
    }
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
test('shows the data contract and mobile workbench without page overflow', async ({
  page
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: '流程图工作台 NEW' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  await page.getByRole('button', { name: '数据接口', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('version: 1')
  await page.getByRole('button', { name: '关闭流程图指南' }).click()
  await page.screenshot({ path: info.outputPath('flow-mobile.png'), fullPage: true })
})
test('captures the complete desktop flowchart and has no browser errors', async ({
  page
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.reload()
  await expect(page.locator('.flowchart-diagram svg')).toBeVisible()
  await page.screenshot({ path: info.outputPath('flow-desktop.png'), fullPage: true })
  expect(errors).toEqual([])
})
