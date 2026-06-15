<template>
  <el-card shadow="never" v-loading="pageLoading">
    <template #header>
      <div class="card-header">
        <span>{{ isEdit ? '编辑内容' : '新建内容' }}</span>
        <el-button @click="goBack">返回列表</el-button>
      </div>
    </template>

    <el-alert v-if="loadError" :title="loadError" type="error" show-icon :closable="false" />
    <el-alert
      v-if="isEdit && versionReadDenied"
      title="无版本查看权限，版本内容保持不变"
      type="warning"
      show-icon
      :closable="false"
      class="mb-12"
    />

    <el-form
      v-if="!loadError"
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      class="item-form"
    >
      <el-form-item label="内容类型" prop="contentType">
        <el-select
          v-model="form.contentType"
          :disabled="isEdit"
          placeholder="请选择"
          style="width: 280px"
          @change="onContentTypeChange"
        >
          <el-option
            v-for="t in CONTENT_TYPES"
            :key="t"
            :label="CONTENT_TYPE_LABELS[t]"
            :value="t"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="分类" prop="categoryId">
        <el-select v-model="form.categoryId" clearable placeholder="可选" style="width: 280px">
          <el-option
            v-for="c in filteredCategories"
            :key="c.id"
            :label="c.categoryName"
            :value="c.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="标题" prop="title">
        <el-input
          v-model="form.title"
          maxlength="255"
          style="width: 480px"
          :disabled="isEdit && !canEditVersionFields"
        />
      </el-form-item>
      <el-form-item label="副标题" prop="subtitle">
        <el-input v-model="form.subtitle" maxlength="255" style="width: 480px" />
      </el-form-item>
      <el-form-item label="摘要" prop="summary">
        <el-input
          v-model="form.summary"
          type="textarea"
          :rows="2"
          maxlength="500"
          style="width: 480px"
          :disabled="isEdit && !canEditVersionFields"
        />
      </el-form-item>
      <el-form-item label="正文" prop="body">
        <el-input
          v-model="form.body"
          type="textarea"
          :rows="10"
          style="width: 480px"
          :disabled="isEdit && !canEditVersionFields"
          :placeholder="isEdit && versionReadDenied ? '无版本查看权限' : ''"
        />
      </el-form-item>
      <el-form-item label="排序" prop="sortOrder">
        <el-input-number v-model="form.sortOrder" :min="0" />
      </el-form-item>
      <el-form-item v-if="!isEdit || canEditVersionFields" label="变更说明" prop="changeRemark">
        <el-input v-model="form.changeRemark" maxlength="255" style="width: 480px" />
      </el-form-item>
      <template v-if="isEdit">
        <el-form-item label="置顶">
          <el-switch v-model="form.isTop" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="推荐">
          <el-switch v-model="form.isRecommend" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="来源类型" prop="sourceType">
          <el-input v-model="form.sourceType" maxlength="50" style="width: 280px" />
        </el-form-item>
        <el-form-item label="来源链接" prop="sourceUrl">
          <el-input v-model="form.sourceUrl" maxlength="500" style="width: 480px" />
        </el-form-item>
        <el-form-item label="当前状态">
          <el-tag>{{ ITEM_STATUS_LABELS[form.status] || form.status }}</el-tag>
          <span class="hint">状态由审核发布流程控制，不可在此修改</span>
        </el-form-item>
      </template>
      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="onSubmit">保存</el-button>
        <el-button @click="goBack">取消</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { fetchAllCategoriesApi } from '@/api/content/categories'
import { createItemApi, updateItemApi } from '@/api/content/items'
import type { CategoryListItem } from '@/api/content/types'
import { usePermission } from '@/composables/usePermission'
import { useUnsavedGuard } from '@/composables/useUnsavedGuard'
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPES,
  ITEM_STATUS_LABELS,
  type ContentType,
} from '@/constants/content'
import { buildCreateItemPayload, buildUpdateItemPayload } from '@/utils/contentForm'
import { loadItemEditFormData } from '@/utils/itemEditLoader'

const route = useRoute()
const router = useRouter()
const perm = usePermission()

const itemId = computed(() => route.params.id as string | undefined)
const isEdit = computed(() => Boolean(itemId.value))

