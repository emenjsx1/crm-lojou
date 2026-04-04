<template>
  <div class="flex min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 font-sans">
    <Sidebar />
    <div class="flex flex-col flex-1 pl-64 w-full">
      <Topbar />
      <main class="flex-1 p-6 overflow-y-auto h-[calc(100vh-4rem)]">
        <slot />
      </main>
    </div>
    <UNotifications />
    <UModals />
    <USlideovers />
  </div>
</template>

<script setup lang="ts">
// Default layout
</script>