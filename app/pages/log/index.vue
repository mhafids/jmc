<template>
  <div>
    <div class="card">
      <div class="card-header">
        <div class="row g-2 align-items-center w-100">
          <div class="col-12 col-md-auto d-flex align-items-center gap-2">
            <span class="text-muted small">Tampilkan</span>
            <select v-model="perPage" class="form-select form-select-sm w-auto" @change="page = 1">
              <option :value="10">10</option>
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
            <span class="text-muted small">baris</span>
          </div>

          <div class="col-12 col-md-auto ms-md-auto d-flex gap-2">
            <select v-model="moduleFilter" class="form-select form-select-sm w-auto" @change="page = 1">
              <option value="">Semua Modul</option>
              <option value="AUTH">AUTH</option>
              <option value="USERS">USERS</option>
              <option value="ROLES">ROLES</option>
              <option value="EMPLOYEES">EMPLOYEES</option>
              <option value="ATTENDANCES">ATTENDANCES</option>
              <option value="TRANSPORT">TRANSPORT</option>
            </select>

            <select v-model="actionFilter" class="form-select form-select-sm w-auto" @change="page = 1">
              <option value="">Semua Aksi</option>
              <option value="login">LOGIN</option>
              <option value="logout">LOGOUT</option>
              <option value="create">CREATE</option>
              <option value="read">READ</option>
              <option value="update">UPDATE</option>
              <option value="delete">DELETE</option>
              <option value="import">IMPORT</option>
              <option value="export">EXPORT</option>
            </select>

            <div class="input-group input-group-sm w-auto">
              <input
                v-model="searchInput"
                type="text"
                class="form-control"
                placeholder="Cari Data ..."
                @keyup.enter="applySearch"
              />
              <button class="btn btn-primary" type="button" @click="applySearch">
                <IconSearch :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="table-responsive card-body p-0 position-relative">

        <div
          v-if="pending"
          class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
          style="z-index: 10;"
        >
          <div class="spinner-border text-primary" role="status"></div>
        </div>

        <table class="table table-vcenter table-hover table-striped mb-0">
          <thead>
            <tr>
              <th width="5%" class="text-center">No</th>
              <th width="20%">Nama User</th>
              <th width="15%">Modul</th>
              <th width="12%">Aksi</th>
              <th width="28%">Deskripsi / Keterangan</th>
              <th width="15%">Timestamp</th>
              <th width="5%" class="text-center">Detail</th>
            </tr>
          </thead>
          <tbody v-if="logs.length > 0">
            <tr v-for="(item, index) in logs" :key="item.id">
              <td class="text-center text-muted">{{ (page - 1) * perPage + index + 1 }}</td>
              <td>
                <div class="font-weight-medium">{{ item.userName }}</div>
                <div class="text-muted small">@{{ item.username }} &bull; {{ item.userRole }}</div>
              </td>
              <td>
                <span class="badge bg-muted-lt font-monospace text-uppercase">{{ item.moduleCode }}</span>
              </td>
              <td>
                <span :class="['badge text-uppercase', getActionBadgeClass(item.action)]">
                  {{ item.action }}
                </span>
              </td>
              <td>
                <span class="text-wrap">{{ item.description || '-' }}</span>
              </td>
              <td class="text-nowrap text-muted">
                {{ formatDateTimeID(item.createdAt) }}
              </td>
              <td class="text-center">
                <button
                  type="button"
                  class="btn btn-ghost-secondary btn-icon btn-sm"
                  title="Lihat Detail & Snapshot Audit"
                  @click="openDetailModal(item)"
                >
                  <IconEye :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="!pending">
            <tr>
              <td colspan="7" class="text-center py-5 text-muted">
                <IconInfoCircle :size="32" class="mb-2 text-secondary opacity-50 d-block mx-auto" />
                <span>Belum ada rekaman log aktivitas yang sesuai.</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card-footer d-flex flex-column flex-md-row align-items-center justify-content-between gap-2">
        <div class="text-muted small">
          Menampilkan <strong>{{ paginationInfo.from }}</strong> hingga <strong>{{ paginationInfo.to }}</strong> dari <strong>{{ totalItems }}</strong> total aktivitas
        </div>
        <ul v-if="totalPages > 1" class="pagination ms-auto m-0">
          <li :class="['page-item', { disabled: page <= 1 }]">
            <a class="page-link" href="#" @click.prevent="goToPage(page - 1)">
              <IconChevronLeft :size="16" />
            </a>
          </li>

          <li
            v-for="p in visiblePages"
            :key="p"
            :class="['page-item', { active: page === p, disabled: p === '...' }]"
          >
            <a
              v-if="p !== '...'"
              class="page-link"
              href="#"
              @click.prevent="goToPage(p)"
            >
              {{ p }}
            </a>
            <span v-else class="page-link">...</span>
          </li>

          <li :class="['page-item', { disabled: page >= totalPages }]">
            <a class="page-link" href="#" @click.prevent="goToPage(page + 1)">
              <IconChevronRight :size="16" />
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div
      v-if="selectedLog"
      class="modal modal-blur fade show d-block"
      tabindex="-1"
      style="background-color: rgba(0, 0, 0, 0.5);"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title d-flex align-items-center gap-2">
              <IconHistory :size="20" class="text-primary" />
              Detail Audit Trail Log Aktivitas
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              @click="closeDetailModal"
            ></button>
          </div>
          <div class="modal-body">
            <div class="row g-3 mb-3">
              <div class="col-12 col-md-6">
                <div class="text-muted small">Pengguna:</div>
                <div class="fw-bold">{{ selectedLog.userName }} (@{{ selectedLog.username }})</div>
                <div class="small text-secondary">Role: {{ selectedLog.userRole }}</div>
              </div>
              <div class="col-12 col-md-6">
                <div class="text-muted small">Waktu Pencatatan:</div>
                <div class="fw-bold">{{ formatDateTimeID(selectedLog.createdAt) }}</div>
                <div class="small text-secondary font-monospace">{{ selectedLog.createdAt }}</div>
              </div>
              <div class="col-12 col-md-6">
                <div class="text-muted small">Modul & Aksi:</div>
                <div class="d-flex align-items-center gap-2 mt-1">
                  <span class="badge bg-muted-lt font-monospace">{{ selectedLog.moduleCode }}</span>
                  <span :class="['badge text-uppercase', getActionBadgeClass(selectedLog.action)]">
                    {{ selectedLog.action }}
                  </span>
                </div>
              </div>
              <div class="col-12 col-md-6">
                <div class="text-muted small">IP Address & User Agent:</div>
                <div class="fw-bold font-monospace small">{{ selectedLog.ipAddress || '-' }}</div>
                <div class="small text-muted text-truncate" :title="selectedLog.userAgent">
                  {{ selectedLog.userAgent || '-' }}
                </div>
              </div>
              <div v-if="selectedLog.url" class="col-12">
                <div class="text-muted small">Endpoint / URL:</div>
                <div class="font-monospace small bg-light p-2 rounded">
                  <span v-if="selectedLog.method" class="badge bg-blue text-white me-2">{{ selectedLog.method }}</span>
                  {{ selectedLog.url }}
                </div>
              </div>
              <div class="col-12">
                <div class="text-muted small">Deskripsi:</div>
                <div class="p-2 border rounded bg-light">
                  {{ selectedLog.description || '-' }}
                </div>
              </div>
            </div>

            <div v-if="selectedLog.oldValues || selectedLog.newValues" class="border-top pt-3">
              <h6 class="text-uppercase text-muted mb-3 font-weight-bold" style="font-size: 0.75rem; letter-spacing: 0.05em;">
                Snapshot Perubahan Nilai (Audit Trail Diff)
              </h6>
              <div class="row g-2">
                <div class="col-12 col-md-6">
                  <label class="form-label small fw-bold text-danger">Data Sebelum (Old Values):</label>
                  <pre
                    class="bg-dark text-light p-2 rounded small overflow-auto font-monospace"
                    style="max-height: 220px;"
                  >{{ formatJson(selectedLog.oldValues) }}</pre>
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label small fw-bold text-success">Data Sesudah (New Values):</label>
                  <pre
                    class="bg-dark text-light p-2 rounded small overflow-auto font-monospace"
                    style="max-height: 220px;"
                  >{{ formatJson(selectedLog.newValues) }}</pre>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary ms-auto" @click="closeDetailModal">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  title: "Log Aktivitas",
});

