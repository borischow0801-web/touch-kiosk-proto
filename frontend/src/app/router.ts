import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import DeptList from '../pages/DeptList.vue'
import TopicList from '../pages/TopicList.vue'
import ItemList from '../pages/ItemList.vue'
import ItemDetail from '../pages/ItemDetail.vue'
import Help from '../pages/Help.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', component: Home },
    { path: '/depts', component: DeptList },
    { path: '/topics', component: TopicList },
    { path: '/items', component: ItemList },
    { path: '/items/:id', component: ItemDetail },
    { path: '/help', component: Help },
  ],
  scrollBehavior() { return { top: 0 } },
})
