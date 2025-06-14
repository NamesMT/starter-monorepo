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
    class="relative h-full w-full flex items-center justify-center border-2 border-white bg-neutral-900 text-white"
    :style="{ backgroundImage: bg }"
  >
    <div
      v-if="image"
      class="absolute inset-0 h-full w-full bg-center opacity-10"
      :style="{ backgroundImage: `url(${image})` }"
    />
    <div class="flex flex-col items-center text-center">
      <h1 class="flex gap-4 text-7xl font-bold" style="display: block; line-clamp: 2; text-overflow: ellipsis;">
        <Icon
          v-if="icon"
          :name="icon"
        />
        {{ title }}
      </h1>
      <p class="max-w-3xl text-2xl" style="display: block; line-clamp: 3; text-overflow: ellipsis;">
        {{ description }}
      </p>
    </div>

    <img
      v-if="logo"
      :src="logo"
      class="absolute bottom-0 left-0 p-5"
      style="height: 125px; width: 153px;"
    >
    <div class="absolute bottom-5 right-5 flex gap-4">
      <div
        v-if="username"
        class="absolute bottom-12 right-8 font-bold"
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
