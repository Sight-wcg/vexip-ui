<template>
  <label :class="className">
    <input
      ref="input"
      type="radio"
      :class="nh.be('input')"
      :checked="currentValue === props.label"
      :disabled="isDisabled || (isLoading && isLoadingLock)"
      :tabindex="props.tabIndex"
      @submit.prevent
      @change="handleChange"
    />
    <span :class="[nh.be('signal'), isLoading && nh.bem('signal', 'active')]"></span>
    <span :class="[nh.be('label'), props.labelClass]">
      <CollapseTransition
        v-if="isButton"
        appear
        horizontal
        fade-effect
      >
        <div v-if="isLoading" :class="nh.be('loading')">
          <Icon
            v-bind="icons.loading"
            :effect="loadingEffect || icons.loading.effect"
            :icon="loadingIcon || icons.loading.icon"
          ></Icon>
        </div>
      </CollapseTransition>
      <slot>{{ props.label }}</slot>
    </span>
  </label>
</template>

<script lang="ts">
import { CollapseTransition } from '@/components/collapse-transition'
import { Icon } from '@/components/icon'

import { computed, defineComponent, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  createSizeProp,
  createStateProp,
  emitEvent,
  useIcons,
  useNameHelper,
  useProps
} from '@vexip-ui/config'
import { isDefined } from '@vexip-ui/utils'
import { radioProps } from './props'
import { GROUP_STATE } from './symbol'

import type { ChangeEvent } from './symbol'

export default defineComponent({
  name: 'Radio',
  components: {
    CollapseTransition,
    Icon
  },
  props: radioProps,
  emits: ['update:value'],
  setup(_props, { emit }) {
    const props = useProps('radio', _props, {
      size: createSizeProp(),
      state: createStateProp(),
      value: {
        default: null,
        static: true
      },
      label: {
        default: null,
        validator: isDefined,
        static: true
      },
      labelClass: null,
      disabled: false,
      border: false,
      tabIndex: 0,
      loading: false,
      loadingLock: false
    })

    const groupState = inject(GROUP_STATE, null)

    const nh = useNameHelper('radio')
    const icons = useIcons()
    const currentValue = ref(props.value)

    const input = ref<HTMLInputElement>()

    const size = computed(() => groupState?.size || props.size)
    const state = computed(() => groupState?.state || props.state)
    const isDisabled = computed(() => groupState?.disabled || props.disabled)
    const isButton = computed(() => groupState?.button)
    const isBorder = computed(() => groupState?.border || props.border)
    const isLoading = computed(() => groupState?.loading || props.loading)
    const loadingIcon = computed(() => groupState?.loadingIcon)
    const isLoadingLock = computed(() => groupState?.loadingLock || false)
    const loadingEffect = computed(() => groupState?.loadingEffect || '')
    const className = computed(() => {
      return [
        nh.b(),
        nh.bs('vars'),
        {
          [nh.bm('inherit')]: props.inherit,
          [nh.bm('checked')]: currentValue.value === props.label,
          [nh.bm('disabled')]: isDisabled.value,
          [nh.bm('loading')]: isLoading.value && isLoadingLock.value,
          [nh.bm(size.value)]: size.value !== 'default',
          [nh.bm('border')]: isBorder.value,
          [nh.bm(state.value)]: state.value !== 'default'
        }
      ]
    })

    watch(
      () => props.value,
      value => {
        currentValue.value = value
      }
    )

    if (groupState) {
      currentValue.value = groupState.currentValue

      watch(() => groupState.currentValue, emitChange)

      onMounted(() => {
        groupState.registerInput(input)
      })

      onBeforeUnmount(() => {
        groupState.unregisterInput(input)
      })
    }

    function emitChange(value: string | number | boolean) {
      if (currentValue.value === value) return

      currentValue.value = value

      emit('update:value', value)
      emitEvent(props.onChange as ChangeEvent, value)
    }

    function handleChange() {
      if (isDisabled.value || (isLoading.value && isLoadingLock.value)) {
        return
      }

      emitChange(props.label)

      if (groupState && currentValue.value === props.label) {
        groupState.updateValue(currentValue.value)
      }
    }

    return {
      props,
      nh,
      icons,
      currentValue,

      className,
      isDisabled,
      isButton,
      isLoading,
      isLoadingLock,
      loadingIcon,
      loadingEffect,

      input,

      handleChange
    }
  }
})
</script>
