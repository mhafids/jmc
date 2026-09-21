export const useAuth = () => {
  const user = useState('auth_user', () => null);
  const token = useState('auth_token', () => null);
  const isRememberMe = useState('auth_is_remember_me', () => false);
  const isAuthenticated = computed(() => Boolean(user.value));

  const fetchUser = async () => {
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : {};
      const res = await $fetch('/api/auth/me', { headers });
      if (res?.success && res.user) {
        user.value = res.user;
        isRememberMe.value = Boolean(res.isRememberMe);
        return res.user;
      }
    } catch (err) {
      user.value = null;
      token.value = null;
      isRememberMe.value = false;
      const tokenCookie = useCookie('auth_token');
      tokenCookie.value = null;
      return null;
    }
  };

  const login = async ({ identifier, password, captchaCode, captchaToken, rememberMe }) => {
    const res = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        identifier,
        password,
        captchaCode,
        captchaToken,
        rememberMe,
      },
    });
    return res;
  };

  const verifyOtp = async ({ otpCode, otpSessionToken }) => {
    const res = await $fetch('/api/auth/verify-otp', {
      method: 'POST',
      body: {
        otpCode,
        otpSessionToken,
      },
    });

    if (res?.success && res.user) {
      user.value = res.user;
      token.value = res.token;
      isRememberMe.value = Boolean(res.isRememberMe);
      const tokenCookie = useCookie('auth_token', {
        path: '/',
        sameSite: 'lax',
        maxAge: 86400,
      });
      tokenCookie.value = res.token;
    }
    return res;
  };

  const resendOtp = async (otpSessionToken) => {
    const res = await $fetch('/api/auth/resend-otp', {
      method: 'POST',
      body: {
        otpSessionToken,
      },
    });
    return res;
  };

  const logout = async (reason = '') => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
    } finally {
      user.value = null;
      token.value = null;
      isRememberMe.value = false;

      const router = useRouter();
      if (reason) {
        router.push(`/login?reason=${reason}`);
      } else {
        router.push('/login');
      }
    }
  };

  return {
    user,
    token,
    isRememberMe,
    isAuthenticated,
    fetchUser,
    login,
    verifyOtp,
    resendOtp,
    logout,
  };
};
