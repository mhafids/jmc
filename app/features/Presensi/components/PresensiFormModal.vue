<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import {
  IconX,
  IconCheck,
  IconAlertTriangle,
  IconInfoCircle,
  IconClock,
  IconMapPin,
  IconCalendar,
  IconUserCheck,
} from '@tabler/icons-vue';

const props = defineProps({
  show: { type: Boolean, default: false },
  isEdit: { type: Boolean, default: false },
  initialData: { type: Object, default: () => ({}) },
  employeeId: { type: String, required: true },
  defaultDate: { type: String, default: '' },
});

const emit = defineEmits(['close', 'saved']);

const form = ref({
  attendance_date: '',
  attendance_type: 'hadir',
  checkin_at: '08:00',
  checkout_at: '17:00',
  checkin_location: 'Gedung Utama',
  checkout_location: 'Gedung Utama',
  status: 'approved',
  verified_by_role: 'HRD',
  remarks: '',
});

const loading = ref(false);
const errorMessage = ref('');
const lookups = ref({
  officeLocations: ['Gedung Utama', 'Gedung A', 'Gedung B'],
  attendanceTypes: [
    { value: 'hadir', label: 'Hadir' },
    { value: 'cuti', label: 'Cuti' },
    { value: 'izin', label: 'Izin' },
    { value: 'sakit', label: 'Sakit' },
    { value: 'tanpa_keterangan', label: 'Tanpa Keterangan' },
  ],
  verificationRoles: ['HRD', 'Lead', 'Manager'],
  verificationStatuses: [
    { value: 'approved', label: 'Disetujui' },
    { value: 'rejected', label: 'Ditolak' },
    { value: 'pending', label: 'Menunggu' },
  ],
});

const fetchLookups = async () => {
  try {
    const res = await $fetch('/api/master/lookup');
    if (res?.data) {
      if (res.data.officeLocations?.length) lookups.value.officeLocations = res.data.officeLocations;
      if (res.data.attendanceTypes?.length) lookups.value.attendanceTypes = res.data.attendanceTypes;
      if (res.data.verificationRoles?.length) lookups.value.verificationRoles = res.data.verificationRoles;
      if (res.data.verificationStatuses?.length) lookups.value.verificationStatuses = res.data.verificationStatuses;
    }
  } catch (err) {
    console.error('Failed to fetch lookups:', err);
  }
};

onMounted(() => {
  fetchLookups();
});

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      errorMessage.value = '';
      if (props.isEdit && props.initialData) {
        form.value = {
          attendance_date: props.initialData.tgl || props.initialData.attendance_date || '',
          attendance_type: props.initialData.attendance_type || 'hadir',
          checkin_at: (props.initialData.checkin_at || '08:00').substring(0, 5),
          checkout_at: (props.initialData.checkout_at || '17:00').substring(0, 5),
          checkin_location: props.initialData.lokasi_checkin || props.initialData.checkin_location || 'Gedung Utama',
          checkout_location: props.initialData.lokasi_checkout || props.initialData.checkout_location || 'Gedung Utama',
          status: props.initialData.verifikasi_raw || props.initialData.status || 'approved',
          verified_by_role: props.initialData.verifikator || props.initialData.verified_by_role || 'HRD',
          remarks: props.initialData.keterangan || props.initialData.remarks || '',
        };
      } else {
        form.value = {
          attendance_date: props.defaultDate || new Date().toISOString().substring(0, 10),
          attendance_type: 'hadir',
          checkin_at: '08:00',
          checkout_at: '17:00',
          checkin_location: 'Gedung Utama',
          checkout_location: 'Gedung Utama',
          status: 'approved',
          verified_by_role: 'HRD',
          remarks: '',
        };
      }
    }
  },
  { immediate: true }
);

