<template>
  <el-card shadow="never" v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>内容列表</span>
        <el-button v-if="perm.canCreateItem" type="primary" @click="goCreate">新建内容</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-form" @submit.prevent="onSearch">
      <el-form-item label="标题">
        <el-input v-model="filters.title" clearable placeholder="模糊搜索" style="width: 160px" />
      </el-form-item>
      <el-form-item label="内容类型">
        <el-select v-model="filters.contentType" clearable placeholder="全部" style="width: 150px">
          <el-option
            v-for="t in CONTENT_TYPES"
            :key="t"
            :label="CONTENT_TYPE_LABELS[t]"
            :value="t"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" clearable placeholder="全部" style="width: 120px">
          <el-option
            v-for="(label, key) in ITEM_STATUS_LABELS"
            :key="key"
            :label="label"
            :value="key"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="分类">
        <el-select v-model="filters.categoryId" clearable placeholder="全部" style="width: 160px">
          <el-option
            v-for="c in categoryOptions"
            :key="c.id"
            :label="c.categoryName"
            :value="c.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" class="mb-12" />
    <el-empty v-else-if="!loading && list.length === 0" description="暂无内容" />

    <template v-else>
      <el-table :data="list" border stripe>
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="内容类型" width="120">
          <template #default="{ row }">
            {{ CONTENT_TYPE_LABELS[row.contentType as ContentType] || row.contentType }}
          </template>
        </el-table-column>
        <el-table-column label="分类" width="140">
          <template #default="{ row }">{{ categoryNameMap[row.categoryId ?? ''] || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ ITEM_STATUS_LABELS[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button v-if="perm.canUpdateItem" type="primary" link @click="goEdit(row.id)">编辑</el-button>
            <el-button v-if="perm.canReadVersion" type="primary" link @click="goVersions(row.id)">版本</el-button>
            <template v-for="action in visiblePublishActions(row.status)" :key="action">
              <el-button
                type="primary"
                link
                :disabled="publishingId === row.id"
                @click="onPublishAction(action, row)"
              >
                {{ PUBLISH_ACTION_LABELS[action] }}
              </el-button>
            </template>
            <el-button v-if="perm.canDeleteItem" type="danger" link @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="loadList"
          @size-change="onSearch"
        />
      </div>
    </template>

    <PublishCommentDialog
      v-model="commentDialogVisible"
      :title="commentDialogTitle"
      :required="commentDialogRequired"
      :placeholder="commentDialogPlaceholder"
      :busy="commentDialogBusy"
      @confirm="onCommentDialogConfirm"
    />

    <PublishRecordsDialog
      v-if="recordsDialogVisible"
      v-model="recordsDialogVisible"
      :biz-id="recordsBizId"
    />
  </el-card>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ApiError } from '@/api/http'
import { fetchAllCategoriesApi } from '@/api/content/categories'
import { deleteItemApi, fetchItemsApi } from '@/api/content/items'
import type { CategoryListItem, ItemListItem } from '@/api/content/types'
import {
  approveContentPublishApi,
  directPublishContentApi,
  rejectContentPublishApi,
  submitContentPublishApi,
  withdrawContentPublishApi,
} from '@/api/publish/content'
import PublishCommentDialog from '@/components/publish/PublishCommentDialog.vue'
import PublishRecordsDialog from '@/components/publish/PublishRecordsDialog.vue'
import { usePermission } from '@/composables/usePermission'
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPES,
  ITEM_STATUS_LABELS,
  type ContentType,
} from '@/constants/content'
import {
  PUBLISH_ACTION_LABELS,
  PUBLISH_CONFIRM_MESSAGES,
  PUBLISH_PERMISSIONS,
  type PublishActionType,
} from '@/constants/publish'
import { formatDateTime } from '@/utils/contentForm'
import {
  listPublishActionsForStatus,
  publishActionAllowsComment,
  publishActionCommentRequired,
} from '@/utils/publishActions'

const router = useRouter()
const perm = usePermission()

const loading = ref(false)
const errorMsg = ref('')
const list = ref<ItemListItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const categoryOptions = ref<CategoryListItem[]>([])
const publishingId = ref<string | null>(null)

const commentDialogVisible = ref(false)
const commentDialogTitle = ref('')
const commentDialogRequired = ref(false)
const commentDialogPlaceholder = ref('')
const commentDialogBusy = ref(false)
const pendingCommentAction = ref<{
  action: PublishActionType
  row: ItemListItem
} | null>(null)

