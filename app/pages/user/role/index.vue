<template>
  <div class="card">
    <div class="card-header">
      <div class="d-flex flex-wrap gap-2 ms-auto align-items-center">

        <select
          v-model="selectedRoleFilter"
          class="form-select"
          style="width: 180px"
          aria-label="Filter Role"
        >
          <option value="">Semua Role</option>
          <option
            v-for="role in availableRoleOptions"
            :key="role"
            :value="role"
          >
            {{ role }}
          </option>
        </select>

        <div class="input-group" style="width: 250px">
          <input
            v-model="searchKeyword"
            type="text"
            class="form-control"
            placeholder="Cari Data ..."
            aria-label="Cari Data"
          />
          <button class="btn btn-icon" type="button" aria-label="Search" @click="resetOrFocus">
            <IconSearch :size="18" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="pending" class="p-5 text-center text-muted">
      <div class="spinner-border text-primary mb-2" role="status"></div>
      <div>Memuat data role...</div>
    </div>

    <div v-else-if="error" class="p-4">
      <div class="alert alert-danger mb-0" role="alert">
        Gagal memuat data role: {{ error.message || 'Terjadi kesalahan sistem' }}
      </div>
    </div>

    <div v-else class="table-responsive card-body p-0">
      <table class="table table-vcenter table-hover card-table">
        <thead>
          <tr>
            <th class="w-1 text-center">No</th>
            <th style="min-width: 180px">Role</th>
            <th>Deskripsi</th>
            <th v-if="canEditRole" class="text-center" style="width: 120px">Aksi</th>
          </tr>
        </thead>
        <tbody v-if="paginatedRoles.length > 0">
          <tr
            v-for="(item, index) in paginatedRoles"
            :key="item.id"
            :class="{ 'cursor-pointer': canEditRole }"
            @click="canEditRole && navigateToDetail(item.id)"
          >
            <td class="text-center text-muted" @click.stop>{{ startIndex + index + 1 }}</td>
            <td class="fw-semibold">
              <NuxtLink
                v-if="canEditRole"
                :to="`/user/role/hak-akses/${item.id}`"
                class="text-reset text-decoration-none d-inline-flex align-items-center gap-1"
              >
                <span class="badge" :class="getRoleBadgeClass(item.name)">{{ item.name }}</span>
                <span v-if="item.userCount !== undefined" class="badge bg-secondary-lt" title="Jumlah Pengguna">
                  {{ item.userCount }} user
                </span>
              </NuxtLink>
              <div v-else class="d-inline-flex align-items-center gap-1">
                <span class="badge" :class="getRoleBadgeClass(item.name)">{{ item.name }}</span>
                <span v-if="item.userCount !== undefined" class="badge bg-secondary-lt" title="Jumlah Pengguna">
                  {{ item.userCount }} user
                </span>
              </div>
            </td>
            <td class="text-secondary">{{ item.description || '-' }}</td>
            <td v-if="canEditRole" class="text-center" @click.stop>
              <NuxtLink
                :to="`/user/role/hak-akses/${item.id}`"
                class="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                title="Lihat & Edit Hak Akses Role"
              >
                <IconShieldLock :size="15" />
                <span>Hak Akses</span>
              </NuxtLink>
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td :colspan="canEditRole ? 4 : 3" class="text-center py-4 text-muted">
              Tidak ada data role yang sesuai dengan filter atau pencarian.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card-footer d-flex align-items-center" v-if="!pending && filteredRoles.length > 0">
      <p class="m-0 text-muted">
        Menampilkan <span>{{ startIndex + 1 }}</span> hingga <span>{{ Math.min(startIndex + perPage, filteredRoles.length) }}</span> dari <span>{{ filteredRoles.length }}</span> data
      </p>
      <ul class="pagination ms-auto m-0" v-if="totalPages > 1">
        <li class="page-item" :class="{ disabled: currentPage === 1 }">
          <a class="page-link" href="#" @click.prevent="currentPage > 1 && currentPage--">
            <IconChevronLeft :size="16" />
          </a>
        </li>
        <li
          v-for="page in totalPages"
          :key="page"
          class="page-item"
          :class="{ active: currentPage === page }"
        >
          <a class="page-link" href="#" @click.prevent="currentPage = page">{{ page }}</a>
        </li>
        <li class="page-item" :class="{ disabled: currentPage === totalPages }">
          <a class="page-link" href="#" @click.prevent="currentPage < totalPages && currentPage++">
            <IconChevronRight :size="16" />
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { IconSearch, IconShieldLock, IconChevronLeft, IconChevronRight } from "@tabler/icons-vue";
import { manajemenRole as fallbackRoles } from "~/data/manajemen-role.js";
import { usePermission } from "~/composables/usePermission.js";

definePageMeta({
  title: "Manajemen Role",
});

useSeoMeta({
  title: "Manajemen Role",
});

const { isSuperadmin, canUpdate } = usePermission();
const canEditRole = computed(() => isSuperadmin.value || canUpdate("ROLES"));

const selectedRoleFilter = ref("");
const searchKeyword = ref("");
const currentPage = ref(1);
const perPage = ref(10);

const { data: apiResponse, pending, error } = await useFetch("/api/roles", {
  headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined,
  lazy: false,
});

const roleItems = computed(() => {
  if (apiResponse.value?.success && Array.isArray(apiResponse.value?.data) && apiResponse.value.data.length > 0) {
    return apiResponse.value.data;
  }
  return fallbackRoles.map((r) => ({
    id: r.id,
    name: r.role,
    description: r.deskripsi,
  }));
});

const availableRoleOptions = computed(() => {
  const names = roleItems.value.map((r) => r.name).filter(Boolean);
  return Array.from(new Set(names));
});

const filteredRoles = computed(() => {
  let list = roleItems.value;

  if (selectedRoleFilter.value) {
    list = list.filter((r) => r.name.toLowerCase() === selectedRoleFilter.value.toLowerCase());
  }

  if (searchKeyword.value.trim()) {
    const q = searchKeyword.value.toLowerCase().trim();
    list = list.filter((r) =>
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  }

  return list;
});

watch([selectedRoleFilter, searchKeyword], () => {
  currentPage.value = 1;
});

const totalPages = computed(() => Math.ceil(filteredRoles.value.length / perPage.value) || 1);
const startIndex = computed(() => (currentPage.value - 1) * perPage.value);
const paginatedRoles = computed(() => {
  return filteredRoles.value.slice(startIndex.value, startIndex.value + perPage.value);
});

const router = useRouter();
const navigateToDetail = (id) => {
  if (id) {
    router.push(`/user/role/hak-akses/${id}`);
  }
};

const getRoleBadgeClass = (name) => {
  if (!name) return 'bg-secondary-lt';
  const lower = name.toLowerCase();
  if (lower.includes('super')) return 'bg-blue-lt';
  if (lower.includes('manager')) return 'bg-green-lt';
  if (lower.includes('admin')) return 'bg-orange-lt';
  return 'bg-purple-lt';
};

const resetOrFocus = () => {
};
</script>

