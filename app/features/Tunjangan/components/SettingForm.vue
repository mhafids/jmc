<template>
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h3 class="card-title m-0">Pengaturan Tarif Dasar Tunjangan Transport</h3>
      <span v-if="!canEditSettings" class="badge bg-blue-lt">
        Mode Pratinjau (Read-Only)
      </span>
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="card-body">

        <div v-if="alertMessage" class="alert alert-dismissible mb-3" :class="alertClass" role="alert">
          <div>{{ alertMessage }}</div>
          <a class="btn-close" aria-label="close" @click="alertMessage = ''"></a>
        </div>

        <div v-if="isLoading" class="text-center py-4 text-muted">
          <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
          Memuat data pengaturan tarif...
        </div>

        <div v-else class="row g-3">

          <div class="col-md-6">
            <label class="form-label" :class="{ required: canEditSettings }">Tarif per KM (Rp)</label>
            <div class="input-group">
              <span class="input-group-text">Rp</span>
              <input
                v-model.number="form.baseFare"
                type="number"
                min="0"
                step="100"
                class="form-control text-end"
                placeholder="5000"
                :disabled="!canEditSettings"
                required
              />
            </div>
            <small class="form-hint text-muted">Tarif nominal tunjangan per kilometer perjalanan.</small>
          </div>

          <div class="col-md-6">
            <label class="form-label" :class="{ required: canEditSettings }">Berlaku Mulai</label>
            <input
              v-model="form.effectiveStart"
              type="date"
              class="form-control"
              :disabled="!canEditSettings"
              required
            />
            <small class="form-hint text-muted">Tanggal efektif aturan tarif ini mulai digunakan.</small>
          </div>

          <div class="col-md-6">
            <label class="form-label" :class="{ required: canEditSettings }">Minimum Kilometer</label>
            <div class="input-group">
              <input
                v-model.number="form.minKm"
                type="number"
                min="0"
                step="0.1"
                class="form-control"
                placeholder="5"
                :disabled="!canEditSettings"
                required
              />
              <span class="input-group-text">km</span>
            </div>
            <small class="form-hint text-muted">Jarak kurang dari atau sama dengan ini tidak dihitung (default: 5 km).</small>
          </div>

          <div class="col-md-6">
            <label class="form-label">Maksimum Kilometer</label>
            <div class="input-group">
              <input
                v-model.number="form.maxKm"
                type="number"
                min="0"
                step="0.1"
                class="form-control"
                placeholder="25"
                :disabled="!canEditSettings"
              />
              <span class="input-group-text">km</span>
            </div>
            <small class="form-hint text-muted">Batas maksimal jarak yang diakui / di-cap (default: 25 km).</small>
          </div>
        </div>
      </div>

      <div class="card-footer">
        <div class="d-flex gap-2">
          <button
            v-if="canEditSettings"
            type="submit"
            class="btn btn-primary"
            :class="{ 'btn-loading': isSaving }"
            :disabled="isSaving || isLoading"
          >
            Simpan
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="handleBack"
          >
            Kembali
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePermission } from '~/composables/usePermission.js';

const router = useRouter();
const { canUpdate, canCreate, isSuperadmin } = usePermission();

const canEditSettings = computed(() => {
  return canUpdate('TRANSPORT_SETTINGS') || canCreate('TRANSPORT_SETTINGS') || isSuperadmin.value;
});

const isLoading = ref(false);
const isSaving = ref(false);
const alertMessage = ref('');
const alertClass = ref('alert-success');

const form = reactive({
  id: null,
  baseFare: 5000,
  effectiveStart: new Date().toISOString().split('T')[0],
  minKm: 5.0,
  maxKm: 25.0,
  isActive: true,
});

const fetchSettings = async () => {
  isLoading.value = true;
  try {
    const res = await $fetch('/api/v1/tunjangan/settings');
    if (res?.status === 'success' && res.data) {
      form.id = res.data.id;
      form.baseFare = res.data.base_fare ?? 5000;
      form.effectiveStart = res.data.effective_start || new Date().toISOString().split('T')[0];
      form.minKm = res.data.min_km ?? 5.0;
      form.maxKm = res.data.max_km ?? 25.0;
      form.isActive = res.data.is_active ?? true;
    }
  } catch (err) {
    console.error('Failed to load transport settings:', err);
    alertClass.value = 'alert-danger';
    alertMessage.value = err.data?.statusMessage || 'Gagal memuat konfigurasi tarif tunjangan.';
  } finally {
    isLoading.value = false;
  }
};

const handleSubmit = async () => {
  if (!canEditSettings.value) return;

  isSaving.value = true;
  alertMessage.value = '';

  if (form.baseFare < 0) {
    alertClass.value = 'alert-danger';
    alertMessage.value = 'Tarif tidak boleh bernilai negatif.';
    isSaving.value = false;
    return;
  }

  if (form.minKm < 0) {
    alertClass.value = 'alert-danger';
    alertMessage.value = 'Batas minimum kilometer tidak boleh bernilai negatif.';
    isSaving.value = false;
    return;
  }

  if (form.maxKm !== null && form.maxKm !== undefined && form.maxKm < form.minKm) {
    alertClass.value = 'alert-danger';
    alertMessage.value = `Batas maksimum (${form.maxKm} km) tidak boleh lebih kecil dari batas minimum (${form.minKm} km).`;
    isSaving.value = false;
    return;
  }

  try {
    const res = await $fetch('/api/v1/tunjangan/settings', {
      method: 'PUT',
      body: {
        baseFare: form.baseFare,
        effectiveStart: form.effectiveStart,
        minKm: form.minKm,
        maxKm: form.maxKm,
        isActive: form.isActive,
      },
    });

    if (res?.status === 'success') {
      alertClass.value = 'alert-success';
      alertMessage.value = res.message || 'Pengaturan tarif dasar tunjangan berhasil disimpan.';
      await fetchSettings();
    }
  } catch (err) {
    console.error('Failed to save settings:', err);
    alertClass.value = 'alert-danger';
    alertMessage.value = err.data?.statusMessage || err.message || 'Gagal menyimpan pengaturan tarif dasar.';
  } finally {
    isSaving.value = false;
  }
};

const handleBack = () => {
  router.push('/tunjangan/transport');
};

onMounted(() => {
  fetchSettings();
});
</script>
