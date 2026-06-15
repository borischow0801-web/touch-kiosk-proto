import { defineStore } from 'pinia'

export const useGuideStore = defineStore('guide', {
  state: () => ({
    deptCode: '',
    deptName: '',
    themeCode: '',
    themeName: '',
    itemTypeCode: '',
    itemTypeName: '',
    listScopeKey: '',
    listPage: 1,
  }),
  actions: {
    rememberListPage(scopeKey: string, page: number) {
      this.listScopeKey = scopeKey
      this.listPage = page
    },
  },
})
