import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GridMaker from './GridMaker.vue'

/**
 * `GridMaker` renders a string grid, one element per non-space character. It is the only Vue
 * component outside the Nuxt layer, so it is where component testing starts: props in, DOM out.
 */
describe('gridMaker', () => {
  const mountGrid = (props: Record<string, unknown>) =>
    mount(GridMaker, { props: props as any })

  it('renders one row per array entry and one cell per character', () => {
    const wrapper = mountGrid({ value: ['ab', 'cd'] })

    expect(wrapper.findAll('.GridMaker__row')).toHaveLength(2)
    expect(wrapper.findAll('.GridMaker__col')).toHaveLength(4)
  })

  it('marks spaces as inactive instead of drawing them', () => {
    const wrapper = mountGrid({ value: ['a b'] })

    expect(wrapper.findAll('.GridMaker__col')).toHaveLength(2)
    expect(wrapper.findAll('.GridMaker__col--inactive')).toHaveLength(1)
  })

  it('turns bare numbers into pixels and passes CSS units through', () => {
    const wrapper = mountGrid({ value: ['a'], size: 24, gapX: '0.5rem' })
    const style = wrapper.find('.GridMaker__row').element.parentElement!.getAttribute('style')

    expect(style).toContain('--SIZE: 24px')
    expect(style).toContain('--GAP-X: 0.5rem')
  })

  it('applies the caller\'s class to active cells only', () => {
    const wrapper = mountGrid({ value: ['a '], elementClass: 'text-red-500' })

    const active = wrapper.find('.GridMaker__col')
    expect(active.classes()).toContain('text-red-500')
    expect(wrapper.find('.GridMaker__col--inactive').classes()).not.toContain('text-red-500')
  })
})
