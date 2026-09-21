<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IconArrowLeft,
  IconCalendar,
  IconPlus,
  IconEdit,
  IconTrash,
  IconAlertTriangle,
  IconUser,
  IconBriefcase,
  IconBuilding,
  IconClock,
  IconCheck,
  IconX,
  IconInfoCircle,
  IconMapPin,
  IconShieldLock,
} from '@tabler/icons-vue';
import { usePermission } from '~~/app/composables/usePermission.js';
import PresensiFormModal from '~~/app/features/Presensi/components/PresensiFormModal.vue';

const route = useRoute();
const router = useRouter();
const { canAccess, canCreate, canUpdate, canDelete } = usePermission();

const employeeId = computed(() => route.params.id);

const now = new Date();
const defaultPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const selectedYear = ref(parseInt(route.query.year, 10) || defaultPrev.getFullYear());
const selectedMonth = ref(parseInt(route.query.month, 10) || (defaultPrev.getMonth() + 1));

const employeeData = ref(null);
const summaryData = ref(null);
const dailyLogs = ref([]);
const loading = ref(false);
const error = ref(null);

const showFormModal = ref(false);
const isEditMode = ref(false);
const selectedLogForEdit = ref(null);

const showDeleteModal = ref(false);
const logToDelete = ref(null);
const isDeleting = ref(false);

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const hasAttendanceAccess = computed(() => canAccess('ATTENDANCES'));
const canCreateAttendance = computed(() => canCreate('ATTENDANCES'));
const canUpdateAttendance = computed(() => canUpdate('ATTENDANCES'));
const canDeleteAttendance = computed(() => canDelete('ATTENDANCES'));

const fetchDetailData = async () => {
  if (!hasAttendanceAccess.value || !employeeId.value) return;

  loading.value = true;
  error.value = null;
  try {
    const res = await $fetch(`/api/v1/attendances/employees/${employeeId.value}`, {
      query: {
        year: selectedYear.value,
        month: selectedMonth.value,
      },
    });

    if (res) {
      employeeData.value = res.employee;
      summaryData.value = res.summary;
      dailyLogs.value = res.data || [];
    }
  } catch (err) {
    console.error('Error fetching employee attendance:', err);
    error.value = err?.data?.statusMessage || err?.message || 'Gagal memuat rincian presensi pegawai.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchDetailData();
});

watch([selectedYear, selectedMonth], () => {
  router.replace({
    query: {
      ...route.query,
      year: selectedYear.value,
      month: selectedMonth.value,
    },
  });
  fetchDetailData();
});

const handleGoBack = () => {
  router.push(`/presensi?year=${selectedYear.value}&month=${selectedMonth.value}`);
};

const handleOpenCreate = () => {
  isEditMode.value = false;
  selectedLogForEdit.value = null;
  showFormModal.value = true;
};

const handleOpenEdit = (log) => {
  isEditMode.value = true;
  selectedLogForEdit.value = log;
  showFormModal.value = true;
};

const handleOpenDelete = (log) => {
  logToDelete.value = log;
  showDeleteModal.value = true;
};

const handleConfirmDelete = async () => {
  if (!logToDelete.value?.id) return;
  isDeleting.value = true;
  try {
    await $fetch(`/api/v1/attendances/${logToDelete.value.id}`, {
      method: 'DELETE',
    });
    showDeleteModal.value = false;
    logToDelete.value = null;
    fetchDetailData();
  } catch (err) {
    alert(err?.data?.statusMessage || err?.message || 'Gagal menghapus presensi.');
  } finally {
    isDeleting.value = false;
  }
};

const formatDecimal = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0.0';
  return Number(val).toFixed(1);
};

