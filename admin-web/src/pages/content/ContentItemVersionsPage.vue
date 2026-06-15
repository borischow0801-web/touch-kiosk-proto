<template>
  <el-card shadow="never" v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>版本记录</span>
        <el-button @click="goBack">返回列表</el-button>
      </div>
    </template>

    <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" class="mb-12" />
    <el-alert
      v-if="versionWorkflowWarning"
      :title="versionWorkflowWarning"
      type="warning"
      show-icon
      :closable="false"
      class="mb-12"
    />
    <el-empty v-else-if="!loading && versions.length === 0" description="暂无版本记录" />

    <el-table v-else :data="versions" border stripe>
      <el-table-column prop="versionNo" label="版本号" width="90" />
      <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ ITEM_STATUS_LABELS[row.status] || row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="changeRemark" label="变更说明" min-width="160" show-overflow-tooltip />
      <el-table-column prop="createdBy" label="创建人" width="120">
        <template #default="{ row }">{{ row.createdBy || '—' }}</template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="360" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="openDetail(row.id)">查看</el-button>
          <template v-for="action in visibleVersionActions(row)" :key="action">
            <el-button
              type="primary"
              link
              :disabled="isVersionBusy"
              :loading="publishingVersionId === row.id"
              @click="onVersionPublishAction(action, row)"
            >
              {{ versionActionLabel(action) }}
            </el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="drawerVisible" title="版本详情（只读）" size="520px" destroy-on-close>
      <div v-loading="detailLoading">
        <el-alert v-if="detailError" :title="detailError" type="error" show-icon :closable="false" />
        <el-descriptions v-else-if="detail" :column="1" border>
          <el-descriptions-item label="版本号">{{ detail.versionNo }}</el-descriptions-item>
          <el-descriptions-item label="标题">{{ detail.title }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ ITEM_STATUS_LABELS[detail.status] || detail.status }}
          </el-descriptions-item>
          <el-descriptions-item label="变更说明">{{ detail.changeRemark || '—' }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ detail.createdBy || '—' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="摘要">{{ detail.summary || '—' }}</el-descriptions-item>
          <el-descriptions-item label="正文">
            <pre class="body-pre">{{ detail.body || '—' }}</pre>
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.extraJson" label="扩展 JSON">
            <pre class="body-pre">{{ detail.extraJson }}</pre>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>

    <PublishCommentDialog
      v-model="commentDialogVisible"
      :title="commentDialogTitle"
      :required="commentDialogRequired"
      :placeholder="commentDialogPlaceholder"
      :busy="commentDialogBusy"
      @confirm="onCommentDialogConfirm"
    />
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ApiError } from '@/api/http'
import { fetchItemVersionsApi, fetchVersionApi } from '@/api/content/items'
import type { VersionDetail, VersionListItem } from '@/api/content/types'
import {
  approveContentPublishApi,
  directPublishContentApi,
  rejectContentPublishApi,
  rollbackContentPublishApi,
  submitContentPublishApi,
} from '@/api/publish/content'
import PublishCommentDialog from '@/components/publish/PublishCommentDialog.vue'
import { usePermission } from '@/composables/usePermission'
import { ITEM_STATUS_LABELS } from '@/constants/content'
import {
  PUBLISH_ACTION_LABELS,
  PUBLISH_CONFIRM_MESSAGES,
  PUBLISH_PERMISSIONS,
  publishStatusLabel,
} from '@/constants/publish'
import { formatDateTime } from '@/utils/contentForm'
import {
  getVersionWorkflowWarning,
  publishActionAllowsComment,
  publishActionCommentRequired,
  versionPublishActionsForRow,
  type VersionPublishActionType,
} from '@/utils/publishActions'

const VERSION_ACTION_LABELS: Record<VersionPublishActionType, string> = {
  submit: PUBLISH_ACTION_LABELS.submit,
  directPublish: PUBLISH_ACTION_LABELS.directPublish,
  approve: PUBLISH_ACTION_LABELS.approve,
  reject: PUBLISH_ACTION_LABELS.reject,
  rollback: '回滚',
}

const VERSION_ACTION_PERMISSION: Record<VersionPublishActionType, string> = {
  submit: PUBLISH_PERMISSIONS.submit,
  directPublish: PUBLISH_PERMISSIONS.directPublish,
  approve: PUBLISH_PERMISSIONS.approve,
  reject: PUBLISH_PERMISSIONS.reject,
  rollback: 'publish:rollback',
}

const route = useRoute()
const router = useRouter()
const perm = usePermission()
const itemId = route.params.id as string

const loading = ref(false)
const errorMsg = ref('')
const versions = ref<VersionListItem[]>([])
const publishingVersionId = ref<string | null>(null)
const isVersionBusy = computed(() => publishingVersionId.value !== null)
const versionWorkflowWarning = computed(() => getVersionWorkflowWarning(versions.value))

