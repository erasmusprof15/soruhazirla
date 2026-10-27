/**
 * Soru kağıdı ve rubriklerde yer alan sayfa atıflarını, kaynak ve kitap sayfası referanslarını temizler.
 */
export function cleanPageReferences(text?: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 1. "Sayfa X'teki metne/grafiğe/tabloya göre" kalıplarını düzelt
  cleaned = cleaned.replace(/(?:ders\s+kitab[ıi]n[ıi]n\s+)?\d+\.\s*sayfas[ıi]ndaki\s+met(?:in|n)e\s+göre/gi, 'Yukarıdaki metne göre');
  cleaned = cleaned.replace(/(?:ders\s+kitab[ıi]n[ıi]n\s+)?\d+\.\s*sayfas[ıi]ndan\s+hareketle/gi, 'Yukarıdaki metinden hareketle');
  cleaned = cleaned.replace(/sayfa\s+\d+['’]?[td][ea]ki\s+met(?:in|n)e\s+göre/gi, 'Yukarıdaki metne göre');
  cleaned = cleaned.replace(/sayfa\s+\d+['’]?[td][ea]n\s+hareketle/gi, 'Yukarıdaki metinden hareketle');

  cleaned = cleaned.replace(/(?:ders\s+kitab[ıi]n[ıi]n\s+)?\d+\.\s*sayfas[ıi]ndaki\s+grafiğe\s+göre/gi, 'Grafiğe göre');
  cleaned = cleaned.replace(/sayfa\s+\d+['’]?[td][ea]ki\s+grafiğe\s+göre/gi, 'Grafiğe göre');
  cleaned = cleaned.replace(/(?:ders\s+kitab[ıi]n[ıi]n\s+)?\d+\.\s*sayfas[ıi]ndaki\s+tabloya\s+göre/gi, 'Tabloya göre');
  cleaned = cleaned.replace(/sayfa\s+\d+['’]?[td][ea]ki\s+tabloya\s+göre/gi, 'Tabloya göre');
  cleaned = cleaned.replace(/(?:ders\s+kitab[ıi]n[ıi]n\s+)?\d+\.\s*sayfas[ıi]ndaki\s+şekle\s+göre/gi, 'Şekle göre');
  cleaned = cleaned.replace(/sayfa\s+\d+['’]?[td][ea]ki\s+şekle\s+göre/gi, 'Şekle göre');

  // 2. Parantez veya köşeli parantez içinde yer alan sayfa atıfları:
  // Örn: (Sayfa 24), (Ders Kitabı, Sayfa 24), (Kaynak: Sayfa 15), (sf. 45), (s. 28), [Sayfa 12-14], (Bkz. Sayfa 10), (Sayfa: 45), (Sayfa No: 45)
  cleaned = cleaned.replace(
    /\s*[\(\[]\s*(?:bkz\.?|kaynak\s*:?|al[ıi]nt[ıi]\s*:?)?\s*(?:meb\s+)?(?:[\wğüşıöçĞÜŞİÖÇ\s]+)?(?:ders\s+kitab[ıi]\s*,?\s*|kitap\s*,?\s*)?(?:sayfa\s*(?:no)?|sf\.?|s\.)\s*:?\s*\d+(?:\s*(?:-|–|—|\/|ila|ile)\s*\d+)?\s*[\)\]]/gi,
    ''
  );

  // Örn: (15. sayfa), (15-18. sayfalar), (15. Sayfa)
  cleaned = cleaned.replace(
    /\s*[\(\[]\s*\d+(?:\s*(?:-|–|—|\/|ila|ile)\s*\d+)?\s*['\.]?\s*sayfa(?:lar[ıi]?)?\s*[\)\]]/gi,
    ''
  );

  // 3. Satır başı veya sonu kaynak / sayfa satırları:
  // Örn: "Kaynak: Sayfa 24", "Kaynak: MEB Biyoloji 9, Sayfa 35", "Kaynak: sf. 12"
  cleaned = cleaned.replace(
    /(?:^|\n)\s*(?:kaynak|al[ıi]nt[ıi]|referans)\s*:\s*(?:meb\s+)?(?:[\wğüşıöçĞÜŞİÖÇ\s]+)?(?:ders\s+kitab[ıi]\s*,?\s*|kitap\s*,?\s*)?(?:sayfa\s*(?:no)?|sf\.?|s\.)\s*:?\s*\d+(?:\s*(?:-|–|—|\/|ila|ile)\s*\d+)?\.?\s*(?=$|\n)/gi,
    ''
  );

  // 4. Yıldızlı veya tireli sayfa atfı: "* Sayfa 15...", "* MEB Ders Kitabı Sayfa 40"
  cleaned = cleaned.replace(
    /(?:^|\n)\s*[\*\-]\s*(?:meb\s+)?(?:[\wğüşıöçĞÜŞİÖÇ\s]+)?(?:ders\s+kitab[ıi]\s*,?\s*|kitap\s*,?\s*)?(?:sayfa\s*(?:no)?|sf\.?|s\.)\s*:?\s*\d+[^\n]*/gi,
    ''
  );

  // 5. Boş kalmış parantezleri ve fazla boşlukları temizle
  cleaned = cleaned.replace(/\(\s*\)/g, '');
  cleaned = cleaned.replace(/\[\s*\]/g, '');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

  return cleaned.trim();
}