const liveEvaluation = computed(() => {
  if (form.value.attendance_type !== 'hadir') {
    return {
      durationHours: 0.0,
      statusHarian: form.value.status === 'rejected' ? 'Tidak terpenuhi' : 'Terpenuhi',
      dayWeight: 0.0,
      isDiffLocation: false,
      isLate: false,
      isLateMoreThan15: false,
      durationLessThan8: false,
    };
  }

  const isDiffLocation =
    form.value.checkin_location.trim().toLowerCase() !==
    form.value.checkout_location.trim().toLowerCase();

  const parseTime = (t) => {
    if (!t) return null;
    const parts = t.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  const inMin = parseTime(form.value.checkin_at);
  const outMin = parseTime(form.value.checkout_at);

  if (inMin === null || outMin === null || outMin <= inMin) {
    return {
      durationHours: 0.0,
      statusHarian: 'Tidak terpenuhi',
      dayWeight: 0.0,
      isDiffLocation,
      isLate: false,
      isLateMoreThan15: false,
      durationLessThan8: true,
      invalidTime: true,
    };
  }

  let gross = outMin - inMin;
  let breakMin = 0;
  const breakStart = 12 * 60;
  const breakEnd = 13 * 60;
  if (inMin <= breakStart && outMin >= breakEnd) {
    breakMin = 60;
  } else if (inMin < breakEnd && outMin > breakStart) {
    breakMin = Math.max(0, Math.min(outMin, breakEnd) - Math.max(inMin, breakStart));
  }

  const cleanMin = Math.max(0, gross - breakMin);
  const cleanHours = Math.round((cleanMin / 60) * 10) / 10;
  const isLate = inMin > 8 * 60;
  const isLateMoreThan15 = inMin > 8 * 60 + 15;
  const durationLessThan8 = cleanHours < 8.0;

  let statusHarian = 'Terpenuhi';
  let dayWeight = 1.0;

  if (isDiffLocation || durationLessThan8 || form.value.status === 'rejected') {
    statusHarian = 'Tidak terpenuhi';
    dayWeight = 0.0;
  } else if (isLateMoreThan15) {
    dayWeight = 0.5;
  }

  return {
    durationHours: cleanHours,
    statusHarian,
    dayWeight,
    isDiffLocation,
    isLate,
    isLateMoreThan15,
    durationLessThan8,
    invalidTime: false,
  };
});

const handleSave = async () => {
  errorMessage.value = '';
  if (!form.value.attendance_date) {
    errorMessage.value = 'Tanggal presensi wajib diisi.';
    return;
  }

  loading.value = true;
  try {
    const payload = {
      employee_id: props.employeeId,
      attendance_date: form.value.attendance_date,
      attendance_type: form.value.attendance_type,
      checkin_at: form.value.attendance_type === 'hadir' ? `${form.value.checkin_at}:00` : null,
      checkout_at: form.value.attendance_type === 'hadir' ? `${form.value.checkout_at}:00` : null,
      checkin_location: form.value.attendance_type === 'hadir' ? form.value.checkin_location : null,
      checkout_location: form.value.attendance_type === 'hadir' ? form.value.checkout_location : null,
      status: form.value.status,
      verified_by_role: form.value.verified_by_role,
      remarks: form.value.remarks,
    };

    if (props.isEdit && props.initialData?.id) {
      await $fetch(`/api/v1/attendances/${props.initialData.id}`, {
        method: 'PUT',
        body: payload,
      });
    } else {
      await $fetch('/api/v1/attendances', {
        method: 'POST',
        body: payload,
      });
    }

    emit('saved');
    emit('close');
  } catch (err) {
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Gagal menyimpan data presensi.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div v-if="show" class="modal modal-blur fade show d-block" tabindex="-1" role="dialog" style="background: rgba(0, 0, 0, 0.5);">
    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
      <div class="modal-content shadow-lg border-0">
        <div class="modal-header bg-primary-lt">
          <h5 class="modal-title d-flex align-items-center gap-2">
            <IconCalendar class="icon text-primary" />
            <span>{{ isEdit ? 'Edit & Verifikasi Presensi Harian' : 'Tambah Presensi Harian Manual' }}</span>
          </h5>
          <button type="button" class="btn-close" aria-label="Close" @click="$emit('close')"></button>
        </div>

        <form @submit.prevent="handleSave">
          <div class="modal-body p-4">

            <div v-if="errorMessage" class="alert alert-danger alert-dismissible mb-3 d-flex align-items-center gap-2">
              <IconAlertTriangle class="icon" />
              <div>{{ errorMessage }}</div>
            </div>

            <div v-if="form.attendance_type === 'hadir'" class="card card-sm mb-4 bg-light border-dashed">
              <div class="card-body py-2 px-3">
                <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div class="d-flex align-items-center gap-2">
                    <span class="text-muted small">Status Simulasi:</span>
                    <span
                      class="badge"
                      :class="liveEvaluation.statusHarian === 'Terpenuhi' ? 'bg-success text-white' : 'bg-danger text-white'"
                    >
                      {{ liveEvaluation.statusHarian }}
                    </span>
                    <span v-if="liveEvaluation.statusHarian === 'Terpenuhi'" class="badge bg-blue-lt">
                      {{ liveEvaluation.dayWeight === 1.0 ? '1.0 Hari (Penuh)' : '0.5 Hari (Setengah Hari)' }}
                    </span>
                  </div>
                  <div class="d-flex align-items-center gap-2 text-muted small">
                    <IconClock class="icon icon-inline" />
                    <span>Durasi Bersih: <strong>{{ liveEvaluation.durationHours.toFixed(1) }} Jam</strong></span>
                  </div>
                </div>

                <div v-if="liveEvaluation.isDiffLocation" class="text-danger small mt-2 d-flex align-items-center gap-1">
                  <IconAlertTriangle class="icon icon-inline text-danger" />
                  <strong>Peringatan Geofence:</strong> Lokasi Check-in berbeda dengan Check-out! Kehadiran tidak akan terhitung masuk (0.00 jam).
                </div>

                <div v-else-if="liveEvaluation.durationLessThan8" class="text-warning small mt-2 d-flex align-items-center gap-1">
                  <IconAlertTriangle class="icon icon-inline text-warning" />
                  <strong>Durasi Kurang:</strong> Total jam kerja bersih kurang dari 8.0 jam (Status menjadi 'Tidak terpenuhi').
                </div>

                <div v-else-if="liveEvaluation.isLateMoreThan15" class="text-info small mt-2 d-flex align-items-center gap-1">
                  <IconInfoCircle class="icon icon-inline text-info" />
                  <strong>Keterlambatan &gt; 15 Menit:</strong> Check-in setelah 08:15 dihitung masuk setengah hari (0.5 hari).
                </div>
              </div>
            </div>

            <div class="row g-3">

              <div class="col-md-6">
                <label class="form-label required">Tanggal Presensi</label>
                <div class="input-icon">
                  <span class="input-icon-addon"><IconCalendar class="icon" /></span>
                  <input
                    v-model="form.attendance_date"
                    type="date"
                    class="form-control"
                    required
                    :disabled="isEdit"
                  />
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label required">Jenis Kehadiran</label>
                <select v-model="form.attendance_type" class="form-select" required>
                  <option v-for="t in lookups.attendanceTypes" :key="t.value" :value="t.value">
                    {{ t.label }}
                  </option>
                </select>
              </div>

              <template v-if="form.attendance_type === 'hadir'">
                <div class="col-md-6">
                  <label class="form-label required">Jam Masuk (Check-in)</label>
                  <div class="input-icon">
                    <span class="input-icon-addon"><IconClock class="icon" /></span>
                    <input v-model="form.checkin_at" type="time" class="form-control" required />
                  </div>
                  <small class="form-hint">Jam standar: 08:00 WIB (Toleransi s/d 08:15 WIB)</small>
                </div>

                <div class="col-md-6">
                  <label class="form-label required">Jam Pulang (Check-out)</label>
                  <div class="input-icon">
                    <span class="input-icon-addon"><IconClock class="icon" /></span>
                    <input v-model="form.checkout_at" type="time" class="form-control" required />
                  </div>
                  <small class="form-hint">Jam pulang reguler: 17:00 WIB</small>
                </div>

                <div class="col-md-6">
                  <label class="form-label required">Lokasi Gedung Check-in</label>
                  <div class="input-icon">
                    <span class="input-icon-addon"><IconMapPin class="icon" /></span>
                    <select v-model="form.checkin_location" class="form-select" required>
                      <option v-for="loc in lookups.officeLocations" :key="loc" :value="loc">
                        {{ loc }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="col-md-6">
                  <label class="form-label required">Lokasi Gedung Check-out</label>
                  <div class="input-icon">
                    <span class="input-icon-addon"><IconMapPin class="icon" /></span>
                    <select v-model="form.checkout_location" class="form-select" required>
                      <option v-for="loc in lookups.officeLocations" :key="loc" :value="loc">
                        {{ loc }}
                      </option>
                    </select>
                  </div>
                  <small class="form-hint text-muted">Wajib sama dengan lokasi check-in.</small>
                </div>
              </template>

              <div class="col-md-6">
                <label class="form-label required">Status Verifikasi</label>
                <div class="input-icon">
                  <span class="input-icon-addon"><IconUserCheck class="icon" /></span>
                  <select v-model="form.status" class="form-select" required>
                    <option v-for="st in lookups.verificationStatuses" :key="st.value" :value="st.value">
                      {{ st.label }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label required">Peran Verifikator</label>
                <select v-model="form.verified_by_role" class="form-select" required>
                  <option v-for="role in lookups.verificationRoles" :key="role" :value="role">
                    {{ role }}
                  </option>
                </select>
              </div>

              <div class="col-12">
                <label class="form-label">Keterangan / Catatan Verifikasi</label>
                <textarea
                  v-model="form.remarks"
                  rows="2"
                  class="form-control"
                  placeholder="Catatan alasan keterlambatan, nomor surat dokter, cuti tahunan, dll..."
                ></textarea>
              </div>
            </div>
          </div>

          <div class="modal-footer bg-light">
            <button type="button" class="btn btn-link link-secondary" @click="$emit('close')">
              Batal
            </button>
            <button type="submit" class="btn btn-primary d-flex align-items-center gap-1" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status"></span>
              <IconCheck v-else class="icon" />
              <span>{{ isEdit ? 'Simpan Perubahan' : 'Tambah Presensi' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
