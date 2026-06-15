import type { PublicItemDetailDto } from './types/public-service-guide.types';
import type { UpstreamItemDetail } from './types/upstream.types';
import type { GuideRelatedContentItem } from './guide-related-content.service';

export function mapUpstreamDetailToPublic(
  upstream: UpstreamItemDetail,
  related: {
    policies: GuideRelatedContentItem[];
    faqs: GuideRelatedContentItem[];
  },
): PublicItemDetailDto {
  return {
    basicInfo: {
      itemId: upstream.basicInfo.itemId,
      name: upstream.basicInfo.name,
      deptName: upstream.basicInfo.deptName,
      themeNames: upstream.basicInfo.themeNames ?? [],
      summary: upstream.basicInfo.summary,
    },
    acceptConditions: upstream.acceptConditions ?? [],
    materials: upstream.materials ?? [],
    processSteps: upstream.processSteps ?? [],
    locations: upstream.locations ?? [],
    workTime: upstream.workTime ?? '',
    timeLimit: upstream.timeLimit ?? '',
    fee: upstream.fee ?? '',
    legalBasis: upstream.legalBasis ?? [],
    consultationPhone: upstream.consultationPhone ?? '',
    complaintPhone: upstream.complaintPhone ?? '',
    relatedPolicies: related.policies.map((p) => ({ id: p.id, title: p.title })),
    relatedFaqs: related.faqs.map((f) => ({ id: f.id, title: f.title })),
  };
}
