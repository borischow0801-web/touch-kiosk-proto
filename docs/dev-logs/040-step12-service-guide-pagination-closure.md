# 040 · Step 12 办事指南分页语义修复

**交付日期**：2026-06-15  
**基于**：039-step12-service-guide-acceptance-closure.md  
**状态**：✅ 分页语义修复与测试完成；**不得宣称 Step 12 最终运行验收已完成**

---

## 一、问题

039 阶段 `getItems` 流程为：

1. Provider 按 `page`/`pageSize` 分页返回上游列表  
2. 再对当前页做 `is_visible` 过滤  
3. 用 `upstream.total - 当前页隐藏数` 估算 total  

导致：

- `total` 不准确（仅扣当前页隐藏项）  
- 前一页因隐藏未填满，后一页可见数据被“截断”  
- 可能出现 total 显示仍有数据但末页为空  

---

## 二、分页过滤方案

```mermaid
flowchart LR
  A[群众端 page/pageSize] --> B[Provider.fetchItemListScope]
  B --> C[查询范围内全量上游事项]
  C --> D[GuideCache 按 scope 缓存]
  D --> E[filterPublicItems 可见性过滤]
  E --> F[paginateFilteredList 内存分页]
  F --> G[enrichItemsWithConfigFlags]
  G --> H[PageResult list/total/page/pageSize]
```

### 关键调整

| 层级 | 变更 |
|---|---|
| `ServiceGuideProvider` | `fetchItemList` → **`fetchItemListScope`**，参数移除 `page`/`pageSize` |
| 上游缓存 | `item_list` 的 `cache_key` 仅含 `deptCode`/`themeCode`/`itemTypeCode`，不含分页参数 |
| `ServiceGuideService` | 先过滤可见性，再 `paginateFilteredList` 切片 |
| `DevelopmentMockServiceGuideProvider` | 返回 scope 内全量示例事项，不再内部 slice |
| `RealServiceGuideProvider` | 仍未实现，继续明确失败 |

**不暴露**内部可见 ID 给群众端；不向共享平台发起真实调用；无定时/全量同步。

---

## 三、total 计算依据

```
visibleList = filterPublicItems(upstream.list)
total       = visibleList.length
list        = visibleList.slice((page-1)*pageSize, page*pageSize)
```

- `total` 为**过滤后**的精确总数。  
- 超出末页时 `list=[]`，`total` 仍保持过滤后总数（符合 api-spec 分页语义）。  
- 可见性规则不变：  
  - `is_visible=0` → 始终隐藏  
  - development mock + 未配置示例事项 → 可见  
  - 非 mock + 未配置 → 保守隐藏  
  - 列表与详情共用 `isItemPubliclyVisible` / `requirePublicItem`

---

## 四、实际修改文件

| 路径 | 说明 |
|---|---|
| `backend/src/service-guide/types/upstream.types.ts` | `UpstreamItemQueryParams`（无分页字段） |
| `backend/src/service-guide/providers/service-guide-provider.interface.ts` | `fetchItemListScope` |
| `backend/src/service-guide/providers/development-mock.service-guide.provider.ts` | 返回 scope 全量 |
| `backend/src/service-guide/providers/real-service-guide.provider.ts` | 接口同步 |
| `backend/src/service-guide/guide-public-item-pagination.util.ts` | **新增** 过滤后分页工具 |
| `backend/src/service-guide/service-guide.service.ts` | 先过滤后分页 |
| `backend/test/service-guide-public.spec.ts` | 分页与 total 用例 + 缓存键调整 |

---

## 五、新增测试场景（+7）

| 场景 | 验证点 |
|---|---|
| 隐藏事项位于第一页 | `pageSize=1` 时首条为首个可见项 `pg-v1`，非 `pg-h1` |
| 隐藏事项位于后续页 | 第 2 页仍能凑满可见项 |
| 多个隐藏跨页分布 | 3 页 `pageSize=2`，逐页 ID 序列正确 |
| pageSize 边界 | `pageSize=5` 一次取齐 5 条可见项 |
| total 准确 | 5 个可见 / 3 个隐藏 → `total=5` |
| 末页不为空 | 第 3 页仍有 1 条可见项 |
| 超出末页 | `page=10` → `list=[]`，`total=5` |
| 非 mock 未配置不可见 | `isDevelopmentMock=false` 且无配置 → `total=0` |

**回归**：缓存、Provider 生产安全、可见性、关联内容等 **547** 项 backend 测试全部通过。

---

## 六、完整验证结果

| 命令 | 结果 |
|---|---|
| `cd backend && npm run type-check` | ✅ |
| `cd backend && npm run build` | ✅ |
| `cd backend && npm test -- --runInBand` | ✅ **547 passed**，35 skipped |
| `cd admin-web && npm test -- --run` | ✅ 160 passed |
| `cd admin-web && npm run build` | ✅ |
| `cd kiosk-app/tests && npm test -- --run` | ✅ 91 passed |
| `cd kiosk-app && npm run build` | ✅ |

**未执行**数据库 migration / seed / 建库 / 授权。

---

## 七、运行阻断（与 039 一致）

本机 `touch_kiosk_dev` 仍缺少 guide 相关表（`guide_dept_mapping` 等），HTTP 业务成功链路**尚未**实测通过。

**HTTP 成功链路仍需由 Codex 在完成数据库迁移后验证**，包括但不限于：

- `GET /api/public/service-guide/depts`
- `GET /api/public/service-guide/themes`
- `GET /api/public/service-guide/items`（多页 total/末页语义）
- `GET /api/public/service-guide/items/:itemId`

---

## 八、风险与未完成项

| 项 | 说明 |
|---|---|
| scope 全量缓存 | 单 scope 事项量极大时，内存过滤与缓存体积需后续与真实平台协议协同优化 |
| 真实 Provider | 无正式文档，未实现 scope 拉取 |
| 最终运行验收 | 分页逻辑已由单元测试覆盖，**不得宣称 Step 12 已完成最终运行验收** |

---

**分页语义修复交付完成；待数据库迁移后的 HTTP 多页冒烟由 Codex 继续。**
