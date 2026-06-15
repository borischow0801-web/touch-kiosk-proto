<template>
  <el-card shadow="never" v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>事项展示配置</span>
        <el-button v-if="perm.canCreateGuideItem" type="primary" @click="openCreate">新增事项</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-form" @submit.prevent="onSearch">
      <el-form-item label="部门编码">
        <el-input v-model="filters.deptCode" clearable placeholder="精确匹配" style="width: 140px" />
      </el-form-item>
      <el-form-item label="主题编码">
        <el-input v-model="filters.themeCode" clearable placeholder="精确匹配" style="width: 140px" />
      </el-form-item>
      <el-form-item label="热门">
        <el-select v-model="filters.isHot" clearable placeholder="全部" style="width: 100px">
          <el-option label="是" :value="1" />
          <el-option label="否" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item label="推荐">
        <el-select v-model="filters.isRecommend" clearable placeholder="全部" style="width: 100px">
          <el-option label="是" :value="1" />
          <el-option label="否" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item label="可见">
        <el-select v-model="filters.isVisible" clearable placeholder="全部" style="width: 100px">
          <el-option label="显示" :value="1" />
          <el-option label="隐藏" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" class="mb-12" />
    <el-empty v-else-if="!loading && list.length === 0" description="暂无事项配置" />

    <template v-else>
      <el-table :data="list" border stripe>
        <el-table-column prop="platformItemId" label="平台事项 ID" min-width="140" show-overflow-tooltip />
        <el-table-column prop="itemName" label="事项名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="displayName" label="展示名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="deptCode" label="部门编码" width="110" />
        <el-table-column prop="themeCode" label="主题编码" width="110" />
        <el-table-column label="热门" width="70">
          <template #default="{ row }">{{ GUIDE_FLAG_LABELS[row.isHot] ?? row.isHot }}</template>
        </el-table-column>
        <el-table-column label="推荐" width="70">
          <template #default="{ row }">{{ GUIDE_FLAG_LABELS[row.isRecommend] ?? row.isRecommend }}</template>
        </el-table-column>
        <el-table-column label="可见" width="70">
          <template #default="{ row }">{{ GUIDE_VISIBLE_LABELS[row.isVisible] ?? row.isVisible }}</template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="70" />
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="perm.canUpdateGuideItem" type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button v-if="perm.canDeleteGuideItem" type="danger" link @click="onDelete(row)">删除</el-button>
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
          @size-change="onPageSizeChange"
        />
      </div>
    </template>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增事项配置' : '编辑事项配置'"
      width="640px"
      destroy-on-close
      @closed="resetDialog"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item v-if="dialogMode === 'create'" label="平台事项 ID" prop="platformItemId">
          <el-input v-model="form.platformItemId" maxlength="100" placeholder="创建后不可修改" />
          <div class="field-hint">创建后不可修改</div>
        </el-form-item>
        <el-form-item v-else label="平台事项 ID">
          <el-input :model-value="form.platformItemId" disabled />
          <div class="field-hint">创建后不可修改</div>
        </el-form-item>
        <el-form-item label="事项名称" prop="itemName">
          <el-input v-model="form.itemName" maxlength="255" />
        </el-form-item>
        <el-form-item label="展示名称" prop="displayName">
          <el-input v-model="form.displayName" maxlength="255" />
        </el-form-item>
        <el-form-item label="部门编码" prop="deptCode">
          <el-input v-model="form.deptCode" maxlength="50" placeholder="留空表示不关联" clearable />
        </el-form-item>
        <el-form-item label="主题编码" prop="themeCode">
          <el-input v-model="form.themeCode" maxlength="50" placeholder="留空表示不关联" clearable />
        </el-form-item>
        <el-form-item label="热门" prop="isHot">
          <el-switch v-model="form.isHot" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="推荐" prop="isRecommend">
          <el-switch v-model="form.isRecommend" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="可见" prop="isVisible">
          <el-switch v-model="form.isVisible" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="关联政策 ID">
          <RelatedIdEditor v-model="form.relatedPolicyIds" @update:model-value="onPolicyIdsChange" />
        </el-form-item>
        <el-form-item label="关联 FAQ ID">
          <RelatedIdEditor v-model="form.relatedFaqIds" @update:model-value="onFaqIdsChange" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ApiError } from '@/api/http'
