<template>
  <el-result icon="warning" title="页面不存在" sub-title="您访问的地址无效或尚未开放">
    <template #extra>
      <el-button type="primary" @click="goDashboard">返回工作台</el-button>
    </template>
  </el-result>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goDashboard(): void {
  void router.push('/dashboard')
}
</script>
