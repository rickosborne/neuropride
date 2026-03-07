export const randomId = (prefix: string = "np"): string => {
  return prefix.concat(BigInt(new Date().toISOString().replace(/\D+/g, "").replace(/^\d{6}/, "")).toString(36));
};
