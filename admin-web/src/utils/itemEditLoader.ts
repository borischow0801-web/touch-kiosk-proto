import { ApiError } from '@/api/http'
import {
  fetchItemApi,
  fetchItemVersionsApi,
  fetchVersionApi,
} from '@/api/content/items'
import type { ItemDetail, VersionListItem } from '@/api/content/types'
import type { ContentType } from '@/constants/content'

export interface ItemEditFormData {
  contentType: ContentType
  categoryId: string
  title: string
  subtitle: string
  summary: string
  body: string
  extraJson: string
  sortOrder: number
  isTop: 0 | 1
  isRecommend: 0 | 1
  sourceType: string
  sourceUrl: string
  status: string
  canEditVersionFields: boolean
  versionReadDenied: boolean
}

export function pickLatestVersion(versions: VersionListItem[]): VersionListItem | null {
  if (versions.length === 0) return null
  return versions.reduce((latest, cur) => (cur.versionNo > latest.versionNo ? cur : latest))
}

export async function loadItemEditFormData(
  itemId: string,
  canReadVersion: boolean,
): Promise<ItemEditFormData> {
  const item = await fetchItemApi(itemId)
  const base = mapItemToFormBase(item)

  if (!canReadVersion) {
    return {
      ...base,
      title: item.title,
      summary: item.summary ?? '',
      body: '',
      extraJson: '',
      canEditVersionFields: false,
      versionReadDenied: true,
    }
  }

  const versions = await fetchItemVersionsApi(itemId)
  const latest = pickLatestVersion(versions)
  if (!latest) {
    return {
      ...base,
      title: item.title,
      summary: item.summary ?? '',
      body: '',
      extraJson: '',
      canEditVersionFields: true,
      versionReadDenied: false,
    }
  }

  const detail = await fetchVersionApi(latest.id)
  return {
    ...base,
    title: detail.title,
    summary: detail.summary ?? '',
    body: detail.body ?? '',
    extraJson: detail.extraJson ?? '',
    canEditVersionFields: true,
    versionReadDenied: false,
  }
}

function mapItemToFormBase(item: ItemDetail): Omit<
  ItemEditFormData,
  'title' | 'summary' | 'body' | 'extraJson' | 'canEditVersionFields' | 'versionReadDenied'
> {
  return {
    contentType: item.contentType as ContentType,
    categoryId: item.categoryId ?? '',
    subtitle: item.subtitle ?? '',
    sortOrder: item.sortOrder,
    isTop: item.isTop as 0 | 1,
    isRecommend: item.isRecommend as 0 | 1,
    sourceType: item.sourceType ?? '',
    sourceUrl: item.sourceUrl ?? '',
    status: item.status,
  }
}
