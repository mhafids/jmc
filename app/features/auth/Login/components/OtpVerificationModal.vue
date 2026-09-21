<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="modal modal-blur fade show d-block"
      tabindex="-1"
      role="dialog"
      style="background: rgba(0, 0, 0, 0.7); z-index: 9999;"
    >
      <div class="modal-dialog modal-md modal-dialog-centered" role="document">
      <div class="modal-content shadow-lg border-primary">
        <div class="modal-status bg-primary"></div>

        <div class="modal-header">
          <h5 class="modal-title d-flex align-items-center gap-2 text-primary fw-bold">
            <IconShieldCheck :size="22" />
            Verifikasi Keamanan (MFA OTP)
          </h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="closeModal"
            :disabled="loading"
          ></button>
        </div>

        <div class="modal-body py-4">
          <p class="text-secondary text-center mb-1">
            Kode verifikasi 4-digit telah dikirimkan ke alamat email resmi Anda:
          </p>
          <div class="text-center fw-bold text-primary mb-4 fs-4 font-monospace">
            {{ maskedEmail }}
          </div>

          <div v-if="errorMessage" class="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3">
            <IconAlertCircle :size="18" />
            <div>{{ errorMessage }}</div>
          </div>

          <div class="d-flex justify-content-center gap-3 mb-4">
            <input
              v-for="(digit, index) in digits"
              :key="index"
              :id="`otp-input-${index}`"
              ref="otpInputs"
              type="text"
              inputmode="numeric"
              maxlength="1"
              v-model="digits[index]"
              class="form-control text-center fs-1 fw-bold font-monospace shadow-sm"
              :class="{
                'is-invalid': errorMessage,
                'border-primary': digits[index],
              }"
              style="width: 60px; height: 68px; font-size: 1.75rem;"
              @input="onDigitInput(index, $event)"
              @keydown="onDigitKeydown(index, $event)"
              @paste="onDigitPaste($event)"
              @focus="$event.target.select()"
              @click="$event.target.select()"
              :disabled="loading || isExpired"
              autocomplete="off"
            />
          </div>

          <div class="text-center mb-3">
            <span class="text-muted small">Waktu Berlaku Kode:</span>
            <div
              class="fw-bold fs-3 font-monospace mt-1"
              :class="remainingSeconds <= 30 ? 'text-danger' : 'text-primary'"
            >
              ⏱️ {{ formattedTime }}
            </div>
            <div v-if="isExpired" class="text-danger small mt-1">
              Kode OTP kedaluwarsa. Silakan klik tombol kirim ulang di bawah.
            </div>
          </div>

          <div class="text-center pt-2 border-top">
            <span class="text-muted small d-block mb-2">Tidak menerima email?</span>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              :disabled="cooldownSeconds > 0 || loading"
              @click="handleResendOtp"
            >
              <IconRefresh :size="16" class="me-1" :class="{ 'spin-anim': loadingResend }" />
              {{
                cooldownSeconds > 0
                  ? `Kirim Ulang OTP (${cooldownSeconds}s)`
                  : 'Kirim Ulang Kode OTP'
              }}
            </button>
          </div>
        </div>

        <div class="modal-footer d-flex justify-content-between">
          <button
            type="button"
            class="btn btn-link text-muted"
            @click="closeModal"
            :disabled="loading"
          >
            Batal
          </button>
          <button
            type="button"
            class="btn btn-primary px-4 py-2 fw-bold"
            :disabled="!isComplete || loading || isExpired"
            @click="submitOtp"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            Verifikasi & Masuk
          </button>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup>
import {
  IconShieldCheck,
  IconAlertCircle,
  IconRefresh,
} from '@tabler/icons-vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  maskedEmail: {
    type: String,
    default: '',
  },
  otpSessionToken: {
    type: String,
    default: '',
  },
  expiresIn: {
    type: Number,
    default: 180,
  },
  cooldownSeconds: {
    type: Number,
    default: 60,
  },
});

const emit = defineEmits(['update:modelValue', 'verified', 'cancelled']);

const { verifyOtp, resendOtp } = useAuth();
const router = useRouter();

const digits = ref(['', '', '', '']);
const otpInputs = ref([]);
const loading = ref(false);
const loadingResend = ref(false);
const errorMessage = ref('');
const currentSessionToken = ref(props.otpSessionToken);

const remainingSeconds = ref(props.expiresIn);
const cooldownSeconds = ref(props.cooldownSeconds);

let timerInterval = null;
let cooldownInterval = null;

const isExpired = computed(() => remainingSeconds.value <= 0);
const isComplete = computed(() => digits.value.every((d) => d.length === 1));