const commentDialogVisible = ref(false)
const commentDialogTitle = ref('')
const commentDialogRequired = ref(false)
const commentDialogPlaceholder = ref('')
const commentDialogBusy = ref(false)
const pendingVersionAction = ref<{
  action: VersionPublishActionType
  row: VersionListItem
} | null>(null)
const rollbackTarget = ref<VersionListItem | null>(null)

const drawerVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detail = ref<VersionDetail | null>(null)

function versionActionLabel(action: VersionPublishActionType): string {
  return VERSION_ACTION_LABELS[action]
}

function hasVersionPublishPermission(action: VersionPublishActionType): boolean {
  return perm.hasPermission(VERSION_ACTION_PERMISSION[action])
}

function visibleVersionActions(row: VersionListItem): VersionPublishActionType[] {
  return versionPublishActionsForRow(row, versions.value).filter((a) =>
    hasVersionPublishPermission(a),
  )
}

async function loadVersions(): Promise<void> {
  loading.value = true
  errorMsg.value = ''
  try {
    versions.value = await fetchItemVersionsApi(itemId)
  } catch (e) {
    versions.value = []
    errorMsg.value = e instanceof ApiError ? e.message : '加载版本列表失败'
  } finally {
    loading.value = false
  }
}

async function openDetail(versionId: string): Promise<void> {
  drawerVisible.value = true
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  try {
    detail.value = await fetchVersionApi(versionId)
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '加载版本详情失败'
  } finally {
    detailLoading.value = false
  }
}

async function onVersionPublishAction(
  action: VersionPublishActionType,
  row: VersionListItem,
): Promise<void> {
  if (isVersionBusy.value) return

  if (action === 'rollback') {
    await startRollback(row)
    return
  }

  if (publishActionAllowsComment(action) && publishActionCommentRequired(action)) {
    pendingVersionAction.value = { action, row }
    commentDialogTitle.value = VERSION_ACTION_LABELS[action]
    commentDialogRequired.value = true
    commentDialogPlaceholder.value = '请输入驳回意见'
    commentDialogVisible.value = true
    return
  }

  if (publishActionAllowsComment(action) && action === 'approve') {
    pendingVersionAction.value = { action, row }
    commentDialogTitle.value = VERSION_ACTION_LABELS[action]
    commentDialogRequired.value = false
    commentDialogPlaceholder.value = '请输入意见说明（可选）'
    commentDialogVisible.value = true
    return
  }

  try {
    await ElMessageBox.confirm(PUBLISH_CONFIRM_MESSAGES[action], '操作确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  await executeVersionPublish(action, row)
}

async function startRollback(row: VersionListItem): Promise<void> {
  const statusLabel = publishStatusLabel(row.status)
  const timeLabel = formatDateTime(row.createdAt)
  try {
    await ElMessageBox.confirm(
      `确定基于以下版本创建新的草稿？\n\n版本号：${row.versionNo}\n状态：${statusLabel}（${row.status}）\n创建时间：${timeLabel}\n\n回滚将复制该版本内容为新草稿，不会修改或删除历史版本。`,
      '回滚确认',
      {
        type: 'warning',
        confirmButtonText: '确认回滚',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }
  pendingVersionAction.value = { action: 'rollback', row }
  rollbackTarget.value = row
  commentDialogTitle.value = '版本回滚'
  commentDialogRequired.value = false
  commentDialogPlaceholder.value = '请输入回滚说明（可选）'
  commentDialogVisible.value = true
}

async function onCommentDialogConfirm(comment: string): Promise<void> {
  const pending = pendingVersionAction.value
  if (!pending || commentDialogBusy.value) return
  commentDialogBusy.value = true
  try {
    await executeVersionPublish(pending.action, pending.row, comment)
    commentDialogVisible.value = false
    pendingVersionAction.value = null
    rollbackTarget.value = null
  } finally {
    commentDialogBusy.value = false
  }
}

async function executeVersionPublish(
  action: VersionPublishActionType,
  row: VersionListItem,
  comment?: string,
): Promise<void> {
  if (publishingVersionId.value) return
  publishingVersionId.value = row.id
  try {
    const payload = {
      versionId: row.id,
      ...(comment ? { comment } : {}),
    }
    switch (action) {
      case 'submit':
        await submitContentPublishApi(itemId, payload)
        ElMessage.success('已提交审核')
        break
      case 'approve':
        await approveContentPublishApi(itemId, payload)
        ElMessage.success('审核通过')
        break
      case 'reject':
        await rejectContentPublishApi(itemId, payload)
        ElMessage.success('已驳回')
        break
      case 'directPublish':
        await directPublishContentApi(itemId, payload)
        ElMessage.success('已直接发布')
        break
      case 'rollback':
        await rollbackContentPublishApi(itemId, {
          versionId: row.id,
          comment: comment || undefined,
        })
        ElMessage.success('已创建新的草稿版本')
        break
      default:
        return
    }
    await loadVersions()
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '操作失败')
  } finally {
    publishingVersionId.value = null
  }
}

function goBack(): void {
  void router.push('/content/items')
}

onMounted(() => {
  void loadVersions()
})
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mb-12 {
  margin-bottom: 12px;
}

.body-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
}
</style>
