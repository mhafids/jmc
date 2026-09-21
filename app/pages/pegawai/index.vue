<script setup>
definePageMeta({
  title: "Data Pegawai",
  layout: false,
});

useSeoMeta({
  title: "Data Pegawai",
});

import {
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
  IconFileDescription,
  IconCloudDownload,
  IconCheck,
  IconX,
  IconAlertTriangle,
} from "@tabler/icons-vue";
import { formatDateID } from "~/utils/formatDate.js";

const { user } = useAuth();

const canCreate = computed(() => {
  const perm = user.value?.permissions?.EMPLOYEES;
  return Boolean(perm?.canCreate);
});

const canUpdate = computed(() => {
  const perm = user.value?.permissions?.EMPLOYEES;
  return perm?.updateScope === 'all' || perm?.updateScope === 'own';
});

const canDelete = computed(() => {
  const perm = user.value?.permissions?.EMPLOYEES;
  return perm?.deleteScope === 'all' || perm?.deleteScope === 'own';
});

const employeesList = ref([]);
const loading = ref(false);
const totalRecords = ref(0);
const totalPages = ref(1);
const currentPage = ref(1);
const perPage = ref(10);

const searchKeyword = ref("");
const selectedPosition = ref("");
const selectedEmploymentType = ref("");
const minTenure = ref("");
const maxTenure = ref("");
const sortBy = ref("createdAt");
const sortOrder = ref("desc");

const positionOptions = ref([]);

const selectedIds = ref([]);
const isSelectAll = computed({
  get() {
    return employeesList.value.length > 0 && selectedIds.value.length === employeesList.value.length;
  },
  set(val) {
    if (val) {
      selectedIds.value = employeesList.value.map((e) => e.id);
    } else {
      selectedIds.value = [];
    }
  },
});

const employeeToDelete = ref(null);
const errorMessage = ref("");
const successMessage = ref("");
const isSubmitting = ref(false);

const fetchLookups = async () => {
  try {
    const res = await $fetch("/api/master/lookup");
    if (res?.success) {
      positionOptions.value = res.data.positions || [];
    }
  } catch (err) {
    console.error("Gagal memuat opsi jabatan:", err);
  }
};

const fetchData = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const params = {
      page: currentPage.value,
      limit: perPage.value,
      search: searchKeyword.value,
      positionId: selectedPosition.value,
      employmentType: selectedEmploymentType.value,
      minTenure: minTenure.value,
      maxTenure: maxTenure.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    };

    const res = await $fetch("/api/employees", { params });
    if (res?.success) {
      employeesList.value = res.data || [];
      totalRecords.value = res.meta?.total || 0;
      totalPages.value = res.meta?.totalPages || 1;
      selectedIds.value = [];
    }
  } catch (err) {
    errorMessage.value = err?.data?.statusMessage || "Gagal memuat data pegawai.";
    employeesList.value = [];
  } finally {
    loading.value = false;
  }
};

const toggleSort = (column) => {
  if (sortBy.value === column) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = column;
    sortOrder.value = "asc";
  }
  currentPage.value = 1;
  fetchData();
};

const changePage = (p) => {
  if (p >= 1 && p <= totalPages.value) {
    currentPage.value = p;
    fetchData();
  }
};

const formatMasaKerja = (years, months) => {
  const y = parseInt(years) || 0;
  const m = parseInt(months) || 0;
  if (y === 0 && m === 0) return "Kurang dari 1 bulan";
  if (y === 0) return `${m} Bulan`;
  if (m === 0) return `${y} Tahun`;
  return `${y} Tahun ${m} Bulan`;
};

const confirmDelete = (employee) => {
  employeeToDelete.value = employee;
  errorMessage.value = "";
};

const executeDelete = async () => {
  if (!employeeToDelete.value) return;
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    await $fetch(`/api/employees/${employeeToDelete.value.id}`, {
      method: "DELETE",
    });

    successMessage.value = `Data pegawai '${employeeToDelete.value.name}' berhasil dihapus.`;
    setTimeout(() => (successMessage.value = ""), 4000);
    employeeToDelete.value = null;
    await fetchData();
  } catch (err) {
    errorMessage.value = err?.data?.statusMessage || "Gagal menghapus data pegawai.";
  } finally {
    isSubmitting.value = false;
  }
};

const executeBulkStatus = async (status) => {
  if (selectedIds.value.length === 0) return;
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    const res = await $fetch("/api/employees/bulk-status", {
      method: "PATCH",
      body: {
        ids: selectedIds.value,
        status,
      },
    });

    successMessage.value = res?.message || "Status pegawai berhasil diubah.";
    setTimeout(() => (successMessage.value = ""), 4000);
    selectedIds.value = [];
    await fetchData();
  } catch (err) {
    errorMessage.value = err?.data?.statusMessage || "Gagal mengubah status massal.";
  } finally {
    isSubmitting.value = false;
  }
};

