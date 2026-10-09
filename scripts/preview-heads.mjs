import { writeFile } from 'node:fs/promises'
import { renderFishboneSvg, layoutFishbone } from '../packages/vue/dist/fishbone.js'

const choices = [
  { style: 'fish', preset: 'ocean', title: '仿生鱼头', detail: '圆润轮廓 · 细描边眼睛 · 轻柔嘴线' },
  {
    style: 'shark',
    preset: 'midnight',
    title: '锐角鲨鱼',
    detail: '收敛轮廓 · 杏仁眼型 · 简洁鱼鳃'
  },
  { style: 'rounded', preset: 'forest', title: '圆润胶囊', detail: '柔和边缘 · 居中文字' },
  { style: 'label', preset: 'classic', title: '经典方框', detail: '简洁描边 · 居中文字' }
]
const data = { label: '产品质量分析' }
const cards = choices
  .map((choice, index) => {
    const theme = { headStyle: choice.style, fontSize: 18 }
    const layout = layoutFishbone(data, choice.preset, theme)
    const box = layout.boxes.find((box) => box.kind === 'head')
    const svg = renderFishboneSvg(data, choice.preset, theme)
    const body = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'))
    const x = 20 + (index % 2) * 440,
      y = 20 + Math.floor(index / 2) * 190
    return `<g transform="translate(${x},${y})"><rect width="420" height="172" rx="14" fill="${layout.theme.background}" stroke="#e2e8ec"/><text x="20" y="27" fill="${layout.theme.textColor}" font-size="14" font-weight="600">${choice.title}</text><text x="20" y="47" fill="${layout.theme.mutedColor}" font-size="11">${choice.detail}</text><svg x="36" y="57" width="350" height="108" viewBox="${box.x - 10} ${box.y - 10} ${box.width + 20} ${box.height + 20}" font-family="Microsoft YaHei, sans-serif">${body}</svg></g>`
  })
  .join('')
await writeFile(
  new URL('../docs/head-styles.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="400" viewBox="0 0 900 400" font-family="Microsoft YaHei, sans-serif"><rect width="900" height="400" fill="#f5f8f9"/>${cards}</svg>`
)
console.log('Generated docs/head-styles.svg')
