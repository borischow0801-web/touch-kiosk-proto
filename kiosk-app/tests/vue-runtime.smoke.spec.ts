import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, onMounted, ref } from 'vue'

describe('Vue runtime 统一性', () => {
  it('onMounted 在 mount 后真实执行', async () => {
    const ready = ref(false)
    const Comp = defineComponent({
      setup() {
        onMounted(() => {
          ready.value = true
        })
        return () => (ready.value ? 'ready' : 'wait')
      },
    })

    const wrapper = mount(Comp)
    await flushPromises()
    expect(wrapper.text()).toBe('ready')
  })
})
