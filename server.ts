import express from 'express';
import type { Request, Response } from 'express';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, _res, next) => {
  const fs = require('fs');
  fs.appendFileSync('/tmp/server_access.log', `[${new Date().toISOString()}] ${req.method} ${req.url} len=${req.headers['content-length']}\n`);
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Gemini API hata mesajlarını kullanıcı dostu ve yol gösterici Türkçe mesajlara dönüştürür
export function formatGeminiError(err: any): string {
  const errMsg = typeof err === 'string' ? err : err?.message || JSON.stringify(err) || '';
  
  if (
    errMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
    errMsg.includes('API key not valid') ||
    errMsg.includes('API_KEY_INVALID') ||
    errMsg.includes('UNAUTHENTICATED') ||
    err?.status === 401
  ) {
    return 'Gemini API anahtarı geçersiz veya yetkilendirilmemiş (401). Lütfen AI Studio panelindeki Settings > Secrets (Ayarlar > Gizli Anahtarlar) bölümünden geçerli bir Gemini API Anahtarı seçtiğinizden veya eklediğinizden emin olunuz.';
  }
  if (errMsg.includes('PERMISSION_DENIED') || err?.status === 403) {
    return 'Gemini API erişim izni reddedildi (403). Lütfen Settings > Secrets panelinden API anahtarınızın model erişim izinlerini kontrol ediniz.';
  }
  if (errMsg.includes('RESOURCE_EXHAUSTED') || err?.status === 429) {
    return 'Gemini API kullanım kotası aşıldı (429). Lütfen kısa bir süre sonra tekrar deneyiniz veya Settings > Secrets panelinden faturalandırması etkinleştirilmiş bir API anahtarı seçiniz.';
  }
  if (errMsg.includes('NOT_FOUND') || err?.status === 404) {
    return 'İstenen yapay zekâ modeli bulunamadı (404). Lütfen tekrar deneyiniz.';
  }
  return errMsg || 'Yapay zekâ yanıt verirken bir hata oluştu. Lütfen tekrar deneyiniz.';
}

// Hızlı ve güvenilir model çağrı yardımcısı (Desteklenen resmi Gemini modelleri)
async function callGeminiWithFallback(options: {
  contents: any[];
  config: any;
}) {
  const candidateConfigs: { model: string; thinkingConfig?: any }[] = [
    {
      model: 'gemini-3.8-flash',
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
    {
      model: 'gemini-flash-latest',
    },
    {
      model: 'gemini-3.1-flash-lite',
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  ];
  let lastErr: any = null;

  const ai = getGenAI();

  for (const candidate of candidateConfigs) {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    try {
      console.log(`[Gemini Engine] ${candidate.model} ile istek başlatılıyor...`);
      const t0 = Date.now();

      const mergedConfig = {
        ...options.config,
        ...(candidate.thinkingConfig ? { thinkingConfig: candidate.thinkingConfig } : {}),
      };

      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timerId = setTimeout(() => {
          reject(new Error(`${candidate.model} 40 saniye içinde yanıt vermedi (model zaman aşımı).`));
        }, 40000);
      });

      const res = await Promise.race([
        ai.models.generateContent({
          model: candidate.model,
          contents: options.contents,
          config: mergedConfig,
        }),
        timeoutPromise,
      ]);

      if (timerId) clearTimeout(timerId);
      console.log(`[Gemini Engine] ${candidate.model} başarılı (${Date.now() - t0} ms)`);
      return res;
    } catch (err: any) {
      if (timerId) clearTimeout(timerId);
      console.warn(`[Gemini Engine] ${candidate.model} başarısız oldu (${err.message || err}), yedek model deneniyor...`);
      lastErr = err;
    }
  }

  throw lastErr;
}

// PDF Metin ve Sayfa Ayıklama Fonksiyonu (pdf-parse v2)
async function extractPdfData(pdfBuffer: Buffer): Promise<{
  text: string;
  pages: number;
  pageList: { num: number; text: string }[];
}> {
  try {
    const { PDFParse } = pdfParse;
    if (PDFParse) {
      const parser = new PDFParse({ data: pdfBuffer, verbosity: 0 });
      const result = await parser.getText();
      const pageList: { num: number; text: string }[] = [];
      let fullTextWithMarkers = '';

      if (result && Array.isArray(result.pages) && result.pages.length > 0) {
        for (const p of result.pages) {
          const num = Number(p.num) || (pageList.length + 1);
          const pText = (p.text || '').trim();
          pageList.push({ num, text: pText });
          if (pText) {
            fullTextWithMarkers += `\n\n=== [SAYFA ${num}] ===\n${pText}`;
          }
        }
      } else if (result?.text) {
        fullTextWithMarkers = result.text;
      }

      const total = result?.total || pageList.length || 1;
      return {
        text: fullTextWithMarkers.trim(),
        pages: total,
        pageList,
      };
    }
  } catch (err: any) {
    console.warn('[PDF Extract] Hata:', err.message || err);
  }
  return { text: '', pages: 0, pageList: [] };
}

// Soru kağıdı ve rubriklerde yer alan sayfa atıflarını, kaynak ve kitap sayfası referanslarını temizler
const MATERIAL_REF_FULL_REGEX =
  /(?:^|\n|\.\s+)\s*(?:ders\s+materyali|kaynak\s+metin|ders\s+kitab[ıi]|materyal|kitap)?\s*(?:sayfa|sf\.?)\s+[\d\s,veileila'’\-–—]+(?:'?[td][ea]ki|[td][ea]ki|deki|daki)?\s*.*?(?:dayanmaktad[ıi]r|al[ıi]nm[ıi]şt[ıi]r|esas\s+al[ıi]nm[ıi]şt[ıi]r|haz[ıi]rlanm[ıi]şt[ıi]r|dayan[ıi]r|ilgilidir|konusundad[ıi]r)\.?\s*(?=$|\n|\.)/gi;

const MATERIAL_REF_STANDALONE_REGEX =
  /(?:ders\s+materyali|kaynak\s+metin|ders\s+kitab[ıi]|materyal)\s+(?:sayfa|sf\.?)\s+.*?(?:dayanmaktad[ıi]r|al[ıi]nm[ıi]şt[ıi]r|esas\s+al[ıi]nm[ıi]şt[ıi]r|haz[ıi]rlanm[ıi]şt[ıi]r|dayan[ıi]r|ilgilidir)\.?/gi;

function cleanPageReferences(text?: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 0. "Ders materyali sayfa 31'deki ... dayanmaktadır" gibi kalıpları soru kağıdından tamamen temizle
  cleaned = cleaned.replace(MATERIAL_REF_FULL_REGEX, ' ');
  cleaned = cleaned.replace(MATERIAL_REF_STANDALONE_REGEX, ' ');
  cleaned = cleaned.replace(/(?:^|\n)\s*(?:ders\s+materyali|kaynak\s+metin|ders\s+kitab[ıi]|materyal)\s*:\s*[^\n]+/gi, ' ');

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
  cleaned = cleaned.replace(
    /\s*[\(\[]\s*(?:bkz\.?|kaynak\s*:?|al[ıi]nt[ıi]\s*:?)?\s*(?:meb\s+)?(?:[\wğüşıöçĞÜŞİÖÇ\s]+)?(?:ders\s+kitab[ıi]\s*,?\s*|kitap\s*,?\s*)?(?:sayfa\s*(?:no)?|sf\.?|s\.)\s*:?\s*\d+(?:\s*(?:-|–|—|\/|ila|ile)\s*\d+)?\s*[\)\]]/gi,
    ''
  );
  cleaned = cleaned.replace(
    /\s*[\(\[]\s*\d+(?:\s*(?:-|–|—|\/|ila|ile)\s*\d+)?\s*['\.]?\s*sayfa(?:lar[ıi]?)?\s*[\)\]]/gi,
    ''
  );

  // 3. Satır başı veya sonu kaynak / sayfa satırları:
  cleaned = cleaned.replace(
    /(?:^|\n)\s*(?:kaynak|al[ıi]nt[ıi]|referans)\s*:\s*(?:meb\s+)?(?:[\wğüşıöçĞÜŞİÖÇ\s]+)?(?:ders\s+kitab[ıi]\s*,?\s*|kitap\s*,?\s*)?(?:sayfa\s*(?:no)?|sf\.?|s\.)\s*:?\s*\d+(?:\s*(?:-|–|—|\/|ila|ile)\s*\d+)?\.?\s*(?=$|\n)/gi,
    ''
  );

  // 4. Yıldızlı veya tireli sayfa atfı
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

// Bir metnin konu başlığı olup olmadığını belirler
function isTopicHeading(text?: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  // 1. Doğrudan etiketli başlıklar: "Konu: ...", "Başlık: ...", "Kazanım: ..."
  if (/^(?:konu|başlık|ünite|tema|bölüm|kazanım)\s*:/i.test(trimmed)) return true;

  // 2. Tırnak içine alınmış hikâye/metin ise (örn: '"Küçük çocuk kasabanın tozlu yolunda..."') ve uzunsa başlık değildir
  if ((trimmed.startsWith('"') || trimmed.startsWith('“') || trimmed.startsWith('\'')) && trimmed.length > 90) {
    return false;
  }

  // 3. 150 karakter veya daha kısa olan tüm tek satırlık başlık kalıpları
  if (trimmed.length <= 150 && !trimmed.includes('\n')) {
    if (trimmed.includes('?')) return false;

    const headingSuffixRegex =
      /(?:katk[ıi]s[ıi]|avantajlar[ıi]|dezavantajlar[ıi]|önemi|plan[ıi]|bileşenleri|paketleri|modelleri|örnekleri|özellikleri|tan[ıi]m[ıi]|türleri|çeşitleri|aşamalar[ıi]|evreleri|ilkeleri|amac[ıi]|kapsam[ıi]|yap[ıi]s[ıi]|işlevi|faktörleri|gelişimi|ilişkisi|etkileri|tarihçesi|yöntemleri|prensipleri|kurallar[ıi]|sonuçlar[ıi]|nedenleri|boyutlar[ıi]|kavram[ıi]|yap[ıi]lanmas[ıi]|dağ[ıi]l[ıi]m[ıi]|araçlar[ıi]|uygulamalar[ıi]|süreçleri|yönetimi|analizi|sertifikas[ıi]|düzenlemeler|hukuku|altyap[ıi]s[ıi]|güvenliği)\.?$/i;

    if (headingSuffixRegex.test(trimmed)) {
      return true;
    }

    const sentenceSplit = trimmed.split(/[\.\!\?]\s+[A-ZÇĞİÖŞÜ]/);
    if (sentenceSplit.length <= 1 && trimmed.length < 110) {
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

function extractAndCleanMaterialRef(
  rawContext?: string,
  rawQuestion?: string,
  existingRef?: string
): {
  context: string;
  questionText: string;
  materialRef?: string;
} {
  let detectedRef = existingRef ? existingRef.trim() : '';

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
      detectedRef = rawContext.replace(/\.$/, '').trim();
    }
  }

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

// Öğretmenin özel notundan veya sayfa aralığı kutularından istenen sayfa aralığını tespit eden akıllı fonksiyon
function detectRequestedPages(
  prompt: string,
  totalPages?: number,
  explicitStart?: string | number,
  explicitEnd?: string | number
): number[] | null {
  const collectedPages = new Set<number>();

  // 0. Doğrudan Başlangıç / Bitiş Sayfası kutularından gelen değerler
  const expStartNum = explicitStart !== undefined && explicitStart !== '' ? parseInt(String(explicitStart), 10) : NaN;
  const expEndNum = explicitEnd !== undefined && explicitEnd !== '' ? parseInt(String(explicitEnd), 10) : NaN;

  if (!isNaN(expStartNum) && !isNaN(expEndNum) && expStartNum > 0 && expEndNum >= expStartNum) {
    const capEnd = totalPages && totalPages > 1 ? Math.min(expEndNum, totalPages) : expEndNum;
    for (let i = expStartNum; i <= capEnd; i++) collectedPages.add(i);
  } else if (!isNaN(expStartNum) && expStartNum > 0) {
    const capEnd = totalPages && totalPages >= expStartNum ? totalPages : expStartNum;
    for (let i = expStartNum; i <= capEnd; i++) collectedPages.add(i);
  } else if (!isNaN(expEndNum) && expEndNum > 0) {
    for (let i = 1; i <= expEndNum; i++) collectedPages.add(i);
  }

  if (prompt && typeof prompt === 'string') {
    const p = prompt.toLowerCase();

    const addRange = (sRaw: string, eRaw: string) => {
      const start = parseInt(sRaw, 10);
      const end = parseInt(eRaw, 10);
      if (start > 0 && end >= start && end - start <= 500) {
        for (let i = start; i <= end; i++) collectedPages.add(i);
      }
    };

    // Pattern 1: "sayfa 10-25", "sayfa 10 ile 25", "sayfa 10'dan 25'e", "s. 10-25", "sf. 10-25", "syf 10-25"
    const regex1 = /(?:sayfa(?:lar[ıi]?)?|syf\.?|sf\.?|s\.)\s*[:\.]?\s*(\d+)\s*(?:['’]?[td][ae]n|['’]?\.?\s*sayfa(?:dan|den)?)?\s*(?:-|–|—|\/|ila|ile|ve|\s+)\s*(?:sayfa\s*)?(\d+)/gi;
    for (const m of p.matchAll(regex1)) {
      addRange(m[1], m[2]);
    }

    // Pattern 2: "10-25. sayfalar", "10 ile 25. sayfalar", "10 - 25 sayfalar", "10. sayfa ile 25. sayfa"
    const regex2 = /(\d+)\s*(?:['’\.]?\s*sayfa(?:dan|den|lar[ıi]?)?)?\s*(?:-|–|—|\/|ila|ile)\s*(\d+)\s*['’\.]?\s*sayfa/gi;
    for (const m of p.matchAll(regex2)) {
      addRange(m[1], m[2]);
    }

    // Pattern 3: "10'dan 25'e kadar", "10 dan 25 e kadar", "10-25 arası", "10 ile 25 arası"
    const regex3 = /(\d+)\s*(?:['’]?[td][ae]n|\s*-\s*|\s*–\s*|\s+ile\s+|\s+ila\s+)\s*(\d+)\s*(?:['’]?[ey][ea]\s*kadar|['’\.]?\s*aras[ıi])/gi;
    for (const m of p.matchAll(regex3)) {
      addRange(m[1], m[2]);
    }

    // Eğer aralık bulunmadıysa tekil veya virgüllü sayfa listesi: "sayfa 12, 15 ve 18" veya "14. sayfa"
    if (collectedPages.size === 0) {
      const listMatch1 = p.match(/(?:sayfa(?:lar[ıi]?)?|syf\.?|sf\.?|s\.)\s*[:\s]?\s*([0-9\s,\.ve]+)/i);
      if (listMatch1) {
        const rawNums = listMatch1[1].match(/\d+/g);
        if (rawNums) {
          rawNums.forEach((n) => {
            const val = parseInt(n, 10);
            if (val > 0) collectedPages.add(val);
          });
        }
      }
      const listMatch2 = p.match(/(\d+)\s*['’\.]\s*sayfa(?:da|dan|deki|daki)?/gi);
      if (listMatch2 && collectedPages.size === 0) {
        listMatch2.forEach((part) => {
          const numMatch = part.match(/\d+/);
          if (numMatch) {
            const val = parseInt(numMatch[0], 10);
            if (val > 0) collectedPages.add(val);
          }
        });
      }
    }
  }

  if (collectedPages.size === 0) return null;
  return Array.from(collectedPages).sort((a, b) => a - b);
}

// Seçilen sayfaları (veya dokümanın tüm sayfalarını) soru sayısına göre homojen (eşit) gruplara ayıran yardımcı fonksiyon
function buildHomogeneousQuestionBuckets(
  pages: { num: number; text: string }[],
  questionCount: number
): {
  scheduleSummary: string;
  bucketedText: string;
} {
  const N = Math.max(1, questionCount);
  const M = pages.length;
  if (M === 0) {
    return { scheduleSummary: '', bucketedText: '' };
  }

  // Her soruya düşecek ideal karakter bütçesi (toplam ~28.000 karakter: hem tüm sayfaları kapsar hem de 4-8 saniyede hızlı yanıt üretir)
  const perQuestionCharBudget = Math.min(4500, Math.max(2000, Math.floor(28000 / N)));
  const scheduleLines: string[] = [];
  const bucketBlocks: string[] = [];

  for (let qIdx = 0; qIdx < N; qIdx++) {
    const qNum = qIdx + 1;
    let assignedPages: { num: number; text: string }[] = [];

    if (M >= N) {
      const startIdx = Math.floor((qIdx * M) / N);
      const endIdx = Math.max(startIdx, Math.floor(((qIdx + 1) * M) / N) - 1);
      assignedPages = pages.slice(startIdx, endIdx + 1);
    } else {
      const pageIdx = Math.min(M - 1, Math.floor((qIdx * M) / N));
      assignedPages = [pages[pageIdx]];
    }

    const pageNumsLabel =
      assignedPages.length > 4
        ? `${assignedPages[0].num} - ${assignedPages[assignedPages.length - 1].num} (Sayfa ${assignedPages.map((p) => p.num).join(', ')})`
        : assignedPages.map((p) => p.num).join(', ');

    scheduleLines.push(
      `- ${qNum}. SORU -> ZORUNLU OLARAK Sayfa ${pageNumsLabel} içerisindeki konu, kavram ve metinlerden (diğer sorularla aynı konuyu tekrar etmeden) hazırlanacaktır.`
    );

    // Eğer bir soruya 6'dan fazla sayfa düştüyse, o aralıktan eşit aralıklı 6 temsili sayfa seçerek metin boyutunu optimize et
    let sampledPages = assignedPages;
    if (assignedPages.length > 6) {
      sampledPages = [];
      for (let s = 0; s < 6; s++) {
        const idx = Math.min(
          assignedPages.length - 1,
          Math.floor((s * assignedPages.length) / 6)
        );
        sampledPages.push(assignedPages[idx]);
      }
    }

    const perPageLimit = Math.max(600, Math.floor(perQuestionCharBudget / Math.max(1, sampledPages.length)));
    const combinedPageText = sampledPages
      .map((p) => (p.text ? `[SAYFA ${p.num} İÇERİĞİ]:\n${p.text.slice(0, perPageLimit)}` : `[SAYFA ${p.num}]`))
      .join('\n\n');

    bucketBlocks.push(
      `==================== [${qNum}. SORU İÇİN ZORUNLU KAYNAK BÖLÜMÜ (SAYFA ${pageNumsLabel})] ====================\n` +
        `DİKKAT: Sınavın ${qNum}. sorusunu İSTİSNASIZ aşağıdaki Sayfa ${pageNumsLabel} metninden ve konusundan üret.\n` +
        `KESİNLİKLE soru metnine (questionText) veya bağlama (context) 'Ders materyali sayfa...' yazma; soruyu doğrudan doğal sınav sorusu olarak sor.\n` +
        `Sayfa/bölüm bilgisini yalnızca cevap anahtarı için 'materialRef' alanına (örn: "Sayfa ${pageNumsLabel}") yaz:\n\n` +
        `${combinedPageText}\n` +
        `====================================================================================================`
    );
  }

  return {
    scheduleSummary: scheduleLines.join('\n'),
    bucketedText: bucketBlocks.join('\n\n'),
  };
}

// PDF Metin Ayıklama Endpoint'i
app.post('/api/extract-pdf', async (req: Request, res: Response) => {
  try {
    const { pdfBase64, fileName } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ success: false, error: 'PDF verisi bulunamadı.' });
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const pdfBuffer = Buffer.from(cleanBase64, 'base64');
    const extracted = await extractPdfData(pdfBuffer);

    const text = extracted.text;
    const pages = extracted.pages || 1;

    console.log(`[PDF Extractor] ${fileName || 'Belge'}: ${pages} sayfa, ${text.length} karakter çıkarıldı.`);

    return res.json({
      success: true,
      // Tüm sayfaların (örn. 1-250. sayfalar) eksiksiz korunması için 50.000 karakter sınırı kaldırıldı
      text: text.slice(0, 1500000),
      charCount: text.length,
      pages,
      pageList: extracted.pageList.map(p => ({ num: p.num, length: p.text.length })),
    });
  } catch (err: any) {
    console.error('PDF metin çıkarma hatası:', err);
    return res.status(500).json({
      success: false,
      error: 'PDF metni okunamadı: ' + (err.message || 'Bilinmeyen hata'),
    });
  }
});

// Soru oluşturma endpoint'i
app.post('/api/generate-exam', async (req: Request, res: Response) => {
  try {
    const { header, config, material } = req.body;

    const schoolName = header?.schoolName?.trim() || '';
    const course = header?.course?.trim() || '';
    const grade = header?.grade || '9. Sınıf';
    const academicYear = header?.academicYear || '2024-2025 Eğitim-Öğretim Yılı';
    const termAndExam = header?.termAndExam || '1. Dönem 1. Ortak Yazılı Sınavı';
    const duration = header?.duration || '40 Dakika';
    const teacherName = header?.teacherName || '';
    const teacherBranch = header?.teacherBranch || '';

    const questionCount = Number(config?.questionCount) || 6;
    const totalPoints = Number(config?.totalPoints) || 100;
    const questionTypes = config?.questionTypes || ['acik_uclu', 'baglam_temelli', 'maddeli', 'kisa_cevapli'];
    const scenarioType = config?.scenarioType || 'MEB İl/İlçe 1. Senaryo';
    const difficulty = config?.difficulty || 'dengeli';
    const customPrompt = (config?.customPrompt || '').trim();

    const isTYMMGrade = grade?.includes('9');

    // 1. DERS MATERYALİ (Soru ve bağlam kaynağı)
    let extractedPdfText = '';
    let usePdfInline = false;
    let cleanBase64 = '';
    let materialPageList: { num: number; text: string }[] = [];
    let materialTotalPages = 1;

    if (material?.pdfBase64) {
      cleanBase64 = material.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      console.log(`[Exam Generator] Ders Materyali PDF alındı (${Math.round(cleanBase64.length / 1024)} KB).`);
      try {
        const pdfBuffer = Buffer.from(cleanBase64, 'base64');
        const extracted = await extractPdfData(pdfBuffer);
        if (extracted && extracted.text && extracted.text.length > 30) {
          extractedPdfText = extracted.text;
          materialPageList = extracted.pageList;
          materialTotalPages = extracted.pages;
          console.log(`[PDF Parser] Ders materyalinden ${materialTotalPages} sayfa, ${extractedPdfText.length} karakter metin ayıklandı.`);
        } else {
          usePdfInline = true;
          console.log(`[PDF Parser] Ders materyali taranmış görsel/okunamadı, inlineData kullanılacak.`);
        }
      } catch (pdfErr) {
        console.warn(`[PDF Parser] Ders materyali ayıklama hatası:`, pdfErr);
        usePdfInline = true;
      }
    }

    // 2. DERS BİLGİ FORMU - DBF (Öğrenme Çıktıları & Süreç Bileşenleri Kaynağı - İsteğe Bağlı)
    let extractedSyllabusPdfText = '';
    let useSyllabusPdfInline = false;
    let cleanSyllabusBase64 = '';
    if (material?.syllabusPdfBase64) {
      cleanSyllabusBase64 = material.syllabusPdfBase64.replace(/^data:application\/pdf;base64,/, '');
      console.log(`[Exam Generator] Ders Bilgi Formu PDF alındı (${Math.round(cleanSyllabusBase64.length / 1024)} KB).`);
      try {
        const syllabusBuffer = Buffer.from(cleanSyllabusBase64, 'base64');
        const extractedSyllabus = await extractPdfData(syllabusBuffer);
        if (extractedSyllabus && extractedSyllabus.text && extractedSyllabus.text.length > 30) {
          extractedSyllabusPdfText = extractedSyllabus.text;
          console.log(`[PDF Parser] Ders bilgi formundan ${extractedSyllabus.pages} sayfa, ${extractedSyllabusPdfText.length} karakter metin ayıklandı.`);
        } else {
          useSyllabusPdfInline = true;
          console.log(`[PDF Parser] Ders bilgi formu taranmış görsel/okunamadı, inlineData kullanılacak.`);
        }
      } catch (sylErr) {
        console.warn(`[PDF Parser] Ders bilgi formu ayıklama hatası:`, sylErr);
        useSyllabusPdfInline = true;
      }
    }

    // 3. YILLIK PLAN (Kazanımlar/Öğrenme Çıktıları, Tarih/Hafta Aralığı, Ara Tatil ve Yarıyıl Tatili Kaynağı - İsteğe Bağlı)
    let extractedAnnualPlanPdfText = '';
    let useAnnualPlanPdfInline = false;
    let cleanAnnualPlanBase64 = '';
    if (material?.annualPlanPdfBase64) {
      cleanAnnualPlanBase64 = material.annualPlanPdfBase64.replace(/^data:application\/pdf;base64,/, '');
      console.log(`[Exam Generator] Yıllık Plan PDF alındı (${Math.round(cleanAnnualPlanBase64.length / 1024)} KB).`);
      try {
        const annualPlanBuffer = Buffer.from(cleanAnnualPlanBase64, 'base64');
        const extractedAnnualPlan = await extractPdfData(annualPlanBuffer);
        if (extractedAnnualPlan && extractedAnnualPlan.text && extractedAnnualPlan.text.length > 30) {
          extractedAnnualPlanPdfText = extractedAnnualPlan.text;
          console.log(`[PDF Parser] Yıllık plandan ${extractedAnnualPlan.pages} sayfa, ${extractedAnnualPlanPdfText.length} karakter metin ayıklandı.`);
        } else {
          useAnnualPlanPdfInline = true;
          console.log(`[PDF Parser] Yıllık plan taranmış görsel/okunamadı, inlineData kullanılacak.`);
        }
      } catch (planErr) {
        console.warn(`[PDF Parser] Yıllık plan ayıklama hatası:`, planErr);
        useAnnualPlanPdfInline = true;
      }
    }

    let effectiveMaterialText = (material?.text || extractedPdfText || '').trim();
    const effectiveSyllabusText = (material?.syllabusText || extractedSyllabusPdfText || '').trim();
    const effectiveAnnualPlanText = (material?.annualPlanText || extractedAnnualPlanPdfText || '').trim();
    const annualPlanScope = (material?.annualPlanScope || '').trim();

    // Eğer frontend'den gelen material.text içinde [SAYFA X] etiketleri varsa onları da pageList'e ayrıştır
    if (materialPageList.length === 0 && effectiveMaterialText.includes('[SAYFA')) {
      const pageSplitRegex = /===\s*\[SAYFA\s*(\d+)\]\s*===/gi;
      const parts = effectiveMaterialText.split(/===\s*\[SAYFA\s*\d+\]\s*===/gi);
      const matches = [...effectiveMaterialText.matchAll(pageSplitRegex)];
      if (matches.length > 0 && parts.length > 1) {
        for (let i = 0; i < matches.length; i++) {
          const pNum = parseInt(matches[i][1], 10);
          const pText = (parts[i + 1] || '').trim();
          materialPageList.push({ num: pNum, text: pText });
        }
        materialTotalPages = Math.max(...materialPageList.map(p => p.num), materialPageList.length);
      }
    }

    // ÖĞRETMENİN ÖZEL TALEBİNDEN VEYA SAYFA ARALIĞI KUTULARINDAN SAYFA TESPİTİ VE HOMOJEN SORU DAĞILIMI
    const requestedPages = detectRequestedPages(
      customPrompt,
      materialTotalPages,
      material?.pageRangeStart,
      material?.pageRangeEnd
    );
    let requestedPagesNotice = '';
    let questionPageScheduleNotice = '';
    let filteredMaterialText = '';

    if (requestedPages && requestedPages.length > 0) {
      const rangeSummary =
        requestedPages.length > 2
          ? `Sayfa ${requestedPages[0]} - ${requestedPages[requestedPages.length - 1]} (Toplam ${requestedPages.length} sayfa)`
          : `Sayfa ${requestedPages.join(', ')}`;
      console.log(`[Exam Generator] Öğretmen özel sayfa sınırlaması istedi: ${rangeSummary}`);

      if (materialPageList.length > 0) {
        const matched = materialPageList.filter(p => requestedPages.includes(p.num) && p.text.trim().length > 0);
        if (matched.length > 0) {
          const { scheduleSummary, bucketedText } = buildHomogeneousQuestionBuckets(matched, questionCount);
          filteredMaterialText = bucketedText;
          questionPageScheduleNotice = scheduleSummary;
          requestedPagesNotice = `ÖĞRETMENİN SEÇTİĞİ SAYFA ARALIĞI: ${rangeSummary}. DİKKAT: Sorular İSTİSNASIZ YALNIZCA bu sayfalardan ve aşağıdaki SORU-SAYFA DAĞILIM PLANINA göre tüm sayfalara/konulara EŞİT (HOMOJEN) dağıtılarak hazırlanacaktır!`;
        } else {
          // Eğer kitap sayfa numarası ile PDF sıra numarası uyuşmadığı için eşleşme boş döndüyse mevcut dolu sayfaları homojen böl
          const nonEmptyPages = materialPageList.filter(p => p.text.trim().length > 0);
          if (nonEmptyPages.length > 0) {
            const { scheduleSummary, bucketedText } = buildHomogeneousQuestionBuckets(nonEmptyPages, questionCount);
            filteredMaterialText = bucketedText;
            questionPageScheduleNotice = scheduleSummary;
          }
          requestedPagesNotice = `ÖĞRETMENİN SEÇTİĞİ SAYFA ARALIĞI: ${rangeSummary}. DİKKAT: Sorular İSTİSNASIZ YALNIZCA bu sayfalardaki tüm konulara eşit dağıtılarak hazırlanacaktır!`;
        }
      } else {
        // Taranmış PDF veya düz metin durumunda da sayfa numaralarını soru sayısına homojen böl
        const dummyPages = requestedPages.map((num) => ({ num, text: '' }));
        const { scheduleSummary } = buildHomogeneousQuestionBuckets(dummyPages, questionCount);
        questionPageScheduleNotice = scheduleSummary;
        requestedPagesNotice = `ÖĞRETMENİN SEÇTİĞİ SAYFA ARALIĞI: ${rangeSummary}. DİKKAT: Sorular İSTİSNASIZ YALNIZCA bu sayfalardan ve her soruya atanan sayfa grubundan homojen dağıtılarak hazırlanacaktır!`;
      }
    } else if (materialPageList.length >= 2) {
      // Sayfa aralığı belirtilmemişse bile çok sayfalı materyalde ilk sayfalara yığılmayı önlemek için tüm dokümanı soru sayısına homojen böl
      const nonEmptyPages = materialPageList.filter(p => p.text.trim().length > 0);
      if (nonEmptyPages.length >= 2) {
        const { scheduleSummary, bucketedText } = buildHomogeneousQuestionBuckets(nonEmptyPages, questionCount);
        filteredMaterialText = bucketedText;
        questionPageScheduleNotice = scheduleSummary;
      }
    }

    // Eğer sayfa gruplaması (bucketedText) oluşturulduysa onu kullan, aksi halde makul boyutta metin sun (28.000 karakter sınırı ile zaman aşımını önle)
    const materialSourceText = filteredMaterialText || effectiveMaterialText.slice(0, 28000);

    const systemInstruction = `Sen Türkiye Cumhuriyeti Millî Eğitim Bakanlığı (MEB) ve Lise Ölçme ve Değerlendirme Uzmanısın.

★★★ 1. MUTLAK KURAL VE EN ÜST DÜZEY ÖNCELİK: SAYFA ARALIĞINA KESİN UYUM VE HOMOJEN KONU DAĞILIMI ★★★
Öğretmenin girdiği "Sayfa Aralığı", "Özel İstek / Vurgulanacak Kazanım" (customPrompt) ve "Yıllık Plan Tarih/Hafta Aralığı" (annualPlanScope) talimatları SİSTEMDEKİ EN YÜKSEK VE DEĞİŞTİRİLEMEZ ÖNCELİĞE SAHİPTİR:
1. SAYFA SINIRLAMASI VE HOMOJEN (EŞİT) DAĞILIM ZORUNLULUĞU:
   - Öğretmen bir sayfa aralığı belirttiğinde (örn: Sayfa 10-25 arası):
     a) Sınavdaki sorular İSTİSNASIZ YALNIZCA VE SADECE BU SAYFA ARALIĞINDAKİ metinlerden, deneylerden, verilerden, paragraflardan ve kavramlardan üretilecektir! Bu sayfaların dışından KESİNLİKLE soru sorulmayacaktır!
     b) TEK BİR KONUYA VEYA SADECE BELLİ SAYFALARA YIĞILMA KESİNLİKLE YASAKTIR! Örneğin 10-25. sayfalar istendiğinde sadece ilk 2-3 sayfadaki (10-12. sayfa) veya tek bir alt başlıktaki konudan arka arkaya soru sormak KESİNLİKLE YASAKTIR!
     c) Sana verilen "ZORUNLU SORU-SAYFA EŞLEŞTİRME PLANI"na birebir uyacaksın: 1. soruyu 1. soru için ayrılan sayfa grubundan, 2. soruyu 2. soru için ayrılan sayfa grubundan, ..., ${questionCount}. soruyu ${questionCount}. soru için ayrılan sayfa grubundan hazırlayacaksın.
     d) Her soru FARKLI bir alt konuyu, farklı bir kavramı veya farklı bir beceriyi ölçmelidir. Aynı konuyu veya aynı örneği birden fazla soruda tekrarlamak yasaktır!
2. YILLIK PLAN ANALİZİ (KAZANIMLAR, HAFTALAR, TARİH ARALIĞI, ARA TATİL VE YARIYIL TATİLİ):
   - Yıllık Plan veya Ders Bilgi Formu (DBF) yüklemek zorunlu değildir; ancak kullanıcı Yıllık Plan ve/veya DBF eklemişse bu dokümanlardaki bilgiler mutlaka okunup analiz edilerek sorular hazırlanacaktır.
   - Yıllık Plan eklendiğinde plandaki şu unsurları dikkatle oku ve analiz et:
     * Ay, Hafta ve Tarih Aralıkları (örn: "Eylül 1. Hafta", "9-13 Eylül", "1-8. Haftalar", "Kasım 3. Hafta" vb.)
     * Kazanımlar / Öğrenme Çıktıları ve Süreç Bileşenleri (ilgili haftanın karşısındaki kazanım kodları ve açıklamaları)
     * Tatil ve Sınav Dönemleri: "1. Dönem Ara Tatili (Kasım Ara Tatili)", "Yarıyıl Tatili (Sömestr / Ocak-Şubat Tatili)", "2. Dönem Ara Tatili (Nisan Ara Tatili)" ve "Ortak Yazılı Sınav Haftaları".
   - Kullanıcının talep ettiği tarih/hafta/tatil aralığına (örn: "1. Ara Tatile kadar olan konular", "1-7. haftalar", "1. Ara Tatil ile Yarıyıl Tatili arası", "Eylül - Ekim ayları") %100 sadık kal ve YALNIZCA o aralıktaki kazanımlardan/konulardan soru oluştur. Henüz işlenmemiş (sonraki haftalarda veya tatil sonrasında yer alan) konulardan KESİNLİKLE soru sorma!
   - Eğer kullanıcı yıllık plan yüklemiş ancak özel bir hafta/tarih aralığı yazmamışsa, sınavın dönem bilgisine (${termAndExam}) göre yıllık plandaki ilgili aralığı otomatik filtrele:
     * "1. Dönem 1. Yazılı" -> Okul açılışından (Eylül) 1. Dönem 1. Sınav Haftası / 1. Dönem Ara Tatiline kadar olan haftalar
     * "1. Dönem 2. Yazılı" -> 1. Dönem başından (veya 1. Ara Tatilden) Yarıyıl Tatiline (Sömestr) kadar olan haftalar
     * "2. Dönem 1. Yazılı" -> Yarıyıl Tatili bitiminden (2. Dönem başı) 2. Dönem Ara Tatiline kadar olan haftalar
     * "2. Dönem 2. Yazılı" -> 2. Dönem konularından Yıl Sonuna kadar olan haftalar
3. KONU VE KAZANIM SINIRLAMASI: Öğretmen belirli bir konuya veya kazanıma odaklanılmasını istemişse sorular doğrudan bu konudan hazırlanacaktır.
4. SORU FORMATI SINIRLAMASI: Öğretmenin soru tipi veya dağılımı hakkındaki özel şartları eksiksiz uygulanacaktır.

SINIF VE MODEL FARKI: 
1. Türkiye Yüzyılı Maarif Modeli (TYMM) SADECE 9. sınıflarda uygulanmaktadır. Seçilen sınıf 9. sınıf ise TYMM esasları (Öğrenme Çıktısı, Süreç Bileşeni) uygulanır.
2. 10, 11 ve 12. sınıflarda TYMM modeli YOKTUR! Bu sınıflar için MEB Ortaöğretim Öğretim Programı (Kazanım ve Bilişsel Süreç / Beceriler) esas alınır.

ÖLÇME VE DEĞERLENDİRME ESASLARI:
1. Ezbere dayalı bilgi yoklaması KESİNLİKLE YAPILMAZ. Çoktan seçmeli test soruları MEB yazılı sınavlarında KULLANILMAZ.
2. Sorular beceri ve süreç odaklıdır. Öğrencinin analiz etme, çıkarım yapma, ilişkilendirme, değerlendirme ve problem çözme becerileri ölçülür.
3. Her soru için mutlaka:
   - "Öğrenme Çıktısı / Kazanım": ${isTYMMGrade ? 'Yıllık plan / DBF veya ilgili dersin TYMM kodlamasına uygun Öğrenme Çıktısı (örn: "BİY.9.1.2. Canlıların temel bileşiklerini analiz eder.")' : 'Yıllık plan / DBF veya ilgili dersin MEB Ortaöğretim Müfredatına uygun Kazanım (örn: "TAR.10.2.1...")'}
   - "Süreç Bileşeni / Bilişsel Beceri": Öğrencinin sergileyeceği zihinsel işlem (örn: "SB1.1. Metnin bağlamını analiz etme", "SB2.3. Neden-sonuç bağı kurma", "SB3.1. Eleştirel değerlendirme yapma")
4. Soru Tipleri: Açık Uçlu Soru, Bağlam Temelli Soru, Yapılandırılmış / Maddeli Soru, Kısa Cevaplı Soru.
5. DERECELİ PUANLAMA ANAHTARI (RUBRİK):
   - Her soru için puanlama ayrıntılı ve objektif olmalıdır:
     * Doğru Cevap (Tam Puan): Eksiksiz yanıt kriteri ve tam puan değerinde örnek öğrenci cevabı.
     * Kısmi Cevap (Kısmi Puan): Temel düşünceyi yakalamış ancak açıklaması eksik olan öğrenci cevabı için kriter ve puan.
     * Yanlış Cevap (0 Puan): İlgisiz, yanıltıcı veya temel kavram hatası içeren cevap kriteri.
     * Boş Cevap (0 Puan): Cevap verilmemiş olması durumu kriteri.
6. Puanların toplamı tam olarak ${totalPoints} puan olmalıdır. Her sorunun puanı (points) belirtilmeli ve toplamları ${totalPoints}'e eşit olmalıdır.
7. KESİNLİKLE SORU METNİNDE VEYA BAĞLAMINDA MATERYAL/SAYFA REFERANSI YAZMAYINIZ:
   - Soru kökünde (questionText), bağlamda (context) veya alt sorularda (subQuestions) ASLA "Ders materyali sayfa 31'deki ... konusuna dayanmaktadır", "Ders materyali sayfa 40'taki...", "Ders kitabının 15. sayfasına göre" gibi ders materyaline veya sayfa numarasına atıf yapan ifadeler YAZILMAYACAKTIR!
   - Soru kağıdı doğrudan öğrenciye verileceğinden, sorular bağımsız, doğal ve doğrudan öğrenciye hitap eden bir sınav sorusu olmalıdır. Öğrenci soru kağıdında materyal adı veya sayfa referansı görmemelidir.
8. DERS MATERYALİ REFERANSI SADECE CEVAP ANAHTARI İÇİN "materialRef" ALANINA YAZILIR:
   - Sorunun ders materyalindeki hangi sayfadan veya başlıktan hazırlandığı bilgisini YALNIZCA öğretmen için oluşturulan "materialRef" alanında belirtiniz (örn: "Sayfa 31: E-Ticaretin Çalışması", "Sayfa 40: Operasyon Planı"). Bu bilgi soru kağıdında değil, yalnızca cevap anahtarında küçük bir not olarak gösterilecektir.
9. KESİNLİKLE HER SORUNUN BAŞINA KONU BAŞLIĞI YAZMAYINIZ:
   - Soru kağıdındaki soruların başında veya "context" alanında ASLA "Ticaretin tarihsel gelişimi ve internetin globalleşmeye katkısı.", "E-ticaretin müşteri açısından avantajları.", "E-ticaret modelleri ve uygulama örnekleri.", "E-ticaret operasyon planı." gibi KONU BAŞLIKLARI YAZILMAYACAKTIR!
   - "context" alanı asla konu başlığı veya etiket yazmak için KULLANILMAZ. "context" YALNIZCA VE SADECE Türkçe/Edebiyat veya paragraf sorularında öğrencinin okuyup cevaplayacağı uzun bir okuma parçası/metin varsa kullanılır. Normal ders sorularında (mesleki gelişim, tarih, coğrafya, felsefe vb.) context alanını boş bırakınız ("") ve soruyu doğrudan "questionText" içine yazınız.`;

    const hasMaterial = Boolean(materialSourceText || usePdfInline);
    const hasSyllabus = Boolean(effectiveSyllabusText || useSyllabusPdfInline);
    const hasAnnualPlan = Boolean(effectiveAnnualPlanText || useAnnualPlanPdfInline);

    const teacherRequirementBlock = (customPrompt || annualPlanScope || requestedPagesNotice || questionPageScheduleNotice) ? `
====================================================================================================
★★★ DİKKAT: ÖĞRETMENİN ÖZEL TALİMATI, SAYFA ARALIĞI VE SORU DAĞILIM PLANI (EN YÜKSEK ÖNCELİK) ★★★
${customPrompt ? `- Öğretmenin Özel İsteği: "${customPrompt}"\n` : ''}${annualPlanScope ? `- Yıllık Plandan İstenen Tarih / Hafta / Tatil Aralığı: "${annualPlanScope}"\n` : ''}${requestedPagesNotice ? `- ${requestedPagesNotice}\n` : ''}${questionPageScheduleNotice ? `\n★ ZORUNLU SORU BAZLI SAYFA VE KONU DAĞILIM TABLOSU (HER SORU KENDİ SAYFA GRUBUNDAN VE FARKLI KONUDAN ÇIKACAKTIR):\n${questionPageScheduleNotice}\n` : ''}-> BU TALİMATLAR MUTLAK EMİRDİR. Belli sayfalara veya tek bir konuya yığılma yapmadan, her soruyu kendisine atanan sayfa grubundaki farklı bir alt konudan %100 SADIK kalarak hazırla!
====================================================================================================
` : '';

    const documentBlocks: string[] = [];

    if (materialSourceText) {
      documentBlocks.push(`==================== DOKÜMAN: DERS MATERYALİ (SORU METİNLERİ, KONULAR VE BAĞLAM KAYNAĞI) ====================
${materialSourceText}
=============================================================================================================`);
    } else if (usePdfInline) {
      documentBlocks.push(`[BİLGİ: Ders Materyali PDF dosyası ekte doğrudan görsel/doküman (inlineData) olarak sunulmuştur. Soru bağlamlarını bu PDF'den üretiniz.]`);
    }

    if (effectiveSyllabusText) {
      documentBlocks.push(`==================== DOKÜMAN: DERS BİLGİ FORMU - DBF (ÖĞRENME ÇIKTILARI, SÜREÇ BİLEŞENLERİ VE ÖLÇME ESASLARI) ====================
${effectiveSyllabusText.slice(0, 16000)}
===================================================================================================================================`);
    } else if (useSyllabusPdfInline) {
      documentBlocks.push(`[BİLGİ: Ders Bilgi Formu (DBF) PDF dosyası ekte doğrudan görsel/doküman (inlineData) olarak sunulmuştur. Öğrenme çıktıları ve süreç bileşenlerini bu formdan alınız.]`);
    }

    if (effectiveAnnualPlanText || useAnnualPlanPdfInline) {
      const targetScopeDescription = annualPlanScope
        ? `ÖĞRETMENİN TALEP ETTİĞİ YILLIK PLAN TARİH / HAFTA / TATİL ARALIĞI: "${annualPlanScope}"`
        : customPrompt
        ? `ÖĞRETMENİN ÖZEL NOTUNDAKİ KAPSAM ("${customPrompt}") ve Sınav Dönemi ("${termAndExam}")`
        : `Sınav Dönemi ("${termAndExam}") kapsamına karşılık gelen haftalar (Ara tatil ve yarıyıl tatili sınırlarını dikkate alarak)`;

      documentBlocks.push(`==================== DOKÜMAN: YILLIK PLAN (KAZANIMLAR, HAFTALAR/TARİH ARALIĞI, ARA TATİL VE YARIYIL TATİLİ TABLOSU) ====================
${effectiveAnnualPlanText ? effectiveAnnualPlanText.slice(0, 16000) : '[Yıllık Plan PDF dokümanı ekte inlineData olarak sunulmuştur.]'}
=========================================================================================================================================
★ YILLIK PLAN ANALİZ VE SORU ÜRETİM TALİMATI:
1. Yukarıdaki Yıllık Planı satır satır incele: Ay/Hafta/Tarih sütunlarını, Öğrenme Çıktılarını (Kazanımları), Süreç Bileşenlerini, Konu/Ünite/Tema başlıklarını ve "1. Dönem Ara Tatili", "Yarıyıl Tatili (Sömestr)", "2. Dönem Ara Tatili", "Sınav Haftası" bölümlerini tespit et.
2. HEDEF ARALIK: ${targetScopeDescription}.
3. Soruları İSTİSNASIZ YALNIZCA bu hedef tarih/hafta/tatil aralığında yer alan öğrenme çıktılarından (kazanımlardan) ve konulardan oluştur!
4. Her sorunun "learningOutcome" (Öğrenme Çıktısı / Kazanım) ve "processComponent" (Süreç Bileşeni) alanlarına, yıllık planda o hafta/tarih aralığında yer alan gerçek kazanım kodunu ve açıklamasını yaz.`);
    }

    let userPromptText = '';
    if (documentBlocks.length > 0) {
      const rulesList: string[] = [];
      rulesList.push(`1. ÖĞRETMENİN ÖZEL TALEBİNE VE ARALIK SEÇİMİNE KESİN UYUM: ${customPrompt ? `"${customPrompt}" şartı mutlak kuraldır.` : 'Yüklenen dokümanlardaki kazanımlara tam sadık kal.'} ${annualPlanScope ? `Yıllık planda YALNIZCA "${annualPlanScope}" aralığındaki haftalardan ve kazanımlardan soru hazırla.` : ''} ${requestedPages ? `Ders materyalinde YALNIZCA ${requestedPages.join(', ')}. sayfalardaki içerikten soru hazırla!` : ''}`);

      if (hasAnnualPlan) {
        rulesList.push(`2. YILLIK PLAN KULLANIMI: Yıllık plandaki tarih aralığını (haftaları), 1. ve 2. ara tatilleri, yarıyıl tatilini ve haftalık kazanım dağılımını analiz et. İstenen tarih/hafta aralığının dışındaki (örneğin sonraki haftalarda veya tatil sonrasında işlenecek) konulardan KESİNLİKLE soru sorma.`);
      }
      if (hasSyllabus) {
        rulesList.push(`3. DERS BİLGİ FORMU (DBF) KULLANIMI: Soruların öğrenme çıktıları, süreç bileşenleri ve dereceli puanlama anahtarı (rubrik) ölçütlerinde Ders Bilgi Formundaki bilgileri kullan.`);
      }
      if (hasMaterial) {
        rulesList.push(`4. DERS MATERYALİ KULLANIMI: Soruların metinlerini, vaka/deney senaryolarını ve bağlamlarını Ders Materyalindeki içerikten${hasAnnualPlan ? ' (yıllık planda seçilen hafta/kazanım kapsamıyla uyumlu olacak şekilde)' : ''} üret.`);
      }
      rulesList.push(`5. Sınav Başlık ve Yapılandırma Bilgileri:
   - Okul: ${schoolName}
   - Ders: ${course}
   - Sınıf: ${grade}
   - Dönem/Sınav: ${termAndExam}
   - Süre: ${duration}
   - Toplam Puan: ${totalPoints}
   - İstenen Soru Sayısı: ${questionCount}
   - Soru Tipleri: ${questionTypes.join(', ')}
   - Senaryo: ${scenarioType}
   - Zorluk: ${difficulty}`);

      userPromptText = `${teacherRequirementBlock}
AŞAĞIDA KULLANICI TARAFINDAN YÜKLENEN DOKÜMAN(LAR) YER ALMAKTADIR. LÜTFEN BU DOKÜMANLARDAKİ BİLGİLERİ ANALİZ EDEREK ${questionCount} ADET ${isTYMMGrade ? 'TYMM UYUMLU' : 'MEB MÜFREDATINA UYGUN'} LİSE YAZILI SORUSU VE DERECELİ PUANLAMA ANAHTARI (RUBRİK) HAZIRLA:

${documentBlocks.join('\n\n')}

ÇOK ÖNEMLİ UYGULAMA KURALLARI:
${rulesList.join('\n')}
${customPrompt ? `\nSON HATIRLATMA: Öğretmenin "${customPrompt}" özel talimatına eksiksiz uy!` : ''}
${annualPlanScope ? `\nYILLIK PLAN KAPSAM HATIRLATMASI: Yalnızca "${annualPlanScope}" tarih/hafta aralığındaki kazanımlardan soru üret!` : ''}`;
    } else {
      userPromptText = `${teacherRequirementBlock}
LÜTFEN ${grade} ${course} DERSİ İÇİN GÜNCEL MEB ${isTYMMGrade ? 'TYMM' : 'ORTAÖĞRETİM'} MÜFREDATINA GÖRE ${questionCount} ADET LİSE YAZILI SORUSU VE DERECELİ PUANLAMA ANAHTARI HAZIRLA:

Okul: ${schoolName}
Ders: ${course}
Sınıf Düzeyi: ${grade}
Eğitim Öğretim Yılı: ${academicYear}
Sınav: ${termAndExam}
Süre: ${duration}
Toplam Puan: ${totalPoints}
İstenen Soru Sayısı: ${questionCount}
İstenen Soru Tipleri: ${questionTypes.join(', ')}
Senaryo Modeli: ${scenarioType}
Zorluk Düzeyi: ${difficulty}
Öğretmen Özel Notu/İstekleri: ${customPrompt || 'Yok'}
${annualPlanScope ? `Yıllık Plan Tarih/Hafta Kapsamı: ${annualPlanScope}\n` : ''}${customPrompt ? `\nDİKKAT: Öğretmenin "${customPrompt}" isteğine kesinlikle tam uyulacaktır!` : ''}`;
    }

    console.log(`[Exam Generator] Model çağrılıyor: ${course || 'Ders'} (${grade}) - ${questionCount} soru [Materyal:${hasMaterial}, DBF:${hasSyllabus}, YıllıkPlan:${hasAnnualPlan}]`);

    const contents: any[] = [];

    // Eğer PDF metni ayıklanamadıysa (taranmış görsel PDF ise) inlineData ekle
    if (usePdfInline && cleanBase64) {
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: cleanBase64,
        },
      });
    }
    if (useSyllabusPdfInline && cleanSyllabusBase64) {
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: cleanSyllabusBase64,
        },
      });
    }
    if (useAnnualPlanPdfInline && cleanAnnualPlanBase64) {
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: cleanAnnualPlanBase64,
        },
      });
    }

    contents.push({
      text: userPromptText,
    });

    const response = await callGeminiWithFallback({
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedCourse: { type: Type.STRING, description: 'Sınavın ait olduğu tespit edilen ders branşı (örn: Tarih, Biyoloji, Fizik, Matematik, Kimya vb.)' },
            examTitle: { type: Type.STRING },
            generalInstructions: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  type: { type: Type.STRING },
                  typeLabel: { type: Type.STRING },
                  learningOutcome: { type: Type.STRING },
                  processComponent: { type: Type.STRING },
                  context: { type: Type.STRING, description: 'Yalnızca Türkçe/Edebiyat veya paragraf sorularında öğrencinin okuyacağı uzun okuma metni/paragraf varsa kullanılır. ASLA konu başlığı veya etiket YAZMAYINIZ. Normal sorularda boş bırakınız ("").' },
                  questionText: { type: Type.STRING, description: 'Öğrenciye yöneltilen net soru kökü. ASLA sayfa numarası veya materyal atfı yazmayın.' },
                  materialRef: { type: Type.STRING, description: 'YALNIZCA cevap anahtarında öğretmene küçük bir not olarak gösterilmek üzere sorunun hazırlandığı sayfa ve konu başlığı (örn: "Sayfa 31: E-Ticaretin Çalışması"). Soru köküne veya context içine KESİNLİKLE yazmayın.' },
                  subQuestions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        text: { type: Type.STRING },
                        points: { type: Type.INTEGER },
                      },
                      required: ['label', 'text', 'points'],
                    },
                  },
                  points: { type: Type.INTEGER },
                  suggestedLines: { type: Type.INTEGER, description: 'Sınav kağıdında bırakılacak cevap satır sayısı (örn: 3, 5, 8)' },
                  rubric: {
                    type: Type.OBJECT,
                    properties: {
                      correctCriteria: { type: Type.STRING, description: 'Tam puan alma kriteri' },
                      sampleCorrectAnswer: { type: Type.STRING, description: 'Tam puan alacak örnek ideal cevap' },
                      partialCriteria: { type: Type.STRING, description: 'Kısmi puan alma kriteri' },
                      samplePartialAnswer: { type: Type.STRING, description: 'Kısmi puan alacak örnek cevap' },
                      partialPoints: { type: Type.INTEGER, description: 'Kısmi puan miktarı' },
                      wrongCriteria: { type: Type.STRING, description: 'Yanlış cevap kriteri (0 puan)' },
                      blankCriteria: { type: Type.STRING, description: 'Boş cevap kriteri (0 puan)' },
                      scoringNotes: { type: Type.STRING, description: 'Öğretmen için puanlama ipucu' },
                    },
                    required: [
                      'correctCriteria',
                      'sampleCorrectAnswer',
                      'partialCriteria',
                      'samplePartialAnswer',
                      'partialPoints',
                      'wrongCriteria',
                      'blankCriteria',
                    ],
                  },
                },
                required: [
                  'number',
                  'type',
                  'typeLabel',
                  'learningOutcome',
                  'processComponent',
                  'questionText',
                  'points',
                  'suggestedLines',
                  'rubric',
                ],
              },
            },
          },
          required: ['examTitle', 'questions'],
        },
      },
    });

    const responseText = response.text || '{}';
    const parsedData = JSON.parse(responseText);

    // Soruların context, soru kökü ve alt sorularındaki sayfa atıflarını temizle; materyal referansını cevap anahtarı notuna taşı
    if (parsedData.questions && Array.isArray(parsedData.questions)) {
      parsedData.questions = parsedData.questions.map((q: any) => {
        const { context, questionText, materialRef } = extractAndCleanMaterialRef(
          q.context,
          q.questionText,
          q.materialRef
        );
        return {
          ...q,
          context: context || '',
          questionText: questionText || '',
          materialRef: materialRef || undefined,
          learningOutcome: cleanPageReferences(q.learningOutcome),
          processComponent: cleanPageReferences(q.processComponent),
          subQuestions: Array.isArray(q.subQuestions)
            ? q.subQuestions.map((sub: any) => ({
                ...sub,
                text: cleanPageReferences(sub.text),
              }))
            : [],
        };
      });
    }

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Sınav oluşturma hatası:', error);
    const friendlyMessage = formatGeminiError(error);
    const statusCode = error?.status === 401 || String(error?.message).includes('401') ? 401 :
                       error?.status === 403 ? 403 :
                       error?.status === 429 ? 429 : 500;
    return res.status(statusCode).json({
      success: false,
      error: friendlyMessage,
    });
  }
});

