<template>
  <div>

    <div class="mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
      <NuxtLink
        to="/user/role"
        class="btn btn-outline-secondary d-inline-flex align-items-center gap-1"
      >
        <IconArrowLeft :size="18" />
        <span>Kembali ke Daftar Role</span>
      </NuxtLink>

      <div class="d-flex gap-2 align-items-center">

        <span v-if="!canEditRole" class="badge bg-secondary-lt px-3 py-2">
          Mode Baca (Read-Only)
        </span>

        <button
          v-if="canEditRole && !isEditing"
          type="button"
          class="btn btn-primary d-inline-flex align-items-center gap-1"
          @click="startEdit"
        >
          <IconEdit :size="16" />
          <span>Edit Hak Akses</span>
        </button>

        <template v-else-if="canEditRole && isEditing">
          <button
            type="button"
            class="btn btn-outline-secondary"
            :disabled="saving"
            @click="cancelEdit"
          >
            Batal
          </button>
          <button
            type="button"
            class="btn btn-success d-inline-flex align-items-center gap-1"
            :disabled="saving"
            @click="handleSave"
          >
            <span v-if="saving" class="spinner-border spinner-border-sm me-1" role="status"></span>
            <IconCheck v-else :size="16" />
            <span>Simpan Perubahan</span>
          </button>
        </template>
      </div>
    </div>

    <div v-if="!canEditRole" class="alert alert-info d-flex align-items-center mb-3" role="alert">
      <IconInfoCircle :size="20" class="text-info me-2 flex-shrink-0" />
      <div>
        <strong>Mode Baca (Read-Only)</strong> — Anda tidak memiliki wewenang untuk mengubah konfigurasi role atau hak akses modul ini.
      </div>
    </div>

    <div v-if="saveSuccessMessage" class="alert alert-success alert-dismissible mb-3 d-flex align-items-center" role="alert">
      <IconCircleCheckFilled :size="20" class="text-success me-2" />
      <div>{{ saveSuccessMessage }}</div>
      <button type="button" class="btn-close" @click="saveSuccessMessage = ''"></button>
    </div>

    <div v-if="saveErrorMessage" class="alert alert-danger alert-dismissible mb-3 d-flex align-items-center" role="alert">
      <IconXboxXFilled :size="20" class="text-danger me-2" />
      <div>{{ saveErrorMessage }}</div>
      <button type="button" class="btn-close" @click="saveErrorMessage = ''"></button>
    </div>

    <div v-if="pending" class="card mb-3 p-5 text-center text-muted">
      <div class="spinner-border text-primary mb-2" role="status"></div>
      <div>Memuat data hak akses role...</div>
    </div>

    <div v-else-if="error" class="card mb-3 p-4">
      <div class="alert alert-danger mb-0" role="alert">
        Gagal memuat data hak akses: {{ error.message || 'Terjadi kesalahan sistem' }}
      </div>
    </div>

    <template v-else>

      <div class="card mb-3">
        <div class="card-status-top bg-primary"></div>
        <div class="card-header d-flex justify-content-between align-items-center">
          <h3 class="card-title">Informasi Role</h3>
          <span v-if="isEditing" class="badge bg-warning-lt">Mode Edit Aktif</span>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4 col-lg-3">
              <label class="form-label fw-semibold">Nama Role <span v-if="isEditing" class="text-danger">*</span></label>
              <input
                v-model="editForm.name"
                type="text"
                class="form-control"
                :class="{ 'bg-light': !isEditing }"
                :readonly="!isEditing"
                :disabled="!isEditing"
                placeholder="Masukkan Nama Role"
              />
            </div>
            <div class="col-md-8 col-lg-9">
              <label class="form-label fw-semibold">Deskripsi Wewenang</label>
              <input
                v-model="editForm.description"
                type="text"
                class="form-control"
                :class="{ 'bg-light': !isEditing }"
                :readonly="!isEditing"
                :disabled="!isEditing"
                placeholder="Masukkan Deskripsi Wewenang Role"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Matriks Hak Akses Per Modul</h3>
          <div class="card-actions">
            <span v-if="isEditing" class="badge bg-primary-lt">Dapat Mengubah Akses & Scope</span>
            <span v-else class="badge bg-secondary-lt">Inspeksi Hak Akses</span>
          </div>
        </div>
        <div class="table-responsive card-body p-0">
          <table class="table table-vcenter table-hover card-table">
            <thead>
              <tr>
                <th class="w-1 text-center">No</th>
                <th style="min-width: 180px">Modul / Fitur</th>
                <th class="text-center" style="width: 90px">Akses</th>
                <th class="text-center" style="width: 90px">Create</th>
                <th class="text-center" style="width: 110px">Read</th>
                <th class="text-center" style="width: 110px">Update</th>
                <th class="text-center" style="width: 110px">Delete</th>
                <th style="min-width: 180px">Catatan Khusus</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in permissionsMatrix" :key="item.moduleId || index">
                <td class="text-center text-muted">{{ item.orderNo || index + 1 }}</td>
                <td class="fw-semibold text-dark">
                  <NuxtLink
                    v-if="item.path && item.canAccess && !isEditing"
                    :to="item.path"
                    class="text-primary text-decoration-underline d-inline-flex align-items-center gap-1"
                    :title="`Buka rute modul ${item.moduleName}`"
                  >
                    <span>{{ item.moduleName }}</span>
                    <IconExternalLink :size="14" class="text-muted" />
                  </NuxtLink>
                  <span v-else>{{ item.moduleName }}</span>
                </td>

                <td class="text-center">
                  <template v-if="isEditing">
                    <input
                      type="checkbox"
                      class="form-check-input cursor-pointer"
                      v-model="item.canAccess"
                      :title="item.canAccess ? 'Akses Diizinkan' : 'Akses Ditolak'"
                    />
                  </template>
                  <template v-else>
                    <IconCircleCheckFilled
                      v-if="item.canAccess"
                      class="text-green"
                      :size="22"
                      title="Memiliki Akses Menu"
                    />
                    <IconXboxXFilled
                      v-else
                      class="text-danger"
                      :size="22"
                      title="Tidak Ada Akses Menu"
                    />
                  </template>
                </td>

                <td class="text-center">
                  <template v-if="isEditing">
                    <input
                      type="checkbox"
                      class="form-check-input cursor-pointer"
                      v-model="item.canCreate"
                      :disabled="!item.canAccess"
                      :title="item.canCreate ? 'Create Diizinkan' : 'Create Ditolak'"
                    />
                  </template>
                  <template v-else>
                    <IconCircleCheckFilled
                      v-if="item.canCreate"
                      class="text-green"
                      :size="22"
                      title="Diizinkan Tambah Data"
                    />
                    <IconXboxXFilled
                      v-else
                      class="text-danger"
                      :size="22"
                      title="Tidak Diizinkan Tambah Data"
                    />
                  </template>
                </td>

                <td class="text-center">
                  <template v-if="isEditing">
                    <select
                      v-model="item.readScope"
                      class="form-select form-select-sm"
                      :disabled="!item.canAccess"
                    >
                      <option value="no">-</option>
                      <option value="all">All</option>
                      <option value="own">Own</option>
                    </select>
                  </template>
                  <template v-else>
                    <span v-if="String(item.readScope).toLowerCase() === 'all'" class="badge bg-blue-lt">All</span>
                    <span v-else-if="String(item.readScope).toLowerCase() === 'own'" class="badge bg-azure-lt">Own</span>
                    <span v-else class="text-muted fw-bold">-</span>
                  </template>
                </td>

                <td class="text-center">
                  <template v-if="isEditing">
                    <select
                      v-model="item.updateScope"
                      class="form-select form-select-sm"
                      :disabled="!item.canAccess"
                    >
                      <option value="no">-</option>
                      <option value="all">All</option>
                      <option value="own">Own</option>
                    </select>
                  </template>
                  <template v-else>
                    <span v-if="String(item.updateScope).toLowerCase() === 'all'" class="badge bg-blue-lt">All</span>
                    <span v-else-if="String(item.updateScope).toLowerCase() === 'own'" class="badge bg-azure-lt">Own</span>
                    <span v-else class="text-muted fw-bold">-</span>
                  </template>
                </td>

                <td class="text-center">
                  <template v-if="isEditing">
                    <select
                      v-model="item.deleteScope"
                      class="form-select form-select-sm"
                      :disabled="!item.canAccess"
                    >
                      <option value="no">-</option>
                      <option value="all">All</option>
                      <option value="own">Own</option>
                    </select>
                  </template>
                  <template v-else>
                    <span v-if="String(item.deleteScope).toLowerCase() === 'all'" class="badge bg-blue-lt">All</span>
                    <span v-else-if="String(item.deleteScope).toLowerCase() === 'own'" class="badge bg-azure-lt">Own</span>
                    <span v-else class="text-muted fw-bold">-</span>
                  </template>
                </td>

                <td>
                  <template v-if="isEditing">
                    <input
                      v-model="item.notes"
                      type="text"
                      class="form-control form-control-sm"
                      placeholder="Catatan aturan khusus..."
                    />
                  </template>
                  <template v-else>
                    <span class="text-secondary small">{{ item.notes || '-' }}</span>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import {
  IconCircleCheckFilled,
  IconXboxXFilled,
  IconArrowLeft,
  IconExternalLink,
  IconEdit,
  IconCheck,
  IconInfoCircle,
} from "@tabler/icons-vue";
import { hakAksesMatriks, manajemenRole as fallbackRoles } from "~/data/manajemen-role.js";
import { usePermission } from "~/composables/usePermission.js";

