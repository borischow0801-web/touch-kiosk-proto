import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import DeptList from '../pages/DeptList.vue'
import TopicList from '../pages/TopicList.vue'
import ItemTypeList from '../pages/ItemTypeList.vue'
import ItemList from '../pages/ItemList.vue'
import ItemDetail from '../pages/ItemDetail.vue'
import Help from '../pages/Help.vue'
import ContentList from '../pages/ContentList.vue'
import ContentDetail from '../pages/ContentDetail.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', component: Home },
    { path: '/depts', component: DeptList },
    { path: '/topics', component: TopicList },
    { path: '/item-types', component: ItemTypeList },
    { path: '/items', component: ItemList },
    { path: '/items/:itemId', component: ItemDetail },
    { path: '/content/:type', component: ContentList },
    { path: '/content/:type/:id', component: ContentDetail },
    { path: '/help', component: Help },
  ],
  scrollBehavior() { return { top: 0 } },
})
