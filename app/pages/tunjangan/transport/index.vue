<template>
  <div class="card">
    <div class="card-header">
      <div class="d-flex gap-2 ms-auto align-items-center">

        <select
          v-model="selectedYear"
          class="form-select"
          style="width: 180px"
          @change="handleFilterChange"
        >
          <option value="">Semua Tahun</option>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
        </select>

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
            <th>Nama Bulan</th>
            <th class="text-center">Total Penerima</th>
            <th class="text-center">Total Tunjangan Transport</th>
            <th class="text-center">Aksi</th>
          </tr>
        </thead>
        <tbody v-if="isLoading">
          <tr>
            <td colspan="5" class="text-center py-4 text-muted">
              <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
              Memuat data rekap periode...
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="periodsList.length === 0">
          <tr>
            <td colspan="5" class="text-center py-4 text-muted">
              Tidak ada data periode tunjangan transport yang ditemukan.
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="(item, index) in periodsList" :key="item.id">
            <td class="text-center">{{ (currentPage - 1) * limit + index + 1 }}</td>
            <td>
              <div class="fw-semibold">{{ item.bulan }} {{ item.period_year }}</div>
              <div class="text-muted small">
                Status:
                <span
                  class="badge"
                  :class="{
                    'bg-success-lt': item.status === 'calculated',
                    'bg-warning-lt': item.status === 'draft',
                    'bg-secondary-lt': item.status === 'locked'
                  }"
                >
                  {{ item.status }}
                </span>
              </div>
            </td>
            <td class="text-center">{{ item.total_recipients }}</td>
            <td class="text-end fw-bold">{{ formatRupiah(item.total_amount) }}</td>
            <td class="text-center">
              <NuxtLink
                :to="`/tunjangan/transport/detail/${item.id}`"
                class="btn btn-primary btn-sm"
              >
                Detail
              </NuxtLink>
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
</template>

<script setup>
definePageMeta({
  title: "Tunjangan Transport",
});

useSeoMeta({
  title: "Tunjangan Transport",
});

import { ref, computed, onMounted } from 'vue';
import { IconSearch } from "@tabler/icons-vue";
import { formatRupiah } from "~/utils/formatRupiah.js";

const selectedYear = ref('');
const searchQuery = ref('');
const currentPage = ref(1);
const limit = ref(10);
const totalPages = ref(1);
const totalItems = ref(0);
const isLoading = ref(false);
const periodsList = ref([]);

const fetchPeriods = async () => {
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    if (selectedYear.value) params.append('year', selectedYear.value);
    if (searchQuery.value) params.append('search', searchQuery.value.trim());
    params.append('page', String(currentPage.value));
    params.append('limit', String(limit.value));

    const res = await $fetch(`/api/v1/tunjangan/periods?${params.toString()}`);
    if (res?.status === 'success' && Array.isArray(res.data)) {
      periodsList.value = res.data;
      if (res.pagination) {
        totalPages.value = res.pagination.total_pages || 1;
        totalItems.value = res.pagination.total_items || 0;
      }
    }
  } catch (err) {
    console.error('Failed to fetch transport periods:', err);
    periodsList.value = [];
  } finally {
    isLoading.value = false;
  }
};

const handleFilterChange = () => {
  currentPage.value = 1;
  fetchPeriods();
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchPeriods();
};

const goToPage = (p) => {
  if (p >= 1 && p <= totalPages.value && p !== currentPage.value) {
    currentPage.value = p;
    fetchPeriods();
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

onMounted(() => {
  fetchPeriods();
});
</script>
