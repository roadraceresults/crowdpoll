export function maskIp(ip: string | undefined): string {
  if (!ip) return "unknown";
  const v4 = ip.replace(/^::ffff:/, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v4)) return `${v4.split(".").slice(0, 3).join(".")}.x`;
  return `${ip.split(":").slice(0, 3).join(":")}::x`;
}
