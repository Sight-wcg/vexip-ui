<template>
  <div
    v-if="!row.hidden"
    ref="wrapper"
    :class="[nh.be('group'), row.checked && nh.bem('group', 'checked')]"
    role="row"
    :draggable="draggable || row.dragging"
    :style="groupStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
    @dblclick="handleDblclick"
    @contextmenu="handleContextmenu"
    @dragstart.stop="handleDragStart"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @dragend="handleDragEnd"
  >
    <div
      ref="rowEl"
      :class="className"
      :style="style"
      v-bind="attrs"
    >
      <div
        v-if="fixed !== 'right'"
        :class="nh.be('side-pad')"
        role="none"
        aria-hidden
      ></div>
      <slot></slot>
      <div
        v-if="fixed !== 'left'"
        :class="[nh.be('side-pad'), nh.bem('side-pad', 'right')]"
        role="none"
        aria-hidden
      ></div>
    </div>
    <CollapseTransition v-if="!!expandColumn" @enter="computeRectHeight" @leave="computeRectHeight">
      <div
        v-if="row.expanded"
        ref="expand"
        :class="nh.be('collapse')"
        :style="expandStyle"
      >
        <Renderer
          v-if="isFunction(expandColumn.renderer)"
          :renderer="expandColumn.renderer"
          :data="{ leftFixed, rightFixed, row: row.data, rowIndex: index }"
        ></Renderer>
        <Renderer
          v-else-if="isFunction(expandRenderer)"
          :renderer="expandRenderer"
          :data="{ leftFixed, rightFixed, row: row.data, rowIndex: index }"
        ></Renderer>
      </div>
    </CollapseTransition>
  </div>
</template>

<script lang="ts">
import { CollapseTransition } from '@/components/collapse-transition'
import { Renderer } from '@/components/renderer'

import {
  computed,
  defineComponent,
  inject,
  nextTick,
  onMounted,
  onUpdated,
  reactive,
  ref,
  toRef,
  watch
} from 'vue'

import { useNameHelper } from '@vexip-ui/config'
import { isFunction } from '@vexip-ui/utils'
import { TABLE_ACTIONS, TABLE_STORE } from './symbol'

import type { CSSProperties, PropType } from 'vue'
import type { TableRowState } from './symbol'

