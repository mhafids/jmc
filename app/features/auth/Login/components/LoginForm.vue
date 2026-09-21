<template>
  <div>

    <div
      v-if="reasonMessage"
      class="alert alert-warning alert-dismissible mb-3 d-flex align-items-center gap-2"
      role="alert"
    >
      <IconAlertTriangle :size="20" class="text-warning" />
      <div class="small">{{ reasonMessage }}</div>
    </div>

    <div
      v-if="errorMessage"
      class="alert alert-danger alert-dismissible mb-3 d-flex align-items-center gap-2"
      role="alert"
    >
      <IconAlertCircle :size="20" class="text-danger" />
      <div class="small">{{ errorMessage }}</div>
    </div>

    <form @submit.prevent="handleSubmit">

      <div class="mb-3">
        <label class="form-label text-muted small fw-semibold">Identitas Pengguna</label>
        <div class="input-icon">
          <span class="input-icon-addon">
            <IconUser :size="18" class="text-muted" />
          </span>
          <input
            v-model="form.identifier"
            type="text"
            class="form-control py-2 ps-5 bg-light text-dark"
            placeholder="Username / Email / No. Handphone"
            name="identifier"
            required
            :disabled="loading"
            autocomplete="username"
          />
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label text-muted small fw-semibold">Kata Sandi</label>
        <div class="input-group input-group-flat">
          <span class="input-group-text bg-light border-end-0">
            <IconLock :size="18" class="text-muted" />
          </span>
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            class="form-control py-2 bg-light text-dark border-start-0 border-end-0"
            name="password"
            placeholder="Password"
            required
            :disabled="loading"
            autocomplete="current-password"
          />
          <button
            type="button"
            class="input-group-text bg-light border-start-0 cursor-pointer"
            @click="showPassword = !showPassword"
            tabindex="-1"
            title="Toggle Password"
          >
            <IconEye v-if="!showPassword" :size="18" class="text-muted" />
            <IconEyeOff v-else :size="18" class="text-primary" />
          </button>
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label text-muted small fw-semibold">Kode Keamanan (Captcha)</label>
        <div class="d-flex align-items-center gap-2 mb-2">

          <div
            class="border rounded d-flex align-items-center justify-content-center bg-white shadow-sm overflow-hidden"
            style="min-width: 160px; height: 48px;"
            v-html="captchaSvg || '<span class=\'text-muted small\'>Loading...</span>'"
          ></div>

          <button
            type="button"
            class="btn btn-outline-secondary d-flex align-items-center justify-content-center p-2"
            style="height: 48px; width: 48px;"
            @click="fetchCaptcha"
            :disabled="loadingCaptcha"
            title="Refresh Kode Captcha"
          >
            <IconRefresh :size="20" :class="{ 'spin-anim': loadingCaptcha }" />
          </button>
        </div>

        <input
          v-model="form.captchaCode"
          type="text"
          class="form-control py-2 text-uppercase fw-bold font-monospace bg-light"
          placeholder="Ketik kode captcha di atas"
          maxlength="6"
          required
          :disabled="loading"
          autocomplete="off"
        />
      </div>

      <div class="mb-3">
        <label class="form-check">
          <input
            v-model="form.rememberMe"
            type="checkbox"
            class="form-check-input"
            :disabled="loading"
          />
          <span class="form-check-label fw-semibold">Remember Me</span>
        </label>
        <div class="form-text text-muted small ms-4">
          Mencegah auto-logout saat tidak aktif selama 3 menit.
        </div>
      </div>

      <div class="d-grid mt-4">
        <button
          class="btn btn-primary text-uppercase shadow py-3 fw-bold"
          type="submit"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          {{ loading ? 'Memproses...' : 'Masuk' }}
        </button>
      </div>
    </form>

    <OtpVerificationModal
      v-model="showOtpModal"
      :masked-email="maskedEmail"
      :otp-session-token="otpSessionToken"
      :expires-in="otpExpiresIn"
      :cooldown-seconds="otpCooldownSeconds"
      @verified="onOtpVerified"
      @cancelled="onOtpCancelled"
    />
  </div>
</template>

<script setup>
import {
  IconUser,
  IconLock,
  IconEye,
  IconEyeOff,
  IconRefresh,
  IconAlertCircle,
  IconAlertTriangle,
} from '@tabler/icons-vue';
import OtpVerificationModal from './OtpVerificationModal.vue';

const route = useRoute();
const { login } = useAuth();

const form = reactive({
  identifier: '',
  password: '',
  captchaCode: '',
  rememberMe: false,
});

const showPassword = ref(false);
const loading = ref(false);
const loadingCaptcha = ref(false);
const errorMessage = ref('');
const reasonMessage = ref('');

const captchaSvg = ref('');
const captchaToken = ref('');

const showOtpModal = ref(false);
const maskedEmail = ref('');
const otpSessionToken = ref('');
const otpExpiresIn = ref(180);
const otpCooldownSeconds = ref(60);

const fetchCaptcha = async () => {
  loadingCaptcha.value = true;
  form.captchaCode = '';
  try {
    const res = await $fetch('/api/auth/captcha');
    if (res?.success) {
      captchaSvg.value = res.svg;
      captchaToken.value = res.token;
    }
  } catch (err) {
    console.error('Failed to load captcha:', err);
  } finally {
    loadingCaptcha.value = false;
  }
};

onMounted(() => {
  fetchCaptcha();

  if (route.query.reason === 'session_timeout') {
    reasonMessage.value = 'Sesi Anda telah berakhir karena tidak ada aktivitas selama 3 menit. Silakan login kembali.';
  } else if (route.query.reason === 'unauthenticated') {
    reasonMessage.value = 'Silakan login terlebih dahulu untuk mengakses halaman tersebut.';
  }
});

const handleSubmit = async () => {
  if (!form.identifier || !form.password || !form.captchaCode) {
    errorMessage.value = 'Silakan lengkapi seluruh field formulir beserta kode captcha.';
    return;
  }

  errorMessage.value = '';
  loading.value = true;

  try {
    console.log("test");

    const res = await login({
      identifier: form.identifier,
      password: form.password,
      captchaCode: form.captchaCode,
      captchaToken: captchaToken.value,
      rememberMe: form.rememberMe,
    });

    if (res?.mfaRequired) {
      maskedEmail.value = res.maskedEmail;
      otpSessionToken.value = res.otpSessionToken;
      otpExpiresIn.value = res.expiresIn;
      otpCooldownSeconds.value = res.cooldownSeconds;
      showOtpModal.value = true;
    }
  } catch (err) {
    console.error('Login submit error:', err);
    errorMessage.value = err.data?.statusMessage || err.message || 'Login gagal. Silakan periksa kembali data Anda.';
    fetchCaptcha();
  } finally {
    loading.value = false;
  }
};

const onOtpVerified = () => {
  if (import.meta.client) {
    window.location.href = '/';
  }
};

const onOtpCancelled = () => {
  fetchCaptcha();
};
</script>

<style scoped>
.spin-anim {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
