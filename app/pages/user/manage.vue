<template>
  <NuxtLayout name="default">
    <template #actions>
      <button
        class="btn btn-primary"
        data-bs-toggle="modal"
        data-bs-target="#modal-add"
        @click="openAddModal"
      >
        <IconPlus stroke="{3}" size="20" />Tambah
      </button>
    </template>
    <div class="card">
      <div class="card-header">
        <div class="d-flex gap-2 ms-auto">

          <select v-model="selectedRole" class="form-select" @change="fetchData">
            <template v-for="(item, index) in roleOptions" :key="index">
              <option :value="item.value">{{ item.label }}</option>
            </template>
          </select>

          <div class="input-group">
            <input
              v-model="searchKeyword"
              type="text"
              class="form-control"
              placeholder="Cari Data ..."
              @keyup.enter="fetchData"
            />
            <button class="btn" type="button" @click="fetchData">
              <IconSearch stroke="{2}" />
            </button>
          </div>
        </div>
      </div>
      <div class="table-responsive card-body p-0">
        <table class="table table-vcenter">
          <thead>
            <tr>
              <th width="5">No</th>
              <th width="15">Action</th>
              <th>Nama Pengguna</th>
              <th>Username</th>
              <th>Jabatan</th>
              <th>Departemen</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr>
              <td colspan="8" class="text-center py-4 text-muted">
                <span class="spinner-border spinner-border-sm me-2"></span>Memuat data...
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="usersList.length === 0">
            <tr>
              <td colspan="8" class="text-center py-4 text-muted">
                Data pengguna tidak ditemukan.
              </td>
            </tr>
          </tbody>
          <tbody v-else v-for="(item, index) in usersList" :key="item.id">
            <tr>
              <td class="text-center">{{ (currentPage - 1) * perPage + index + 1 }}</td>
              <td class="text-nowrap">
                <div class="d-flex">

                  <a
                    href="#"
                    class="text-dark"
                    data-bs-toggle="modal"
                    data-bs-target="#modal-add"
                    @click="openEditModal(item)"
                  >
                    <span
                      data-bs-toggle="tooltip"
                      data-bs-placement="bottom"
                      title="Edit"
                    >
                      <IconPencil stroke="{1}" size="20" />
                    </span>
                  </a>

                  <a
                    v-if="item.id !== currentUserId"
                    href="#"
                    class="text-danger"
                    data-bs-toggle="modal"
                    data-bs-target="#modal-hapus"
                    @click="selectDeleteUser(item)"
                  >
                    <span
                      data-bs-toggle="tooltip"
                      data-bs-placement="bottom"
                      title="Hapus"
                    >
                      <IconTrash stroke="{1}" size="20" />
                    </span>
                  </a>
                </div>
              </td>
              <td>{{ item.nama || item.name }}</td>
              <td>{{ item.username }}</td>
              <td>{{ item.jabatan || item.jobTitle || '-' }}</td>
              <td>{{ item.departemen || item.department || '-' }}</td>
              <td>{{ item.role || item.roleName || '-' }}</td>
              <td>{{ (item.status === 'active' || item.isActive) ? "Aktif" : "Tidak Aktif" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer d-flex align-items-center">
        <ul class="pagination ms-auto m-0">
          <li
            class="page-item"
            :class="{ disabled: currentPage <= 1 }"
            @click.prevent="changePage(currentPage - 1)"
          >
            <a class="page-link" href="#">prev</a>
          </li>
          <li
            v-for="p in totalPages"
            :key="p"
            class="page-item"
            :class="{ active: p === currentPage }"
            @click.prevent="changePage(p)"
          >
            <a class="page-link" href="#">{{ p }}</a>
          </li>
          <li
            class="page-item"
            :class="{ disabled: currentPage >= totalPages }"
            @click.prevent="changePage(currentPage + 1)"
          >
            <a class="page-link" href="#">
              next

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

      <div class="modal modal-blur fade" id="modal-add">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Form Manajemen User</h5>
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div class="modal-body">

              <div v-if="modalError" class="alert alert-danger py-2 mb-3">
                {{ modalError }}
              </div>

              <div class="mb-3 position-relative">
                <label class="form-label required">Nama Lengkap</label>
                <input
                  v-model="employeeSearchInput"
                  type="text"
                  class="form-control"
                  :placeholder="isEditMode ? 'Nama Pegawai' : 'Ketik min. 2 huruf untuk cari pegawai (misal: rian)...'"
                  :disabled="isEditMode"
                  autocomplete="off"
                  @input="onEmployeeSearchTyping"
                  @focus="onEmployeeSearchFocus"
                />
                <div v-if="selectedEmployee" class="small text-success mt-1 fw-bold">
                  ✔ Pegawai terpilih: {{ selectedEmployee.name }} (NIP: {{ selectedEmployee.nip }})
                </div>

                <div
                  v-if="showEmployeeDropdown"
                  class="list-group position-absolute w-100 shadow-lg mt-1 border"
                  style="z-index: 1060; max-height: 220px; overflow-y: auto; background: #ffffff; left: 0; right: 0;"
                >

                  <div v-if="isSearchingEmployee" class="p-3 text-center text-muted small">
                    <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                    Mencari pegawai...
                  </div>

                  <div
                    v-else-if="employeeSuggestions.length === 0"
                    class="p-3 text-center text-muted small"
                  >
                    Tidak ditemukan pegawai aktif dengan kata kunci "{{ employeeSearchInput }}".
                  </div>

                  <button
                    v-for="emp in employeeSuggestions"
                    v-else
                    :key="emp.id"
                    type="button"
                    class="list-group-item list-group-item-action text-start py-2"
                    @mousedown.prevent="selectEmployee(emp)"
                  >
                    <div class="fw-bold text-primary">{{ emp.name }}</div>
                    <div class="small text-secondary">
                      NIP: {{ emp.nip }} • {{ emp.positionName || '-' }} • {{ emp.departmentName || '-' }}
                    </div>
                  </button>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Username</label>
                <input
                  v-model="form.username"
                  type="text"
                  class="form-control"
                  @keyup="validateUsernameOnKeyUp"
                />
                <div v-if="usernameError" class="text-danger small mt-1">
                  {{ usernameError }}
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Jabatan</label>
                <select v-model="form.jobTitle" class="form-select">
                  <option value="" selected disabled>
                    Pilih terlebih dahulu
                  </option>
                  <option
                    v-for="pos in masterData.positions"
                    :key="pos.id"
                    :value="pos.name"
                  >
                    {{ pos.name }}
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">Departemen</label>
                <select v-model="form.department" class="form-select">
                  <option value="" selected disabled>
                    Pilih terlebih dahulu
                  </option>
                  <option
                    v-for="dept in masterData.departments"
                    :key="dept.id"
                    :value="dept.name"
                  >
                    {{ dept.name }}
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">Role</label>
                <select v-model="form.roleId" class="form-select">
                  <option value="" selected disabled>
                    Pilih terlebih dahulu
                  </option>
                  <option
                    v-for="role in masterData.roles"
                    :key="role.id"
                    :value="role.id"
                  >
                    {{ role.name }}
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">
                  Password
                  <span v-if="isEditMode" class="text-muted small fw-normal">(Opsional saat edit)</span>
                </label>
                <div class="input-group mb-1">
                  <input
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    class="form-control"
                    @keyup="validatePasswordOnKeyUp"
                  />
                  <button
                    class="btn btn-outline-secondary"
                    type="button"
                    title="Show/Hide Password"
                    @click="showPassword = !showPassword"
                  >
                    {{ showPassword ? 'Hide' : 'Show' }}
                  </button>
                  <button
                    class="btn btn-outline-secondary"
                    type="button"
                    title="Copy Password"
                    :disabled="!form.password"
                    @click="copyPassword"
                  >
                    Copy
                  </button>
                </div>
                <button
                  type="button"
                  class="btn btn-primary"
                  @click="generatePassword"
                >
                  Generate Password
                </button>
                <div v-if="copiedMsg" class="text-success small mt-1">
                  ✔ Password berhasil disalin!
                </div>

                <div v-if="form.password" class="small mt-2 p-2 bg-light border rounded">
                  <div :class="pwdChecks.length ? 'text-success' : 'text-danger'">• Min. 8 karakter</div>
                  <div :class="pwdChecks.noSpace ? 'text-success' : 'text-danger'">• Tanpa spasi</div>
                  <div :class="pwdChecks.upper ? 'text-success' : 'text-danger'">• Min. 1 huruf besar</div>
                  <div :class="pwdChecks.lower ? 'text-success' : 'text-danger'">• Min. 1 huruf kecil</div>
                  <div :class="pwdChecks.special ? 'text-success' : 'text-danger'">• Min. 1 karakter khusus</div>
                </div>
              </div>

              <div>
                <label class="form-label">Status</label>
                <label class="form-check">
                  <input
                    v-model="form.isActive"
                    class="form-check-input"
                    type="checkbox"
                    :disabled="isEditMode && editingUserId === currentUserId"
                  />
                  <span class="form-check-label">Aktif</span>
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <div class="d-flex gap-2 ms-auto">
                <button
                  id="btn-close-modal-add"
                  type="button"
                  class="btn"
                  data-bs-dismiss="modal"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  :disabled="submitting"
                  @click="saveUser"
                >
                  <i class="ti ti-check me-1"></i> Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal modal-blur fade" id="modal-hapus">
        <div
          class="modal-dialog modal-sm modal-dialog-centered"
          role="document"
        >
          <div class="modal-content">
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
            <div class="modal-status bg-danger"></div>
            <div class="modal-body text-center py-4">

              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="icon mb-2 text-danger icon-lg"
              >
                <path d="M12 9v4"></path>
                <path
                  d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"
                ></path>
                <path d="M12 16h.01"></path>
              </svg>
              <h3 class="mb-1">Hapus Data</h3>
              <div class="text-secondary">
                Apakah kamu ingin menghapus data ini ?
              </div>
            </div>
            <div class="modal-footer">
              <div class="w-100">
                <div class="row">
                  <div class="col">
                    <a
                      id="btn-close-modal-hapus"
                      href="#"
                      class="btn btn-3 w-100"
                      data-bs-dismiss="modal"
                    >
                      Batal
                    </a>
                  </div>
                  <div class="col">
                    <button
                      type="button"
                      class="btn btn-danger btn-4 w-100"
                      :disabled="deleting"
                      @click="confirmDelete"
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

<script setup>
definePageMeta({
  title: "Manajemen User",
  layout: false,
});

useSeoMeta({
  title: "Manajemen User",
});

import { IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";

const usersList = ref([]);
const currentUserId = ref("");
const loading = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const modalError = ref("");
const copiedMsg = ref(false);
const showPassword = ref(false);

const selectedRole = ref("");
const searchKeyword = ref("");
const currentPage = ref(1);
const perPage = ref(10);
const totalPages = ref(1);

const roleOptions = ref([
  {
    label: "Semua Role",
    value: "",
  },
  {
    label: "Admin",
    value: "admin",
  },
  {
    label: "Super Admin",
    value: "super admin",
  },
]);

const masterData = ref({
  positions: [],
  departments: [],
  roles: [],
});

const isEditMode = ref(false);
const editingUserId = ref(null);
const userToDelete = ref(null);

const form = ref({
  employeeId: "",
  username: "",
  password: "",
  jobTitle: "",
  department: "",
  roleId: "",
  isActive: true,
});

const usernameError = ref("");
const validateUsernameOnKeyUp = () => {
  const val = form.value.username ? form.value.username.toLowerCase().replace(/\s+/g, "") : "";
  form.value.username = val;
  if (!val) {
    usernameError.value = "";
    return;
  }
  if (val.length < 6) {
    usernameError.value = "Username minimal 6 karakter.";
    return;
  }
  if (!/^[a-z0-9]+$/.test(val)) {
    usernameError.value = "Hanya huruf kecil dan angka tanpa spasi.";
    return;
  }
  usernameError.value = "";
};

const pwdChecks = computed(() => {
  const p = form.value.password || "";
  return {
    length: p.length >= 8,
    noSpace: p.length > 0 && !/\s/.test(p),
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
  };
});

const validatePasswordOnKeyUp = () => {};

const generatePassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const num = "23456789";
  const special = "!@#$%^&*_-";
  let pwd = upper[Math.floor(Math.random() * upper.length)] +
            lower[Math.floor(Math.random() * lower.length)] +
            num[Math.floor(Math.random() * num.length)] +
            special[Math.floor(Math.random() * special.length)];
  const all = upper + lower + num + special;
  while (pwd.length < 10) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  form.value.password = pwd.split("").sort(() => 0.5 - Math.random()).join("");
  showPassword.value = true;
};

const copyPassword = async () => {
  if (!form.value.password) return;
  try {
    await navigator.clipboard.writeText(form.value.password);
    copiedMsg.value = true;
    setTimeout(() => { copiedMsg.value = false; }, 2000);
  } catch (e) {}
};

const employeeSearchInput = ref("");
const employeeSuggestions = ref([]);
const showEmployeeDropdown = ref(false);
const isSearchingEmployee = ref(false);
const selectedEmployee = ref(null);

let suggestTimer = null;
const executeEmployeeSearch = async (query) => {
  if (!query || query.length < 2) {
    employeeSuggestions.value = [];
    showEmployeeDropdown.value = false;
    isSearchingEmployee.value = false;
    return;
  }
  isSearchingEmployee.value = true;
  showEmployeeDropdown.value = true;
  try {
    const res = await $fetch(`/api/employees/suggest?q=${encodeURIComponent(query)}`);
    if (res?.success) {
      employeeSuggestions.value = res.data || [];
    } else {
      employeeSuggestions.value = [];
    }
  } catch (err) {
    console.error("Gagal suggest pegawai:", err);
    employeeSuggestions.value = [];
  } finally {
    isSearchingEmployee.value = false;
  }
};

const onEmployeeSearchTyping = () => {
  clearTimeout(suggestTimer);
  selectedEmployee.value = null;
  form.value.employeeId = "";
  const query = employeeSearchInput.value.trim();
  if (query.length < 2) {
    employeeSuggestions.value = [];
    showEmployeeDropdown.value = false;
    return;
  }
  suggestTimer = setTimeout(() => {
    executeEmployeeSearch(query);
  }, 200);
};

const onEmployeeSearchFocus = () => {
  const query = employeeSearchInput.value.trim();
  if (query.length >= 2 && !selectedEmployee.value) {
    executeEmployeeSearch(query);
  }
};

const selectEmployee = (emp) => {
  selectedEmployee.value = emp;
  employeeSearchInput.value = `${emp.name} (${emp.nip})`;
  form.value.employeeId = emp.id;
  showEmployeeDropdown.value = false;

  if (emp.positionName) form.value.jobTitle = emp.positionName;
  if (emp.departmentName) form.value.department = emp.departmentName;
};

const fetchData = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: perPage.value.toString(),
      search: searchKeyword.value.trim(),
      roleId: selectedRole.value,
    });
    const res = await $fetch(`/api/users?${params.toString()}`);
    if (res?.success) {
      usersList.value = res.data || [];
      totalPages.value = res.pagination?.totalPages || 1;
      currentUserId.value = res.currentUserId || "";
    }
  } catch (err) {
    console.error("Gagal memuat data pengguna:", err);
  } finally {
    loading.value = false;
  }
};

