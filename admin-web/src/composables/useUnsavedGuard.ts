import { type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessageBox } from 'element-plus'

export function useUnsavedGuard(dirty: Ref<boolean>, submitting: Ref<boolean>): void {
  onBeforeRouteLeave((_to, _from, next) => {
    if (!dirty.value || submitting.value) return next()
    ElMessageBox.confirm('有未保存的更改，确定离开？', '提示', {
      type: 'warning',
      confirmButtonText: '离开',
      cancelButtonText: '取消',
    })
      .then(() => next())
      .catch(() => next(false))
  })
}
