<script setup>
definePageMeta({
  layout: "auth",
  title: "Login",
  alias: ["/login", "/auth/login"],
});

import LoginForm from "~/features/auth/Login/components/LoginForm.vue";

const { initTheme } = useTheme();
const config = useRuntimeConfig();

onMounted(() => {
  initTheme();
});
</script>

<template>
  <div class="box col-md-8 p-4">

    <div class="d-flex gap-3 mb-4 align-items-center">
      <div class="logo">
        <img
          src="~/assets/images/logo/logo_jmc_black.png"
          alt="Logo"
          height="30"
        />
      </div>

      <div class="logo-text">
        <h1 class="mb-0 text-primary">{{ config.public.appName }}</h1>

        <div>{{ config.public.appClient }}</div>
      </div>
    </div>

    <p class="text-secondary mb-4">
      Selamat Datang, silahkan masukkan username, email, atau no. handphone dan password anda!
    </p>

    <LoginForm />
  </div>
</template>
