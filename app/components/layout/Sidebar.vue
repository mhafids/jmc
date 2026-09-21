<template>
  <aside
    class="navbar navbar-vertical navbar-expand-lg navbar-dark sidebar"
    data-bs-theme="dark"
  >
    <div class="container-fluid px-0 justify-content-start">

      <h1 class="navbar-brand text-white ms-3 ms-lg-0 gap-3">
        <div class="logo">
          <img src="~/assets/images/logo/logo_jmc.png" alt="Logo" height="15" />
        </div>

        <NuxtLink
          to="/"
          class="fw-bold hstack gap-3 text-decoration-none text-white"
        >
          <div style="font-size: 0.9rem">{{ config.public.appName }}</div>
        </NuxtLink>
      </h1>

      <div
        id="sidebar-menu"
        class="offcanvas offcanvas-start px-lg-3"
        tabindex="-1"
      >

        <div class="offcanvas-header">
          <div class="d-flex gap-3 align-items-center">
            <div class="image">
              <img
                src="~/assets/images/logo/logo_jmc.png"
                alt="Logo"
                height="15"
              />
            </div>

            <div class="logo-text flex-grow-1">
              <h3 class="m-0"></h3>
              <div class="fs-4 fw-bold">{{ config.public.appName }}</div>
            </div>
          </div>

          <button
            type="button"
            class="btn-close btn-close-white"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          />
        </div>

        <div
          class="offcanvas-body p-3 p-lg-0 flex-column flex-grow-1 overflow-auto"
        >
          <ul class="navbar-nav align-items-start pt-lg-3">
            <template v-for="item in filteredMenuItems">

              <li
                :key="item.title"
                v-if="item.children"
                class="nav-item dropdown"
                :class="{ active: isParentActive(item) }"
              >
                <a
                  class="nav-link dropdown-toggle"
                  href="#"
                  :class="{ active: isParentActive(item) }"
                  data-bs-toggle="dropdown"
                  data-bs-auto-close="false"
                  role="button"
                  aria-expanded="false"
                  @click.prevent="toggleDropdown(item.title)"
                >
                  <span class="nav-link-icon d-md-none d-lg-inline-block">
                    <component :is="item.icon" />
                  </span>
                  <span class="nav-link-title">{{ item.title }}</span>
                </a>
                <div
                  class="dropdown-menu"
                  :class="{
                    show:
                      openDropdowns.includes(item.title) ||
                      isParentActive(item),
                  }"
                >
                  <div class="dropdown-menu-columns">
                    <div class="dropdown-menu-column">
                      <NuxtLink
                        v-for="child in item.children"
                        :key="child.to"
                        :to="child.to"
                        class="dropdown-item"
                        :class="{ active: isActive(child.to) }"
                      >
                        {{ child.title }}
                      </NuxtLink>
                    </div>
                  </div>
                </div>
              </li>

              <li v-else class="nav-item" :key="item.title">
                <NuxtLink
                  :to="item.to"
                  class="nav-link"
                  :class="{ active: isActive(item.to) }"
                >
                  <span class="nav-link-icon d-md-none d-lg-inline-block">
                    <component :is="item.icon" />
                  </span>
                  <span class="nav-link-title">{{ item.title }}</span>
                </NuxtLink>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { menuIconMap } from "~/data/menu.js";
import { IconCircle } from "@tabler/icons-vue";

const appName = "Admin";
const route = useRoute();
const config = useRuntimeConfig();
const { user, isAuthenticated } = useAuth();

const { data: apiMenuData, refresh: refreshMenu } = await useFetch('/api/menu', {
  lazy: true,
  server: false,
  watch: [() => user.value?.roleId],
});

const resolveIcon = (iconKey, code) => {
  if (typeof iconKey === 'object' && iconKey !== null) return iconKey;
  if (iconKey && menuIconMap[iconKey]) return menuIconMap[iconKey];
  if (code && menuIconMap[code]) return menuIconMap[code];
  return IconCircle;
};

const filteredMenuItems = computed(() => {
  if (apiMenuData.value?.success && Array.isArray(apiMenuData.value?.data)) {
    return apiMenuData.value.data.map((item) => ({
      ...item,
      icon: resolveIcon(item.icon, item.code),
      children: item.children
        ? item.children.map((child) => ({
            ...child,
            icon: resolveIcon(child.icon, child.code),
          }))
        : undefined,
    }));
  }

  return [];
});

const openDropdowns = ref([]);

const isActive = (path) => {
  if (path === "/") return route.path === "/";
  return route.path === path || route.path.startsWith(path + "/");
};

const isParentActive = (item) => {
  if (!item.children) return false;
  return item.children.some((child) => isActive(child.to));
};

const toggleDropdown = (title) => {
  const idx = openDropdowns.value.indexOf(title);
  if (idx === -1) {
    openDropdowns.value.push(title);
  } else {
    openDropdowns.value.splice(idx, 1);
  }
};

watch(
  [() => route.path, filteredMenuItems],
  () => {
    filteredMenuItems.value.forEach((item) => {
      if (item.children && isParentActive(item)) {
        if (!openDropdowns.value.includes(item.title)) {
          openDropdowns.value.push(item.title);
        }
      }
    });
  },
  { immediate: true },
);
</script>
