<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  IconCalendar,
  IconDownload,
  IconUpload,
  IconSearch,
  IconEye,
  IconFileSpreadsheet,
  IconAlertTriangle,
  IconRefresh,
  IconShieldLock,
} from '@tabler/icons-vue';
import { usePermission } from '~~/app/composables/usePermission.js';
import ImportPresensiModal from '~~/app/features/Presensi/components/ImportPresensiModal.vue';

const router = useRouter();
const { canAccess, canCreate } = usePermission();

const now = new Date();
const defaultPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const selectedYear = ref(defaultPrev.getFullYear());
const selectedMonth = ref(defaultPrev.getMonth() + 1);

const searchQuery = ref('');
const currentPage = ref(1);
const perPage = ref(10);

const listData = ref([]);
const pagination = ref({
  current_page: 1,
  total_pages: 1,
  total_items: 0,
});
const loading = ref(false);
const error = ref(null);
const showImportModal = ref(false);

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const hasAttendanceAccess = computed(() => canAccess('ATTENDANCES'));
const canImportAttendance = computed(() => canCreate('ATTENDANCES'));

const fetchSummaries = async () => {
  if (!hasAttendanceAccess.value) return;

  loading.value = true;
  error.value = null;
  try {
    const res = await $fetch('/api/v1/attendances/summaries', {
      query: {
        year: selectedYear.value,
        month: selectedMonth.value,
        search: searchQuery.value,
        page: currentPage.value,
        limit: perPage.value,
      },
    });

    if (res?.data) {
      listData.value = res.data;
      pagination.value = res.pagination || {
        current_page: 1,
        total_pages: 1,
        total_items: res.data.length,
      };
    }
  } catch (err) {
    console.error('Error fetching summaries:', err);
    error.value = err?.data?.statusMessage || err?.message || 'Gagal memuat data rekap presensi.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchSummaries();
});

watch([selectedYear, selectedMonth], () => {
  currentPage.value = 1;
  fetchSummaries();
});

let searchTimeout = null;
const handleSearchInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchSummaries();
  }, 400);
};

const handlePageChange = (page) => {
  if (page >= 1 && page <= pagination.value.total_pages) {
    currentPage.value = page;
    fetchSummaries();
  }
};

const handleDownloadTemplate = () => {
  window.open('/api/v1/attendances/template', '_blank');
};

const goToDetail = (employeeId) => {
  router.push(`/presensi/${employeeId}?year=${selectedYear.value}&month=${selectedMonth.value}`);
};

const formatDecimal = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0.0';
  return Number(val).toFixed(1);
};
</script>