const executeBulkDelete = async () => {
  if (selectedIds.value.length === 0) return;
  if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.value.length} data pegawai terpilih?`)) {
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    await $fetch("/api/employees/bulk-delete", {
      method: "POST",
      body: {
        ids: selectedIds.value,
      },
    });

    successMessage.value = "Pegawai terpilih berhasil dihapus.";
    setTimeout(() => (successMessage.value = ""), 4000);
    selectedIds.value = [];
    await fetchData();
  } catch (err) {
    errorMessage.value = err?.data?.statusMessage || "Gagal melakukan penghapusan massal.";
  } finally {
    isSubmitting.value = false;
  }
};

const downloadList = () => {
  const query = new URLSearchParams({
    search: searchKeyword.value,
    positionId: selectedPosition.value,
    employmentType: selectedEmploymentType.value,
  }).toString();
  window.open(`/api/employees/export?${query}`, "_blank");
};

onMounted(() => {
  fetchLookups();
  fetchData();
});
</script>

<template>
  <NuxtLayout name="default">
    <template #actions>
      <NuxtLink v-if="canCreate" to="/pegawai/form" class="btn btn-primary">
        <IconPlus stroke="{3}" size="20" /> Tambah
      </NuxtLink>
    </template>

    <div v-if="successMessage" class="alert alert-success alert-dismissible fade show" role="alert">
      <div class="d-flex align-items-center">
        <IconCheck class="me-2" size="20" />
        <span>{{ successMessage }}</span>
      </div>
      <button type="button" class="btn-close" @click="successMessage = ''"></button>
    </div>

    <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert">
      <div class="d-flex align-items-center">
        <IconAlertTriangle class="me-2" size="20" />
        <span>{{ errorMessage }}</span>
      </div>
      <button type="button" class="btn-close" @click="errorMessage = ''"></button>
    </div>

    <div class="card">
      <div class="card-header flex-wrap gap-2">

        <div v-if="canUpdate && selectedIds.length > 0" class="d-flex align-items-center gap-2 bg-light p-2 rounded w-100 mb-2 border">
          <span class="badge bg-primary">{{ selectedIds.length }} Terpilih</span>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-success" :disabled="isSubmitting" @click="executeBulkStatus('active')">
              Aktifkan
            </button>
            <button class="btn btn-sm btn-outline-warning" :disabled="isSubmitting" @click="executeBulkStatus('inactive')">
              Nonaktifkan
            </button>
          </div>
          <button v-if="canDelete" class="btn btn-sm btn-outline-danger ms-auto" :disabled="isSubmitting" @click="executeBulkDelete">
            <IconTrash size="16" class="me-1" /> Hapus Terpilih
          </button>
        </div>

        <div class="d-flex flex-wrap gap-2 ms-auto align-items-center w-100 justify-content-end">

          <div class="d-flex align-items-center gap-1">
            <span class="text-nowrap small text-muted">Masa Kerja (Thn)</span>
            <input
              v-model="minTenure"
              type="number"
              min="0"
              class="form-control form-control-sm"
              style="width: 55px"
              placeholder="Min"
              @change="fetchData"
            />
            -
            <input
              v-model="maxTenure"
              type="number"
              min="0"
              class="form-control form-control-sm"
              style="width: 55px"
              placeholder="Max"
              @change="fetchData"
            />
          </div>

          <select v-model="selectedPosition" class="form-select form-select-sm" style="width: 170px" @change="fetchData">
            <option value="">Semua Jabatan</option>
            <option v-for="pos in positionOptions" :key="pos.id" :value="pos.id">
              {{ pos.name }}
            </option>
          </select>

          <select v-model="selectedEmploymentType" class="form-select form-select-sm" style="width: 150px" @change="fetchData">
            <option value="">Status Ikatan</option>
            <option value="tetap">PKWTT (Tetap)</option>
            <option value="kontrak">PKWT (Kontrak)</option>
            <option value="magang">Magang</option>
            <option value="pns">PNS</option>
            <option value="pppk">PPPK</option>
          </select>

          <div class="input-group input-group-sm" style="width: 200px">
            <input
              v-model="searchKeyword"
              type="text"
              class="form-control"
              placeholder="Cari Data ..."
              @keyup.enter="fetchData"
            />
            <button class="btn" type="button" @click="fetchData">
              <IconSearch stroke="{2}" size="16" />
            </button>
          </div>

          <button class="btn btn-sm btn-outline-secondary" title="Export Daftar Pegawai" @click="downloadList">
            <IconCloudDownload size="16" class="me-1" /> Export
          </button>
        </div>
      </div>

      <div class="table-responsive card-body p-0">
        <table class="table table-vcenter table-hover">
          <thead>
            <tr>
              <th width="40" class="text-center">
                <input v-if="canUpdate" v-model="isSelectAll" type="checkbox" class="form-check-input" />
                <span v-else>No</span>
              </th>
              <th width="120" class="text-center">Aksi</th>
              <th class="cursor-pointer" @click="toggleSort('nip')">
                NIP <span v-if="sortBy === 'nip'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="cursor-pointer" @click="toggleSort('name')">
                Nama <span v-if="sortBy === 'name'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="cursor-pointer" @click="toggleSort('position')">
                Jabatan <span v-if="sortBy === 'position'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="cursor-pointer" @click="toggleSort('tanggalMasuk')">
                Tanggal Masuk <span v-if="sortBy === 'tanggalMasuk'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="cursor-pointer" @click="toggleSort('tenure')">
                Masa Kerja <span v-if="sortBy === 'tenure'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr>
              <td colspan="7" class="text-center py-4 text-muted">
                <span class="spinner-border spinner-border-sm me-2"></span>Memuat data pegawai...
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="employeesList.length === 0">
            <tr>
              <td colspan="7" class="text-center py-4 text-muted">
                Tidak ada data pegawai yang ditemukan.
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr v-for="(item, index) in employeesList" :key="item.id">
              <td class="text-center">
                <div class="d-flex align-items-center justify-content-center gap-1">
                  <input
                    v-if="canUpdate"
                    v-model="selectedIds"
                    :value="item.id"
                    type="checkbox"
                    class="form-check-input mt-0"
                  />
                  <span>{{ (currentPage - 1) * perPage + index + 1 }}</span>
                </div>
              </td>
              <td class="text-nowrap text-center">
                <div class="d-flex justify-content-center gap-2">

                  <NuxtLink :to="`/pegawai/${item.nip || item.id}`" class="text-dark" title="Detail">
                    <IconFileDescription stroke="{1}" size="20" />
                  </NuxtLink>

                  <NuxtLink v-if="canUpdate" :to="`/pegawai/form/${item.id}`" class="text-primary" title="Edit">
                    <IconPencil stroke="{1}" size="20" />
                  </NuxtLink>

                  <NuxtLink :to="`/pegawai/${item.nip || item.id}`" class="text-dark" title="Download Ringkasan">
                    <IconCloudDownload stroke="{1}" size="20" />
                  </NuxtLink>

                  <a
                    v-if="canDelete"
                    href="#"
                    class="text-danger"
                    data-bs-toggle="modal"
                    data-bs-target="#modal-hapus"
                    title="Hapus"
                    @click.prevent="confirmDelete(item)"
                  >
                    <IconTrash stroke="{1}" size="20" />
                  </a>
                </div>
              </td>
              <td class="font-monospace fw-bold">{{ item.nip }}</td>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <img
                    :src="item.photoPath || '/images/pegawai/ahmad.jpg'"
                    alt="Foto"
                    class="avatar avatar-sm rounded-circle object-cover"
                    onerror="this.src='/images/pegawai/ahmad.jpg'"
                  />
                  <div>
                    <div class="fw-semibold">{{ item.name }}</div>
                    <div class="text-muted small">{{ item.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div>{{ item.positionName || '-' }}</div>
                <div class="text-muted small">{{ item.departmentName || '-' }}</div>
              </td>
              <td>{{ formatDateID(item.joinedAt) }}</td>
              <td>
                <span class="badge bg-blue-lt">
                  {{ formatMasaKerja(item.yearsOfService, item.monthsOfService) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card-footer d-flex align-items-center">
        <p class="m-0 text-secondary">
          Menampilkan <span>{{ employeesList.length > 0 ? (currentPage - 1) * perPage + 1 : 0 }}</span> s/d
          <span>{{ Math.min(currentPage * perPage, totalRecords) }}</span> dari <span>{{ totalRecords }}</span> entri
        </p>
        <ul class="pagination ms-auto m-0">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <a class="page-link" href="#" @click.prevent="changePage(currentPage - 1)">prev</a>
          </li>
          <li
            v-for="p in Math.min(5, totalPages)"
            :key="p"
            class="page-item"
            :class="{ active: p === currentPage }"
          >
            <a class="page-link" href="#" @click.prevent="changePage(p)">{{ p }}</a>
          </li>
          <li class="page-item" :class="{ disabled: currentPage >= totalPages }">
            <a class="page-link" href="#" @click.prevent="changePage(currentPage + 1)">next</a>
          </li>
        </ul>
      </div>

      <div class="modal modal-blur fade" id="modal-hapus" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-sm modal-dialog-centered" role="document">
          <div class="modal-content">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            <div class="modal-status bg-danger"></div>
            <div class="modal-body text-center py-4">
              <IconAlertTriangle class="icon mb-2 text-danger icon-lg" />
              <h3 class="mb-1">Hapus Data Pegawai</h3>
              <div class="text-secondary">
                Apakah Anda yakin ingin menghapus data pegawai
                <strong>{{ employeeToDelete?.name }}</strong> (NIP: {{ employeeToDelete?.nip }})?
              </div>
            </div>
            <div class="modal-footer">
              <div class="w-100">
                <div class="row">
                  <div class="col">
                    <button type="button" class="btn w-100" data-bs-dismiss="modal">
                      Batal
                    </button>
                  </div>
                  <div class="col">
                    <button
                      type="button"
                      class="btn btn-danger w-100"
                      data-bs-dismiss="modal"
                      :disabled="isSubmitting"
                      @click="executeDelete"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </NuxtLayout>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.object-cover {
  object-fit: cover;
}
</style>
