/** 群众端政务公开列表项（不含后台字段） */
export interface PublicContentListItem {
  id: string;
  contentType: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  categoryId: string | null;
  coverFileId: string | null;
  publishAt: Date | null;
  sourceType: string | null;
  sourceUrl: string | null;
}

/** 群众端政务公开详情（正文来自 current_version_id 指向版本） */
export interface PublicContentDetail extends PublicContentListItem {
  body: string | null;
}
