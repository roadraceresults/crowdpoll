export const TYPE_NAMES = ["polymarket yes no", "polymarket line graph", "cnn line graph", "politico line graph"];

export function typeNamed(value: string): string {
  const name = TYPE_NAMES.find((typeName) => typeName === value.trim().toLowerCase());
  if (name === undefined) throw new Error(`unsupported type ${JSON.stringify(value)}; supported: ${TYPE_NAMES.join(", ")}`);
  return name;
}

export function ownTypeError(value: string, command: string, own: string): string {
  return `type ${JSON.stringify(value)} is not supported by ${command}; it extracts "${own}"; use extract-all for other types`;
}

export function checkOwnType(value: string | undefined, command: string, own: string): void {
  if (value !== undefined && typeNamed(value) !== own) throw new Error(ownTypeError(value, command, own));
}
