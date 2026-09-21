<template>
  <div v-if="loading" class="text-center py-5 text-muted">
    <div class="spinner-border spinner-border-sm me-2"></div> Memuat profil pegawai...
  </div>
  <div v-else-if="errorMessage" class="alert alert-danger">
    {{ errorMessage }}
  </div>
  <div v-else class="row g-3">
    <div class="col-lg-6">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Data Diri</h3>
        </div>
        <div class="card-body">
          <div class="row g-4">
            <div class="col-12">
              <div class="row align-items-center">

                <div class="col-auto">
                  <img
                    :src="pegawai.photoPath || '/images/pegawai/ahmad.jpg'"
                    alt="Foto Profil"
                    class="foto-ptofil object-cover"
                    onerror="this.src='/images/pegawai/ahmad.jpg'"
                  />
                </div>

                <div class="col">

                  <div class="datagrid-item mb-4">
                    <div class="datagrid-title">NIP</div>
                    <div class="datagrid-content font-monospace fw-bold">{{ pegawai.nip || '-' }}</div>
                  </div>

                  <div class="datagrid-item">
                    <div class="datagrid-title">Nama Lengkap</div>
                    <div class="datagrid-content fw-semibold">{{ pegawai.name || '-' }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="datagrid-item">
                <div class="datagrid-title">Email</div>
                <div class="datagrid-content">{{ pegawai.email || '-' }}</div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="datagrid-item">
                <div class="datagrid-title">Nomor HP</div>
                <div class="datagrid-content">{{ pegawai.phone || '-' }}</div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="datagrid-item">
                <div class="datagrid-title">Tempat Lahir</div>
                <div class="datagrid-content">{{ pegawai.birthPlace || '-' }}</div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="datagrid-item">
                <div class="datagrid-title">Tanggal Lahir</div>
                <div class="datagrid-content">{{ formatDateID(pegawai.birthDate) }}</div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="datagrid-item">
                <div class="datagrid-title">Usia</div>
                <div class="datagrid-content">{{ pegawai.age ? `${pegawai.age} tahun` : '-' }}</div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="datagrid-item">
                <div class="datagrid-title">Pendidikan</div>
                <div v-if="pegawai.educations && pegawai.educations.length > 0">
                  <div v-for="edu in pegawai.educations" :key="edu.id" class="datagrid-content mb-1">
                    <span class="badge bg-blue-lt me-1">{{ edu.educationLevel }}</span>
                    {{ edu.schoolName }} ({{ edu.graduationYear }})
                  </div>
                </div>
                <div v-else class="datagrid-content text-muted">-</div>
              </div>
            </div>

            <div class="col-12">
              <div class="datagrid-item">
                <div class="datagrid-title">Alamat Lengkap</div>
                <div class="datagrid-content">
                  {{ pegawai.fullAddress || '-' }}
                </div>
              </div>
            </div>

            <div class="col-md-4">
              <div class="datagrid-item">
                <div class="datagrid-title">Kecamatan</div>
                <div class="datagrid-content">{{ pegawai.districtName || '-' }}</div>
              </div>
            </div>

            <div class="col-md-4">
              <div class="datagrid-item">
                <div class="datagrid-title">Kabupaten</div>
                <div class="datagrid-content">{{ pegawai.regencyName || '-' }}</div>
              </div>
            </div>

            <div class="col-md-4">
              <div class="datagrid-item">
                <div class="datagrid-title">Provinsi</div>
                <div class="datagrid-content">{{ pegawai.provinceName || '-' }}</div>
              </div>
            </div>

            <div class="col-md-4">
              <div class="datagrid-item">
                <div class="datagrid-title">Jarak Rumah-Kantor</div>
                <div class="datagrid-content">{{ pegawai.distanceKm ? `${pegawai.distanceKm} km` : '0 km' }}</div>
              </div>
            </div>

            <div class="col-md-4">
              <div class="datagrid-item">
                <div class="datagrid-title">Status Pernikahan</div>
                <div class="datagrid-content">
                  {{ (pegawai.maritalStatus === 'married' || pegawai.maritalStatus === 'kawin') ? 'Menikah' : 'Belum Menikah' }}
                </div>
              </div>
            </div>

            <div class="col-md-4">
              <div class="datagrid-item">
                <div class="datagrid-title">Jumlah Anak</div>
                <div class="datagrid-content">{{ pegawai.childrenCount || 0 }}</div>
              </div>
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
              <div class="datagrid-item">
                <div class="datagrid-title">Tanggal Masuk</div>
                <div class="datagrid-content">{{ formatDateID(pegawai.joinedAt) }}</div>
              </div>
            </div>

            <div class="col-12">
              <div class="datagrid-item">
                <div class="datagrid-title">Masa Kerja</div>
                <div class="datagrid-content">
                  <span class="badge bg-green-lt fs-6">
                    {{ formatMasaKerja(pegawai.yearsOfService, pegawai.monthsOfService) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="datagrid-item">
                <div class="datagrid-title">Jabatan</div>
                <div class="datagrid-content">{{ pegawai.positionName || '-' }}</div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="datagrid-item">
                <div class="datagrid-title">Departemen</div>
                <div class="datagrid-content">{{ pegawai.departmentName || '-' }}</div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="datagrid-item">
                <div class="datagrid-title">Status Ikatan Kerja</div>
                <div class="datagrid-content text-uppercase">{{ pegawai.employmentType || '-' }}</div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="datagrid-item">
                <div class="datagrid-title">Status Keaktifan</div>
                <div class="datagrid-content">
                  <span v-if="pegawai.status === 'active'" class="badge bg-success text-white">Aktif</span>
                  <span v-else class="badge bg-danger text-white">Nonaktif</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="card-footer d-flex gap-2">
          <button class="btn btn-outline-secondary" @click="printPage">
            Cetak / Download PDF
          </button>
          <div class="ms-auto">
            <button class="btn btn-outline-primary" @click="goBack()">
              Kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  title: "Detail Pegawai",
});

useSeoMeta({
  title: "Detail Pegawai",
});

import { formatDateID } from "~/utils/formatDate.js";

const route = useRoute();
const { goBack } = useGoBack();

const identifier = computed(() => route.params.nipp || route.params.id);
const pegawai = ref({});
const loading = ref(true);
const errorMessage = ref("");

const formatMasaKerja = (years, months) => {
  const y = parseInt(years) || 0;
  const m = parseInt(months) || 0;
  if (y === 0 && m === 0) return "Kurang dari 1 bulan";
  if (y === 0) return `${m} Bulan`;
  if (m === 0) return `${y} Tahun`;
  return `${y} Tahun ${m} Bulan`;
};

const printPage = () => {
  window.print();
};

onMounted(async () => {
  try {
    const res = await $fetch(`/api/employees/${identifier.value}`);
    if (res?.success && res.data) {
      pegawai.value = res.data;
    }
  } catch (err) {
    errorMessage.value = err?.data?.statusMessage || "Gagal memuat data detail pegawai.";
  } finally {
    loading.value = false;
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
</style>
