import { defineStore } from 'pinia'

export const useContentStore = defineStore('content', {
  state: () => ({
    listType: '',
    page: 1,
    detailId: '',
  }),
  actions: {
    reset() {
      this.listType = ''
      this.page = 1
      this.detailId = ''
    },
    rememberList(type: string, page: number) {
      this.listType = type
      this.page = page
    },
    rememberDetail(type: string, id: string) {
      this.listType = type
      this.detailId = id
    },
  },
})
