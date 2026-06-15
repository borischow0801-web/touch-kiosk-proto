<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="480px"
    destroy-on-close
    @closed="onClosed"
  >
    <el-form label-width="80px">
      <el-form-item :label="commentLabel" :required="required">
        <el-input
          v-model="comment"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          :placeholder="placeholder"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="busy" @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="confirming || busy" :disabled="confirming || busy" @click="onConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

defineOptions({ name: 'PublishCommentDialog' })

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    commentLabel?: string
    placeholder?: string
    required?: boolean
    busy?: boolean
  }>(),
  {
    commentLabel: '意见说明',
    placeholder: '请输入意见（可选）',
    required: false,
    busy: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [comment: string]
}>()

const visible = ref(props.modelValue)
const comment = ref('')
const confirming = ref(false)

watch(
  () => props.modelValue,
  (v) => {
    visible.value = v
    if (v) comment.value = ''
  },
)

watch(visible, (v) => emit('update:modelValue', v))

function onClosed(): void {
  comment.value = ''
  confirming.value = false
}

async function onConfirm(): Promise<void> {
  if (confirming.value || props.busy) return
  const text = comment.value.trim()
  if (props.required && !text) {
    ElMessage.warning('请填写意见说明')
    return
  }
  confirming.value = true
  emit('confirm', text)
}

defineExpose({ close: () => { visible.value = false } })
</script>