const formattedTime = computed(() => {
  const m = Math.floor(Math.max(0, remainingSeconds.value) / 60);
  const s = Math.max(0, remainingSeconds.value) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

const startTimers = (ttl = props.expiresIn, cooldown = props.cooldownSeconds) => {
  clearInterval(timerInterval);
  clearInterval(cooldownInterval);

  remainingSeconds.value = ttl;
  cooldownSeconds.value = cooldown;

  timerInterval = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value -= 1;
    } else {
      clearInterval(timerInterval);
    }
  }, 1000);

  cooldownInterval = setInterval(() => {
    if (cooldownSeconds.value > 0) {
      cooldownSeconds.value -= 1;
    } else {
      clearInterval(cooldownInterval);
    }
  }, 1000);
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      digits.value = ['', '', '', ''];
      errorMessage.value = '';
      currentSessionToken.value = props.otpSessionToken;
      startTimers(props.expiresIn, props.cooldownSeconds);
      nextTick(() => {
        const firstInput = document.getElementById('otp-input-0');
        if (firstInput) firstInput.focus();
      });
    } else {
      clearInterval(timerInterval);
      clearInterval(cooldownInterval);
    }
  }
);

onUnmounted(() => {
  clearInterval(timerInterval);
  clearInterval(cooldownInterval);
});

const onDigitInput = (index, event) => {
  errorMessage.value = '';
  const val = event.target.value;
  const cleaned = val.replace(/\D/g, '');

  if (!cleaned) {
    digits.value[index] = '';
    return;
  }

  digits.value[index] = cleaned.slice(-1);

  if (digits.value[index] && index < 3) {
    nextTick(() => {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    });
  }

  if (isComplete.value) {
    submitOtp();
  }
};

const onDigitKeydown = (index, event) => {
  if (event.key === 'Backspace') {
    if (!digits.value[index] && index > 0) {
      event.preventDefault();
      digits.value[index - 1] = '';
      nextTick(() => {
        const prevInput = document.getElementById(`otp-input-${index - 1}`);
        if (prevInput) {
          prevInput.focus();
          prevInput.select();
        }
      });
    }
  } else if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault();
    const prevInput = document.getElementById(`otp-input-${index - 1}`);
    if (prevInput) {
      prevInput.focus();
      prevInput.select();
    }
  } else if (event.key === 'ArrowRight' && index < 3) {
    event.preventDefault();
    const nextInput = document.getElementById(`otp-input-${index + 1}`);
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  }
};

const onDigitPaste = (event) => {
  event.preventDefault();
  const paste = (event.clipboardData || window.clipboardData).getData('text').trim();
  const numbers = paste.replace(/\D/g, '').slice(0, 4);
  if (numbers.length > 0) {
    for (let i = 0; i < 4; i++) {
      digits.value[i] = numbers[i] || '';
    }
    const focusIdx = Math.min(numbers.length, 3);
    const targetInput = document.getElementById(`otp-input-${focusIdx}`);
    if (targetInput) targetInput.focus();

    if (isComplete.value) {
      submitOtp();
    }
  }
};

const submitOtp = async () => {
  if (!isComplete.value || loading.value || isExpired.value) return;

  loading.value = true;
  errorMessage.value = '';

  const fullOtp = digits.value.join('');

  try {
    const res = await verifyOtp({
      otpCode: fullOtp,
      otpSessionToken: currentSessionToken.value,
    });

    if (res?.success) {
      emit('verified', res);
      emit('update:modelValue', false);
      if (import.meta.client) {
        window.location.href = '/';
      } else {
        await navigateTo('/', { replace: true });
      }
    }
  } catch (err) {
    errorMessage.value = err.data?.statusMessage || 'Verifikasi OTP gagal.';

    digits.value = ['', '', '', ''];
    nextTick(() => {
      const firstInput = document.getElementById('otp-input-0');
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    });

    if (err.data?.statusCode === 403) {
      setTimeout(() => {
        closeModal();
      }, 2500);
    }
  } finally {
    loading.value = false;
  }
};

const handleResendOtp = async () => {
  if (cooldownSeconds.value > 0 || loadingResend.value) return;

  loadingResend.value = true;
  errorMessage.value = '';

  try {
    const res = await resendOtp(currentSessionToken.value);
    if (res?.success) {
      currentSessionToken.value = res.otpSessionToken;
      startTimers(res.expiresIn, res.cooldownSeconds);
      digits.value = ['', '', '', ''];
      const firstInput = document.getElementById('otp-input-0');
      if (firstInput) firstInput.focus();
    }
  } catch (err) {
    errorMessage.value = err.data?.statusMessage || 'Gagal mengirim ulang kode OTP.';
  } finally {
    loadingResend.value = false;
  }
};

const closeModal = () => {
  emit('update:modelValue', false);
  emit('cancelled');
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
