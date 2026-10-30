/**
 * Soru kağıdı ve rubriklerde yer alan sayfa atıflarını, kaynak, kitap sayfası referanslarını
 * ve her soruda yer alan gereksiz konu başlıklarını temizler.
 * Öğrenci soru kağıdında ASLA ders materyali, sayfa numarası veya konu başlığı görünmez.
 */

// Soru metni veya bağlamında yer alan "Ders materyali sayfa 31'deki ... dayanmaktadır" gibi kalıpları eşleştiren regex
export const MATERIAL_REF_FULL_REGEX =
  /(?:^|\n|\.\s+)\s*(?:ders\s+materyali|kaynak\s+metin|ders\s+kitab[ıi]|materyal|kitap)?\s*(?:sayfa|sf\.?)\s+[\d\s,veileila'’\-–—]+(?:'?[td][ea]ki|[td][ea]ki|deki|daki)?\s*.*?(?:dayanmaktad[ıi]r|al[ıi]nm[ıi]şt[ıi]r|esas\s+al[ıi]nm[ıi]şt[ıi]r|haz[ıi]rlanm[ıi]şt[ıi]r|dayan[ıi]r|ilgilidir|konusundad[ıi]r)\.?\s*(?=$|\n|\.)/gi;

export const MATERIAL_REF_STANDALONE_REGEX =
  /(?:ders\s+materyali|kaynak\s+metin|ders\s+kitab[ıi]|materyal)\s+(?:sayfa|sf\.?)\s+.*?(?:dayanmaktad[ıi]r|al[ıi]nm[ıi]şt[ıi]r|esas\s+al[ıi]nm[ıi]şt[ıi]r|haz[ıi]rlanm[ıi]şt[ıi]r|dayan[ıi]r|ilgilidir)\.?/gi;

/**
 * Bir metnin gerçek bir okuma parçası/senaryo mu yoksa yapay zekânın ürettiği bir
 * konu başlığı (topic heading) mı olduğunu tespit eder.
 * Örn: "Ticaretin tarihsel gelişimi ve internetin globalleşmeye katkısı."
 * Örn: "E-ticaret operasyon planı."
 * Örn: "E-ticaret modelleri ve uygulama örnekleri."
 */
