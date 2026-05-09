/** Parses env values like `15m`, `900s`, `1h` into seconds (for JWT `expiresIn` number option). */
export function jwtExpiresSecondsFromEnv(): number {
  const raw = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
  const m = /^(\d+)(s|m|h|d)$/i.exec(raw.trim());
  if (!m) {
    return 900;
  }
  const n = Number(m[1]);
  switch (m[2].toLowerCase()) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      return 900;
  }
}
