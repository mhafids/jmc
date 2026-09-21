<template>
  <div class="row">
    <div class="col-lg-8 col-md-10">
      <SettingForm />
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  title: "Setting Tunjangan Transport",
});

useSeoMeta({
  title: "Setting Tunjangan Transport",
});

import SettingForm from "~/features/Tunjangan/components/SettingForm.vue";
</script>
