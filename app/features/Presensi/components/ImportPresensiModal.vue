<script setup>
import { ref, watch } from 'vue';
import {
  IconUpload,
  IconFileSpreadsheet,
  IconCheck,
  IconAlertTriangle,
  IconInfoCircle,
  IconCalendar,
  IconClock,
} from '@tabler/icons-vue';

const props = defineProps({
  show: { type: Boolean, default: false },
  currentYear: { type: Number, required: true },
  currentMonth: { type: Number, required: true },
});

const emit = defineEmits(['close', 'imported']);

const selectedFile = ref(null);
const fileInput = ref(null);
const year = ref(props.currentYear);
const month = ref(props.currentMonth);
const isUploading = ref(false);
const uploadProgress = ref(0);
const statusMessage = ref('');
const errorMessage = ref('');
const successMessage = ref('');

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      selectedFile.value = null;
      errorMessage.value = '';
      successMessage.value = '';
      statusMessage.value = '';
      isUploading.value = false;
      year.value = props.currentYear;
      month.value = props.currentMonth;
      if (fileInput.value) fileInput.value.value = '';
    }
  }
);

const handleFileChange = (e) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    const file = files[0];
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      errorMessage.value = 'Hanya format berkas .xlsx, .xls, atau .csv yang didukung.';
      selectedFile.value = null;
      return;
    }
    errorMessage.value = '';
    selectedFile.value = file;
  }
};

const pollJobStatus = async (jobId) => {
  let attempts = 0;
  const maxAttempts = 30;

  const check = async () => {
    try {
      attempts++;
      const res = await $fetch(`/api/v1/attendances/import/${jobId}/status`);
      if (res?.data) {
        const job = res.data;
        if (job.job_status === 'completed') {
          isUploading.value = false;
          successMessage.value = `Proses impor selesai! Sebanyak ${job.processed_rows} baris data presensi berhasil direkapitulasi.`;
          statusMessage.value = '';
          emit('imported');
          setTimeout(() => {
            emit('close');
          }, 1500);
          return;
        } else if (job.job_status === 'failed') {
          isUploading.value = false;
          errorMessage.value = `Proses impor gagal: ${job.error_message || 'Terjadi kesalahan sistem'}`;
          statusMessage.value = '';
          return;
        }
      }

      if (attempts < maxAttempts) {
        setTimeout(check, 1000);
      } else {
        isUploading.value = false;
        successMessage.value = 'Berkas diterima dan sedang dalam antrean pemrosesan server.';
        emit('imported');
      }
    } catch (err) {
      console.error('Polling error:', err);
      isUploading.value = false;
      errorMessage.value = 'Gagal memantau status pemrosesan latar belakang.';
    }
  };

  setTimeout(check, 800);
};

const handleUpload = async () => {
  if (!selectedFile.value) {
    errorMessage.value = 'Silakan pilih berkas spreadsheet terlebih dahulu.';
    return;
  }

  errorMessage.value = '';
  successMessage.value = '';
  isUploading.value = true;
  statusMessage.value = 'Mengunggah berkas dan memproses log presensi di latar belakang...';

  try {
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    formData.append('period_year', year.value.toString());
    formData.append('period_month', month.value.toString());

    const res = await $fetch('/api/v1/attendances/import', {
      method: 'POST',
      body: formData,
    });

    if (res?.import_job?.id) {
      if (res.import_job.status === 'completed') {
        isUploading.value = false;
        successMessage.value = `Proses impor tuntas! ${res.import_job.processed_rows} baris data presensi berhasil diolah.`;
        emit('imported');
        setTimeout(() => {
          emit('close');
        }, 1500);
      } else {
        await pollJobStatus(res.import_job.id);
      }
    } else {
      isUploading.value = false;
      successMessage.value = 'File presensi berhasil diunggah.';
      emit('imported');
      setTimeout(() => emit('close'), 1200);
    }
  } catch (err) {
    isUploading.value = false;
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Gagal mengunggah berkas presensi.';
  }
};
</script>

<template>
  <div v-if="show" class="modal modal-blur fade show d-block" tabindex="-1" role="dialog" style="background: rgba(0, 0, 0, 0.5);">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content shadow-lg border-0">
        <div class="modal-header bg-success-lt">
          <h5 class="modal-title d-flex align-items-center gap-2">
            <IconFileSpreadsheet class="icon text-success" />
            <span>Import Berkas Log Presensi Excel</span>
          </h5>
          <button type="button" class="btn-close" aria-label="Close" :disabled="isUploading" @click="$emit('close')"></button>
        </div>

        <form @submit.prevent="handleUpload">
          <div class="modal-body p-4">

            <div v-if="errorMessage" class="alert alert-danger mb-3 d-flex align-items-center gap-2">
              <IconAlertTriangle class="icon" />
              <div>{{ errorMessage }}</div>
            </div>

            <div v-if="successMessage" class="alert alert-success mb-3 d-flex align-items-center gap-2">
              <IconCheck class="icon" />
              <div>{{ successMessage }}</div>
            </div>

            <div class="card card-sm mb-3 bg-light border-0">
              <div class="card-body p-3">
                <div class="d-flex align-items-start gap-2 text-muted small">
                  <IconInfoCircle class="icon text-primary mt-1 flex-shrink-0" />
                  <div>
                    Unggah berkas log presensi mesin absensi / spreadsheet (.xlsx, .csv).
                    Sistem akan memvalidasi geofence lokasi gedung, jam kerja 8 jam, dan menghitung rekapitulasi bulanan secara otomatis melalui <strong>Background Process</strong>.
                  </div>
                </div>
              </div>
            </div>

            <div class="row g-3">

              <div class="col-6">
                <label class="form-label required">Bulan Periode</label>
                <select v-model="month" class="form-select" :disabled="isUploading">
                  <option v-for="(mName, idx) in monthNames" :key="idx + 1" :value="idx + 1">
                    {{ mName }}
                  </option>
                </select>
              </div>

              <div class="col-6">
                <label class="form-label required">Tahun Periode</label>
                <select v-model="year" class="form-select" :disabled="isUploading">
                  <option :value="2025">2025</option>
                  <option :value="2026">2026</option>
                  <option :value="2027">2027</option>
                </select>
              </div>

              <div class="col-12">
                <label class="form-label required">Pilih File Spreadsheet (.xlsx / .csv)</label>
                <input
                  ref="fileInput"
                  type="file"
                  class="form-control"
                  accept=".xlsx, .xls, .csv"
                  :disabled="isUploading"
                  required
                  @change="handleFileChange"
                />
              </div>

              <div v-if="isUploading" class="col-12 text-center py-2">
                <div class="spinner-border text-primary mb-2" role="status"></div>
                <div class="text-primary fw-medium small">{{ statusMessage }}</div>
                <div class="text-muted extra-small">Halaman akan otomatis dimuat ulang setelah selesai.</div>
              </div>
            </div>
          </div>

          <div class="modal-footer bg-light">
            <button type="button" class="btn btn-link link-secondary" :disabled="isUploading" @click="$emit('close')">
              Tutup
            </button>
            <button type="submit" class="btn btn-success d-flex align-items-center gap-1" :disabled="isUploading || !selectedFile">
              <IconUpload v-if="!isUploading" class="icon" />
              <span>{{ isUploading ? 'Memproses...' : 'Unggah & Mulai Rekap' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
