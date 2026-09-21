<template>
  <div>

    <div v-if="successMsg" class="alert alert-success alert-dismissible fade show" role="alert">
      <div class="d-flex align-items-center">
        <IconCheck class="me-2" size="20" />
        <span>{{ successMsg }}</span>
      </div>
      <button type="button" class="btn-close" @click="successMsg = ''"></button>
    </div>

    <div v-if="errorMsg" class="alert alert-danger alert-dismissible fade show" role="alert">
      <div class="d-flex align-items-center">
        <IconAlertTriangle class="me-2" size="20" />
        <span>{{ errorMsg }}</span>
      </div>
      <button type="button" class="btn-close" @click="errorMsg = ''"></button>
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="row g-3">
        <div class="col-lg-6">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Data Diri</h3>
            </div>
            <div class="card-body">
              <div class="row g-4">
                <div class="col-12">
                  <div class="row align-items-center">

                    <div class="col-auto text-center">
                      <img
                        :src="photoPreview || form.photoPath || '/images/pegawai/ahmad.jpg'"
                        alt="Foto Pegawai"
                        class="foto-ptofil object-cover mb-2"
                        onerror="this.src='/images/pegawai/ahmad.jpg'"
                      />
                      <div>
                        <label
                          for="unggah-foto"
                          class="form-label text-primary text-center cursor-pointer mb-0"
                        >
                          {{ uploadingPhoto ? 'Mengunggah...' : 'Ubah Foto' }}
                        </label>
                        <input
                          id="unggah-foto"
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          hidden
                          @change="handleFileUpload"
                        />
                      </div>
                    </div>

                    <div class="col">

                      <div class="mb-4">
                        <label class="form-label required">NIP</label>
                        <input
                          v-model="form.nip"
                          type="text"
                          class="form-control"
                          placeholder="Nomor Induk Pegawai (min 8 angka)"
                          required
                        />
                      </div>

                      <div>
                        <label class="form-label required">Nama Lengkap</label>
                        <input
                          v-model="form.name"
                          type="text"
                          class="form-control"
                          placeholder="Nama lengkap beserta gelar"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-md-6">
                  <label class="form-label required">Email</label>
                  <input
                    v-model="form.email"
                    type="email"
                    class="form-control"
                    placeholder="alamat@email.com"
                    required
                  />
                </div>

                <div class="col-md-6">
                  <label class="form-label required">Nomor HP</label>
                  <input
                    v-model="form.phone"
                    type="text"
                    class="form-control"
                    placeholder="+6281234567890"
                    required
                  />
                </div>

                <div class="col-md-5">
                  <label class="form-label required">Tempat Lahir</label>
                  <input
                    v-model="form.birthPlace"
                    type="text"
                    class="form-control"
                    placeholder="Kota kelahiran"
                    required
                  />
                </div>

                <div class="col-md-5">
                  <label class="form-label required">Tanggal Lahir</label>
                  <input
                    v-model="form.birthDate"
                    type="date"
                    class="form-control"
                    required
                  />
                </div>

                <div class="col-md-2">
                  <label class="form-label">Usia</label>
                  <input
                    :value="calculatedAge"
                    type="number"
                    min="0"
                    class="form-control"
                    readonly
                  />
                </div>

                <div class="col-12">
                  <div class="card">
                    <div class="card-body">
                      <div class="d-flex align-items-center justify-content-between mb-2">
                        <label class="form-label m-0 required">Riwayat Pendidikan</label>
                      </div>
                      <table class="table table-borderless align-middle">
                        <thead>
                          <tr>
                            <th class="py-0" style="width: 25%">Jenjang</th>
                            <th class="py-0" style="width: 45%">Nama Sekolah / PT</th>
                            <th class="py-0" style="width: 20%">Tahun Lulus</th>
                            <th class="py-0" style="width: 10%"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(edu, idx) in form.educations" :key="idx">
                            <td>
                              <select v-model="edu.educationLevel" class="form-select form-select-sm" required>
                                <option value="" disabled>Pilih</option>
                                <option value="SD">SD</option>
                                <option value="SMP">SMP</option>
                                <option value="SMA/SMK">SMA/SMK</option>
                                <option value="D3">D3</option>
                                <option value="S1">S1</option>
                                <option value="S2">S2</option>
                                <option value="S3">S3</option>
                              </select>
                            </td>
                            <td>
                              <input
                                v-model="edu.schoolName"
                                type="text"
                                class="form-control form-control-sm"
                                placeholder="Nama institusi"
                                required
                              />
                            </td>
                            <td>
                              <input
                                v-model.number="edu.graduationYear"
                                type="number"
                                min="1950"
                                :max="new Date().getFullYear()"
                                class="form-control form-control-sm"
                                placeholder="YYYY"
                                required
                              />
                            </td>
                            <td class="text-center">
                              <span
                                v-if="form.educations.length > 1"
                                class="cursor-pointer text-danger"
                                title="Hapus baris"
                                @click="removeEducation(idx)"
                              >
                                <IconXboxXFilled size="20" />
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <div class="text-center mt-2">
                        <button type="button" class="btn btn-sm btn-outline-primary" @click="addEducation">
                          + TAMBAH DATA
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-12">
                  <label class="form-label required">Alamat Lengkap</label>
                  <textarea
                    v-model="form.fullAddress"
                    class="form-control"
                    rows="3"
                    placeholder="Nama jalan, RT/RW, nomor rumah, kelurahan"
                    required
                  ></textarea>
                </div>

                <div class="col-md-4 position-relative">
                  <label class="form-label required">Kecamatan</label>
                  <input
                    v-model="districtSearch"
                    type="text"
                    class="form-control"
                    placeholder="Ketik min 3 huruf..."
                    autocomplete="off"
                    @input="onDistrictInput"
                  />

                  <div
                    v-if="showDistrictDropdown && districtSuggestions.length > 0"
                    class="list-group position-absolute w-100 shadow-sm"
                    style="z-index: 1050; max-height: 200px; overflow-y: auto;"
                  >
                    <button
                      v-for="d in districtSuggestions"
                      :key="d.districtId"
                      type="button"
                      class="list-group-item list-group-item-action py-1 px-2 small"
                      @click="selectDistrict(d)"
                    >
                      <strong>{{ d.districtName }}</strong>
                      <span class="text-muted ms-1">({{ d.regencyName }}, {{ d.provinceName }})</span>
                    </button>
                  </div>
                </div>

                <div class="col-md-4">
                  <label class="form-label">Kabupaten / Kota</label>
                  <input
                    :value="form.regencyName"
                    type="text"
                    class="form-control bg-light"
                    readonly
                    disabled
                  />
                </div>

                <div class="col-md-4">
                  <label class="form-label">Provinsi</label>
                  <input
                    :value="form.provinceName"
                    type="text"
                    class="form-control bg-light"
                    readonly
                    disabled
                  />
                </div>

                <div class="col-md-12">
                  <label class="form-label required">Jarak Rumah ke Kantor (KM)</label>
                  <input
                    v-model="form.distanceKm"
                    type="number"
                    step="0.1"
                    min="0"
                    max="99"
                    class="form-control"
                    placeholder="Maksimal 2 digit integer (contoh: 12.5)"
                    required
                  />
                  <small class="text-muted">Parameter perhitungan tunjangan transport harian.</small>
                </div>

                <div class="col-md-6">
                  <div class="form-label required">Status Pernikahan</div>
                  <div>
                    <label class="form-check form-check-inline">
                      <input
                        v-model="form.maritalStatus"
                        class="form-check-input"
                        type="radio"
                        value="single"
                        name="marital_radio"
                        @change="handleMaritalChange"
                      />
                      <span class="form-check-label">Belum Menikah</span>
                    </label>
                    <label class="form-check form-check-inline">
                      <input
                        v-model="form.maritalStatus"
                        class="form-check-input"
                        type="radio"
                        value="married"
                        name="marital_radio"
                        @change="handleMaritalChange"
                      />
                      <span class="form-check-label">Menikah</span>
                    </label>
                  </div>
                </div>

                <div class="col-md-6">
                  <label class="form-label required">Jumlah Anak</label>
                  <input
                    v-model.number="form.childrenCount"
                    type="number"
                    min="0"
                    max="99"
                    class="form-control"
                    :disabled="form.maritalStatus !== 'married'"
                    required
                  />
                  <small v-if="form.maritalStatus !== 'married'" class="text-muted">Terkunci 0 jika belum menikah.</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Data Kepegawaian</h3>
            </div>
            <div class="card-body">
              <div class="row g-4">

                <div class="col-12">
                  <label class="form-label required">Tanggal Masuk</label>
                  <input
                    v-model="form.joinedAt"
                    type="date"
                    class="form-control"
                    required
                  />
                </div>

                <div class="col-md-6">
                  <label class="form-label required">Jabatan</label>
                  <select v-model="form.positionId" class="form-select" required>
                    <option value="" disabled>Pilih jabatan</option>
                    <option v-for="p in positions" :key="p.id" :value="p.id">
                      {{ p.name }}
                    </option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label required">Departemen</label>
                  <select v-model="form.departmentId" class="form-select" required>
                    <option value="" disabled>Pilih departemen</option>
                    <option v-for="d in departments" :key="d.id" :value="d.id">
                      {{ d.name }}
                    </option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label required">Ikatan Kerja</label>
                  <select v-model="form.employmentType" class="form-select" required>
                    <option value="tetap">PKWTT (Tetap)</option>
                    <option value="kontrak">PKWT (Kontrak)</option>
                    <option value="magang">Magang</option>
                    <option value="pns">PNS</option>
                    <option value="pppk">PPPK</option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label required">Jenis Kelamin</label>
                  <select v-model="form.gender" class="form-select" required>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Status Keaktifan</label>
                  <label class="form-check form-switch form-switch-3">
                    <input
                      v-model="isActiveStatus"
                      class="form-check-input"
                      type="checkbox"
                    />
                    <span class="form-check-label">{{ isActiveStatus ? 'Aktif' : 'Nonaktif' }}</span>
                  </label>
                </div>
              </div>
            </div>
            <div class="card-footer d-flex">
              <div class="d-flex gap-2 ms-auto">
                <button type="submit" class="btn btn-primary" :disabled="submitting">
                  <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
                  {{ isEditMode ? 'Simpan Perubahan' : 'Simpan Data' }}
                </button>
                <button type="button" class="btn btn-outline-primary" @click="goBack()">
                  Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { IconXboxXFilled, IconCheck, IconAlertTriangle } from "@tabler/icons-vue";

