<template>
  <div class="new-chat-view">
    <p>{{ t('chat.selectOrCreateChat') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useTranslation } from 'i18next-vue'
const { t } = useTranslation()
</script>

<style scoped>
.new-chat-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}
</style>