<template>
  <div class="page-body">
    <div class="container-xl">

      <div v-if="!hasAttendanceAccess" class="card shadow-sm border-0 mt-4">
        <div class="card-body text-center py-5">
          <div class="text-danger mb-3">
            <IconShieldLock size="64" stroke-width="1.5" />
          </div>
          <h2 class="h2 text-danger">403 - Akses Ditolak</h2>
          <p class="text-muted max-w-md mx-auto mb-4">
            Role Anda tidak memiliki wewenang untuk mengakses modul Presensi (Attendance Management).
            Sesuai matriks hak akses, Superadmin dilarang mengakses modul ini.
          </p>
          <NuxtLink to="/" class="btn btn-primary">
            Kembali ke Dashboard
          </NuxtLink>
        </div>
      </div>

      <div v-else>

        <div class="page-header d-print-none mb-4">
          <div class="row g-2 align-items-center">
            <div class="col">
              <div class="page-pretitle text-muted">Modul Manajemen Presensi</div>
              <h2 class="page-title d-flex align-items-center gap-2">
                <IconCalendar class="icon text-primary" />
                <span>Rekapitulasi Presensi Pegawai</span>
              </h2>
            </div>

            <div class="col-auto ms-auto d-flex gap-2">
              <button
                type="button"
                class="btn btn-outline-secondary d-flex align-items-center gap-1"
                @click="handleDownloadTemplate"
              >
                <IconDownload class="icon" />
                <span>Download Template Excel</span>
              </button>
              <button
                v-if="canImportAttendance"
                type="button"
                class="btn btn-success d-flex align-items-center gap-1"
                @click="showImportModal = true"
              >
                <IconUpload class="icon" />
                <span>Import Excel</span>
              </button>
            </div>
          </div>
        </div>

        <div class="card shadow-sm mb-4">
          <div class="card-body p-3">
            <div class="row g-3 align-items-center">

              <div class="col-md-3 col-sm-6">
                <label class="form-label small text-muted mb-1">Periode Bulan</label>
                <select v-model="selectedMonth" class="form-select">
                  <option v-for="(mName, idx) in monthNames" :key="idx + 1" :value="idx + 1">
                    {{ mName }}
                  </option>
                </select>
              </div>

              <div class="col-md-2 col-sm-6">
                <label class="form-label small text-muted mb-1">Tahun</label>
                <select v-model="selectedYear" class="form-select">
                  <option :value="2025">2025</option>
                  <option :value="2026">2026</option>
                  <option :value="2027">2027</option>
                </select>
              </div>

              <div class="col-md-5 col-sm-12">
                <label class="form-label small text-muted mb-1">Cari Pegawai</label>
                <div class="input-icon">
                  <span class="input-icon-addon"><IconSearch class="icon" /></span>
                  <input
                    v-model="searchQuery"
                    type="text"
                    class="form-control"
                    placeholder="Ketik nama pegawai, NIP, atau jabatan..."
                    @input="handleSearchInput"
                  />
                </div>
              </div>

              <div class="col-md-2 col-sm-12 d-flex align-items-end">
                <button
                  type="button"
                  class="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-1"
                  :disabled="loading"
                  @click="fetchSummaries"
                >
                  <IconRefresh class="icon" :class="{ 'rotate-spinner': loading }" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="alert alert-info d-flex align-items-center justify-content-between p-3 mb-4">
          <div class="d-flex align-items-center gap-2">
            <IconCalendar class="icon text-info" />
            <div>
              Menampilkan data rekap presensi periode:
              <strong>{{ monthNames[selectedMonth - 1] }} {{ selectedYear }}</strong>
              <span v-if="selectedYear === defaultPrev.getFullYear() && selectedMonth === (defaultPrev.getMonth() + 1)" class="badge bg-info-lt ms-2">
                Default N-1 Bulan Berjalan
              </span>
            </div>
          </div>
          <div class="text-muted small">
            Total Pegawai: <strong>{{ pagination.total_items }}</strong>
          </div>
        </div>

        <div class="card shadow-sm border-0">
          <div class="table-responsive">
            <table class="table table-vcenter table-hover card-table">
              <thead>
                <tr class="bg-light text-muted small">
                  <th class="w-1 text-center">No.</th>
                  <th>Nama</th>
                  <th>Jabatan</th>
                  <th class="text-center">Hadir</th>
                  <th class="text-center">Status Hadir</th>
                  <th class="text-center">Cuti</th>
                  <th class="text-center">Kuota Cuti</th>
                  <th class="text-center">Izin</th>
                  <th class="text-center">Kuota Izin</th>
                  <th class="text-center">Unpaid Leave</th>
                  <th class="text-center">Kuota Unpaid leave</th>
                  <th class="w-1 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>

                <tr v-if="loading">
                  <td colspan="12" class="text-center py-5">
                    <div class="spinner-border text-primary me-2" role="status"></div>
                    <span class="text-muted">Memuat data rekapitulasi presensi...</span>
                  </td>
                </tr>

                <tr v-else-if="error">
                  <td colspan="12" class="text-center py-5 text-danger">
                    <IconAlertTriangle class="icon mb-2" size="32" />
                    <div>{{ error }}</div>
                  </td>
                </tr>

                <tr v-else-if="listData.length === 0">
                  <td colspan="12" class="text-center py-5 text-muted">
                    <IconFileSpreadsheet class="icon mb-2" size="36" />
                    <div>Tidak ada data presensi pegawai untuk periode ini.</div>
                  </td>
                </tr>

                <tr v-for="item in listData" :key="item.employee_id">
                  <td class="text-center text-muted">{{ item.no }}</td>
                  <td>
                    <div class="fw-medium text-dark">{{ item.nama }}</div>
                    <div class="text-muted extra-small">NIP: {{ item.nip }}</div>
                  </td>
                  <td class="text-muted">{{ item.jabatan }}</td>
                  <td class="text-center fw-bold">{{ formatDecimal(item.hadir) }}</td>
                  <td class="text-center">
                    <span
                      class="badge"
                      :class="item.status_hadir === 'Terpenuhi' ? 'bg-success text-white' : 'bg-danger text-white'"
                    >
                      {{ item.status_hadir }}
                    </span>
                  </td>
                  <td class="text-center">{{ formatDecimal(item.cuti) }}</td>
                  <td class="text-center text-muted">{{ formatDecimal(item.kuota_cuti) }}</td>
                  <td class="text-center">{{ formatDecimal(item.izin) }}</td>
                  <td class="text-center text-muted">{{ formatDecimal(item.kuota_izin) }}</td>
                  <td class="text-center">{{ formatDecimal(item.unpaid_leave) }}</td>
                  <td class="text-center text-muted">{{ formatDecimal(item.kuota_unpaid_leave) }}</td>
                  <td class="text-center">
                    <button
                      type="button"
                      class="btn btn-sm btn-icon btn-outline-primary"
                      title="Lihat Detail Presensi"
                      @click="goToDetail(item.employee_id)"
                    >
                      <IconEye class="icon" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="pagination.total_pages > 1" class="card-footer d-flex align-items-center justify-content-between py-2">
            <p class="m-0 text-muted small">
              Menampilkan halaman <strong>{{ pagination.current_page }}</strong> dari <strong>{{ pagination.total_pages }}</strong> (Total {{ pagination.total_items }} data)
            </p>
            <ul class="pagination m-0 ms-auto">
              <li class="page-item" :class="{ disabled: pagination.current_page <= 1 }">
                <button class="page-link" @click="handlePageChange(pagination.current_page - 1)">
                  &lsaquo; Sebelumnya
                </button>
              </li>
              <li
                v-for="p in pagination.total_pages"
                :key="p"
                class="page-item"
                :class="{ active: p === pagination.current_page }"
              >
                <button class="page-link" @click="handlePageChange(p)">{{ p }}</button>
              </li>
              <li class="page-item" :class="{ disabled: pagination.current_page >= pagination.total_pages }">
                <button class="page-link" @click="handlePageChange(pagination.current_page + 1)">
                  Berikutnya &rsaquo;
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <ImportPresensiModal
      :show="showImportModal"
      :current-year="selectedYear"
      :current-month="selectedMonth"
      @close="showImportModal = false"
      @imported="fetchSummaries"
    />
  </div>
</template>

<style scoped>
.extra-small {
  font-size: 0.75rem;
}
.rotate-spinner {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
