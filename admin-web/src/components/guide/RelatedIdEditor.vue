<template>
  <div class="related-id-editor">
    <div v-if="modelValue.length" class="tag-list">
      <el-tag
        v-for="(id, index) in modelValue"
        :key="`${id}-${index}`"
        closable
        class="id-tag"
        @close="removeAt(index)"
      >
        {{ id }}
      </el-tag>
    </div>
    <div class="add-row">
      <el-input
        v-model="draftId"
        placeholder="输入 UUID v4 后添加"
        maxlength="36"
        clearable
        @keyup.enter="addDraft"
      />
      <el-button type="primary" link @click="addDraft">添加</el-button>
    </div>
    <div v-if="errorMsg" class="field-error">{{ errorMsg }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { isUuidV4 } from '@/utils/guideForm'

const modelValue = defineModel<string[]>({ required: true })

const draftId = ref('')
const errorMsg = ref('')

function addDraft(): void {
  errorMsg.value = ''
  const value = draftId.value.trim()
  if (!value) {
    errorMsg.value = '请输入 ID'
    return
  }
  if (!isUuidV4(value)) {
    errorMsg.value = '请输入合法的 UUID v4'
    return
  }
  if (modelValue.value.includes(value)) {
    errorMsg.value = '该 ID 已存在'
    return
  }
  modelValue.value = [...modelValue.value, value]
  draftId.value = ''
}

function removeAt(index: number): void {
  const next = [...modelValue.value]
  next.splice(index, 1)
  modelValue.value = next
  errorMsg.value = ''
}

defineExpose({ addDraft, draftId, errorMsg })
</script>

<style scoped>
.related-id-editor {
  width: 100%;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.add-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-error {
  margin-top: 4px;
  font-size: 12px;
  color: #f56c6c;
}
</style>
