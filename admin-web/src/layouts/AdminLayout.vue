<template>
  <el-container class="admin-layout">
    <el-aside width="220px" class="admin-aside">
      <div class="brand">政务公开管理</div>
      <el-menu :default-active="activeMenu" router class="admin-menu">
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>工作台</span>
        </el-menu-item>
        <el-sub-menu v-if="perm.showContentMenu" index="content">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>内容管理</span>
          </template>
          <el-menu-item v-if="perm.canReadItem" index="/content/items">内容列表</el-menu-item>
          <el-menu-item v-if="perm.canReadCategory" index="/content/categories">内容分类</el-menu-item>
        </el-sub-menu>
        <el-sub-menu v-if="perm.showGuideMenu" index="guide">
          <template #title>
            <el-icon><Notebook /></el-icon>
            <span>办事指南配置</span>
          </template>
          <el-menu-item v-if="perm.canReadDept" index="/guide/depts">部门映射</el-menu-item>
          <el-menu-item v-if="perm.canReadTheme" index="/guide/themes">主题映射</el-menu-item>
          <el-menu-item v-if="perm.canReadGuideItem" index="/guide/item-configs">事项展示配置</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="admin-header">
        <div class="header-title">{{ pageTitle }}</div>
        <div class="header-actions">
          <span class="user-name">{{ auth.displayName }}</span>
          <el-button type="primary" link @click="onLogout">退出登录</el-button>
        </div>
      </el-header>
      <el-main class="admin-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document, Notebook, Odometer } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const perm = usePermission()

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => (route.meta.title as string) || '管理端')

async function onLogout(): Promise<void> {
  await auth.logout()
  await router.replace('/login')
}
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
}

.admin-aside {
  background: #001529;
  color: #fff;
}

.brand {
  height: 56px;
  line-height: 56px;
  padding: 0 20px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.admin-menu {
  border-right: none;
  background: transparent;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  color: #606266;
}

.admin-main {
  background: #f5f7fa;
}
</style>
