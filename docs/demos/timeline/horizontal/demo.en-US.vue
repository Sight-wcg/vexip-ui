<template>
  <p style="margin-bottom: 28px">
    <span>Flip: </span>
    <Switch v-model:value="flip" style="margin-right: 10px"></Switch>
    <span>Alternate: </span>
    <Switch v-model:value="alternate"></Switch>
  </p>
  <Timeline
    horizontal
    :flip="flip"
    :alternate="alternate"
    pending
  >
    <TimelineItem>
      <span>Timeline node 1</span>
    </TimelineItem>
    <TimelineItem>
      <span>Timeline node 2</span>
    </TimelineItem>
    <TimelineItem>
      <span>Timeline node 3</span>
    </TimelineItem>
    <TimelineItem>
      <span>Timeline node 4</span>
    </TimelineItem>
    <TimelineItem>
      <span>Timeline node 5</span>
    </TimelineItem>
  </Timeline>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const flip = ref(false)
const alternate = ref(false)
</script>

<style scoped>
.vxp-timeline__item {
  white-space: nowrap;
}
</style>