const formatDateIndo = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = parseInt(parts[2], 10);
      const m = parseInt(parts[1], 10);
      const y = parts[0];
      return `${d} ${monthNames[m - 1]} ${y}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
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
            Role Anda tidak memiliki wewenang untuk mengakses detail data presensi.
          </p>
          <NuxtLink to="/" class="btn btn-primary">Kembali ke Dashboard</NuxtLink>
        </div>
      </div>

      <div v-else>

        <div class="page-header d-print-none mb-4">
          <div class="row g-2 align-items-center">
            <div class="col-auto">
              <button type="button" class="btn btn-outline-secondary d-flex align-items-center gap-1" @click="handleGoBack">
                <IconArrowLeft class="icon" />
                <span>Kembali</span>
              </button>
            </div>
            <div class="col">
              <div class="page-pretitle text-muted">Detail Presensi Pegawai</div>
              <h2 class="page-title d-flex align-items-center gap-2">
                <IconCalendar class="icon text-primary" />
                <span>{{ employeeData?.nama || 'Memuat profil...' }}</span>
              </h2>
            </div>
            <div class="col-auto ms-auto d-flex gap-2">
              <button
                v-if="canCreateAttendance"
                type="button"
                class="btn btn-primary d-flex align-items-center gap-1"
                @click="handleOpenCreate"
              >
                <IconPlus class="icon" />
                <span>Tambah Presensi Manual</span>
              </button>
            </div>
          </div>
        </div>

        <div class="row g-3 mb-4">

          <div class="col-md-5">
            <div class="card shadow-sm h-100 border-0">
              <div class="card-body p-3">
                <div class="d-flex align-items-center gap-3 mb-3">
                  <div class="avatar avatar-md bg-primary-lt rounded-circle">
                    <IconUser class="icon" />
                  </div>
                  <div>
                    <h4 class="card-title mb-0">{{ employeeData?.nama || '-' }}</h4>
                    <span class="text-muted small">NIP: {{ employeeData?.nip || '-' }}</span>
                  </div>
                </div>
                <div class="row g-2 small text-muted">
                  <div class="col-6 d-flex align-items-center gap-1">
                    <IconBriefcase class="icon icon-inline" />
                    <span>Jabatan: <strong>{{ employeeData?.jabatan || '-' }}</strong></span>
                  </div>
                  <div class="col-6 d-flex align-items-center gap-1">
                    <IconBuilding class="icon icon-inline" />
                    <span>Unit: <strong>{{ employeeData?.departemen || '-' }}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-7">
            <div class="card shadow-sm h-100 border-0">
              <div class="card-body p-3">
                <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                  <span class="fw-medium text-dark small">Periode & Akumulasi Bulanan:</span>
                  <div class="d-flex gap-2">
                    <select v-model="selectedMonth" class="form-select form-select-sm w-auto">
                      <option v-for="(mName, idx) in monthNames" :key="idx + 1" :value="idx + 1">
                        {{ mName }}
                      </option>
                    </select>
                    <select v-model="selectedYear" class="form-select form-select-sm w-auto">
                      <option :value="2025">2025</option>
                      <option :value="2026">2026</option>
                      <option :value="2027">2027</option>
                    </select>
                  </div>
                </div>

                <div class="row g-2 text-center">
                  <div class="col-3">
                    <div class="p-2 bg-light rounded">
                      <div class="text-muted extra-small">Hadir (Hari)</div>
                      <div class="h3 mb-0 text-primary">{{ formatDecimal(summaryData?.hadir) }}</div>
                    </div>
                  </div>
                  <div class="col-3">
                    <div class="p-2 bg-light rounded">
                      <div class="text-muted extra-small">Cuti</div>
                      <div class="h3 mb-0 text-warning">{{ formatDecimal(summaryData?.cuti) }}</div>
                    </div>
                  </div>
                  <div class="col-3">
                    <div class="p-2 bg-light rounded">
                      <div class="text-muted extra-small">Izin / Sakit</div>
                      <div class="h3 mb-0 text-info">
                        {{ formatDecimal(Number(summaryData?.izin || 0) + Number(summaryData?.sakit || 0)) }}
                      </div>
                    </div>
                  </div>
                  <div class="col-3">
                    <div class="p-2 bg-light rounded">
                      <div class="text-muted extra-small">Status Hadir</div>
                      <div class="mt-1">
                        <span
                          class="badge"
                          :class="summaryData?.status_hadir === 'Terpenuhi' ? 'bg-success text-white' : 'bg-danger text-white'"
                        >
                          {{ summaryData?.status_hadir || 'Tidak terpenuhi' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm border-0">
          <div class="card-header py-3 bg-white d-flex align-items-center justify-content-between">
            <h3 class="card-title text-dark mb-0">Catatan Presensi Harian</h3>
            <span class="text-muted small">Total: {{ dailyLogs.length }} Catatan</span>
          </div>

          <div class="table-responsive">
            <table class="table table-vcenter table-hover card-table">
              <thead>
                <tr class="bg-light text-muted small">
                  <th>Tgl</th>
                  <th>Lokasi checkin</th>
                  <th>Kehadiran</th>
                  <th class="text-center">Durasi (Hadir)</th>
                  <th class="text-center">Status</th>
                  <th class="text-center">Verifikasi</th>
                  <th>Verifikator</th>
                  <th>Keterangan</th>
                  <th v-if="canUpdateAttendance || canDeleteAttendance" class="w-1 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>

                <tr v-if="loading">
                  <td colspan="9" class="text-center py-5">
                    <div class="spinner-border text-primary me-2" role="status"></div>
                    <span class="text-muted">Memuat catatan presensi harian...</span>
                  </td>
                </tr>

                <tr v-else-if="error">
                  <td colspan="9" class="text-center py-5 text-danger">
                    <IconAlertTriangle class="icon mb-2" size="32" />
                    <div>{{ error }}</div>
                  </td>
                </tr>

                <tr v-else-if="dailyLogs.length === 0">
                  <td colspan="9" class="text-center py-5 text-muted">
                    <IconCalendar class="icon mb-2" size="36" />
                    <div>Belum ada catatan presensi harian untuk periode ini.</div>
                  </td>
                </tr>

                <tr v-for="log in dailyLogs" :key="log.id">
                  <td class="text-nowrap fw-medium text-dark">
                    <div>{{ formatDateIndo(log.tgl) }}</div>
                    <div v-if="log.attendance_type === 'hadir'" class="text-muted extra-small">
                      {{ log.checkin_at }} - {{ log.checkout_at }}
                    </div>
                  </td>
                  <td>
                    <div class="d-flex align-items-center gap-1">
                      <IconMapPin class="icon icon-inline text-muted" />
                      <span>{{ log.lokasi_checkin }}</span>
                    </div>
                    <div v-if="log.lokasi_checkout && log.lokasi_checkout !== log.lokasi_checkin" class="text-danger extra-small">
                      Checkout: {{ log.lokasi_checkout }} (Beda Gedung)
                    </div>
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="{
                        'bg-blue-lt': log.kehadiran === 'Hadir',
                        'bg-warning-lt': log.kehadiran === 'Cuti',
                        'bg-purple-lt': log.kehadiran === 'Izin',
                        'bg-danger-lt': log.kehadiran === 'Sakit' || log.kehadiran === 'Tanpa Keterangan',
                      }"
                    >
                      {{ log.kehadiran }}
                    </span>
                  </td>
                  <td class="text-center fw-bold">{{ formatDecimal(log.durasi_hadir) }} Jam</td>
                  <td class="text-center">
                    <span
                      class="badge"
                      :class="log.status === 'Terpenuhi' ? 'bg-success text-white' : 'bg-danger text-white'"
                      :title="log.failure_reason || (log.status === 'Terpenuhi' ? 'Memenuhi syarat' : 'Tidak memenuhi syarat')"
                      data-bs-toggle="tooltip"
                    >
                      {{ log.status }}
                    </span>
                    <div v-if="log.is_late_half_day" class="text-muted extra-small mt-1">
                      (0.5 Hari)
                    </div>
                  </td>
                  <td class="text-center">
                    <span
                      class="badge"
                      :class="{
                        'bg-success-lt text-success': log.verifikasi === 'Disetujui',
                        'bg-danger-lt text-danger': log.verifikasi === 'Ditolak',
                        'bg-warning-lt text-warning': log.verifikasi === 'Menunggu',
                      }"
                    >
                      {{ log.verifikasi }}
                    </span>
                  </td>
                  <td class="text-muted small">{{ log.verifikator }}</td>
                  <td class="small text-muted" style="max-width: 250px;">
                    <div :title="log.keterangan">{{ log.keterangan }}</div>
                    <div v-if="log.failure_reason && log.failure_reason !== log.keterangan" class="text-danger extra-small">
                      ⚠️ {{ log.failure_reason }}
                    </div>
                  </td>
                  <td v-if="canUpdateAttendance || canDeleteAttendance" class="text-center text-nowrap">
                    <button
                      v-if="canUpdateAttendance"
                      type="button"
                      class="btn btn-sm btn-icon btn-outline-primary me-1"
                      title="Edit / Verifikasi"
                      @click="handleOpenEdit(log)"
                    >
                      <IconEdit class="icon" />
                    </button>
                    <button
                      v-if="canDeleteAttendance"
                      type="button"
                      class="btn btn-sm btn-icon btn-outline-danger"
                      title="Hapus Catatan"
                      @click="handleOpenDelete(log)"
                    >
                      <IconTrash class="icon" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <PresensiFormModal
      :show="showFormModal"
      :is-edit="isEditMode"
      :initial-data="selectedLogForEdit"
      :employee-id="employeeId"
      :default-date="`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`"
      @close="showFormModal = false"
      @saved="fetchDetailData"
    />

    <div v-if="showDeleteModal" class="modal modal-blur fade show d-block" tabindex="-1" role="dialog" style="background: rgba(0, 0, 0, 0.5);">
      <div class="modal-dialog modal-dialog-centered modal-sm" role="document">
        <div class="modal-content shadow-lg border-0">
          <div class="modal-body text-center py-4">
            <IconAlertTriangle class="icon text-danger mb-2" size="48" />
            <h3>Hapus Catatan Presensi?</h3>
            <div class="text-muted small mb-3">
              Catatan presensi tanggal <strong>{{ formatDateIndo(logToDelete?.tgl) }}</strong> akan dihapus permanen dan ringkasan bulanan akan dihitung ulang.
            </div>
            <div class="d-flex justify-content-center gap-2">
              <button type="button" class="btn btn-link link-secondary" :disabled="isDeleting" @click="showDeleteModal = false">
                Batal
              </button>
              <button type="button" class="btn btn-danger" :disabled="isDeleting" @click="handleConfirmDelete">
                <span v-if="isDeleting" class="spinner-border spinner-border-sm me-1" role="status"></span>
                <span>{{ isDeleting ? 'Menghapus...' : 'Hapus' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.extra-small {
  font-size: 0.75rem;
}
</style>
