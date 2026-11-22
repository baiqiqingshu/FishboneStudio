import { writeFile } from 'node:fs/promises'
import { renderFishboneSvg, layoutFishbone } from '../packages/fishbone/dist/fishbone.js'

const choices = [
  {
    style: 'fish',
    preset: 'ocean',
    title: '弧面鱼头',
    detail: '参考弧面轮廓 · 浅色填充 · 细描边与轻淡鱼鳃'
  },
  {
    style: 'shark',
    preset: 'midnight',
    title: '开口鱼头',
    detail: '参考开口轮廓 · 收敛嘴部缺口 · 简洁小圆眼'
  },
  {
    style: 'roundfish',
    preset: 'ocean',
    title: '圆角三角',
    detail: '参考圆弧三角 · 高身 240 px · 适合强调问题'
  },
  {
    style: 'triangle',
    preset: 'ocean',
    title: '极简三角',
    detail: '参考极简三角 · 高身 240 px · 干净几何轮廓'
  },
  {
    style: 'carp',
    preset: 'sunset',
    title: '水滴鱼头',
    detail: '高身 230 px · 淡杏填充 · 柔和鱼鳃'
  },
  {
    style: 'sunfish',
    preset: 'forest',
    title: '扇面鱼头',
    detail: '高身 260 px · 浅色大轮廓 · 开口与鱼鳃'
  },
  {
    style: 'slim',
    preset: 'ocean',
    title: '细长鱼头',
    detail: '保留细长风格 · 高度 108 px · 小眼与轻嘴线'
  },
  { style: 'rounded', preset: 'forest', title: '圆润胶囊', detail: '柔和边缘 · 居中文字' },
  { style: 'label', preset: 'classic', title: '经典方框', detail: '简洁描边 · 居中文字' }
]
const data = { label: '产品质量分析' }
const boardHeight = 20 + Math.ceil(choices.length / 2) * 250
const cards = choices
  .map((choice, index) => {
    const theme = { headStyle: choice.style, fontSize: 18 }
    const layout = layoutFishbone(data, choice.preset, theme)
    const box = layout.boxes.find((box) => box.kind === 'head')
    const svg = renderFishboneSvg(data, choice.preset, theme)
    const body = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'))
    const x = 20 + (index % 2) * 440,
      y = 20 + Math.floor(index / 2) * 250
    return `<g transform="translate(${x},${y})"><rect width="420" height="230" rx="14" fill="${layout.theme.background}" stroke="#e2e8ec"/><text x="20" y="27" fill="${layout.theme.textColor}" font-size="14" font-weight="600">${choice.title}</text><text x="20" y="47" fill="${layout.theme.mutedColor}" font-size="11">${choice.detail}</text><svg x="28" y="62" width="364" height="158" viewBox="${box.x + box.width / 2 - 180} ${box.y + box.height / 2 - 150} 360 300" font-family="Microsoft YaHei, sans-serif">${body}</svg></g>`
  })
  .join('')
await writeFile(
  new URL('../docs/head-styles.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${boardHeight}" viewBox="0 0 900 ${boardHeight}" font-family="Microsoft YaHei, sans-serif"><rect width="900" height="${boardHeight}" fill="#f5f8f9"/>${cards}</svg>`
)
console.log('Generated docs/head-styles.svg')
