<template>
  <div class="login-page">
    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="login-title">政务公开管理系统</div>
        <div class="login-subtitle">管理端登录</div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            autocomplete="username"
            placeholder="请输入用户名"
            :disabled="submitting"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            show-password
            placeholder="请输入密码"
            :disabled="submitting"
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-button type="primary" class="submit-btn" :loading="submitting" @click="onSubmit">
          登录
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { safeRedirectPath } from '@/router/redirect'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = reactive({ username: '', password: '' })

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function onSubmit(): Promise<void> {
  if (submitting.value || !formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await auth.login(form.username.trim(), form.password)
    form.password = ''
    const redirect = safeRedirectPath(route.query.redirect)
    await router.replace(redirect)
  } catch (e) {
    const message = e instanceof ApiError ? e.message : '登录失败，请稍后重试'
    ElMessage.error(message)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef2f7 0%, #f8fafc 100%);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 420px;
}

.login-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.login-subtitle {
  margin-top: 4px;
  font-size: 14px;
  color: #909399;
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
}
</style>
