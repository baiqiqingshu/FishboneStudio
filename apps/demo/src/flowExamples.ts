import type { FlowchartData } from '@fishbone/vue'
export const flowExamples: { name: string; description: string; data: FlowchartData }[] = [
  {
    name: '采购审批流程',
    description: '跨区域审批、条件分支与退回补充，呈现完整业务协作。',
    data: {
      version: 1,
      title: '采购申请与审批',
      regions: [
        { id: 'request', label: '申请部门', description: '发起申请 · 完善采购信息' },
        {
          id: 'review',
          label: '审批中心',
          description: '部门审核 · 预算确认',
          style: { fill: '#f4f6fc', stroke: '#e2e7f2', titleColor: '#687dac' }
        },
        {
          id: 'execute',
          label: '采购执行',
          description: '订单执行 · 验收入库',
          style: { fill: '#fcf8f1', stroke: '#eee6d6', titleColor: '#a58b56' }
        }
      ],
      nodes: [
        { id: 'start', type: 'start', label: '开始' },
        { id: 'draft', type: 'activity', label: '填写采购申请', regionId: 'request' },
        { id: 'submit', type: 'activity', label: '提交申请', regionId: 'request' },
        { id: 'supplement', type: 'activity', label: '补充申请资料', regionId: 'request' },
        { id: 'complete', type: 'decision', label: '资料齐全？', regionId: 'review' },
        { id: 'approve', type: 'activity', label: '部门负责人审核', regionId: 'review' },
        { id: 'budget', type: 'decision', label: '预算通过？', regionId: 'review' },
        { id: 'order', type: 'activity', label: '创建采购订单', regionId: 'execute' },
        { id: 'accept', type: 'activity', label: '到货验收入库', regionId: 'execute' },
        {
          id: 'archive',
          type: 'activity',
          label: '记录与归档',
          regionId: 'execute',
          shape: 'ellipse'
        },
        { id: 'end', type: 'end', label: '结束' }
      ],
      edges: [
        { source: 'start', target: 'draft' },
        { source: 'draft', target: 'submit' },
        { source: 'submit', target: 'complete', label: '提交审核' },
        {
          source: 'complete',
          target: 'approve',
          label: '是',
          sourcePort: 'bottom',
          targetPort: 'top'
        },
        {
          source: 'complete',
          target: 'supplement',
          label: '否 · 退回补充',
          sourcePort: 'left',
          targetPort: 'right',
          style: { dashed: true }
        },
        {
          source: 'supplement',
          target: 'submit',
          sourcePort: 'left',
          targetPort: 'left',
          style: { dashed: true }
        },
        { source: 'approve', target: 'budget' },
        { source: 'budget', target: 'order', label: '通过' },
        {
          source: 'budget',
          target: 'end',
          label: '未通过',
          sourcePort: 'bottom',
          style: { dashed: true }
        },
        { source: 'order', target: 'accept' },
        { source: 'accept', target: 'archive' },
        { source: 'archive', target: 'end' }
      ]
    }
  },
  {
    name: '多列对齐演示',
    description: '较长区域自动分列，跨列直接连接尽量同行，兼顾短区域对齐。',
    data: {
      version: 1,
      title: '订单处理与质量检查',
      regions: [
        { id: 'process', label: '订单处理', description: '连续步骤 · 自动分列' },
        { id: 'quality', label: '质量检查', description: '检查结果 · 异常处理' }
      ],
      nodes: [
        { id: 'start', label: '开始', type: 'start' },
        ...[
          '接收订单',
          '核对信息',
          '确认付款',
          '锁定库存',
          '生成拣货单',
          '拣选商品',
          '复核数量',
          '包装贴标',
          '出库交接',
          '物流发运',
          '同步运单',
          '确认签收'
        ].map((label, i) => ({
          id: `p${i}`,
          label,
          type: 'activity' as const,
          regionId: 'process'
        })),
        { id: 'q0', label: '订单检查', type: 'activity', regionId: 'quality' },
        { id: 'q1', label: '质量合格？', type: 'decision', regionId: 'quality' },
        { id: 'q2', label: '异常反馈', type: 'activity', regionId: 'quality' },
        { id: 'q3', label: '签收确认', type: 'activity', regionId: 'quality' },
        { id: 'end', label: '完成', type: 'end' }
      ],
      edges: [
        { source: 'start', target: 'p0' },
        ...Array.from({ length: 11 }, (_, i) => ({ source: `p${i}`, target: `p${i + 1}` })),
        { source: 'p1', target: 'q0' },
        { source: 'p6', target: 'q1', label: '送检' },
        { source: 'q1', target: 'q2', label: '否' },
        { source: 'q2', target: 'p5', label: '重新处理', style: { dashed: true } },
        { source: 'p11', target: 'q3' },
        { source: 'q3', target: 'end' }
      ]
    }
  },
  {
    name: '简单判断流程',
    description: '不使用区域也能渲染，支持判断分支、椭圆活动与回流连接。',
    data: {
      version: 1,
      title: '账号验证流程',
      nodes: [
        { id: 'start', type: 'start', label: '开始' },
        { id: 'input', type: 'activity', label: '填写登录信息' },
        { id: 'valid', type: 'decision', label: '信息有效？' },
        { id: 'retry', type: 'activity', label: '重新输入', shape: 'ellipse' },
        { id: 'login', type: 'activity', label: '进入工作空间' },
        { id: 'end', type: 'end', label: '结束' }
      ],
      edges: [
        { source: 'start', target: 'input' },
        { source: 'input', target: 'valid' },
        { source: 'valid', target: 'retry', label: '否' },
        {
          source: 'retry',
          target: 'input',
          sourcePort: 'right',
          targetPort: 'right',
          style: { dashed: true }
        },
        { source: 'valid', target: 'login', label: '是' },
        { source: 'login', target: 'end' }
      ]
    }
  }
]