import {
  createItemConfigApi,
  deleteItemConfigApi,
  fetchItemConfigsApi,
  updateItemConfigApi,
} from '@/api/guide/itemConfigs'
import type { ItemConfigListItem } from '@/api/guide/types'
import RelatedIdEditor from '@/components/guide/RelatedIdEditor.vue'
import { usePermission } from '@/composables/usePermission'
import { GUIDE_FLAG_LABELS, GUIDE_VISIBLE_LABELS } from '@/constants/guide'
import { formatDateTime } from '@/utils/contentForm'
import { nullableTextField } from '@/utils/guideForm'

const perm = usePermission()
const loading = ref(false)
const submitting = ref(false)
const errorMsg = ref('')
const list = ref<ItemConfigListItem[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const filters = reactive({
  deptCode: '',
  themeCode: '',
  isHot: undefined as 0 | 1 | undefined,
  isRecommend: undefined as 0 | 1 | undefined,
  isVisible: undefined as 0 | 1 | undefined,
})

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref('')
const relatedPolicyIdsTouched = ref(false)
const relatedFaqIdsTouched = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  platformItemId: '',
  itemName: '',
  displayName: '',
  deptCode: '',
  themeCode: '',
  isHot: 0,
  isRecommend: 0,
  isVisible: 1,
  sortOrder: 0,
  relatedPolicyIds: [] as string[],
  relatedFaqIds: [] as string[],
})

const rules: FormRules = {
  platformItemId: [{ required: true, message: '请输入平台事项 ID', trigger: 'blur' }],
  itemName: [{ required: true, message: '请输入事项名称', trigger: 'blur' }],
  displayName: [{ required: true, message: '请输入展示名称', trigger: 'blur' }],
}

function onPolicyIdsChange(): void {
  relatedPolicyIdsTouched.value = true
}

function onFaqIdsChange(): void {
  relatedFaqIdsTouched.value = true
}

function buildFilterQuery() {
  return {
    page: page.value,
    pageSize: pageSize.value,
    deptCode: filters.deptCode.trim() || undefined,
    themeCode: filters.themeCode.trim() || undefined,
    isHot: filters.isHot,
    isRecommend: filters.isRecommend,
    isVisible: filters.isVisible,
  }
}

