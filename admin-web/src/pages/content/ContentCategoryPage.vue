<template>
  <el-card shadow="never" v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>内容分类</span>
        <el-button v-if="perm.canCreateCategory" type="primary" @click="openCreate()">新增分类</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-form" @submit.prevent="loadList">
      <el-form-item label="内容类型">
        <el-select v-model="filterContentType" clearable placeholder="全部" style="width: 180px">
          <el-option
            v-for="t in CONTENT_TYPES"
            :key="t"
            :label="CONTENT_TYPE_LABELS[t]"
            :value="t"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadList">查询</el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" class="mb-12" />
    <el-empty v-else-if="!loading && treeData.length === 0" description="暂无分类数据" />

    <el-table
      v-else
      :data="treeData"
      row-key="id"
      default-expand-all
      :tree-props="{ children: 'children' }"
      border
      stripe
    >
      <el-table-column prop="categoryName" label="分类名称" min-width="200" />
      <el-table-column label="内容类型" width="140">
        <template #default="{ row }">
          {{ CONTENT_TYPE_LABELS[row.contentType as ContentType] || row.contentType }}
        </template>
      </el-table-column>
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          {{ CATEGORY_STATUS_LABELS[row.status] || row.status }}
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="perm.canUpdateCategory"
            data-action="edit-category"
            type="primary"
            link
            @click="openEdit(row)"
          >编辑</el-button>
          <el-button
            v-if="perm.canDeleteCategory"
            data-action="delete-category"
            type="danger"
            link
            @click="onDelete(row)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增分类' : '编辑分类'"
      width="480px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="内容类型" prop="contentType">
          <el-select
            v-model="form.contentType"
            :disabled="dialogMode === 'edit'"
            placeholder="请选择"
            style="width: 100%"
          >
            <el-option
              v-for="t in CONTENT_TYPES"
              :key="t"
              :label="CONTENT_TYPE_LABELS[t]"
              :value="t"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="父分类" prop="parentId">
          <template v-if="dialogMode === 'edit'">
            <el-input :model-value="parentDisplayName" disabled style="width: 100%" />
            <div class="field-hint">父分类在创建后暂不支持调整</div>
          </template>
          <el-select
            v-else
            v-model="form.parentId"
            clearable
            placeholder="无（根分类）"
            style="width: 100%"
          >
            <el-option
              v-for="c in parentOptions"
              :key="c.id"
              :label="c.categoryName"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="分类名称" prop="categoryName">
          <el-input v-model="form.categoryName" maxlength="100" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item v-if="dialogMode === 'edit'" label="状态" prop="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
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
import { computed, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ApiError } from '@/api/http'
import {
  createCategoryApi,
  deleteCategoryApi,
  fetchAllCategoriesApi,
  updateCategoryApi,
} from '@/api/content/categories'
import type { CategoryListItem } from '@/api/content/types'
import { usePermission } from '@/composables/usePermission'
import {
  CATEGORY_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPES,
  type ContentType,
} from '@/constants/content'
import { formatDateTime } from '@/utils/contentForm'

interface CategoryTreeNode extends CategoryListItem {
  children?: CategoryTreeNode[]
}

const perm = usePermission()
const loading = ref(false)
const submitting = ref(false)
const errorMsg = ref('')
const flatList = ref<CategoryListItem[]>([])
const filterContentType = ref<ContentType | ''>('')

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref('')
const formRef = ref<FormInstance>()
const form = reactive({
  contentType: '' as ContentType | '',
  parentId: '' as string,
  categoryName: '',
  sortOrder: 0,
  status: 'active' as 'active' | 'disabled',
})

const rules: FormRules = {
  contentType: [{ required: true, message: '请选择内容类型', trigger: 'change' }],
  categoryName: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
}

const treeData = computed(() => buildTree(flatList.value))

const parentOptions = computed(() =>
  flatList.value.filter((c) => c.contentType === form.contentType && c.id !== editingId.value),
)

const parentDisplayName = computed(() => {
  if (!form.parentId) return '无（根分类）'
  const parent = flatList.value.find((c) => c.id === form.parentId)
  return parent?.categoryName ?? form.parentId
})

function buildTree(list: CategoryListItem[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>()
  const roots: CategoryTreeNode[] = []
  for (const item of list) {
    map.set(item.id, { ...item, children: [] })
  }
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.categoryName.localeCompare(b.categoryName))
    nodes.forEach((n) => n.children?.length && sortNodes(n.children))
  }
  sortNodes(roots)
  return roots
}

async function loadList(): Promise<void> {
  loading.value = true
  errorMsg.value = ''
  try {
    flatList.value = await fetchAllCategoriesApi({
      contentType: filterContentType.value || undefined,
    })
  } catch (e) {
    flatList.value = []
    errorMsg.value = e instanceof ApiError ? e.message : '加载分类失败'
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  dialogMode.value = 'create'
  editingId.value = ''
  form.contentType = filterContentType.value || CONTENT_TYPES[0]
  form.parentId = ''
  form.categoryName = ''
  form.sortOrder = 0
  form.status = 'active'
  dialogVisible.value = true
}

function openEdit(row: CategoryListItem): void {
  dialogMode.value = 'edit'
  editingId.value = row.id
  form.contentType = row.contentType as ContentType
  form.parentId = row.parentId ?? ''
  form.categoryName = row.categoryName
  form.sortOrder = row.sortOrder
  form.status = (row.status as 'active' | 'disabled') || 'active'
  dialogVisible.value = true
}

function resetForm(): void {
  formRef.value?.resetFields()
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
      await createCategoryApi({
        contentType: form.contentType as ContentType,
        categoryName: form.categoryName.trim(),
        parentId: form.parentId || undefined,
        sortOrder: form.sortOrder,
      })
      ElMessage.success('分类创建成功')
    } else {
      await updateCategoryApi(editingId.value, {
        categoryName: form.categoryName.trim(),
        sortOrder: form.sortOrder,
        status: form.status,
      })
      ElMessage.success('分类更新成功')
    }
    dialogVisible.value = false
    await loadList()
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '保存失败')
  } finally {
    submitting.value = false
  }
}

async function onDelete(row: CategoryListItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除分类「${row.categoryName}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deleteCategoryApi(row.id)
    ElMessage.success('删除成功')
    await loadList()
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '删除失败')
  }
}

onMounted(() => {
  void loadList()
})

defineExpose({
  openEdit,
  openCreate,
  onDelete,
  onSubmit,
  form,
  dialogMode,
  dialogVisible,
  submitting,
  flatList,
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

.field-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}
</style>
