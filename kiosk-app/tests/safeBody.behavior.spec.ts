import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SafeBody from '../src/components/SafeBody.vue'
import { containsDangerousMarkup, sanitizePublicBody } from '../src/utils/sanitizeBody'

describe('SafeBody 组件', () => {
  it('恶意 HTML 渲染后不含危险标记', async () => {
    const raw = '<p>安全</p><script>void(0)</script><span onclick="x()">字</span>'
    const sanitized = sanitizePublicBody(raw)
    expect(containsDangerousMarkup(sanitized)).toBe(false)

    const wrapper = mount(SafeBody, { props: { body: raw } })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.safe-body').text()).toContain('安全')
    expect(wrapper.find('.safe-body').text()).toContain('字')
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.find('[onclick]').exists()).toBe(false)
  })

  it('纯文本正确转义', () => {
    const wrapper = mount(SafeBody, { props: { body: '<不是标签>' } })
    expect(wrapper.html()).toContain('&lt;不是标签&gt;')
  })
})
