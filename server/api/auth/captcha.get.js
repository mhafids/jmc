import { generateSvgCaptcha, signCaptchaToken } from '~~/server/utils/captcha.js';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const length = config.captchaLength || 5;
  const secret = config.captchaSecret;
  const ttlSeconds = config.captchaTtlSeconds || 300;

  const { text, svg } = generateSvgCaptcha({ length, width: 160, height: 48 });
  const token = signCaptchaToken(text, secret, ttlSeconds);

  return {
    success: true,
    svg,
    token,
    expiresIn: ttlSeconds,
  };
});
