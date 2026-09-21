<template>
  <div
    v-if="showWarningModal"
    class="modal modal-blur fade show d-block"
    tabindex="-1"
    role="dialog"
    style="background: rgba(0, 0, 0, 0.55); z-index: 1055;"
  >
    <div class="modal-dialog modal-sm modal-dialog-centered" role="document">
      <div class="modal-content shadow-lg border-warning">
        <div class="modal-status bg-warning"></div>
        <div class="modal-body text-center py-4">
          <div class="mb-3">
            <span class="avatar avatar-lg rounded-circle bg-warning-lt text-warning">
              <IconAlertTriangle :size="36" />
            </span>
          </div>

          <h3 class="fw-bold mb-2">Peringatan Inaktivitas</h3>
          <p class="text-secondary small mb-3">
            Anda tidak melakukan aktivitas beberapa saat. Sesi Anda akan berakhir otomatis dalam:
          </p>

          <div class="display-6 fw-bold text-danger mb-3 font-monospace">
            ⏱️ {{ formatSeconds(countdownSeconds) }}
          </div>

          <div class="text-muted small mb-4">
            Apakah Anda ingin tetap melanjutkan sesi bekerja Anda di sistem?
          </div>

          <div class="row g-2">
            <div class="col-6">
              <button
                type="button"
                class="btn btn-outline-danger w-100 py-2"
                @click="onLogoutNow"
              >
                Logout Sekarang
              </button>
            </div>
            <div class="col-6">
              <button
                type="button"
                class="btn btn-primary w-100 py-2 fw-semibold"
                @click="onExtendSession"
              >
                Lanjutkan Sesi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { IconAlertTriangle } from '@tabler/icons-vue';

const { showWarningModal, countdownSeconds, extendSession } = useSessionTimeout();
const { logout } = useAuth();

const formatSeconds = (sec) => {
  const s = Math.max(0, sec);
  return `${s} Detik`;
};

const onExtendSession = () => {
  extendSession();
};

const onLogoutNow = () => {
  logout('manual');
};
</script>
