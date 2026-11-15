<template>
  <!-- Matte translucent surface. Inputs keep their own approved styling. -->
  <div
    class="animate-in w-full z-20 rounded-2xl border border-border/60 bg-card/20 p-4 shadow-lg backdrop-blur-sm fade-in fill-mode-both slide-in-from-bottom-2 duration-300 ease-out-expo sm:p-8"
  >
    <slot />
  </div>
</template>
