<template>
  <div>
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div class="d-flex align-items-center gap-2">
        <h3 class="card-title m-0">{{ periodHeader.title || 'Detail Tunjangan Transport' }}</h3>
        <span
          v-if="periodHeader.status"
          class="badge"
          :class="{
            'bg-success-lt': periodHeader.status === 'calculated',
            'bg-warning-lt': periodHeader.status === 'draft',
            'bg-secondary-lt': periodHeader.status === 'locked'
          }"
        >
          {{ periodHeader.status.toUpperCase() }}
        </span>
      </div>

      <NuxtLink to="/tunjangan/transport" class="btn btn-outline-secondary btn-sm">
        &larr; Kembali ke Rekap
      </NuxtLink>
    </div>

    <div v-if="alertMessage" class="alert alert-dismissible" :class="alertClass" role="alert">
      <div class="d-flex">
        <div>{{ alertMessage }}</div>
      </div>
      <a class="btn-close" aria-label="close" @click="alertMessage = ''"></a>
    </div>

    <div class="card">
      <div class="card-header d-flex flex-wrap gap-2 align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <button
            v-if="canCalculate"
            class="btn btn-primary"
            :class="{ 'btn-loading': isCalculating }"
            :disabled="isCalculating || isLocked"
            :title="isLocked ? 'Periode telah dikunci dan tidak dapat dihitung ulang' : 'Hitung kalkulasi tunjangan transport seluruh pegawai'"
            @click="handleCalculate"
          >
            Hitung Tunjangan
          </button>
          <span v-else class="badge bg-blue-lt">
            Mode Pratinjau (Read-Only)
          </span>
        </div>

        <div class="ms-auto">
          <div class="input-group">
            <input
              v-model="searchQuery"
              type="text"
              class="form-control"
              placeholder="Cari Data ..."
              @keyup.enter="handleSearch"
            />
            <button class="btn" type="button" @click="handleSearch">
              <IconSearch stroke="{2}" />
            </button>
          </div>
        </div>
      </div>

      <div class="table-responsive card-body p-0">
        <table class="table table-vcenter table-hover">
          <thead>
            <tr>
              <th width="5" class="text-center">No</th>
              <th class="cursor-pointer" @click="toggleSort('nama')">
                Nama Penerima
                <span v-if="sortBy === 'nama'">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="text-center cursor-pointer" @click="toggleSort('km')">
                Kilometer
                <span v-if="sortBy === 'km'">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="text-center cursor-pointer" @click="toggleSort('hari')">
                Jumlah Hari
                <span v-if="sortBy === 'hari'">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="text-center cursor-pointer" @click="toggleSort('nominal')">
                Nominal
                <span v-if="sortBy === 'nominal'">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </th>
            </tr>
          </thead>
          <tbody v-if="isLoading">
            <tr>
              <td colspan="5" class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                Memuat rincian tunjangan...
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="detailsList.length === 0">
            <tr>
              <td colspan="5" class="text-center py-4 text-muted">
                Belum ada rincian perhitungan tunjangan untuk periode ini.
                <span v-if="canCalculate && !isLocked"> Silakan klik tombol <strong>Hitung Tunjangan</strong> di atas.</span>
              </td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr v-for="(item, index) in detailsList" :key="item.id">
              <td class="text-center">{{ (currentPage - 1) * limit + index + 1 }}</td>
              <td>
                <div class="fw-semibold">{{ item.nama }}</div>
                <div class="text-muted small">
                  {{ item.nip || '-' }} &bull;
                  <span
                    class="badge"
                    :class="{
                      'bg-success-lt': item.eligibility_status === 'eligible',
                      'bg-danger-lt': item.eligibility_status === 'not_eligible'
                    }"
                  >
                    {{ item.eligibility_status === 'eligible' ? 'Berhak' : 'Tidak Berhak' }}
                  </span>
                  <span v-if="item.calculation_note" class="ms-1 text-muted">
                    ({{ item.calculation_note }})
                  </span>
                </div>
              </td>
              <td class="text-center">
                <span
                  class="badge bg-light text-dark fw-bold"
                  :title="`Jarak asli profil: ${item.original_km} km`"
                >
                  {{ item.km }} km
                </span>
              </td>
              <td class="text-center">
                <span
                  class="badge bg-light text-dark fw-bold"
                  :title="`Total kehadiran fisik: ${item.hari} hari kerja`"
                >
                  {{ item.hari }} hari
                </span>
              </td>
              <td class="text-end fw-bold" :class="{ 'text-muted': item.nominal === 0 }">
                {{ formatRupiah(item.nominal) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card-footer d-flex align-items-center">
        <p class="m-0 text-muted small">
          Menampilkan <span>{{ (currentPage - 1) * limit + 1 }}</span> hingga
          <span>{{ Math.min(currentPage * limit, totalItems) }}</span> dari
          <span>{{ totalItems }}</span> entri
        </p>
        <ul class="pagination ms-auto m-0">
          <li class="page-item" :class="{ disabled: currentPage <= 1 }">
            <a class="page-link" href="#" @click.prevent="goToPage(currentPage - 1)">
              Prev
            </a>
          </li>
          <li
            v-for="page in visiblePages"
            :key="page"
            class="page-item"
            :class="{ active: page === currentPage }"
          >
            <a class="page-link" href="#" @click.prevent="goToPage(page)">
              {{ page }}
            </a>
          </li>
          <li class="page-item" :class="{ disabled: currentPage >= totalPages }">
            <a class="page-link" href="#" @click.prevent="goToPage(currentPage + 1)">
              Next
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="icon"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <path d="M9 6l6 6l-6 6"></path>
              </svg>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  title: "Detail Tunjangan Transport",
});

