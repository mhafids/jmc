
export function calculateRoundedKm(originalKm, maxKm = 25.0) {
  const kmNum = Number(originalKm) || 0;
  if (kmNum <= 0) return 0;

  const effectiveKm = maxKm !== null && maxKm !== undefined && kmNum > Number(maxKm)
    ? Number(maxKm)
    : kmNum;

  const intPart = Math.floor(effectiveKm);
  const decimalPart = effectiveKm - intPart;

  const normalizedDecimal = Math.round(decimalPart * 1000) / 1000;

  if (normalizedDecimal >= 0.5) {
    return Math.ceil(effectiveKm);
  }
  return Math.floor(effectiveKm);
}

export function evaluateTransportAllowance({ employee, attendanceDays = 0, setting }) {
  const baseFare = Number(setting?.baseFare || 0);
  const minKm = Number(setting?.minKm !== undefined ? setting.minKm : 5.0);
  const maxKm = setting?.maxKm !== null && setting?.maxKm !== undefined ? Number(setting.maxKm) : 25.0;

  const originalKm = Number(employee?.distanceKm || 0);
  const hadir = Number(attendanceDays || 0);
  const employmentType = (employee?.employmentType || '').toLowerCase();

  const roundedKm = calculateRoundedKm(originalKm, maxKm);

  if (employmentType !== 'tetap') {
    return {
      isEligible: false,
      eligibilityStatus: 'not_eligible',
      originalKm,
      roundedKm,
      attendanceDays: hadir,
      baseFare,
      nominal: 0,
      calculationNote: 'Bukan pegawai tetap (Hanya pegawai tetap yang berhak)',
    };
  }

  if (hadir < 19) {
    return {
      isEligible: false,
      eligibilityStatus: 'not_eligible',
      originalKm,
      roundedKm,
      attendanceDays: hadir,
      baseFare,
      nominal: 0,
      calculationNote: `Hari masuk kerja (${hadir} hari) kurang dari batas minimal 19 hari kerja`,
    };
  }

  if (originalKm <= minKm) {
    return {
      isEligible: false,
      eligibilityStatus: 'not_eligible',
      originalKm,
      roundedKm,
      attendanceDays: hadir,
      baseFare,
      nominal: 0,
      calculationNote: `Jarak tempuh (${originalKm} km) kurang dari atau sama dengan batas minimal ${minKm} km`,
    };
  }

  const nominal = baseFare * roundedKm * hadir;

  let note = `Memenuhi syarat (Jarak: ${roundedKm} km, Hadir: ${hadir} hari)`;
  if (originalKm > maxKm) {
    note += ` [Jarak asli ${originalKm} km di-cap maksimal ${maxKm} km]`;
  }

  return {
    isEligible: true,
    eligibilityStatus: 'eligible',
    originalKm,
    roundedKm,
    attendanceDays: hadir,
    baseFare,
    nominal,
    calculationNote: note,
  };
}
