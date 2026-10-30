import { useEffect, useRef, useState, useCallback } from 'react';
import { ExamConfig, ExamData, ExamHeader, MaterialInput, ViewTab } from '../types/exam';

export const AUTO_SAVE_STORAGE_KEY = 'maarif_autosave_state_v1';
export const LOCKED_FIELDS_STORAGE_KEY = 'maarif_locked_header_fields_v1';
export const SAVED_HEADER_STORAGE_KEY = 'maarif_saved_header_v1';

export interface AutoSavePayload {
  header: ExamHeader;
  lockedFields: Partial<Record<keyof ExamHeader, boolean>>;
  config: ExamConfig;
  examData: ExamData | null;
  currentTab: ViewTab;
  showGeneratorForm: boolean;
  material: MaterialInput;
  updatedAt: number;
}

interface UseAutoSaveOptions {
  header: ExamHeader;
  lockedFields: Partial<Record<keyof ExamHeader, boolean>>;
  config: ExamConfig;
  examData: ExamData | null;
  currentTab: ViewTab;
  showGeneratorForm: boolean;
  material: MaterialInput;
  intervalMs?: number;
}

/**
 * Kullanıcının yaptığı değişiklikleri (başlık ayarları, kilitli alanlar, sınav/soru düzenlemeleri,
 * rubrik düzenlemeleri ve yapılandırma ayarları) hem değişiklik anında (debounced) hem de
 * periyodik olarak localStorage'a otomatik kaydeden hook.
 */
export function useAutoSave({
  header,
  lockedFields,
  config,
  examData,
  currentTab,
  showGeneratorForm,
  material,
  intervalMs = 5000,
}: UseAutoSaveOptions) {
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const latestStateRef = useRef({
    header,
    lockedFields,
    config,
    examData,
    currentTab,
    showGeneratorForm,
    material,
  });

  useEffect(() => {
    latestStateRef.current = {
      header,
      lockedFields,
      config,
      examData,
      currentTab,
      showGeneratorForm,
      material,
    };
  }, [header, lockedFields, config, examData, currentTab, showGeneratorForm, material]);

  const persistNow = useCallback(() => {
    const current = latestStateRef.current;
    const now = Date.now();

    try {
      // Başlık ve kilitli alanları her zaman ayrı anahtarlara da kaydet
      localStorage.setItem(LOCKED_FIELDS_STORAGE_KEY, JSON.stringify(current.lockedFields));
      localStorage.setItem(SAVED_HEADER_STORAGE_KEY, JSON.stringify(current.header));
    } catch {
      // Depolama kotası hatası olursa yoksay
    }

    // Büyük base64 PDF verilerini localStorage kotasını aşmamak için hariç tut
    const safeMaterial: MaterialInput = {
      ...current.material,
      pdfBase64: undefined,
      syllabusPdfBase64: undefined,
      annualPlanPdfBase64: undefined,
      // Çok büyük PDF metinlerini (>150KB) kırp veya kotayı koru
      text:
        current.material.text && current.material.text.length > 150000
          ? current.material.text.slice(0, 150000)
          : current.material.text,
    };

    const payload: AutoSavePayload = {
      header: current.header,
      lockedFields: current.lockedFields,
      config: current.config,
      examData: current.examData,
      currentTab: current.currentTab,
      showGeneratorForm: current.showGeneratorForm,
      material: safeMaterial,
      updatedAt: now,
    };

    try {
      localStorage.setItem(AUTO_SAVE_STORAGE_KEY, JSON.stringify(payload));
      setLastSavedAt(now);
    } catch {
      // Eğer materyal metni nedeniyle kota aşılırsa, materyal metni olmadan sınav ve başlık verilerini kaydet
      try {
        const fallbackPayload: AutoSavePayload = {
          ...payload,
          material: {
            text: '',
            pageRangeStart: current.material.pageRangeStart,
            pageRangeEnd: current.material.pageRangeEnd,
            annualPlanScope: current.material.annualPlanScope,
          },
        };
        localStorage.setItem(AUTO_SAVE_STORAGE_KEY, JSON.stringify(fallbackPayload));
        setLastSavedAt(now);
      } catch {
        // tamamen doluysa yoksay
      }
    }
  }, []);

  // Değişiklik olduğunda kısa gecikmeli (debounced) otomatik kayıt
  useEffect(() => {
    const timer = setTimeout(() => {
      persistNow();
    }, 600);
    return () => clearTimeout(timer);
  }, [header, lockedFields, config, examData, currentTab, showGeneratorForm, material, persistNow]);

  // Periyodik otomatik kayıt (varsayılan: her 5 saniyede bir) + sekme kapanırken/gizlenirken kayıt
  useEffect(() => {
    const intervalId = setInterval(() => {
      persistNow();
    }, intervalMs);

    const handleVisibilityOrUnload = () => {
      persistNow();
    };

    window.addEventListener('beforeunload', handleVisibilityOrUnload);
    document.addEventListener('visibilitychange', handleVisibilityOrUnload);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleVisibilityOrUnload);
      document.removeEventListener('visibilitychange', handleVisibilityOrUnload);
    };
  }, [intervalMs, persistNow]);

  return {
    lastSavedAt,
    saveNow: persistNow,
  };
}

export function loadAutoSavedState(): Partial<AutoSavePayload> | null {
  try {
    const raw = localStorage.getItem(AUTO_SAVE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<AutoSavePayload>;
  } catch {
    return null;
  }
}