export default defineComponent({
  name: 'TableRow',
  components: {
    CollapseTransition,
    Renderer
  },
  props: {
    row: {
      type: Object as PropType<TableRowState>,
      default: () => ({})
    },
    index: {
      type: Number,
      default: null
    },
    isHead: {
      type: Boolean,
      default: false
    },
    isFoot: {
      type: Boolean,
      default: false
    },
    fixed: {
      type: String as PropType<'left' | 'right' | undefined>,
      default: null
    }
  },
  setup(props) {
    const { state, getters, mutations } = inject(TABLE_STORE)!
    const tableAction = inject(TABLE_ACTIONS)!

    const nh = useNameHelper('table')

    const wrapper = ref<HTMLElement>()
    const rowElement = ref<HTMLElement>()
    const expandElement = ref<HTMLElement>()

    const instance = reactive({
      el: wrapper,
      row: toRef(props, 'row')
    })

    const rowKey = computed(() => props.row.key)
    const rowType = computed(() => (props.isHead ? 'head' : props.isFoot ? 'foot' : undefined))
    const className = computed(() => {
      let customClass = null

      if (!rowType.value) {
        if (typeof state.rowClass === 'function') {
          customClass = state.rowClass(props.row.data, props.index)
        } else {
          customClass = state.rowClass
        }
      }

      return [
        nh.be('row'),
        {
          [nh.bem('row', 'hover')]: !rowType.value && state.highlight && props.row.hover,
          [nh.bem('row', 'stripe')]: state.stripe && props.index % 2 === 1,
          [nh.bem('row', 'checked')]: props.row.checked
        },
        customClass
      ]
    })
    const style = computed(() => {
      let customStyle: any = ''

      if (!rowType.value) {
        if (typeof state.rowStyle === 'function') {
          customStyle = state.rowStyle(props.row.data, props.index)
        } else {
          customStyle = state.rowStyle
        }
      }

      return [
        customStyle,
        {
          minHeight: !state.rowHeight ? `${state.rowMinHeight}px` : undefined
        }
      ]
    })
    const attrs = computed(() => {
      if (!rowType.value) {
        if (typeof state.rowAttrs === 'function') {
          return state.rowAttrs(props.row.data, props.index)
        } else {
          return state.rowAttrs
        }
      }

      return null
    })
    const groupStyle = computed(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      state.totalHeight

      const offset =
        state.heightBITree && !rowType.value && props.index
          ? state.heightBITree.sum(props.index)
          : 0

      return {
        transform: offset ? `translate3d(0, ${offset}px, 0)` : undefined
      }
    })
    const draggable = computed(() => !rowType.value && state.rowDraggable)
    const dragging = computed(() => state.dragging)
    const expandRenderer = computed(() => state.expandRenderer)
    const expandStyle = computed<CSSProperties>(() => {
      const width =
        props.fixed === 'right' ? getters.rightFixedWidths.at(-1) : getters.leftFixedWidths.at(-1)
      const padLeft = props.fixed !== 'right' ? state.sidePadding[0] || 0 : 0
      const padRight = props.fixed !== 'left' ? state.sidePadding[1] || 0 : 0

      return props.fixed
        ? {
            width: width && `${width + padLeft + padRight}px`,
            whiteSpace: 'nowrap'
          }
        : {}
    })
    const cellDraggable = computed(() => {
      return getters.hasDragColumn && !getters.disableDragRows.has(rowKey.value)
    })
    const leftFixed = computed(() => {
      return (getters.leftFixedWidths.at(-1) || 0) + (state.sidePadding[0] || 0)
    })
    const rightFixed = computed(() => {
      return (getters.rightFixedWidths.at(-1) || 0) + (state.sidePadding[1] || 0)
    })

    function getRowHeight(row: TableRowState) {
      if (!row) return 0

      return (row.borderHeight || 0) + (row.height || 0) + (row.expandHeight || 0)
    }

    function computeRectHeight() {
      if (!Object.keys(props.row).length || props.row.hidden) return

      computeBorderHeight()
      computeRowHeight()
      !rowType.value && updateTotalHeight()
    }

    function updateTotalHeight() {
      if (state.heightBITree && !props.fixed) {
        nextTick(() => {
          const height = getRowHeight(props.row)
          const tree = state.heightBITree
          const prev = tree.get(props.index)

          if (height !== prev) {
            tree.add(props.index, height - prev)
            mutations.updateTotalHeight()
          }
        })
      }
    }

    watch(
      () => props.row.hidden,
      value => {
        !value && computeRectHeight()
      }
    )
    watch(
      () => props.row,
      () => {
        computeRectHeight()
      }
    )

    onMounted(() => {
      computeRectHeight()
      mutations.updateTotalHeight()
    })

    onUpdated(() => {
      if (!state.rowHeight) {
        computeRectHeight()
      } else if (!props.row.hidden) {
        computeBorderHeight()
        updateTotalHeight()
      }
    })

    function computeRowHeight() {
      if (state.rowHeight) {
        mutations.fixRowHeight(rowKey.value, state.rowHeight)

        nextTick(() => {
          if (rowElement.value) {
            rowElement.value.style.height = `${state.rowHeight}px`
            rowElement.value.style.maxHeight = `${state.rowHeight}px`
          }
        })
      } else {
        nextTick(() => {
          if (!props.fixed) {
            if (rowElement.value) {
              mutations.fixRowHeight(rowKey.value, rowElement.value.offsetHeight)
            }
          } else {
            setTimeout(() => {
              if (rowElement.value) {
                rowElement.value.style.height = `${props.row.height}px`
              }
            }, 0)
          }
        })
      }
    }

    function computeBorderHeight() {
      if (wrapper.value) {
        const style = getComputedStyle(wrapper.value)
        const borderHeight = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)

        mutations.setBorderHeight(rowKey.value, borderHeight)
        mutations.setRowExpandHeight(rowKey.value, expandElement.value?.scrollHeight || 0)
      }
    }

    function buildEventPayload(event: Event) {
      return {
        row: props.row.data,
        key: props.row.key,
        index: props.index,
        event
      }
    }

    function handleMouseEnter(event: MouseEvent) {
      mutations.setRowHover(rowKey.value, true)

      if (!rowType.value && tableAction) {
        tableAction.emitRowEvent('Enter', buildEventPayload(event))
      }
    }

    function handleMouseLeave(event: MouseEvent) {
      mutations.setRowHover(rowKey.value, false)

      if (!rowType.value && tableAction) {
        tableAction.emitRowEvent('Leave', buildEventPayload(event))
      }
    }

    function handleClick(event: MouseEvent) {
      if (!rowType.value && tableAction) {
        tableAction.emitRowEvent('Click', buildEventPayload(event))
      }
    }

    function handleDblclick(event: MouseEvent) {
      if (!rowType.value && tableAction) {
        tableAction.emitRowEvent('Dblclick', buildEventPayload(event))
      }
    }

    function handleContextmenu(event: MouseEvent) {
      if (!rowType.value && tableAction) {
        tableAction.emitRowEvent('Contextmenu', buildEventPayload(event))
      }
    }

    function handleDragStart(event: DragEvent) {
      if (!draggable.value && !cellDraggable.value) return

      tableAction.handleRowDragStart(instance, event)
    }

    function shouldProcessDrag() {
      return (draggable.value || cellDraggable.value) && dragging.value
    }

    function handleDragOver(event: DragEvent) {
      if (!shouldProcessDrag() || (cellDraggable.value && !getters.rowDragging)) return

      event.stopPropagation()
      event.preventDefault()
      tableAction.handleRowDragOver(instance, event)
    }

    function handleDrop(event: DragEvent) {
      if (!shouldProcessDrag()) return

      event.stopPropagation()
      event.preventDefault()
      tableAction.handleRowDrop(instance, event)
      nextTick(() => mutations.handleDrag(rowKey.value, false))
    }

    function handleDragEnd(event: DragEvent) {
      if (!shouldProcessDrag()) return

      event.stopPropagation()
      tableAction.handleRowDragEnd(event)
      nextTick(() => mutations.handleDrag(rowKey.value, false))
    }

    return {
      nh,

      className,
      style,
      attrs,
      groupStyle,
      draggable,
      expandRenderer,
      expandStyle,
      leftFixed,
      rightFixed,
      expandColumn: toRef(getters, 'expandColumn'),

      wrapper,
      rowEl: rowElement,
      expand: expandElement,

      isFunction,
      handleMouseEnter,
      handleMouseLeave,
      handleClick,
      handleDblclick,
      handleContextmenu,
      handleDragStart,
      handleDragOver,
      handleDrop,
      handleDragEnd,
      computeRectHeight
    }
  }
})
</script>
