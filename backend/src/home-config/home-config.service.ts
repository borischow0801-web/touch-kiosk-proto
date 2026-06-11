import { Injectable } from '@nestjs/common';

@Injectable()
export class HomeConfigService {
  getPublicConfig() {
    return {
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
    };
  }
}
