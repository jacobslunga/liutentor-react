/**
 * PDFs often encode å/ä/ö as a base letter plus a separate diaeresis or ring
 * glyph, which copies as "a¨" or "¨a". Recombine them into single characters.
 */
export function normalizePdfText(text: string) {
  return text
    .replace(/(?:\u00A8|\u0308)([aAoO])/gu, "$1\u0308")
    .replace(/([aAoO])\u00A8/gu, "$1\u0308")
    .replace(/(?:\u02DA|\u030A)([aA])/gu, "$1\u030A")
    .replace(/([aA])\u02DA/gu, "$1\u030A")
    .normalize("NFC");
}
