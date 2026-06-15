/** Stable public response shapes — must remain compatible with kiosk-app. */

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
