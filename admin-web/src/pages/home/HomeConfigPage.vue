<template>
  <div class="home-config-page">
    <el-card shadow="never" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>首页配置</span>
          <div class="header-actions">
            <template v-for="action in visiblePublishActions" :key="action">
              <el-button
                v-if="action !== 'records'"
                type="primary"
                link
                :disabled="publishBusy"
                :loading="publishBusy && publishingAction === action"
                @click="onPublishAction(action)"
              >
                {{ PUBLISH_ACTION_LABELS[action] }}
              </el-button>
            </template>
            <el-button
              v-if="perm.canReadPublishRecords && config.id"
              type="primary"
              link
              @click="recordsVisible = true"
            >
              发布记录
            </el-button>
            <el-button
              v-if="perm.canPublishRollback && canHomeRollback(config)"
              type="warning"
              link
              :disabled="publishBusy"
              @click="openRollbackDialog"
            >
              版本回滚
            </el-button>
          </div>
        </div>
      </template>

      <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" class="mb-12" />

      <el-descriptions v-if="config.id" :column="2" border class="mb-16">
        <el-descriptions-item label="配置 ID">{{ config.id }}</el-descriptions-item>
        <el-descriptions-item label="主表状态">
          <el-tag size="small">{{ HOME_STATUS_LABELS[config.status ?? ''] || config.status || '—' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ config.updatedAt ? formatDateTime(config.updatedAt) : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="当前发布版本">
          <template v-if="config.currentVersion">
            v{{ config.currentVersion.versionNo }} · {{ config.currentVersion.title }}
            （{{ HOME_STATUS_LABELS[config.currentVersion.status] || config.currentVersion.status }}）
          </template>
          <span v-else>—</span>
        </el-descriptions-item>
      </el-descriptions>
      <el-empty v-else-if="!loading" description="尚未初始化首页配置，保存草稿后将自动创建" />

      <el-divider content-position="left">草稿编辑</el-divider>

      <el-form ref="configFormRef" :model="draftForm" :rules="configRules" label-width="120px" class="draft-form">
        <el-form-item label="标题" prop="title">
          <el-input v-model="draftForm.title" maxlength="255" :disabled="!canEditDraft || !perm.canUpdateHomeConfig" />
        </el-form-item>
        <el-form-item label="副标题" prop="subtitle">
          <el-input v-model="draftForm.subtitle" maxlength="255" :disabled="!canEditDraft || !perm.canUpdateHomeConfig" />
        </el-form-item>
        <el-form-item label="顶部横幅 JSON">
          <el-input
            v-model="draftForm.topBannerText"
            type="textarea"
            :rows="4"
            placeholder='例如：["温馨提示","欢迎光临"]'
            :disabled="!canEditDraft || !perm.canUpdateHomeConfig"
          />
          <div class="field-hint">解析为 bannerLines，通常为 string 数组</div>
        </el-form-item>
        <el-form-item label="主题 JSON">
          <el-input
            v-model="draftForm.themeText"
            type="textarea"
            :rows="4"
            placeholder='例如：{"primaryColor":"#0052d9"}'
            :disabled="!canEditDraft || !perm.canUpdateHomeConfig"
          />
        </el-form-item>
        <el-form-item label="变更说明">
          <el-input
            v-model="draftForm.changeRemark"
            maxlength="255"
            :disabled="!canEditDraft || !perm.canUpdateHomeConfig"
          />
        </el-form-item>
        <el-form-item v-if="perm.canUpdateHomeConfig">
          <el-button type="primary" :loading="savingConfig" :disabled="savingConfig" @click="onSaveConfig">
            保存草稿
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="module-card" v-loading="modulesLoading">
      <template #header>
        <div class="card-header">
          <span>模块管理（当前草稿）</span>
          <div class="header-actions">
            <el-button
              v-if="perm.canSortHomeModule"
              :loading="sortingModules"
              :disabled="sortingModules || modules.length === 0"
              @click="onSaveSort"
            >
              保存排序
            </el-button>
            <el-button v-if="perm.canCreateHomeModule" type="primary" @click="openModuleCreate">新增模块</el-button>
          </div>
        </div>
      </template>

      <el-alert v-if="moduleErrorMsg" :title="moduleErrorMsg" type="error" show-icon :closable="false" class="mb-12" />
      <el-empty v-if="!modulesLoading && modules.length === 0" description="暂无模块，请先保存草稿后新增" />

      <el-table v-else :data="modules" border stripe>
        <el-table-column prop="moduleCode" label="编码" width="120" show-overflow-tooltip />
        <el-table-column prop="moduleName" label="名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="moduleType" label="类型" width="90" />
        <el-table-column label="可见" width="70">
          <template #default="{ row }">{{ row.isVisible ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="排序" width="110">
          <template #default="{ row }">
            <el-input-number
              v-if="perm.canSortHomeModule"
              v-model="row.sortOrder"
              :min="1"
              size="small"
              controls-position="right"
            />
            <span v-else>{{ row.sortOrder }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="targetType" label="目标类型" width="90" />
        <el-table-column prop="targetValue" label="目标值" min-width="140" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-if="perm.canUpdateHomeModule" type="primary" link @click="openModuleEdit(row)">编辑</el-button>
            <el-button v-if="perm.canDeleteHomeModule" type="danger" link @click="onDeleteModule(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="moduleDialogVisible"
      :title="moduleDialogMode === 'create' ? '新增模块' : '编辑模块'"
      width="640px"
      destroy-on-close
      @closed="resetModuleDialog"
    >
      <el-form ref="moduleFormRef" :model="moduleForm" :rules="moduleRules" label-width="120px">
        <el-form-item label="模块编码" prop="moduleCode">
          <el-input v-model="moduleForm.moduleCode" maxlength="50" :disabled="moduleDialogMode === 'edit'" />
        </el-form-item>
        <el-form-item label="模块名称" prop="moduleName">
          <el-input v-model="moduleForm.moduleName" maxlength="100" />
        </el-form-item>
        <el-form-item label="模块类型" prop="moduleType">
          <el-select v-model="moduleForm.moduleType" style="width: 100%">
            <el-option
              v-for="opt in HOME_MODULE_TYPE_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="moduleForm.icon" maxlength="100" clearable />
        </el-form-item>
        <el-form-item label="颜色">
          <el-input v-model="moduleForm.color" maxlength="50" clearable />
        </el-form-item>
        <el-form-item label="布局类型">
          <el-input v-model="moduleForm.layoutType" maxlength="50" clearable />
        </el-form-item>
        <el-form-item label="可见">
          <el-switch v-model="moduleForm.isVisible" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="moduleForm.sortOrder" :min="1" />
        </el-form-item>
        <el-form-item label="目标类型" prop="targetType">
          <el-select v-model="moduleForm.targetType" style="width: 100%">
            <el-option
              v-for="opt in HOME_TARGET_TYPE_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标值" prop="targetValue">
          <el-input v-model="moduleForm.targetValue" maxlength="500" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="moduleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="moduleSubmitting" @click="onModuleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <PublishCommentDialog
      v-model="commentDialogVisible"
      :title="commentDialogTitle"
      :required="commentDialogRequired"
      :placeholder="commentDialogPlaceholder"
      :busy="commentDialogBusy"
      @confirm="onCommentDialogConfirm"
    />

    <PublishRecordsDialog
      v-if="config.id"
      v-model="recordsVisible"
      :biz-id="config.id"
      biz-type="home_config"
    />

    <el-dialog v-model="rollbackDialogVisible" title="版本回滚" width="480px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="源版本 ID">
          <el-input v-model="rollbackVersionId" placeholder="历史版本 UUID" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="rollbackComment" type="textarea" :rows="3" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rollbackDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishBusy" @click="onRollbackConfirm">确认回滚</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ApiError } from '@/api/http'
import { fetchHomeConfigApi, updateHomeConfigApi } from '@/api/home/config'
import {
  createHomeModuleApi,
  deleteHomeModuleApi,
  fetchHomeModulesApi,
  sortHomeModulesApi,
  updateHomeModuleApi,
} from '@/api/home/modules'
import type { AdminHomeConfig, HomeModuleItem } from '@/api/home/types'
import {
  approveHomeConfigPublishApi,
  directPublishHomeConfigApi,
  fetchHomeConfigPublishRecordsApi,
  rejectHomeConfigPublishApi,
  rollbackHomeConfigPublishApi,
  submitHomeConfigPublishApi,
  withdrawHomeConfigPublishApi,
} from '@/api/publish/homeConfig'
import type { PublishRecordItem } from '@/api/publish/types'
import PublishCommentDialog from '@/components/publish/PublishCommentDialog.vue'
import PublishRecordsDialog from '@/components/publish/PublishRecordsDialog.vue'
import { usePermission } from '@/composables/usePermission'
import { HOME_MODULE_TYPE_OPTIONS, HOME_STATUS_LABELS, HOME_TARGET_TYPE_OPTIONS } from '@/constants/home'
import {
  PUBLISH_ACTION_LABELS,
  PUBLISH_CONFIRM_MESSAGES,
  PUBLISH_PERMISSIONS,
  type PublishActionType,
} from '@/constants/publish'
import { formatDateTime } from '@/utils/contentForm'
import {
  buildSortItems,
  draftFormFromConfig,
  emptyDraftForm,
  parseJsonField,
} from '@/utils/homeForm'
import { canHomeRollback, listHomePublishActions } from '@/utils/homePublishActions'
import {
  publishActionAllowsComment,
  publishActionCommentRequired,
} from '@/utils/publishActions'

const perm = usePermission()

const loading = ref(false)
const savingConfig = ref(false)
const modulesLoading = ref(false)
const sortingModules = ref(false)
const moduleSubmitting = ref(false)
const publishBusy = ref(false)
const publishingAction = ref<PublishActionType | null>(null)
const errorMsg = ref('')
const moduleErrorMsg = ref('')

const config = ref<AdminHomeConfig>({
  id: null,
  configName: 'default',
  status: null,
  currentVersionId: null,
  currentVersion: null,
  draftVersion: null,
  updatedAt: null,
})

const publishRecords = ref<PublishRecordItem[]>([])
const modules = ref<HomeModuleItem[]>([])

const configFormRef = ref<FormInstance>()
const draftForm = reactive(emptyDraftForm())
const configRules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
}

const canEditDraft = computed(() => Boolean(config.value.draftVersion) || !config.value.id)

const visiblePublishActions = computed(() => {
  const actions = listHomePublishActions(config.value, publishRecords.value)
  return actions.filter((action) => {
    if (action === 'records') return false
    const permission = PUBLISH_PERMISSIONS[action]
    return perm.hasPermission(permission)
  })
})

const moduleDialogVisible = ref(false)
const moduleDialogMode = ref<'create' | 'edit'>('create')
const editingModuleId = ref('')
const moduleFormRef = ref<FormInstance>()
const moduleForm = reactive({
  moduleCode: '',
  moduleName: '',
  moduleType: 'card',
  icon: '',
  color: '',
  layoutType: '',
  isVisible: true,
  sortOrder: 1,
  targetType: 'route',
  targetValue: '',
})
const moduleRules: FormRules = {
  moduleCode: [{ required: true, message: '请输入模块编码', trigger: 'blur' }],
  moduleName: [{ required: true, message: '请输入模块名称', trigger: 'blur' }],
  moduleType: [{ required: true, message: '请选择模块类型', trigger: 'change' }],
  targetType: [{ required: true, message: '请选择目标类型', trigger: 'change' }],
  targetValue: [{ required: true, message: '请输入目标值', trigger: 'blur' }],
}

const recordsVisible = ref(false)
const commentDialogVisible = ref(false)
const commentDialogTitle = ref('')
const commentDialogRequired = ref(false)
const commentDialogPlaceholder = ref('')
const commentDialogBusy = ref(false)
const pendingPublishAction = ref<Exclude<PublishActionType, 'records'> | null>(null)

const rollbackDialogVisible = ref(false)
const rollbackVersionId = ref('')
const rollbackComment = ref('')

onMounted(() => {
  void refreshAll()
})

async function refreshAll(): Promise<void> {
  await loadConfig()
  await Promise.all([loadModules(), loadPublishRecords()])
}

async function loadConfig(): Promise<void> {
  loading.value = true
  errorMsg.value = ''
  try {
    config.value = await fetchHomeConfigApi()
    Object.assign(draftForm, draftFormFromConfig(config.value.draftVersion))
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : '加载首页配置失败'
  } finally {
    loading.value = false
  }
}

async function loadModules(): Promise<void> {
  if (!perm.canReadHomeModule) return
  modulesLoading.value = true
  moduleErrorMsg.value = ''
  try {
    const res = await fetchHomeModulesApi()
    modules.value = res.list
  } catch (e) {
    moduleErrorMsg.value = e instanceof ApiError ? e.message : '加载模块列表失败'
  } finally {
    modulesLoading.value = false
  }
}

async function loadPublishRecords(): Promise<void> {
  if (!perm.canReadPublishRecords || !config.value.id) {
    publishRecords.value = []
    return
  }
  try {
    publishRecords.value = await fetchHomeConfigPublishRecordsApi(config.value.id)
  } catch {
    publishRecords.value = []
  }
}

async function onSaveConfig(): Promise<void> {
  if (savingConfig.value) return
  const valid = await configFormRef.value?.validate().catch(() => false)
  if (!valid) return

  const bannerParsed = parseJsonField(draftForm.topBannerText, '顶部横幅 JSON')
  if (!bannerParsed.ok) {
    ElMessage.error(bannerParsed.message)
    return
  }
  const themeParsed = parseJsonField(draftForm.themeText, '主题 JSON')
  if (!themeParsed.ok) {
    ElMessage.error(themeParsed.message)
    return
  }

  savingConfig.value = true
  try {
    config.value = await updateHomeConfigApi({
      title: draftForm.title.trim(),
      subtitle: draftForm.subtitle.trim() || undefined,
      topBannerJson: bannerParsed.value,
      themeJson: themeParsed.value,
      changeRemark: draftForm.changeRemark.trim() || undefined,
    })
    Object.assign(draftForm, draftFormFromConfig(config.value.draftVersion))
    ElMessage.success('草稿已保存')
    await loadModules()
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '保存失败')
  } finally {
    savingConfig.value = false
  }
}

function openModuleCreate(): void {
  moduleDialogMode.value = 'create'
  editingModuleId.value = ''
  Object.assign(moduleForm, {
    moduleCode: '',
    moduleName: '',
    moduleType: 'card',
    icon: '',
    color: '',
    layoutType: '',
    isVisible: true,
    sortOrder: modules.value.length + 1,
    targetType: 'route',
    targetValue: '',
  })
  moduleDialogVisible.value = true
}

function openModuleEdit(row: HomeModuleItem): void {
  moduleDialogMode.value = 'edit'
  editingModuleId.value = row.id
  Object.assign(moduleForm, {
    moduleCode: row.moduleCode,
    moduleName: row.moduleName,
    moduleType: row.moduleType,
    icon: row.icon ?? '',
    color: row.color ?? '',
    layoutType: row.layoutType ?? '',
    isVisible: row.isVisible,
    sortOrder: row.sortOrder,
    targetType: row.targetType,
    targetValue: row.targetValue,
  })
  moduleDialogVisible.value = true
}

function resetModuleDialog(): void {
  moduleFormRef.value?.resetFields()
}

async function onModuleSubmit(): Promise<void> {
  if (moduleSubmitting.value) return
  const valid = await moduleFormRef.value?.validate().catch(() => false)
  if (!valid) return

  moduleSubmitting.value = true
  try {
    const payload = {
      moduleCode: moduleForm.moduleCode.trim(),
      moduleName: moduleForm.moduleName.trim(),
      moduleType: moduleForm.moduleType,
      icon: moduleForm.icon.trim() || undefined,
      color: moduleForm.color.trim() || undefined,
      layoutType: moduleForm.layoutType.trim() || undefined,
      isVisible: moduleForm.isVisible,
      sortOrder: moduleForm.sortOrder,
      targetType: moduleForm.targetType,
      targetValue: moduleForm.targetValue.trim(),
    }
    if (moduleDialogMode.value === 'create') {
      await createHomeModuleApi(payload)
      ElMessage.success('模块已创建')
    } else {
      const { moduleCode: _code, ...updatePayload } = payload
      await updateHomeModuleApi(editingModuleId.value, updatePayload)
      ElMessage.success('模块已更新')
    }
    moduleDialogVisible.value = false
    await loadModules()
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '保存模块失败')
  } finally {
    moduleSubmitting.value = false
  }
}