definePageMeta({
  title: "Detail Hak Akses Role",
});

useSeoMeta({
  title: "Detail Hak Akses Role",
});

const route = useRoute();
const roleId = computed(() => route.params.id);

const { isSuperadmin, canUpdate } = usePermission();
const canEditRole = computed(() => isSuperadmin.value || canUpdate("ROLES"));

const isEditing = ref(false);
const saving = ref(false);
const saveSuccessMessage = ref("");
const saveErrorMessage = ref("");

const editForm = reactive({
  name: "",
  description: "",
});

const permissionsMatrix = ref([]);

const { data: apiResponse, pending, error, refresh } = await useFetch(
  () => `/api/roles/${roleId.value}/permissions`,
  {
    headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined,
    lazy: false,
    watch: [roleId],
  }
);

const roleInfo = computed(() => {
  if (apiResponse.value?.success && apiResponse.value?.role) {
    return apiResponse.value.role;
  }
  const fallback = fallbackRoles.find((r) => r.id === roleId.value || r.role === roleId.value);
  if (fallback) {
    return {
      name: fallback.role,
      description: fallback.deskripsi,
    };
  }
  return {
    name: "Role Terpilih",
    description: "Detail wewenang hak akses modul sistem",
  };
});

const syncData = () => {
  editForm.name = roleInfo.value.name || "";
  editForm.description = roleInfo.value.description || "";

  if (apiResponse.value?.success && Array.isArray(apiResponse.value?.permissions)) {
    permissionsMatrix.value = JSON.parse(JSON.stringify(apiResponse.value.permissions));
  } else {
    const fallbackList = hakAksesMatriks[roleInfo.value.name] || hakAksesMatriks["Superadmin"];
    permissionsMatrix.value = fallbackList.map((item, idx) => ({
      moduleId: String(idx + 1),
      moduleName: item.modul,
      path: item.path || null,
      orderNo: item.no,
      canAccess: item.canAksesMenu,
      canCreate: item.canCreateMenu,
      readScope: item.read,
      updateScope: item.update,
      deleteScope: item.delete,
      notes: item.notes,
    }));
  }
};