const route = useRoute();
const router = useRouter();
const { goBack } = useGoBack();

const employeeId = computed(() => route.params.id || route.params.nip || null);
const isEditMode = computed(() => Boolean(employeeId.value));

const positions = ref([]);
const departments = ref([]);

const form = reactive({
  nip: "",
  name: "",
  email: "",
  phone: "+62",
  photoPath: "",
  birthPlace: "",
  birthDate: "",
  maritalStatus: "single",
  childrenCount: 0,
  joinedAt: "",
  positionId: "",
  departmentId: "",
  employmentType: "tetap",
  gender: "male",
  districtId: "",
  districtName: "",
  regencyName: "",
  provinceName: "",
  fullAddress: "",
  distanceKm: 0,
  status: "active",
  educations: [
    { educationLevel: "S1", schoolName: "", graduationYear: 2020 },
  ],
});

const isActiveStatus = computed({
  get: () => form.status === "active",
  set: (val) => {
    form.status = val ? "active" : "inactive";
  },
});

const photoPreview = ref("");
const uploadingPhoto = ref(false);

const districtSearch = ref("");
const districtSuggestions = ref([]);
const showDistrictDropdown = ref(false);

const submitting = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const calculatedAge = computed(() => {
  if (!form.birthDate) return 0;
  const birth = new Date(form.birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
});

const handleMaritalChange = () => {
  if (form.maritalStatus !== "married") {
    form.childrenCount = 0;
  }
};

const addEducation = () => {
  form.educations.push({
    educationLevel: "SMA/SMK",
    schoolName: "",
    graduationYear: new Date().getFullYear(),
  });
};

const removeEducation = (index) => {
  if (form.educations.length > 1) {
    form.educations.splice(index, 1);
  }
};

let searchTimeout = null;
const onDistrictInput = () => {
  clearTimeout(searchTimeout);
  if (!districtSearch.value || districtSearch.value.length < 3) {
    districtSuggestions.value = [];
    showDistrictDropdown.value = false;
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const res = await $fetch(`/api/wilayah/districts?q=${encodeURIComponent(districtSearch.value)}`);
      if (res?.success) {
        districtSuggestions.value = res.data || [];
        showDistrictDropdown.value = districtSuggestions.value.length > 0;
      }
    } catch (e) {
      districtSuggestions.value = [];
    }
  }, 300);
};

