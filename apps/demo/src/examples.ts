import type { FishboneNode } from '@fishbone/vue'
export const examples: { name: string; description: string; data: FishboneNode }[] = [
  {
    name: '产品质量分析',
    description: '从人、机、料、法、环、测六个维度，定位产品质量问题。',
    data: {
      label: '产品质量不达标',
      children: [
        {
          label: '人员 · Man',
          children: [
            { label: '操作熟练度不足', children: [{ label: '新员工培训不充分' }] },
            { label: '质量意识薄弱' },
            { label: '岗位职责不清晰' }
          ]
        },
        {
          label: '设备 · Machine',
          children: [
            { label: '设备老化' },
            { label: '维护保养不到位' },
            { label: '参数设置不合理' }
          ]
        },
        {
          label: '材料 · Material',
          children: [
            { label: '原材料质量波动' },
            { label: '供应商标准不统一' },
            { label: '储存条件不符合要求' }
          ]
        },
        {
          label: '方法 · Method',
          children: [
            { label: '工艺流程不完善' },
            { label: '作业指导书更新滞后' },
            { label: '缺少过程质量检查' }
          ]
        },
        {
          label: '环境 · Environment',
          children: [
            { label: '温湿度控制不稳定' },
            { label: '生产区域清洁不足' },
            { label: '工位照明条件欠佳' }
          ]
        },
        {
          label: '测量 · Measurement',
          children: [
            { label: '检测设备未定期校准' },
            { label: '抽样方案不合理' },
            { label: '检验标准执行不一致' }
          ]
        }
      ]
    }
  },
  {
    name: '项目延期复盘',
    description: '梳理需求、协作、技术与资源，找到项目延期的关键原因。',
    data: {
      label: '项目交付延期',
      children: [
        {
          label: '需求管理',
          children: [
            {
              label: '需求频繁变更',
              children: [{ label: '验收标准未提前确认' }, { label: '缺少变更评估' }]
            },
            { label: '优先级不清晰' }
          ]
        },
        {
          label: '团队协作',
          children: [{ label: '跨团队信息不同步' }, { label: '评审反馈不及时' }]
        },
        {
          label: '技术风险',
          children: [{ label: '第三方接口不稳定' }, { label: '历史代码维护成本高' }]
        },
        {
          label: '资源规划',
          children: [{ label: '工作量估算偏低' }, { label: '关键岗位资源不足' }]
        }
      ]
    }
  },
  {
    name: '用户流失分析',
    description: '围绕体验、价值与服务，探索用户流失背后的原因。',
    data: {
      label: '用户留存率下降',
      children: [
        { label: '产品体验', children: [{ label: '首次使用流程复杂' }, { label: '页面加载缓慢' }] },
        {
          label: '用户价值',
          children: [{ label: '核心功能使用门槛高' }, { label: '价值反馈不明确' }]
        },
        { label: '客户服务', children: [{ label: '问题响应时间长' }, { label: '帮助文档不完善' }] }
      ]
    }
  }
]
