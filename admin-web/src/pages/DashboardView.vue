<template>
  <el-card shadow="never">
    <template #header>
      <span>工作台</span>
    </template>
    <p class="welcome">欢迎使用政务公开管理系统管理端。</p>
    <p class="hint">本阶段为认证与壳层占位首页，内容管理等功能将在后续步骤接入。</p>
    <el-descriptions v-if="auth.userInfo" :column="1" border class="profile-box">
      <el-descriptions-item label="用户名">{{ auth.userInfo.username }}</el-descriptions-item>
      <el-descriptions-item label="姓名">{{ auth.userInfo.realName || '—' }}</el-descriptions-item>
      <el-descriptions-item label="角色">{{ auth.roles.join('、') || '—' }}</el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<style scoped>
.welcome {
  margin: 0 0 8px;
  font-size: 16px;
  color: #303133;
}

.hint {
  margin: 0 0 20px;
  color: #909399;
}

.profile-box {
  max-width: 480px;
}
</style>
