import Fastify from 'fastify'
import cors from '@fastify/cors'

type NavItem = { label: string; to: string }
type HotItem = { id: string; name: string }

type AppConfig = {
  title: string
  subtitle?: string
  idleSeconds: number
  homeHotItems: HotItem[]
  nav: NavItem[]
  bannerLines?: string[]
}

type Dept = { id: string; name: string; firstLetter?: string; hot?: boolean }
type Topic = { id: string; name: string; hot?: boolean }

type Item = { id: string; name: string; deptId: string; topicId: string; hot?: boolean }
type ItemDetail = Item & {
  materials: string[]
  steps: string[]
  locationText: string
  workTimeText: string
  tips?: string[]
}

const server = Fastify({ logger: true })

await server.register(cors, { origin: true })

/** ====== Mock Data（原型阶段：后续换 DB/配置后台） ====== */
const config: AppConfig = {
  title: '政务服务触摸查询',
  subtitle: '请在下方操作区点击选择',
  idleSeconds: 90,
  bannerLines: [
    '温馨提示：本页面不需要键盘输入',
    '如无操作将自动返回首页',
  ],
  homeHotItems: [
    { id: 'i-001', name: '社保查询（示例）' },
    { id: 'i-002', name: '医保报销（示例）' },
    { id: 'i-003', name: '不动产登记（示例）' },
    { id: 'i-004', name: '企业开办（示例）' },
    { id: 'i-005', name: '公积金提取（示例）' },
    { id: 'i-006', name: '户籍业务（示例）' },
  ],
  nav: [
    { label: '首页', to: '/home' },
    { label: '返回', to: 'BACK' },
    { label: '重来', to: '/home?reset=1' },
    { label: '帮助', to: '/help' },
  ],
}

const depts: Dept[] = [
  { id: 'd-001', name: '人社局', firstLetter: 'R', hot: true },
  { id: 'd-002', name: '医保局', firstLetter: 'Y', hot: true },
  { id: 'd-003', name: '不动产登记中心', firstLetter: 'B' },
  { id: 'd-004', name: '市场监管局', firstLetter: 'S' },
]

const topics: Topic[] = [
  { id: 't-001', name: '社会保障', hot: true },
  { id: 't-002', name: '医疗卫生', hot: true },
  { id: 't-003', name: '住房与不动产' },
  { id: 't-004', name: '企业服务' },
]

const itemDetails: Record<string, ItemDetail> = {
  'i-001': {
    id: 'i-001',
    name: '社保查询（示例）',
    deptId: 'd-001',
    topicId: 't-001',
    hot: true,
    materials: ['身份证原件', '社保卡（如有）'],
    steps: ['取号排队', '窗口核验身份', '查询/反馈结果（本原型不含打印）'],
    locationText: '一楼 A 区 人社业务窗口（示例）',
    workTimeText: '工作日 09:00-12:00，13:30-17:00（示例）',
    tips: ['本页面为原型演示，内容可配置替换。'],
  },
  'i-002': {
    id: 'i-002',
    name: '医保报销（示例）',
    deptId: 'd-002',
    topicId: 't-002',
    hot: true,
    materials: ['身份证', '发票原件', '费用清单', '出院小结（如适用）'],
    steps: ['取号', '提交材料', '受理审核', '反馈结果'],
    locationText: '一楼 B 区 医保业务窗口（示例）',
    workTimeText: '工作日 09:00-12:00，13:30-17:00（示例）',
  },
  'i-003': {
    id: 'i-003',
    name: '不动产登记（示例）',
    deptId: 'd-003',
    topicId: 't-003',
    hot: true,
    materials: ['身份证', '不动产权属证明', '申请表（现场领取）'],
    steps: ['咨询引导', '窗口受理', '审核', '发证/通知'],
    locationText: '二楼 C 区 不动产登记窗口（示例）',
    workTimeText: '工作日 09:00-12:00，13:30-17:00（示例）',
  },
  'i-004': {
    id: 'i-004',
    name: '企业开办（示例）',
    deptId: 'd-004',
    topicId: 't-004',
    hot: true,
    materials: ['法人身份证', '公司名称备选', '经营范围说明'],
    steps: ['名称预核', '设立登记', '刻章/税务等联办（示例）'],
    locationText: '一楼 D 区 企业服务窗口（示例）',
    workTimeText: '工作日 09:00-12:00，13:30-17:00（示例）',
  },
  'i-005': {
    id: 'i-005',
    name: '公积金提取（示例）',
    deptId: 'd-001',
    topicId: 't-001',
    hot: true,
    materials: ['身份证', '银行卡', '提取原因相关材料（示例）'],
    steps: ['取号', '提交材料', '审核', '办结'],
    locationText: '一楼 A 区 公积金窗口（示例）',
    workTimeText: '工作日 09:00-12:00，13:30-17:00（示例）',
  },
  'i-006': {
    id: 'i-006',
    name: '户籍业务（示例）',
    deptId: 'd-004',
    topicId: 't-001',
    hot: true,
    materials: ['身份证', '户口簿（如有）', '相关证明材料（示例）'],
    steps: ['咨询', '取号', '窗口受理', '办结'],
    locationText: '一楼 E 区 综合窗口（示例）',
    workTimeText: '工作日 09:00-12:00，13:30-17:00（示例）',
  },
}

const items: Item[] = Object.values(itemDetails).map(({ materials, steps, locationText, workTimeText, tips, ...rest }) => rest)

/** ====== Routes ====== */
server.get('/api/health', async () => ({ ok: true }))

server.get('/api/config', async () => config)

server.get('/api/depts', async (req) => {
  const { hot, letter } = (req.query as any) ?? {}
  let list = [...depts]
  if (hot === '1') list = list.filter(d => d.hot)
  if (letter) list = list.filter(d => (d.firstLetter ?? '').toUpperCase() === String(letter).toUpperCase())
  return list
})

server.get('/api/topics', async (req) => {
  const { hot } = (req.query as any) ?? {}
  let list = [...topics]
  if (hot === '1') list = list.filter(t => t.hot)
  return list
})

server.get('/api/items', async (req) => {
  const { deptId, topicId, hot } = (req.query as any) ?? {}
  let list = [...items]
  if (deptId) list = list.filter(i => i.deptId === deptId)
  if (topicId) list = list.filter(i => i.topicId === topicId)
  if (hot === '1') list = list.filter(i => i.hot)
  return list
})

server.get('/api/items/:id', async (req, reply) => {
  const { id } = req.params as any
  const found = itemDetails[id]
  if (!found) return reply.code(404).send({ message: 'Not Found' })
  return found
})

server.post('/api/metrics/click', async (req) => {
  server.log.info({ metric: req.body }, 'click_metric')
  return { ok: true }
})

const port = Number(process.env.PORT || 3100)
const host = process.env.HOST || '0.0.0.0'
server.listen({ port, host })
