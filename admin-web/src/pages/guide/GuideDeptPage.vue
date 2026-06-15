<template>
  <el-card shadow="never" v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>部门映射</span>
        <el-button v-if="perm.canCreateDept" type="primary" @click="openCreate">新增部门</el-button>
      </div>
    </template>

    <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" class="mb-12" />
    <el-empty v-else-if="!loading && list.length === 0" description="暂无部门映射" />

    <template v-else>
      <el-table :data="list" border stripe>
        <el-table-column prop="deptCode" label="部门编码" width="120" />
        <el-table-column prop="deptName" label="部门名称" min-width="140" />
        <el-table-column prop="displayName" label="展示名称" min-width="140" />
        <el-table-column label="可见" width="80">
          <template #default="{ row }">{{ GUIDE_VISIBLE_LABELS[row.isVisible] ?? row.isVisible }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">{{ GUIDE_STATUS_LABELS[row.status] ?? row.status }}</template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="perm.canUpdateDept" type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button v-if="perm.canDeleteDept" type="danger" link @click="onDelete(row)">删除</el-button>
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
      :title="dialogMode === 'create' ? '新增部门映射' : '编辑部门映射'"
      width="520px"
      destroy-on-close
      @closed="resetDialog"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item v-if="dialogMode === 'create'" label="部门编码" prop="deptCode">
          <el-input v-model="form.deptCode" maxlength="50" placeholder="创建后不可修改" />
          <div class="field-hint">保存后由后端规范为大写，创建后不可修改</div>
        </el-form-item>
        <el-form-item v-else label="部门编码">
          <el-input :model-value="form.deptCode" disabled />
          <div class="field-hint">创建后不可修改</div>
        </el-form-item>
        <el-form-item label="部门名称" prop="deptName">
          <el-input v-model="form.deptName" maxlength="100" />
        </el-form-item>
        <el-form-item label="展示名称" prop="displayName">
          <el-input v-model="form.displayName" maxlength="100" />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <el-input v-model="form.icon" maxlength="255" placeholder="留空表示无图标" />
        </el-form-item>
        <el-form-item label="楼层文案" prop="floorText">
          <el-input v-model="form.floorText" maxlength="100" />
        </el-form-item>
        <el-form-item label="区域文案" prop="areaText">
          <el-input v-model="form.areaText" maxlength="100" />
        </el-form-item>
        <el-form-item label="是否可见" prop="isVisible">
          <el-switch v-model="form.isVisible" :active-value="1" :inactive-value="0" />
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
import { onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ApiError } from '@/api/http'
import { createDeptApi, deleteDeptApi, fetchDeptsApi, updateDeptApi } from '@/api/guide/depts'
import type { DeptMappingListItem } from '@/api/guide/types'
import { usePermission } from '@/composables/usePermission'
import { GUIDE_STATUS_LABELS, GUIDE_VISIBLE_LABELS } from '@/constants/guide'
import { formatDateTime } from '@/utils/contentForm'
import { nullableTextField } from '@/utils/guideForm'

const perm = usePermission()
const loading = ref(false)
const submitting = ref(false)
const errorMsg = ref('')
const list = ref<DeptMappingListItem[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref('')
const formRef = ref<FormInstance>()
const form = reactive({
  deptCode: '',
  deptName: '',
  displayName: '',
  icon: '',
  floorText: '',
  areaText: '',
  isVisible: 1,
  sortOrder: 0,
  status: 'active' as 'active' | 'disabled',
})

const rules: FormRules = {
  deptCode: [{ required: true, message: '请输入部门编码', trigger: 'blur' }],
  deptName: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
  displayName: [{ required: true, message: '请输入展示名称', trigger: 'blur' }],
}

async function loadList(): Promise<void> {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await fetchDeptsApi({ page: page.value, pageSize: pageSize.value })
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

function onPageSizeChange(): void {
  page.value = 1
  void loadList()
}

function openCreate(): void {
  dialogMode.value = 'create'
  editingId.value = ''
  form.deptCode = ''
  form.deptName = ''
  form.displayName = ''
  form.icon = ''
  form.floorText = ''
  form.areaText = ''
  form.isVisible = 1
  form.sortOrder = 0
  form.status = 'active'
  dialogVisible.value = true
}

function openEdit(row: DeptMappingListItem): void {
  dialogMode.value = 'edit'
  editingId.value = row.id
  form.deptCode = row.deptCode
  form.deptName = row.deptName
  form.displayName = row.displayName
  form.icon = row.icon ?? ''
  form.floorText = row.floorText ?? ''
  form.areaText = row.areaText ?? ''
  form.isVisible = row.isVisible
  form.sortOrder = row.sortOrder
  form.status = (row.status as 'active' | 'disabled') || 'active'
  dialogVisible.value = true
}

function resetDialog(): void {
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
      await createDeptApi({
        deptCode: form.deptCode.trim(),
        deptName: form.deptName.trim(),
        displayName: form.displayName.trim(),
        icon: nullableTextField(form.icon) ?? undefined,
        floorText: nullableTextField(form.floorText) ?? undefined,
        areaText: nullableTextField(form.areaText) ?? undefined,
        isVisible: form.isVisible,
        sortOrder: form.sortOrder,
      })
      ElMessage.success('创建成功')
    } else {
      await updateDeptApi(editingId.value, {
        deptName: form.deptName.trim(),
        displayName: form.displayName.trim(),
        icon: nullableTextField(form.icon),
        floorText: nullableTextField(form.floorText),
        areaText: nullableTextField(form.areaText),
        isVisible: form.isVisible,
        sortOrder: form.sortOrder,
        status: form.status,
      })
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

async function onDelete(row: DeptMappingListItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除部门映射「${row.displayName}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deleteDeptApi(row.id)
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
