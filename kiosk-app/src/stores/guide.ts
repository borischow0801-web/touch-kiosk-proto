import { defineStore } from 'pinia'

export const useGuideStore = defineStore('guide', {
  state: () => ({
    deptCode: '',
    deptName: '',
    themeCode: '',
    themeName: '',
    itemTypeCode: '',
    itemTypeName: '',
  }),
})