const recordsDialogVisible = ref(false)
const recordsBizId = ref('')

const filters = reactive({
  title: '',
  contentType: '' as ContentType | '',
  status: '',
  categoryId: '',
})

const categoryNameMap = computed(() => {
  const map: Record<string, string> = {}
  for (const c of categoryOptions.value) map[c.id] = c.categoryName
  return map
})

function hasPublishPermission(action: PublishActionType): boolean {
  return perm.hasPermission(PUBLISH_PERMISSIONS[action])
}

function visiblePublishActions(status: string): PublishActionType[] {
  return listPublishActionsForStatus(status).filter((a) => hasPublishPermission(a))
}

async function loadCategories(): Promise<void> {
  try {
    categoryOptions.value = await fetchAllCategoriesApi()
  } catch {
    categoryOptions.value = []
  }
}

async function loadList(): Promise<void> {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await fetchItemsApi({
      page: page.value,
      pageSize: pageSize.value,
      title: filters.title || undefined,
      contentType: filters.contentType || undefined,
      status: filters.status || undefined,
      categoryId: filters.categoryId || undefined,
    })
    list.value = res.list
    total.value = res.total
  } catch (e) {
    list.value = []
    total.value = 0
    errorMsg.value = e instanceof ApiError ? e.message : '加载内容列表失败'
  } finally {
    loading.value = false
  }
}

function onSearch(): void {
  page.value = 1
  void loadList()
}

function onReset(): void {
  filters.title = ''
  filters.contentType = ''
  filters.status = ''
  filters.categoryId = ''
  onSearch()
}

function goCreate(): void {
  void router.push('/content/items/create')
}

function goEdit(id: string): void {
  void router.push(`/content/items/${id}/edit`)
}

function goVersions(id: string): void {
  void router.push(`/content/items/${id}/versions`)
}

async function onDelete(row: ItemListItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除内容「${row.title}」？此操作不可恢复。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deleteItemApi(row.id)
    ElMessage.success('删除成功')
    await loadList()
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '删除失败')
  }
}

async function onPublishAction(action: PublishActionType, row: ItemListItem): Promise<void> {
  if (publishingId.value === row.id) return

  if (action === 'records') {
    recordsBizId.value = row.id
    await nextTick()
    recordsDialogVisible.value = true
    return
  }

  if (publishActionAllowsComment(action) && publishActionCommentRequired(action)) {
    pendingCommentAction.value = { action, row }
    commentDialogTitle.value = PUBLISH_ACTION_LABELS[action]
    commentDialogRequired.value = true
    commentDialogPlaceholder.value = '请输入驳回意见'
    commentDialogVisible.value = true
    return
  }

  if (publishActionAllowsComment(action) && (action === 'withdraw' || action === 'approve')) {
    pendingCommentAction.value = { action, row }
    commentDialogTitle.value = PUBLISH_ACTION_LABELS[action]
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

  await executePublishAction(action, row)
}

async function onCommentDialogConfirm(comment: string): Promise<void> {
  const pending = pendingCommentAction.value
  if (!pending || commentDialogBusy.value) return
  commentDialogBusy.value = true
  try {
    await executePublishAction(pending.action, pending.row, comment)
    commentDialogVisible.value = false
    pendingCommentAction.value = null
  } finally {
    commentDialogBusy.value = false
  }
}

async function executePublishAction(
  action: PublishActionType,
  row: ItemListItem,
  comment?: string,
): Promise<void> {
  if (publishingId.value === row.id) return
  publishingId.value = row.id
  try {
    const payload = comment ? { comment } : {}
    switch (action) {
      case 'submit':
        await submitContentPublishApi(row.id, payload)
        ElMessage.success('已提交审核')
        break
      case 'approve':
        await approveContentPublishApi(row.id, payload)
        ElMessage.success('审核通过')
        break
      case 'reject':
        await rejectContentPublishApi(row.id, payload)
        ElMessage.success('已驳回')
        break
      case 'directPublish':
        await directPublishContentApi(row.id, payload)
        ElMessage.success('已直接发布')
        break
      case 'withdraw':
        await withdrawContentPublishApi(row.id, payload)
        ElMessage.success('已撤回')
        break
      default:
        return
    }
    await loadList()
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '操作失败')
  } finally {
    publishingId.value = null
  }
}

onMounted(() => {
  void loadCategories()
  void loadList()
})
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-form {
  margin-bottom: 12px;
}

.mb-12 {
  margin-bottom: 12px;
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
