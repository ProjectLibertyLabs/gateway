export function isHexString(str: string): boolean {
  const hexRegex = /^0[xX][0-9a-fA-F]+$/;
  return hexRegex.test(str);
}