const fetchMasterLookup = async () => {
  try {
    const res = await $fetch("/api/master/lookup");
    if (res?.success && res.data) {
      masterData.value = res.data;
      if (res.data.roles && res.data.roles.length > 0) {
        roleOptions.value = [
          { label: "Semua Role", value: "" },
          ...res.data.roles.map((r) => ({ label: r.name, value: r.id })),
        ];
      }
    }
  } catch (err) {
    console.error("Gagal memuat master lookup:", err);
  }
};

const changePage = (p) => {
  if (p >= 1 && p <= totalPages.value) {
    currentPage.value = p;
    fetchData();
  }
};

const openAddModal = () => {
  isEditMode.value = false;
  editingUserId.value = null;
  modalError.value = "";
  selectedEmployee.value = null;
  employeeSearchInput.value = "";
  employeeSuggestions.value = [];
  showEmployeeDropdown.value = false;
  showPassword.value = false;

  form.value = {
    employeeId: "",
    username: "",
    password: "",
    jobTitle: "",
    department: "",
    roleId: masterData.value.roles?.[0]?.id || "",
    isActive: true,
  };
  generatePassword();
};

const openEditModal = (item) => {
  isEditMode.value = true;
  editingUserId.value = item.id;
  modalError.value = "";
  selectedEmployee.value = {
    id: item.employeeId,
    name: item.name,
    nip: item.employeeNip || "-",
  };
  employeeSearchInput.value = item.name;
  showEmployeeDropdown.value = false;
  showPassword.value = false;

  form.value = {
    employeeId: item.employeeId,
    username: item.username,
    password: "",
    jobTitle: item.jobTitle || "",
    department: item.department || "",
    roleId: item.roleId || "",
    isActive: item.status === "active" || item.isActive,
  };
};

