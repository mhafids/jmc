export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: "2024-11-01",

  devtools: { enabled: true },

  runtimeConfig: {
    authSecret: process.env.AUTH_SECRET || "jmc-secret-jwt-key-development-minimum-32-characters",
    captchaSecret: process.env.CAPTCHA_SECRET || "jmc-captcha-secret-key-development-32-chars",
    captchaTtlSeconds: Number(process.env.CAPTCHA_TTL_SECONDS || 300),
    captchaLength: Number(process.env.CAPTCHA_LENGTH || 5),
    rememberMeTtlSeconds: Number(process.env.AUTH_REMEMBER_ME_TTL_SECONDS || 86400),
    mailDriver: process.env.MAIL_DRIVER || "log",
    mailtrapToken: process.env.MAILTRAP_TOKEN || "",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: Number(process.env.SMTP_PORT || 2525),
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    smtpFrom: process.env.SMTP_FROM || "hello@demomailtrap.co",
    smtpFromName: process.env.SMTP_FROM_NAME || "Prototipe JMC Admin Security",

    public: {
      appName: process.env.APP_NAME || "NUXT TABLER ADMIN",
      appClient: process.env.APP_CLIENT || "Prototipe JMC Admin",
      appUrl: process.env.APP_URL || "http://localhost:3000",
      sessionIdleTimeoutSeconds: Number(process.env.AUTH_SESSION_IDLE_TIMEOUT_SECONDS || 180),
      sessionWarningSeconds: Number(process.env.AUTH_SESSION_WARNING_SECONDS || 30),
      otpTtlSeconds: Number(process.env.AUTH_OTP_TTL_SECONDS || 180),
      otpMaxAttempts: Number(process.env.AUTH_OTP_MAX_ATTEMPTS || 3),
      otpDigits: Number(process.env.AUTH_OTP_DIGITS || 4),
      otpResendCooldownSeconds: Number(process.env.AUTH_OTP_RESEND_COOLDOWN_SECONDS || 60),
    },
  },

  css: [
    "@tabler/core/dist/css/tabler.min.css",
    "~/assets/css/backend.css",
  ],

  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.png" }],
      script: [
        {
          src: "https://www.google.com/recaptcha/api.js",
          async: true,
          defer: true,
        },
      ],
    },
  },

  plugins: [
    "~/plugins/jquery.client.js",
    "~/plugins/tabler.client.js",
    "~/plugins/apexcharts.client.js",
  ],

  vite: {
    optimizeDeps: {
      include: ["apexcharts"],
    },
  },
});
