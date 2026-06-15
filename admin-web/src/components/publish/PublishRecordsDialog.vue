<template>
  <el-dialog v-model="visible" title="发布记录" width="820px" destroy-on-close>
    <div v-loading="loading">
      <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" class="mb-12" />
      <el-empty v-else-if="!loading && records.length === 0" description="暂无发布记录" />
      <el-table v-else :data="records" border stripe max-height="420">
        <el-table-column label="操作" width="110">
          <template #default="{ row }">
            {{ PUBLISH_RECORD_ACTION_LABELS[row.action] || row.action }}
          </template>
        </el-table-column>
        <el-table-column label="原状态" width="100">
          <template #default="{ row }">{{ publishStatusLabel(row.fromStatus) }}</template>
        </el-table-column>
        <el-table-column label="新状态" width="100">
          <template #default="{ row }">{{ publishStatusLabel(row.toStatus) }}</template>
        </el-table-column>
        <el-table-column prop="comment" label="意见" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.comment || '—' }}</template>
        </el-table-column>
        <el-table-column prop="operatorId" label="操作人" width="120" show-overflow-tooltip />
        <el-table-column label="操作时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.operatedAt) }}</template>
        </el-table-column>
        <el-table-column prop="versionId" label="版本 ID" min-width="200" show-overflow-tooltip />
      </el-table>
    </div>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ApiError } from '@/api/http'
import { fetchContentPublishRecordsApi } from '@/api/publish/content'
import type { PublishRecordItem } from '@/api/publish/types'
import { PUBLISH_RECORD_ACTION_LABELS, publishStatusLabel } from '@/constants/publish'
import { formatDateTime } from '@/utils/contentForm'

defineOptions({ name: 'PublishRecordsDialog' })

const props = defineProps<{
  modelValue: boolean
  bizId: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const visible = ref(props.modelValue)
const loading = ref(false)
const errorMsg = ref('')
const records = ref<PublishRecordItem[]>([])

watch(
  () => props.modelValue,
  (v) => {
    visible.value = v
  },
)

watch(visible, (v) => emit('update:modelValue', v))

onMounted(() => {
  if (props.modelValue && props.bizId) void loadRecords()
})

async function loadRecords(): Promise<void> {
  loading.value = true
  errorMsg.value = ''
  records.value = []
  try {
    records.value = await fetchContentPublishRecordsApi(props.bizId)
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : '加载发布记录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.mb-12 {
  margin-bottom: 12px;
}
</style>