const selectDeleteUser = (item) => {
  userToDelete.value = item;
};

const saveUser = async () => {
  modalError.value = "";
  if (!isEditMode.value && !form.value.employeeId) {
    modalError.value = "Wajib memilih pegawai dari hasil autosuggest.";
    return;
  }
  if (!form.value.username || form.value.username.length < 6) {
    modalError.value = "Username wajib minimal 6 karakter alfanumerik huruf kecil.";
    return;
  }
  if (!isEditMode.value && !form.value.password) {
    modalError.value = "Password wajib diisi atau di-generate.";
    return;
  }
  if (!form.value.roleId) {
    modalError.value = "Role wajib dipilih.";
    return;
  }

  submitting.value = true;
  try {
    if (!isEditMode.value) {
      await $fetch("/api/users", {
        method: "POST",
        body: {
          employeeId: form.value.employeeId,
          username: form.value.username,
          password: form.value.password,
          roleId: form.value.roleId,
          jobTitle: form.value.jobTitle,
          department: form.value.department,
          status: form.value.isActive ? "active" : "inactive",
        },
      });
    } else {
      const payload = {
        username: form.value.username,
        roleId: form.value.roleId,
        jobTitle: form.value.jobTitle,
        department: form.value.department,
        status: form.value.isActive ? "active" : "inactive",
      };
      if (form.value.password) payload.password = form.value.password;
      await $fetch(`/api/users/${editingUserId.value}`, {
        method: "PUT",
        body: payload,
      });
    }

    const closeBtn = document.getElementById("btn-close-modal-add");
    if (closeBtn) closeBtn.click();
    await fetchData();
  } catch (err) {
    modalError.value = err?.data?.statusMessage || err?.message || "Gagal menyimpan data pengguna.";
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = async () => {
  if (!userToDelete.value) return;
  deleting.value = true;
  try {
    await $fetch(`/api/users/${userToDelete.value.id}`, {
      method: "DELETE",
    });
    const closeBtn = document.getElementById("btn-close-modal-hapus");
    if (closeBtn) closeBtn.click();
    userToDelete.value = null;
    await fetchData();
  } catch (err) {
    alert(err?.data?.statusMessage || err?.message || "Gagal menghapus pengguna.");
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  await Promise.all([fetchMasterLookup(), fetchData()]);
});
</script>
