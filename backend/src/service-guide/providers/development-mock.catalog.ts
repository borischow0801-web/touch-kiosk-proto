/**
 * Explicitly marked development / example data.
 * Used only by DevelopmentMockServiceGuideProvider and exists* fallbacks.
 * NOT a real shared-platform response.
 */
import type { UpstreamItemDetail } from '../types/upstream.types';
import type { PublicDept, PublicItem, PublicItemType, PublicTheme } from '../types/public-service-guide.types';
import { normalizeGuideCode } from '../../guide-config/utils/normalize-guide-code.util';

export const DEVELOPMENT_MOCK_MARKER = '__DEVELOPMENT_MOCK_EXAMPLE_DATA__' as const;

export const DEVELOPMENT_MOCK_DEPTS: PublicDept[] = [
  { deptCode: 'd-001', name: '人社局', firstLetter: 'R', hot: true },
  { deptCode: 'd-002', name: '医保局', firstLetter: 'Y', hot: true },
  { deptCode: 'd-003', name: '不动产登记中心', firstLetter: 'B' },
  { deptCode: 'd-004', name: '市场监管局', firstLetter: 'S' },
];

export const DEVELOPMENT_MOCK_THEMES: PublicTheme[] = [
  { themeCode: 't-001', name: '社会保障', hot: true },
  { themeCode: 't-002', name: '医疗卫生', hot: true },
  { themeCode: 't-003', name: '住房与不动产' },
  { themeCode: 't-004', name: '企业服务' },
];

export const DEVELOPMENT_MOCK_ITEM_TYPES: PublicItemType[] = [
  { code: 'apply', name: '申请办理' },
  { code: 'query', name: '查询咨询' },
  { code: 'cert', name: '证明开具' },
];

export const DEVELOPMENT_MOCK_ITEMS: PublicItem[] = [
  { itemId: 'i-001', name: '社保查询（示例）', deptCode: 'd-001', themeCode: 't-001', itemTypeCode: 'query', hot: true },
  { itemId: 'i-002', name: '医保报销（示例）', deptCode: 'd-002', themeCode: 't-002', itemTypeCode: 'apply', hot: true },
  { itemId: 'i-003', name: '不动产登记（示例）', deptCode: 'd-003', themeCode: 't-003', itemTypeCode: 'apply', hot: true },
  { itemId: 'i-004', name: '企业开办（示例）', deptCode: 'd-004', themeCode: 't-004', itemTypeCode: 'apply', hot: true },
  { itemId: 'i-005', name: '公积金提取（示例）', deptCode: 'd-001', themeCode: 't-001', itemTypeCode: 'apply', hot: true },
  { itemId: 'i-006', name: '户籍业务（示例）', deptCode: 'd-004', themeCode: 't-001', itemTypeCode: 'apply', hot: true },
];

