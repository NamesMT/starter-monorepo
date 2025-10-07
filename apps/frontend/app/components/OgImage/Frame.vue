<script setup>
defineProps({
  title: { type: String, required: false },
  description: { type: String, required: false },
  bg: { type: String, required: false, default: 'linear-gradient(to bottom right, #171717, #131313)' },
  icon: { type: String, required: false },
  logo: { type: String, required: false },
  image: { type: String, required: false },
  username: { type: String, required: false },
  socials: { type: Array, required: false },
})
</script>

<template>
  <div
    class="text-white border-2 border-white bg-neutral-900 flex h-full w-full items-center justify-center relative"
    :style="{ backgroundImage: bg }"
  >
    <div
      v-if="image"
      class="opacity-10 h-full w-full inset-0 absolute bg-center"
      :style="{ backgroundImage: `url(${image})` }"
    />
    <div class="text-center flex flex-col items-center">
      <h1 class="text-7xl font-bold flex gap-4" style="display: block; line-clamp: 2; text-overflow: ellipsis;">
        <Icon
          v-if="icon"
          :name="icon"
        />
        {{ title }}
      </h1>
      <p class="text-2xl max-w-3xl" style="display: block; line-clamp: 3; text-overflow: ellipsis;">
        {{ description }}
      </p>
    </div>

    <img
      v-if="logo"
      :src="logo"
      class="p-5 bottom-0 left-0 absolute"
      style="height: 125px; width: 153px;"
    >
    <div class="flex gap-4 bottom-5 right-5 absolute">
      <div
        v-if="username"
        class="font-bold bottom-12 right-8 absolute"
      >
        {{ username }}
      </div>
      <Icon
        v-for="social of socials"
        :key="social.name"
        :name="social.icon"
        class="h-7 w-7"
      />
    </div>
  </div>
</template>