const pageLoading = ref(false)
const submitting = ref(false)
const loadError = ref('')
const dirty = ref(false)
const initializing = ref(false)
const canEditVersionFields = ref(true)
const versionReadDenied = ref(false)
const formRef = ref<FormInstance>()
const categories = ref<CategoryListItem[]>([])

const form = reactive({
  contentType: '' as ContentType | '',
  categoryId: '',
  title: '',
  subtitle: '',
  summary: '',
  body: '',
  sortOrder: 0,
  changeRemark: '',
  isTop: 0 as 0 | 1,
  isRecommend: 0 as 0 | 1,
  sourceType: '',
  sourceUrl: '',
  status: 'draft',
})

const rules: FormRules = {
  contentType: [{ required: true, message: '请选择内容类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
}

const filteredCategories = computed(() =>
  categories.value.filter((c) => c.contentType === form.contentType && c.status === 'active'),
)

function markDirty(): void {
  if (!initializing.value) dirty.value = true
}

watch(form, () => markDirty(), { deep: true })

useUnsavedGuard(dirty, submitting)

async function loadCategories(): Promise<void> {
  try {
    categories.value = await fetchAllCategoriesApi()
  } catch (e) {
    categories.value = []
    if (!loadError.value) {
      loadError.value = e instanceof ApiError ? e.message : '加载分类失败'
    }
  }
}

async function loadItem(): Promise<void> {
  if (!itemId.value) return
  pageLoading.value = true
  loadError.value = ''
  initializing.value = true
  try {
    const data = await loadItemEditFormData(itemId.value, perm.canReadVersion.value)
    form.contentType = data.contentType
    form.categoryId = data.categoryId
    form.title = data.title
    form.subtitle = data.subtitle
    form.summary = data.summary
    form.body = data.body
    form.sortOrder = data.sortOrder
    form.isTop = data.isTop
    form.isRecommend = data.isRecommend
    form.sourceType = data.sourceType
    form.sourceUrl = data.sourceUrl
    form.status = data.status
    form.changeRemark = ''
    canEditVersionFields.value = data.canEditVersionFields
    versionReadDenied.value = data.versionReadDenied
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : '加载内容失败'
  } finally {
    pageLoading.value = false
  }
}

function onContentTypeChange(): void {
  if (!initializing.value) {
    form.categoryId = ''
  }
}

function goBack(): void {
  void router.push('/content/items')
}

function buildEditPayload(): ReturnType<typeof buildUpdateItemPayload> {
  const fields: Record<string, unknown> = {
    subtitle: form.subtitle,
    categoryId: form.categoryId,
    sortOrder: form.sortOrder,
    isTop: form.isTop,
    isRecommend: form.isRecommend,
    sourceType: form.sourceType,
    sourceUrl: form.sourceUrl,
  }
  if (canEditVersionFields.value) {
    fields.title = form.title.trim()
    fields.summary = form.summary
    fields.body = form.body
    if (form.changeRemark.trim()) {
      fields.changeRemark = form.changeRemark.trim()
    }
  }
  return buildUpdateItemPayload(fields)
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
    if (isEdit.value && itemId.value) {
      await updateItemApi(itemId.value, buildEditPayload())
      ElMessage.success('保存成功')
    } else {
      const payload = buildCreateItemPayload({
        contentType: form.contentType,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        summary: form.summary.trim() || undefined,
        body: form.body || undefined,
        categoryId: form.categoryId || undefined,
        changeRemark: form.changeRemark.trim() || undefined,
        sortOrder: form.sortOrder,
      })
      await createItemApi(payload)
      ElMessage.success('创建成功')
    }
    dirty.value = false
    goBack()
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('禁止提交字段')) {
      ElMessage.error(e.message)
    } else {
      ElMessage.error(e instanceof ApiError ? e.message : '保存失败')
    }
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  initializing.value = true
  await loadCategories()
  if (isEdit.value) {
    await loadItem()
  } else {
    form.contentType = CONTENT_TYPES[0]
  }
  await nextTick()
  dirty.value = false
  initializing.value = false
})
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-form {
  max-width: 720px;
}

.hint {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}

.mb-12 {
  margin-bottom: 12px;
}
</style>