async function onDeleteModule(row: HomeModuleItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除模块「${row.moduleName}」？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteHomeModuleApi(row.id)
    ElMessage.success('模块已删除')
    await loadModules()
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '删除失败')
  }
}

async function onSaveSort(): Promise<void> {
  if (sortingModules.value) return
  const built = buildSortItems(modules.value.map((m) => ({ id: m.id, sortOrder: m.sortOrder })))
  if (!built.ok) {
    ElMessage.warning(built.message)
    return
  }
  sortingModules.value = true
  try {
    const res = await sortHomeModulesApi({ items: built.items })
    modules.value = res.list
    ElMessage.success('排序已保存')
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '保存排序失败')
  } finally {
    sortingModules.value = false
  }
}

function onPublishAction(action: PublishActionType): void {
  if (action === 'records' || !config.value.id) return

  if (publishActionAllowsComment(action) && publishActionCommentRequired(action)) {
    pendingPublishAction.value = action
    commentDialogTitle.value = PUBLISH_ACTION_LABELS[action]
    commentDialogRequired.value = true
    commentDialogPlaceholder.value = '请填写驳回原因'
    commentDialogVisible.value = true
    return
  }

  if (publishActionAllowsComment(action) && (action === 'withdraw' || action === 'approve')) {
    pendingPublishAction.value = action
    commentDialogTitle.value = PUBLISH_ACTION_LABELS[action]
    commentDialogRequired.value = false
    commentDialogPlaceholder.value = '请输入意见说明（可选）'
    commentDialogVisible.value = true
    return
  }

  void runPublishAction(action)
}

