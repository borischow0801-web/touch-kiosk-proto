import { Injectable, NotFoundException } from '@nestjs/common';
import {
  createPageResult,
  type PageResult,
} from '../common/dto/page-result.dto';
import type { ItemsQueryDto } from './dto/items-query.dto';

export interface PublicDept {
  deptCode: string;
  name: string;
  firstLetter?: string;
  hot?: boolean;
}

export interface PublicTheme {
  themeCode: string;
  name: string;
  hot?: boolean;
}

export interface PublicItemType {
  code: string;
  name: string;
}

export interface PublicItem {
  itemId: string;
  name: string;
  deptCode: string;
  themeCode: string;
  itemTypeCode?: string;
  hot?: boolean;
}

export interface PublicItemDetailDto {
  basicInfo: {
    itemId: string;
    name: string;
    deptName: string;
    themeNames: string[];
    summary?: string;
  };
  acceptConditions: string[];
  materials: { name: string; required: boolean; note?: string }[];
  processSteps: { step: number; name: string; description?: string }[];
  locations: { name: string; address?: string; floor?: string; area?: string }[];
  workTime: string;
  timeLimit: string;
  fee: string;
  legalBasis: string[];
  consultationPhone: string;
  complaintPhone: string;
  relatedPolicies: { id: string; title: string }[];
  relatedFaqs: { id: string; title: string }[];
}

@Injectable()
export class ServiceGuideService {
  private readonly depts: PublicDept[] = [
    { deptCode: 'd-001', name: '人社局', firstLetter: 'R', hot: true },
    { deptCode: 'd-002', name: '医保局', firstLetter: 'Y', hot: true },
    { deptCode: 'd-003', name: '不动产登记中心', firstLetter: 'B' },
    { deptCode: 'd-004', name: '市场监管局', firstLetter: 'S' },
  ];

  private readonly themes: PublicTheme[] = [
    { themeCode: 't-001', name: '社会保障', hot: true },
    { themeCode: 't-002', name: '医疗卫生', hot: true },
    { themeCode: 't-003', name: '住房与不动产' },
    { themeCode: 't-004', name: '企业服务' },
  ];

  private readonly defaultItemTypes: PublicItemType[] = [
    { code: 'apply', name: '申请办理' },
    { code: 'query', name: '查询咨询' },
    { code: 'cert', name: '证明开具' },
  ];

  private readonly items: PublicItem[] = [
    { itemId: 'i-001', name: '社保查询（示例）', deptCode: 'd-001', themeCode: 't-001', itemTypeCode: 'query', hot: true },
    { itemId: 'i-002', name: '医保报销（示例）', deptCode: 'd-002', themeCode: 't-002', itemTypeCode: 'apply', hot: true },
    { itemId: 'i-003', name: '不动产登记（示例）', deptCode: 'd-003', themeCode: 't-003', itemTypeCode: 'apply', hot: true },
    { itemId: 'i-004', name: '企业开办（示例）', deptCode: 'd-004', themeCode: 't-004', itemTypeCode: 'apply', hot: true },
    { itemId: 'i-005', name: '公积金提取（示例）', deptCode: 'd-001', themeCode: 't-001', itemTypeCode: 'apply', hot: true },
    { itemId: 'i-006', name: '户籍业务（示例）', deptCode: 'd-004', themeCode: 't-001', itemTypeCode: 'apply', hot: true },
  ];

  private readonly itemDetails: Record<string, PublicItemDetailDto> = {
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
      relatedPolicies: [],
      relatedFaqs: [],
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
      relatedPolicies: [],
      relatedFaqs: [],
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
      relatedPolicies: [],
      relatedFaqs: [],
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
      relatedPolicies: [],
      relatedFaqs: [],
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
      relatedPolicies: [],
      relatedFaqs: [],
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
      relatedPolicies: [],
      relatedFaqs: [],
    },
  };

  // ── Lookup helpers used by StatsController for semantic validation ──────────

  existsItemId(id: string): boolean {
    return this.items.some((i) => i.itemId === id);
  }

  existsDeptCode(code: string): boolean {
    return this.depts.some((d) => d.deptCode === code);
  }

  existsThemeCode(code: string): boolean {
    return this.themes.some((t) => t.themeCode === code);
  }

  existsItemTypeCode(code: string): boolean {
    return this.defaultItemTypes.some((t) => t.code === code);
  }

  // ── Query methods ────────────────────────────────────────────────────────────

  getDepts(hot?: string): PublicDept[] {
    let list = [...this.depts];
    if (hot === '1') list = list.filter((d) => d.hot);
    return list;
  }

  getThemes(hot?: string): PublicTheme[] {
    let list = [...this.themes];
    if (hot === '1') list = list.filter((t) => t.hot);
    return list;
  }

  getItemTypes(code: string, by: 'dept' | 'theme'): PublicItemType[] {
    const exists =
      by === 'dept'
        ? this.depts.some((d) => d.deptCode === code)
        : this.themes.some((t) => t.themeCode === code);
    if (!exists) {
      throw new NotFoundException(
        `${by === 'dept' ? '部门' : '主题'} ${code} 不存在`,
      );
    }
    // Return only types that have at least one item under this dept/theme
    const usedCodes = new Set(
      this.items
        .filter((i) =>
          by === 'dept' ? i.deptCode === code : i.themeCode === code,
        )
        .map((i) => i.itemTypeCode)
        .filter((c): c is string => Boolean(c)),
    );
    return this.defaultItemTypes.filter((t) => usedCodes.has(t.code));
  }

  getItems(query: ItemsQueryDto): PageResult<PublicItem> {
    let list = [...this.items];
    if (query.deptCode) list = list.filter((i) => i.deptCode === query.deptCode);
    if (query.themeCode) list = list.filter((i) => i.themeCode === query.themeCode);
    if (query.itemTypeCode) list = list.filter((i) => i.itemTypeCode === query.itemTypeCode);
    const total = list.length;
    const start = (query.page - 1) * query.pageSize;
    return createPageResult(list.slice(start, start + query.pageSize), total, query.page, query.pageSize);
  }

  getItemDetail(itemId: string): PublicItemDetailDto {
    const found = this.itemDetails[itemId];
    if (!found) throw new NotFoundException(`事项 ${itemId} 不存在`);
    return found;
  }
}