const selectDistrict = (d) => {
  form.districtId = d.districtId;
  form.districtName = d.districtName;
  form.regencyName = d.regencyName;
  form.provinceName = d.provinceName;
  districtSearch.value = d.districtName;
  showDistrictDropdown.value = false;
};

const handleFileUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    errorMsg.value = "Ukuran file foto maksimal 2MB.";
    return;
  }

  photoPreview.value = URL.createObjectURL(file);

  uploadingPhoto.value = true;
  errorMsg.value = "";
  try {
    const formData = new FormData();
    formData.append("photo", file);

    const res = await $fetch("/api/employees/upload-photo", {
      method: "POST",
      body: formData,
    });

    if (res?.success) {
      form.photoPath = res.data.url;
    }
  } catch (err) {
    errorMsg.value = err?.data?.statusMessage || "Gagal mengunggah berkas foto.";
  } finally {
    uploadingPhoto.value = false;
  }
};

const loadMaster = async () => {
  try {
    const res = await $fetch("/api/master/lookup");
    if (res?.success) {
      positions.value = res.data.positions || [];
      departments.value = res.data.departments || [];
    }
  } catch (err) {
    console.error("Gagal memuat master jabatan/departemen:", err);
  }
};

const loadDetail = async () => {
  if (!isEditMode.value) return;
  try {
    const res = await $fetch(`/api/employees/${employeeId.value}`);
    if (res?.success && res.data) {
      const d = res.data;
      form.nip = d.nip || "";
      form.name = d.name || "";
      form.email = d.email || "";
      form.phone = d.phone || "+62";
      form.photoPath = d.photoPath || "";
      form.birthPlace = d.birthPlace || "";
      form.birthDate = d.birthDate ? d.birthDate.split("T")[0] : "";
      form.maritalStatus = d.maritalStatus || "single";
      form.childrenCount = d.childrenCount || 0;
      form.joinedAt = d.joinedAt ? d.joinedAt.split("T")[0] : "";
      form.positionId = d.positionId || "";
      form.departmentId = d.departmentId || "";
      form.employmentType = d.employmentType || "tetap";
      form.gender = d.gender || "male";
      form.districtId = d.districtId || "";
      form.districtName = d.districtName || "";
      form.regencyName = d.regencyName || "";
      form.provinceName = d.provinceName || "";
      districtSearch.value = d.districtName || "";
      form.fullAddress = d.fullAddress || "";
      form.distanceKm = d.distanceKm || 0;
      form.status = d.status || "active";

      if (Array.isArray(d.educations) && d.educations.length > 0) {
        form.educations = d.educations.map((e) => ({
          educationLevel: e.educationLevel,
          schoolName: e.schoolName,
          graduationYear: e.graduationYear,
        }));
      }
    }
  } catch (err) {
    errorMsg.value = err?.data?.statusMessage || "Gagal memuat detail pegawai.";
  }
};