useSeoMeta({
  title: "Log Aktivitas - Audit Trail",
});

import {
  IconSearch,
  IconEye,
  IconChevronLeft,
  IconChevronRight,
  IconInfoCircle,
  IconHistory,
} from "@tabler/icons-vue";
import { formatDateTimeID } from "~/utils/formatDate.js";

const page = ref(1);
const perPage = ref(10);
const searchInput = ref("");
const searchQuery = ref("");
const moduleFilter = ref("");
const actionFilter = ref("");

const selectedLog = ref(null);

let searchTimer = null;
watch(searchInput, (val) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery.value = val.trim();
    page.value = 1;
  }, 400);
});

const applySearch = () => {
  clearTimeout(searchTimer);
  searchQuery.value = searchInput.value.trim();
  page.value = 1;
};

const queryParams = computed(() => ({
  page: page.value,
  perPage: perPage.value,
  search: searchQuery.value || undefined,
  moduleCode: moduleFilter.value || undefined,
  action: actionFilter.value || undefined,
}));

const { data: responseData, pending, refresh } = await useFetch("/api/activity-logs", {
  query: queryParams,
  watch: [page, perPage, searchQuery, moduleFilter, actionFilter],
});

const logs = computed(() => responseData.value?.data || []);
const meta = computed(() => responseData.value?.meta || {});
const totalItems = computed(() => meta.value.totalItems || 0);
const totalPages = computed(() => meta.value.totalPages || 1);

const paginationInfo = computed(() => {
  if (totalItems.value === 0) return { from: 0, to: 0 };
  const from = (page.value - 1) * perPage.value + 1;
  const to = Math.min(page.value * perPage.value, totalItems.value);
  return { from, to };
});

const visiblePages = computed(() => {
  const current = page.value;
  const total = totalPages.value;
  const pages = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("...");

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 2) pages.push("...");
    pages.push(total);
  }

  return pages;
});

const goToPage = (p) => {
  if (p >= 1 && p <= totalPages.value && p !== page.value) {
    page.value = p;
  }
};

const getActionBadgeClass = (action) => {
  const act = (action || "").toLowerCase();
  switch (act) {
    case "create":
      return "bg-green-lt";
    case "update":
      return "bg-yellow-lt";
    case "delete":
      return "bg-red-lt";
    case "login":
      return "bg-blue-lt";
    case "logout":
      return "bg-secondary-lt";
    case "import":
    case "export":
      return "bg-purple-lt";
    default:
      return "bg-azure-lt";
  }
};

const openDetailModal = (item) => {
  selectedLog.value = item;
};

const closeDetailModal = () => {
  selectedLog.value = null;
};

const formatJson = (val) => {
  if (!val) return "Tidak ada data.";
  try {
    return JSON.stringify(val, null, 2);
  } catch (e) {
    return String(val);
  }
};
</script>