async function loadList(): Promise<void> {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await fetchItemConfigsApi(buildFilterQuery())
    list.value = res.list
    total.value = res.total
  } catch (e) {
    list.value = []
    total.value = 0
    errorMsg.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function onSearch(): void {
  page.value = 1
  void loadList()
}

function onReset(): void {
  filters.deptCode = ''
  filters.themeCode = ''
  filters.isHot = undefined
  filters.isRecommend = undefined
  filters.isVisible = undefined
  onSearch()
}

function onPageSizeChange(): void {
  page.value = 1
  void loadList()
}

function openCreate(): void {
  dialogMode.value = 'create'
  editingId.value = ''
  relatedPolicyIdsTouched.value = false
  relatedFaqIdsTouched.value = false
  form.platformItemId = ''
  form.itemName = ''
  form.displayName = ''
  form.deptCode = ''
  form.themeCode = ''
  form.isHot = 0
  form.isRecommend = 0
  form.isVisible = 1
  form.sortOrder = 0
  form.relatedPolicyIds = []
  form.relatedFaqIds = []
  dialogVisible.value = true
}

function openEdit(row: ItemConfigListItem): void {
  dialogMode.value = 'edit'
  editingId.value = row.id
  relatedPolicyIdsTouched.value = false
  relatedFaqIdsTouched.value = false
  form.platformItemId = row.platformItemId
  form.itemName = row.itemName
  form.displayName = row.displayName
  form.deptCode = row.deptCode ?? ''
  form.themeCode = row.themeCode ?? ''
  form.isHot = row.isHot
  form.isRecommend = row.isRecommend
  form.isVisible = row.isVisible
  form.sortOrder = row.sortOrder
  form.relatedPolicyIds = [...row.relatedPolicyIds]
  form.relatedFaqIds = [...row.relatedFaqIds]
  dialogVisible.value = true
}

function resetDialog(): void {
  formRef.value?.resetFields()
  form.relatedPolicyIds = []
  form.relatedFaqIds = []
  relatedPolicyIdsTouched.value = false
  relatedFaqIdsTouched.value = false
}

function deptCodePayload(): string | null | undefined {
  if (dialogMode.value === 'create') {
    const value = nullableTextField(form.deptCode)
    return value ?? undefined
  }
  return nullableTextField(form.deptCode)
}

function themeCodePayload(): string | null | undefined {
  if (dialogMode.value === 'create') {
    const value = nullableTextField(form.themeCode)
    return value ?? undefined
  }
  return nullableTextField(form.themeCode)
}

async function onSubmit(): Promise<void> {
  if (submitting.value || !formRef.value) return
  submitting.value = true
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    submitting.value = false
    return
  }

  try {
    if (dialogMode.value === 'create') {
      const deptCode = nullableTextField(form.deptCode) ?? undefined
      const themeCode = nullableTextField(form.themeCode) ?? undefined
      await createItemConfigApi({
        platformItemId: form.platformItemId.trim(),
        itemName: form.itemName.trim(),
        displayName: form.displayName.trim(),
        deptCode,
        themeCode,
        isHot: form.isHot,
        isRecommend: form.isRecommend,
        isVisible: form.isVisible,
        sortOrder: form.sortOrder,
        relatedPolicyIds: [...form.relatedPolicyIds],
        relatedFaqIds: [...form.relatedFaqIds],
      })
      ElMessage.success('创建成功')
    } else {
      const payload: Parameters<typeof updateItemConfigApi>[1] = {
        itemName: form.itemName.trim(),
        displayName: form.displayName.trim(),
        deptCode: deptCodePayload() as string | null,
        themeCode: themeCodePayload() as string | null,
        isHot: form.isHot,
        isRecommend: form.isRecommend,
        isVisible: form.isVisible,
        sortOrder: form.sortOrder,
      }
      if (relatedPolicyIdsTouched.value) {
        payload.relatedPolicyIds = [...form.relatedPolicyIds]
      }
      if (relatedFaqIdsTouched.value) {
        payload.relatedFaqIds = [...form.relatedFaqIds]
      }
      await updateItemConfigApi(editingId.value, payload)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    await loadList()
  } catch (e) {
    if (e instanceof ApiError && e.code === 404) {
      ElMessage.error(e.message || '记录不存在')
      dialogVisible.value = false
      await loadList()
    } else {
      ElMessage.error(e instanceof ApiError ? e.message : '保存失败')
    }
  } finally {
    submitting.value = false
  }
}

async function onDelete(row: ItemConfigListItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除事项配置「${row.displayName}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deleteItemConfigApi(row.id)
    ElMessage.success('删除成功')
    await loadList()
  } catch (e) {
    if (e instanceof ApiError && e.code === 404) {
      ElMessage.error(e.message || '记录不存在')
      await loadList()
    } else {
      ElMessage.error(e instanceof ApiError ? e.message : '删除失败')
    }
  }
}

onMounted(() => {
  void loadList()
})

defineExpose({
  openCreate,
  openEdit,
  onDelete,
  onSubmit,
  form,
  dialogMode,
  dialogVisible,
  submitting,
  list,
  relatedPolicyIdsTouched,
  relatedFaqIdsTouched,
  filters,
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

.field-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
