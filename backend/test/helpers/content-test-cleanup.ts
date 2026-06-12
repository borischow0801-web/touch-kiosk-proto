import { DataSource } from 'typeorm';
import { ContentItem } from '../../src/database/entities/content-item.entity';
import { ContentVersion } from '../../src/database/entities/content-version.entity';
import { PublishRecord } from '../../src/database/entities/publish-record.entity';

/** Remove test content rows respecting current_version_id FK. */
export async function deleteContentItemsWithVersions(
  dataSource: DataSource,
  itemIds: string[],
): Promise<void> {
  if (itemIds.length === 0) return;
  const manager = dataSource.manager;
  for (const itemId of itemIds) {
    await manager.delete(PublishRecord, { bizId: itemId });
    await manager.update(ContentItem, itemId, { currentVersionId: null });
    await manager.delete(ContentVersion, { contentId: itemId });
  }
  await manager.delete(ContentItem, itemIds);
}