export function isTopicHeading(text?: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  // 1. Doğrudan etiketli başlıklar: "Konu: ...", "Başlık: ...", "Kazanım: ..."
  if (/^(?:konu|başlık|ünite|tema|bölüm|kazanım)\s*:/i.test(trimmed)) return true;

  // 2. Tırnak içine alınmış hikâye/metin ise (örn: '"Küçük çocuk kasabanın tozlu yolunda..."') ve uzunsa başlık DEĞİLDİR
  if ((trimmed.startsWith('"') || trimmed.startsWith('“') || trimmed.startsWith('\'')) && trimmed.length > 90) {
    return false;
  }

  // 3. 150 karakter veya daha kısa olan tüm tek satırlık başlık kalıpları
  if (trimmed.length <= 150 && !trimmed.includes('\n')) {
    // Soru işareti varsa soru köküdür, başlık değildir
    if (trimmed.includes('?')) return false;

    // Tipik Türkçe konu başlığı tamlama ekleri / son ekleri:
    // "katkısı", "avantajları", "planı", "önemi", "bileşenleri", "özellikleri", "modelleri", "örnekleri", "yapısı" vb.
    const headingSuffixRegex =
      /(?:katk[ıi]s[ıi]|avantajlar[ıi]|dezavantajlar[ıi]|önemi|plan[ıi]|bileşenleri|paketleri|modelleri|örnekleri|özellikleri|tan[ıi]m[ıi]|türleri|çeşitleri|aşamalar[ıi]|evreleri|ilkeleri|amac[ıi]|kapsam[ıi]|yap[ıi]s[ıi]|işlevi|faktörleri|gelişimi|ilişkisi|etkileri|tarihçesi|yöntemleri|prensipleri|kurallar[ıi]|sonuçlar[ıi]|nedenleri|boyutlar[ıi]|kavram[ıi]|yap[ıi]lanmas[ıi]|dağ[ıi]l[ıi]m[ıi]|araçlar[ıi]|uygulamalar[ıi]|süreçleri|yönetimi|analizi|sertifikas[ıi]|düzenlemeler|hukuku|altyap[ıi]s[ıi]|güvenliği)\.?$/i;

    if (headingSuffixRegex.test(trimmed)) {
      return true;
    }

    // 100 karakterden kısa ve birden fazla bağımsız cümle içermeyen metinler:
    // Örn: "E-ticaret operasyon planı.", "Ticaretin tarihsel gelişimi..."
    const sentenceSplit = trimmed.split(/[\.\!\?]\s+[A-ZÇĞİÖŞÜ]/);
    if (sentenceSplit.length <= 1 && trimmed.length < 110) {
      // Yüklemi olmayan isim tamlaması veya tek başlık
      const hasNarrativeVerb =
        /(?:açıklayınız|belirtiniz|yazınız|gösteriniz|çiziniz|hesaplayınız|demiştir|söyledi|anlattı|geçmektedir|yaşanmıştır|başlamıştır|gerçekleşmiştir)/i.test(
          trimmed
        );
      if (!hasNarrativeVerb) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Metinden ders materyali ve sayfa referanslarını temizler.
 */
export function cleanPageReferences(text?: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 0. "Ders materyali sayfa 31'deki ... başlığına dayanmaktadır" kalıplarını tamamen sil
  cleaned = cleaned.replace(MATERIAL_REF_FULL_REGEX, ' ');
  cleaned = cleaned.replace(MATERIAL_REF_STANDALONE_REGEX, ' ');

  // "Ders materyali sayfa ...", "Kaynak: Sayfa ...", "Ders kitabı sayfa ..." satırları
  cleaned = cleaned.replace(
    /(?:^|\n)\s*(?:ders\s+materyali|kaynak\s+metin|ders\s+kitab[ıi]|materyal)\s*:\s*[^\n]+/gi,
    ' '
  );

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
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Context veya questionText içindeki materyal referans cümlesini ve konu başlıklarını tespit edip çıkarır.
 * Bulunan referansı veya konu başlığını cevap anahtarında gösterilmek üzere materialRef olarak döndürür,
 * soru kağıdında gösterilecek context ve questionText'ten ise tamamen arındırır.
 */
export function extractAndCleanMaterialRef(
  rawContext?: string,
  rawQuestion?: string,
  existingRef?: string
): {
  context: string;
  questionText: string;
  materialRef?: string;
} {
  let detectedRef = existingRef ? existingRef.trim() : '';

  // 1. Context içinde referans var mı ara
  if (rawContext) {
    const match = rawContext.match(MATERIAL_REF_STANDALONE_REGEX);
    if (!detectedRef && match && match[0]) {
      detectedRef = match[0]
        .replace(/^(?:bu\s+soru\s+)?ders\s+materyali\s+/i, '')
        .replace(/\s*dayanmaktad[ıi]r\.?$/i, '')
        .replace(/\s*al[ıi]nm[ıi]şt[ıi]r\.?$/i, '')
        .replace(/\s*esas\s+al[ıi]nm[ıi]şt[ıi]r\.?$/i, '')
        .trim();
    } else if (!detectedRef && isTopicHeading(rawContext)) {
      // Eğer context bir konu başlığı ise (örn: "Ticaretin tarihsel gelişimi ve internetin globalleşmeye katkısı.")
      // bunu cevap anahtarı notu için al
      detectedRef = rawContext.replace(/\.$/, '').trim();
    }
  }

  // 2. QuestionText içinde referans var mı ara
  if (!detectedRef && rawQuestion) {
    const match = rawQuestion.match(MATERIAL_REF_STANDALONE_REGEX);
    if (match && match[0]) {
      detectedRef = match[0]
        .replace(/^(?:bu\s+soru\s+)?ders\s+materyali\s+/i, '')
        .replace(/\s*dayanmaktad[ıi]r\.?$/i, '')
        .replace(/\s*al[ıi]nm[ıi]şt[ıi]r\.?$/i, '')
        .replace(/\s*esas\s+al[ıi]nm[ıi]şt[ıi]r\.?$/i, '')
        .trim();
    }
  }

  // 3. Her iki metni de sayfa atıflarından tamamen arındır
  let cleanedContext = cleanPageReferences(rawContext);
  const cleanedQuestion = cleanPageReferences(rawQuestion);

  // KESİN KURAL: Eğer context bir konu başlığı ise soru kağıdında ASLA gösterilmez!
  if (isTopicHeading(cleanedContext)) {
    cleanedContext = '';
  }

  return {
    context: cleanedContext,
    questionText: cleanedQuestion,
    materialRef: detectedRef || undefined,
  };
}