export const DEVELOPMENT_MOCK_ITEM_DETAILS: Record<string, UpstreamItemDetail> = {
  'i-001': {
    basicInfo: { itemId: 'i-001', name: '社保查询（示例）', deptName: '人社局', themeNames: ['社会保障'] },
    acceptConditions: ['年满16周岁', '有缴费记录的参保人员'],
    materials: [
      { name: '身份证原件', required: true },
      { name: '社保卡', required: false, note: '如有' },
    ],
    processSteps: [
      { step: 1, name: '取号排队' },
      { step: 2, name: '窗口核验身份' },
      { step: 3, name: '查询反馈结果' },
    ],
    locations: [{ name: '人社业务窗口', floor: '一楼', area: 'A区' }],
    workTime: '工作日 09:00-12:00，13:30-17:00（示例）',
    timeLimit: '即时办结',
    fee: '免费',
    legalBasis: [],
    consultationPhone: '12333',
    complaintPhone: '',
  },
  'i-002': {
    basicInfo: { itemId: 'i-002', name: '医保报销（示例）', deptName: '医保局', themeNames: ['医疗卫生'] },
    acceptConditions: [],
    materials: [
      { name: '身份证', required: true },
      { name: '发票原件', required: true },
      { name: '费用清单', required: true },
      { name: '出院小结', required: false, note: '如适用' },
    ],
    processSteps: [
      { step: 1, name: '取号' },
      { step: 2, name: '提交材料' },
      { step: 3, name: '受理审核' },
      { step: 4, name: '反馈结果' },
    ],
    locations: [{ name: '医保业务窗口', floor: '一楼', area: 'B区' }],
    workTime: '工作日 09:00-12:00，13:30-17:00（示例）',
    timeLimit: '5个工作日',
    fee: '免费',
    legalBasis: [],
    consultationPhone: '12345',
    complaintPhone: '',
  },
  'i-003': {
    basicInfo: { itemId: 'i-003', name: '不动产登记（示例）', deptName: '不动产登记中心', themeNames: ['住房与不动产'] },
    acceptConditions: [],
    materials: [
      { name: '身份证', required: true },
      { name: '不动产权属证明', required: true },
      { name: '申请表', required: true, note: '现场领取' },
    ],
    processSteps: [
      { step: 1, name: '咨询引导' },
      { step: 2, name: '窗口受理' },
      { step: 3, name: '审核' },
      { step: 4, name: '发证/通知' },
    ],
    locations: [{ name: '不动产登记窗口', floor: '二楼', area: 'C区' }],
    workTime: '工作日 09:00-12:00，13:30-17:00（示例）',
    timeLimit: '15个工作日',
    fee: '免费',
    legalBasis: [],
    consultationPhone: '12345',
    complaintPhone: '',
  },
  'i-004': {
    basicInfo: { itemId: 'i-004', name: '企业开办（示例）', deptName: '市场监管局', themeNames: ['企业服务'] },
    acceptConditions: [],
    materials: [
      { name: '法人身份证', required: true },
      { name: '公司名称备选', required: true },
      { name: '经营范围说明', required: true },
    ],
    processSteps: [
      { step: 1, name: '名称预核' },
      { step: 2, name: '设立登记' },
      { step: 3, name: '刻章/税务等联办（示例）' },
    ],
    locations: [{ name: '企业服务窗口', floor: '一楼', area: 'D区' }],
    workTime: '工作日 09:00-12:00，13:30-17:00（示例）',
    timeLimit: '3个工作日',
    fee: '免费',
    legalBasis: [],
    consultationPhone: '12345',
    complaintPhone: '',
  },
  'i-005': {
    basicInfo: { itemId: 'i-005', name: '公积金提取（示例）', deptName: '人社局', themeNames: ['社会保障'] },
    acceptConditions: [],
    materials: [
      { name: '身份证', required: true },
      { name: '银行卡', required: true },
      { name: '提取原因相关材料', required: true, note: '示例' },
    ],
    processSteps: [
      { step: 1, name: '取号' },
      { step: 2, name: '提交材料' },
      { step: 3, name: '审核' },
      { step: 4, name: '办结' },
    ],
    locations: [{ name: '公积金窗口', floor: '一楼', area: 'A区' }],
    workTime: '工作日 09:00-12:00，13:30-17:00（示例）',
    timeLimit: '即时办结',
    fee: '免费',
    legalBasis: [],
    consultationPhone: '12329',
    complaintPhone: '',
  },
  'i-006': {
    basicInfo: { itemId: 'i-006', name: '户籍业务（示例）', deptName: '市场监管局', themeNames: ['社会保障'] },
    acceptConditions: [],
    materials: [
      { name: '身份证', required: true },
      { name: '户口簿', required: false, note: '如有' },
      { name: '相关证明材料', required: false, note: '示例' },
    ],
    processSteps: [
      { step: 1, name: '咨询' },
      { step: 2, name: '取号' },
      { step: 3, name: '窗口受理' },
      { step: 4, name: '办结' },
    ],
    locations: [{ name: '综合窗口', floor: '一楼', area: 'E区' }],
    workTime: '工作日 09:00-12:00，13:30-17:00（示例）',
    timeLimit: '即时办结',
    fee: '免费',
    legalBasis: [],
    consultationPhone: '12345',
    complaintPhone: '',
  },
};

export function developmentMockHasItemId(id: string): boolean {
  return DEVELOPMENT_MOCK_ITEMS.some((i) => i.itemId === id);
}

export function developmentMockHasDeptCode(code: string): boolean {
  const normalized = normalizeGuideCode(code);
  return DEVELOPMENT_MOCK_DEPTS.some((d) => normalizeGuideCode(d.deptCode) === normalized);
}

export function developmentMockHasThemeCode(code: string): boolean {
  const normalized = normalizeGuideCode(code);
  return DEVELOPMENT_MOCK_THEMES.some((t) => normalizeGuideCode(t.themeCode) === normalized);
}

export function developmentMockHasItemTypeCode(code: string): boolean {
  return DEVELOPMENT_MOCK_ITEM_TYPES.some((t) => t.code === code);
}
