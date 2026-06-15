/** Internal upstream shapes — never exposed via Public API. */

export interface UpstreamItemType {
  code: string;
  name: string;
}

export interface UpstreamItem {
  itemId: string;
  name: string;
  deptCode: string;
  themeCode: string;
  itemTypeCode?: string;
}

export interface UpstreamItemListResult {
  list: UpstreamItem[];
  total: number;
}

/** Query scope for upstream item list — pagination is applied after visibility filtering in service layer. */
export interface UpstreamItemQueryParams {
  deptCode?: string;
  themeCode?: string;
  itemTypeCode?: string;
}

export interface UpstreamItemDetail {
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
}