async function onCommentDialogConfirm(comment: string): Promise<void> {
  const action = pendingPublishAction.value
  if (!action || !config.value.id) return
  commentDialogBusy.value = true
  try {
    await runPublishAction(action, comment)
    commentDialogVisible.value = false
    pendingPublishAction.value = null
  } finally {
    commentDialogBusy.value = false
  }
}

async function runPublishAction(
  action: Exclude<PublishActionType, 'records'>,
  comment?: string,
): Promise<void> {
  if (!config.value.id || publishBusy.value) return

  const confirmMsg = PUBLISH_CONFIRM_MESSAGES[action]
  try {
    await ElMessageBox.confirm(confirmMsg, '操作确认', { type: 'warning' })
  } catch {
    return
  }

  publishBusy.value = true
  publishingAction.value = action
  try {
    const bizId = config.value.id
    const payload = comment ? { comment } : undefined
    switch (action) {
      case 'submit':
        await submitHomeConfigPublishApi(bizId, payload)
        break
      case 'approve':
        await approveHomeConfigPublishApi(bizId, payload)
        break
      case 'reject':
        await rejectHomeConfigPublishApi(bizId, payload)
        break
      case 'directPublish':
        await directPublishHomeConfigApi(bizId, payload)
        break
      case 'withdraw':
        await withdrawHomeConfigPublishApi(bizId, payload)
        break
      default:
        break
    }
    ElMessage.success('操作成功')
    await refreshAll()
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '发布操作失败')
  } finally {
    publishBusy.value = false
    publishingAction.value = null
  }
}

function openRollbackDialog(): void {
  rollbackVersionId.value = config.value.currentVersion?.id ?? ''
  rollbackComment.value = ''
  rollbackDialogVisible.value = true
}

async function onRollbackConfirm(): Promise<void> {
  if (!config.value.id || publishBusy.value) return
  if (!rollbackVersionId.value.trim()) {
    ElMessage.warning('请输入源版本 ID')
    return
  }
  publishBusy.value = true
  try {
    await rollbackHomeConfigPublishApi(config.value.id, {
      versionId: rollbackVersionId.value.trim(),
      comment: rollbackComment.value.trim() || undefined,
    })
    ElMessage.success('回滚草稿已创建')
    rollbackDialogVisible.value = false
    await refreshAll()
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '回滚失败')
  } finally {
    publishBusy.value = false
  }
}
</script>

<style scoped>
.home-config-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mb-12 {
  margin-bottom: 12px;
}

.mb-16 {
  margin-bottom: 16px;
}

.draft-form {
  max-width: 720px;
}

.field-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.module-card {
  margin-top: 0;
}
</style>
