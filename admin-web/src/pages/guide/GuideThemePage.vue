<template>
  <el-card shadow="never" v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>主题映射</span>
        <el-button v-if="perm.canCreateTheme" type="primary" @click="openCreate">新增主题</el-button>
      </div>
    </template>

    <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" class="mb-12" />
    <el-empty v-else-if="!loading && list.length === 0" description="暂无主题映射" />

    <template v-else>
      <el-table :data="list" border stripe>
        <el-table-column prop="themeCode" label="主题编码" width="120" />
        <el-table-column prop="themeName" label="主题名称" min-width="140" />
        <el-table-column label="平台参数" min-width="120">
          <template #default="{ row }">{{ row.platformParamJson ? '已配置' : '—' }}</template>
        </el-table-column>
        <el-table-column label="可见" width="80">
          <template #default="{ row }">{{ GUIDE_VISIBLE_LABELS[row.isVisible] ?? row.isVisible }}</template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="perm.canUpdateTheme" type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button v-if="perm.canDeleteTheme" type="danger" link @click="onDelete(row)">删除</el-button>
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
      :title="dialogMode === 'create' ? '新增主题映射' : '编辑主题映射'"
      width="560px"
      destroy-on-close
      @closed="resetDialog"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item v-if="dialogMode === 'create'" label="主题编码" prop="themeCode">
          <el-input v-model="form.themeCode" maxlength="50" placeholder="创建后不可修改" />
          <div class="field-hint">保存后由后端规范为大写，创建后不可修改</div>
        </el-form-item>
        <el-form-item v-else label="主题编码">
          <el-input :model-value="form.themeCode" disabled />
          <div class="field-hint">创建后不可修改</div>
        </el-form-item>
        <el-form-item label="主题名称" prop="themeName">
          <el-input v-model="form.themeName" maxlength="100" />
        </el-form-item>
        <el-form-item label="平台参数 JSON" prop="platformParamJson">
          <el-input
            v-model="form.platformParamJson"
            type="textarea"
            :rows="5"
            placeholder='合法 JSON 文本，如 {"key":"value"}；留空表示不配置'
          />
          <div class="field-hint">仅作 JSON 格式校验，不在前端解析或展示凭据内容</div>
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <el-input v-model="form.icon" maxlength="255" placeholder="留空表示无图标" />
        </el-form-item>
        <el-form-item label="是否可见" prop="isVisible">
          <el-switch v-model="form.isVisible" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" />
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
import { createThemeApi, deleteThemeApi, fetchThemesApi, updateThemeApi } from '@/api/guide/themes'
import type { ThemeMappingListItem } from '@/api/guide/types'
import { usePermission } from '@/composables/usePermission'
import { GUIDE_VISIBLE_LABELS } from '@/constants/guide'
import { formatDateTime } from '@/utils/contentForm'
import { isValidJsonText, nullableTextField } from '@/utils/guideForm'

const perm = usePermission()
const loading = ref(false)
const submitting = ref(false)
const errorMsg = ref('')
const list = ref<ThemeMappingListItem[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref('')
const formRef = ref<FormInstance>()
const form = reactive({
  themeCode: '',
  themeName: '',
  platformParamJson: '',
  icon: '',
  isVisible: 1,
  sortOrder: 0,
})

const rules: FormRules = {
  themeCode: [{ required: true, message: '请输入主题编码', trigger: 'blur' }],
  themeName: [{ required: true, message: '请输入主题名称', trigger: 'blur' }],
  platformParamJson: [
    {
      validator: (_rule, value: string, callback) => {
        if (!isValidJsonText(value ?? '')) {
          callback(new Error('请输入合法的 JSON 文本'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

async function loadList(): Promise<void> {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await fetchThemesApi({ page: page.value, pageSize: pageSize.value })
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
  form.themeCode = ''
  form.themeName = ''
  form.platformParamJson = ''
  form.icon = ''
  form.isVisible = 1
  form.sortOrder = 0
  dialogVisible.value = true
}

function openEdit(row: ThemeMappingListItem): void {
  dialogMode.value = 'edit'
  editingId.value = row.id
  form.themeCode = row.themeCode
  form.themeName = row.themeName
  form.platformParamJson = row.platformParamJson ?? ''
  form.icon = row.icon ?? ''
  form.isVisible = row.isVisible
  form.sortOrder = row.sortOrder
  dialogVisible.value = true
}

function resetDialog(): void {
  formRef.value?.resetFields()
  form.platformParamJson = ''
}

async function onSubmit(): Promise<void> {
  if (submitting.value || !formRef.value) return
  submitting.value = true
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    submitting.value = false
    return
  }

  const jsonText = form.platformParamJson.trim()

  try {
    if (dialogMode.value === 'create') {
      await createThemeApi({
        themeCode: form.themeCode.trim(),
        themeName: form.themeName.trim(),
        platformParamJson: jsonText || undefined,
        icon: nullableTextField(form.icon) ?? undefined,
        isVisible: form.isVisible,
        sortOrder: form.sortOrder,
      })
      ElMessage.success('创建成功')
    } else {
      await updateThemeApi(editingId.value, {
        themeName: form.themeName.trim(),
        platformParamJson: jsonText === '' ? null : jsonText,
        icon: nullableTextField(form.icon),
        isVisible: form.isVisible,
        sortOrder: form.sortOrder,
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

async function onDelete(row: ThemeMappingListItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除主题映射「${row.themeName}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deleteThemeApi(row.id)
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