const handleSubmit = async () => {
  submitting.value = true;
  errorMsg.value = "";
  successMsg.value = "";

  try {
    const payload = {
      nip: form.nip,
      name: form.name,
      email: form.email,
      phone: form.phone,
      photoPath: form.photoPath,
      birthPlace: form.birthPlace,
      birthDate: form.birthDate,
      maritalStatus: form.maritalStatus,
      childrenCount: form.childrenCount,
      joinedAt: form.joinedAt,
      positionId: form.positionId,
      departmentId: form.departmentId,
      employmentType: form.employmentType,
      gender: form.gender,
      districtId: form.districtId || null,
      fullAddress: form.fullAddress,
      distanceKm: form.distanceKm,
      status: form.status,
      educations: form.educations,
    };

    if (isEditMode.value) {
      await $fetch(`/api/employees/${employeeId.value}`, {
        method: "PUT",
        body: payload,
      });
      successMsg.value = "Data pegawai berhasil diperbarui!";
    } else {
      await $fetch("/api/employees", {
        method: "POST",
        body: payload,
      });
      successMsg.value = "Data pegawai baru berhasil ditambahkan!";
    }

    setTimeout(() => {
      router.push("/pegawai");
    }, 1200);
  } catch (err) {
    errorMsg.value = err?.data?.statusMessage || "Terjadi kesalahan saat menyimpan data.";
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  await loadMaster();
  if (isEditMode.value) {
    await loadDetail();
  }
});
</script>

<style scoped>
.foto-ptofil {
  width: 100px;
  height: 100px;
  border-radius: 50%;
}
.object-cover {
  object-fit: cover;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
