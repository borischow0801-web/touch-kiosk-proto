import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ContentListItem from '../src/components/ContentListItem.vue'

describe('ContentListItem 行为', () => {
  it('仅列表模块渲染非交互 article', () => {
    const wrapper = mount(ContentListItem, {
      props: {
        title: '指南条目',
        summary: '摘要说明',
        interactive: false,
      },
    })
    expect(wrapper.find('article').exists()).toBe(true)
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).toContain('指南条目')
    expect(wrapper.text()).toContain('摘要说明')
  })

  it('支持详情模块渲染可点击按钮并触发 activate', async () => {
    const wrapper = mount(ContentListItem, {
      props: {
        title: '政策A',
        meta: '2024-01-01',
        interactive: true,
      },
    })
    const button = wrapper.get('button[type="button"]')
    expect(button.text()).toContain('政策A')
    await button.trigger('click')
    expect(wrapper.emitted('activate')).toHaveLength(1)
  })
})