watch([apiResponse, roleInfo], syncData, { immediate: true });

const startEdit = () => {
  if (!canEditRole.value) {
    saveErrorMessage.value = "Anda tidak memiliki wewenang untuk mengedit role ini.";
    return;
  }
  saveSuccessMessage.value = "";
  saveErrorMessage.value = "";
  isEditing.value = true;
};

const cancelEdit = () => {
  syncData();
  isEditing.value = false;
  saveErrorMessage.value = "";
};

const handleSave = async () => {
  if (!canEditRole.value) {
    saveErrorMessage.value = "Anda tidak memiliki wewenang untuk mengedit role ini.";
    return;
  }

  if (!editForm.name.trim()) {
    saveErrorMessage.value = "Nama Role wajib diisi.";
    return;
  }

  saving.value = true;
  saveSuccessMessage.value = "";
  saveErrorMessage.value = "";

  try {
    const res = await $fetch(`/api/roles/${roleId.value}/permissions`, {
      method: "PUT",
      body: {
        name: editForm.name,
        description: editForm.description,
        permissions: permissionsMatrix.value,
      },
    });

    if (res?.success) {
      saveSuccessMessage.value = res.message || "Perubahan role dan hak akses berhasil disimpan.";
      isEditing.value = false;
      await refresh();
    } else {
      saveErrorMessage.value = res?.message || "Gagal menyimpan perubahan.";
    }
  } catch (err) {
    saveErrorMessage.value = err?.data?.statusMessage || err?.message || "Gagal menyimpan perubahan ke server.";
  } finally {
    saving.value = false;
  }
};
</script>