// Tek soru yenileme / alternatif soru üretme endpoint'i
app.post('/api/regenerate-question', async (req: Request, res: Response) => {
  try {
    const {
      currentQuestion,
      otherQuestions,
      header,
      config,
      material,
      customInstruction,
      // Geriye dönük uyumluluk alanları:
      questionNumber,
      course: bodyCourse,
      grade: bodyGrade,
      type: bodyType,
      learningOutcome: bodyOutcome,
      contextTopic,
      totalPoints: bodyPoints,
    } = req.body;

    const qNum = Number(currentQuestion?.number || questionNumber || 1);
    const qPoints = Number(currentQuestion?.points || bodyPoints || 10);
    const qType = currentQuestion?.type || bodyType || 'acik_uclu';
    const qTypeLabel = currentQuestion?.typeLabel || 'Açık Uçlu Soru';
    const qOutcome = currentQuestion?.learningOutcome || bodyOutcome || contextTopic || '';
    const qProcess = currentQuestion?.processComponent || '';
    const oldQuestionText = currentQuestion?.questionText || '';
    const oldContext = currentQuestion?.context || '';

    const course = header?.course?.trim() || bodyCourse || 'Ders';
    const grade = header?.grade || bodyGrade || '9. Sınıf';
    const isTYMMGrade = grade.includes('9');
    const difficulty = config?.difficulty || 'dengeli';
    const customPrompt = (config?.customPrompt || '').trim();
    const userInstruction = (customInstruction || '').trim();

    // Materyal metni, DBF, Yıllık Plan ve sayfa filtrelemesi
    const effectiveMaterialText = (material?.text || '').trim();
    const effectiveSyllabusText = (material?.syllabusText || '').trim();
    const effectiveAnnualPlanText = (material?.annualPlanText || '').trim();
    const annualPlanScope = (material?.annualPlanScope || '').trim();

    const materialPageList: { num: number; text: string }[] = [];
    let materialTotalPages = 1;

    if (effectiveMaterialText.includes('[SAYFA')) {
      const pageSplitRegex = /===\s*\[SAYFA\s*(\d+)\]\s*===/gi;
      const parts = effectiveMaterialText.split(/===\s*\[SAYFA\s*\d+\]\s*===/gi);
      const matches = [...effectiveMaterialText.matchAll(pageSplitRegex)];
      if (matches.length > 0 && parts.length > 1) {
        for (let i = 0; i < matches.length; i++) {
          const pNum = parseInt(matches[i][1], 10);
          const pText = (parts[i + 1] || '').trim();
          materialPageList.push({ num: pNum, text: pText });
        }
        materialTotalPages = Math.max(...materialPageList.map(p => p.num), materialPageList.length);
      }
    }

    const combinedPageRequest = `${customPrompt} ${userInstruction}`.trim();
    const requestedPages = detectRequestedPages(
      combinedPageRequest,
      materialTotalPages,
      material?.pageRangeStart,
      material?.pageRangeEnd
    );
    let filteredMaterialText = '';
    if (requestedPages && requestedPages.length > 0 && materialPageList.length > 0) {
      const matched = materialPageList.filter(p => requestedPages.includes(p.num));
      if (matched.length > 0) {
        // Tekil soru yenilemede, ilgili soru numarasına düşen sayfa grubunu önceliklendir
        const totalQuestions = Math.max(qNum, Number(config?.questionCount) || 6);
        const M = matched.length;
        const startIdx = Math.floor(((qNum - 1) * M) / totalQuestions);
        const endIdx = Math.max(startIdx, Math.floor((qNum * M) / totalQuestions) - 1);
        const primaryPages = matched.slice(startIdx, endIdx + 1);
        const primaryNums = primaryPages.map(p => p.num).join(', ');
        const pagesToInclude = primaryPages.length > 0 ? primaryPages : matched.slice(0, 6);
        const perPageChar = Math.max(1200, Math.floor(15000 / Math.max(1, pagesToInclude.length)));

        filteredMaterialText =
          `★ BU SORU (${qNum}. SORU) İÇİN ÖNCELİKLİ SAYFA GRUBU: Sayfa ${primaryNums}\n\n` +
          pagesToInclude
            .map(p => `==================== [SEÇİLEN SAYFA ${p.num}] ====================\n${p.text.slice(0, perPageChar)}`)
            .join('\n\n');
      }
    }

    const materialSourceText = filteredMaterialText || effectiveMaterialText.slice(0, 20000);

    const existingQuestionsSummary = Array.isArray(otherQuestions) && otherQuestions.length > 0
      ? otherQuestions
          .map((oq: any) => `- Soru ${oq.number}: ${oq.questionText}`)
          .join('\n')
      : 'Yok';

    const systemInstruction = `Sen Türkiye Cumhuriyeti Millî Eğitim Bakanlığı (MEB) ve Lise Ölçme ve Değerlendirme Uzmanısın.
Görevin, sınav kağıdında öğretmenin değiştirmek istediği ${qNum}. soru (${qPoints} Puan) yerine YEPYENİ, ÖZGÜN ve FARKLI bir alternatif soru ve dereceli puanlama anahtarı (rubrik) üretmektir.

KRİTİK KURALLAR:
1. ESKİ SORUYU TEKRARLAMA: Değiştirilen eski soru ("${oldQuestionText}") ve bağlamı ("${oldContext.slice(0, 200)}") ile AYNI OLMAYAN, farklı bir örnek olay, veri, deney, metin veya açıdan yaklaşan YENİ bir alternatif soru hazırla.
2. SINAVDAKİ DİĞER SORULARLA ÇAKIŞMA: Sınavda zaten bulunan diğer sorularla aynı soruyu sorma.
3. PUAN VE NUMARA KORUMA: Yeni sorunun numarası (${qNum}) ve puan değeri (${qPoints} Puan) birebir korunmalıdır.
4. SINIF VE MÜFREDAT UYUMU: ${isTYMMGrade ? '9. Sınıf Türkiye Yüzyılı Maarif Modeli (TYMM) esaslarına (Öğrenme Çıktısı ve Süreç Bileşeni) tam uy.' : `${grade} MEB Ortaöğretim Müfredatı kazanımlarına tam uy.`}
5. SAYFA ATFI YASAĞI: Soru köküne, bağlama (context) veya rubriğe KESİNLİKLE kitap sayfası atfı ("Sayfa 14", "(Ders Kitabı Sayfa 25)", "(s. 20)" vb.) YAZMA. Bağlam kendi kendine yeten bir metin veya senaryo olmalıdır.`;

    const promptParts: string[] = [];

    promptParts.push(`LÜTFEN AŞAĞIDAKİ BİLGİLERE GÖRE ${qNum}. SORU İÇİN YENİ BİR ALTERNATİF SORU VE DERECELİ PUANLAMA ANAHTARI ÜRET:
- Ders: ${course}
- Sınıf: ${grade}
- Soru Numarası: ${qNum}
- Soru Puanı: ${qPoints} Puan
- Soru Türü: ${qTypeLabel} (${qType})
- Hedeflenen Öğrenme Çıktısı / Kazanım: ${qOutcome || 'Dersin müfredatına ve materyale uygun kazanım'}
- Hedeflenen Süreç Bileşeni: ${qProcess || 'Analiz etme, çıkarım yapma veya değerlendirme'}
- Zorluk Düzeyi: ${difficulty}${annualPlanScope ? `\n- Yıllık Plan Tarih / Hafta / Tatil Kapsamı: ${annualPlanScope}` : ''}`);

    if (userInstruction) {
      promptParts.push(`★★★ ÖĞRETMENİN BU SORU İÇİN ÖZEL DEĞİŞİKLİK TALEBİ (EN YÜKSEK ÖNCELİK) ★★★
"${userInstruction}"
-> Yeni soruyu doğrudan bu talebe uygun olarak kurgula!`);
    } else if (customPrompt) {
      promptParts.push(`Öğretmenin Sınav Genel Notu: "${customPrompt}"`);
    }

    promptParts.push(`DEĞİŞTİRİLEN (BEĞENİLMEYEN) ESKİ SORU (BUNUNLA AYNI SORUYU SORMA, FARKLI BİR ALTERNATİF ÜRET):
- Eski Bağlam: ${oldContext || 'Yok'}
- Eski Soru Kökü: ${oldQuestionText || 'Yok'}`);

    if (existingQuestionsSummary !== 'Yok') {
      promptParts.push(`SINAVDAKİ DİĞER MEVCUT SORULAR (BUNLARLA TEKRARA DÜŞME):
${existingQuestionsSummary}`);
    }

    if (materialSourceText) {
      promptParts.push(`==================== DERS MATERYALİ (SORU VE BAĞLAM KAYNAĞI) ====================
${materialSourceText}
=================================================================================
DİKKAT: Yeni alternatif soruyu ve bağlamını yukarıdaki ders materyalinde yer alan konulardan, kavramlardan veya örneklerden üret.`);
    }

    if (effectiveSyllabusText) {
      promptParts.push(`==================== DERS BİLGİ FORMU (KAZANIM VE SÜREÇ BİLEŞENLERİ) ====================
${effectiveSyllabusText.slice(0, 20000)}
=========================================================================================`);
    }

    if (effectiveAnnualPlanText) {
      promptParts.push(`==================== YILLIK PLAN (KAZANIMLAR, HAFTALAR, ARA TATİL VE YARIYIL TATİLİ) ====================
${effectiveAnnualPlanText.slice(0, 20000)}
=========================================================================================================
DİKKAT: Yeni alternatif soruyu yıllık plandaki ilgili tarih/hafta/tatil aralığında (${annualPlanScope || header?.termAndExam || 'mevcut sınav dönemi'}) yer alan kazanımlara uygun olarak hazırla.`);
    }

    const response = await callGeminiWithFallback({
      contents: [{ text: promptParts.join('\n\n') }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            number: { type: Type.INTEGER },
            type: { type: Type.STRING },
            typeLabel: { type: Type.STRING },
            learningOutcome: { type: Type.STRING },
            processComponent: { type: Type.STRING },
            context: { type: Type.STRING, description: 'Soru bağlamı (varsa). KESİNLİKLE sayfa veya ders materyali atfı içermemelidir.' },
            questionText: { type: Type.STRING, description: 'Öğrenciye yöneltilen net soru kökü. ASLA sayfa numarası veya materyal atfı yazmayın.' },
            materialRef: { type: Type.STRING, description: 'YALNIZCA cevap anahtarında öğretmene küçük bir not olarak gösterilmek üzere sorunun hazırlandığı sayfa ve konu başlığı (örn: "Sayfa 31: E-Ticaretin Çalışması"). Soru köküne veya context içine KESİNLİKLE yazmayın.' },
            subQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  text: { type: Type.STRING },
                  points: { type: Type.INTEGER },
                },
                required: ['label', 'text', 'points'],
              },
            },
            points: { type: Type.INTEGER },
            suggestedLines: { type: Type.INTEGER },
            rubric: {
              type: Type.OBJECT,
              properties: {
                correctCriteria: { type: Type.STRING },
                sampleCorrectAnswer: { type: Type.STRING },
                partialCriteria: { type: Type.STRING },
                samplePartialAnswer: { type: Type.STRING },
                partialPoints: { type: Type.INTEGER },
                wrongCriteria: { type: Type.STRING },
                blankCriteria: { type: Type.STRING },
                scoringNotes: { type: Type.STRING },
              },
              required: [
                'correctCriteria',
                'sampleCorrectAnswer',
                'partialCriteria',
                'samplePartialAnswer',
                'partialPoints',
                'wrongCriteria',
                'blankCriteria',
              ],
            },
          },
          required: [
            'number',
            'type',
            'typeLabel',
            'learningOutcome',
            'processComponent',
            'questionText',
            'points',
            'suggestedLines',
            'rubric',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (parsed) {
      parsed.number = qNum;
      parsed.points = qPoints;

      const { context, questionText, materialRef } = extractAndCleanMaterialRef(
        parsed.context,
        parsed.questionText,
        parsed.materialRef
      );

      parsed.context = context || '';
      parsed.questionText = questionText || '';
      parsed.materialRef = materialRef || undefined;
      parsed.learningOutcome = cleanPageReferences(parsed.learningOutcome);
      parsed.processComponent = cleanPageReferences(parsed.processComponent);
      if (parsed.rubric) {
        parsed.rubric.correctCriteria = cleanPageReferences(parsed.rubric.correctCriteria);
        parsed.rubric.sampleCorrectAnswer = cleanPageReferences(parsed.rubric.sampleCorrectAnswer);
        parsed.rubric.partialCriteria = cleanPageReferences(parsed.rubric.partialCriteria);
        parsed.rubric.samplePartialAnswer = cleanPageReferences(parsed.rubric.samplePartialAnswer);
        parsed.rubric.wrongCriteria = cleanPageReferences(parsed.rubric.wrongCriteria);
        parsed.rubric.blankCriteria = cleanPageReferences(parsed.rubric.blankCriteria);
        if (parsed.rubric.scoringNotes) {
          parsed.rubric.scoringNotes = cleanPageReferences(parsed.rubric.scoringNotes);
        }
      }
      if (Array.isArray(parsed.subQuestions)) {
        parsed.subQuestions = parsed.subQuestions.map((sub: any) => ({
          ...sub,
          text: cleanPageReferences(sub.text),
        }));
      }
    }
    return res.json({ success: true, question: parsed });
  } catch (err: any) {
    console.error('Soru yenileme hatası:', err);
    const friendlyMessage = formatGeminiError(err);
    const statusCode = err?.status === 401 || String(err?.message).includes('401') ? 401 :
                       err?.status === 403 ? 403 :
                       err?.status === 429 ? 429 : 500;
    return res.status(statusCode).json({ success: false, error: friendlyMessage });
  }
});

// Vite middleware in dev or static files in production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
