// Strip a leading UTF-8 BOM (U+FEFF) and any surrounding whitespace from an env
// value. Some tooling (e.g. `vercel env add` piped on Windows PowerShell)
// prepends a BOM to the stored value, which silently corrupts URLs/keys.
// Built from the code point so this source file stays pure ASCII.
const BOM = new RegExp(String.fromCharCode(0xfeff), "g");

export const cleanEnv = (v: string | undefined | null): string =>
  (v ?? "").replace(BOM, "").trim();