useSeoMeta({
  title: "Detail Tunjangan Transport",
});

import { ref, computed, onMounted } from 'vue';
import { IconSearch } from "@tabler/icons-vue";
import { formatRupiah } from "~/utils/formatRupiah.js";
import { usePermission } from "~/composables/usePermission.js";

const route = useRoute();
const periodId = route.params.id;

const { canCreate, canUpdate, isSuperadmin } = usePermission();

const canCalculate = computed(() => {
  return canCreate('TRANSPORT_ALLOWANCES');
});

const periodHeader = ref({});
const detailsList = ref([]);
const searchQuery = ref('');
const sortBy = ref('nama');
const sortDir = ref('asc');
const currentPage = ref(1);
const limit = ref(10);
const totalPages = ref(1);
const totalItems = ref(0);
const isLoading = ref(false);
const isCalculating = ref(false);

const alertMessage = ref('');
const alertClass = ref('alert-success');

const isLocked = computed(() => periodHeader.value?.status === 'locked');

const fetchHeader = async () => {
  try {
    const res = await $fetch(`/api/v1/tunjangan/periods/${periodId}`);
    if (res?.status === 'success' && res.data) {
      periodHeader.value = res.data;
    }
  } catch (err) {
    console.error('Failed to fetch period header:', err);
  }
};

const fetchDetails = async () => {
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    if (searchQuery.value) params.append('search', searchQuery.value.trim());
    params.append('sort_by', sortBy.value);
    params.append('sort_dir', sortDir.value);
    params.append('page', String(currentPage.value));
    params.append('limit', String(limit.value));

    const res = await $fetch(`/api/v1/tunjangan/periods/${periodId}/details?${params.toString()}`);
    if (res?.status === 'success' && Array.isArray(res.data)) {
      detailsList.value = res.data;
      if (res.pagination) {
        totalPages.value = res.pagination.total_pages || 1;
        totalItems.value = res.pagination.total_items || 0;
      }
    }
  } catch (err) {
    console.error('Failed to fetch period details:', err);
    detailsList.value = [];
  } finally {
    isLoading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchDetails();
};

const toggleSort = (column) => {
  if (sortBy.value === column) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = column;
    sortDir.value = 'asc';
  }
  fetchDetails();
};

const goToPage = (p) => {
  if (p >= 1 && p <= totalPages.value && p !== currentPage.value) {
    currentPage.value = p;
    fetchDetails();
  }
};

const visiblePages = computed(() => {
  const pages = [];
  const start = Math.max(1, currentPage.value - 2);
  const end = Math.min(totalPages.value, start + 4);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

const handleCalculate = async () => {
  if (isLocked.value) return;
  isCalculating.value = true;
  alertMessage.value = '';

  try {
    const res = await $fetch(`/api/v1/tunjangan/periods/${periodId}/calculate`, {
      method: 'POST',
    });

    if (res?.status === 'success') {
      alertClass.value = 'alert-success';
      alertMessage.value = res.message || 'Kalkulasi tunjangan transport berhasil dijalankan.';
      await Promise.all([fetchHeader(), fetchDetails()]);
    }
  } catch (err) {
    console.error('Calculation failed:', err);
    alertClass.value = 'alert-danger';
    alertMessage.value = err.data?.statusMessage || err.message || 'Gagal mengeksekusi perhitungan tunjangan.';
  } finally {
    isCalculating.value = false;
  }
};

onMounted(async () => {
  await Promise.all([fetchHeader(), fetchDetails()]);
});
</script>
