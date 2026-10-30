import React, { useState } from 'react';
import { Building2, Lock, Sparkles } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { HeaderSettingsModal } from './components/HeaderSettingsModal';
import { MaterialAndOptionsForm } from './components/MaterialAndOptionsForm';
import { ExamPaperView } from './components/ExamPaperView';
import { RubricView } from './components/RubricView';
import { MatrixView } from './components/MatrixView';
import { ExamData, ExamHeader, ExamConfig, MaterialInput, ViewTab } from './types/exam';
import { exportExamToWord } from './utils/export';
import { cleanPageReferences, extractAndCleanMaterialRef } from './utils/cleanText';
import {
  useAutoSave,
  loadAutoSavedState,
  LOCKED_FIELDS_STORAGE_KEY,
  SAVED_HEADER_STORAGE_KEY,
} from './hooks/useAutoSave';

const DEFAULT_HEADER: ExamHeader = {
  schoolName: '',
  academicYear: '2024-2025 Eğitim ve Öğretim Yılı',
  termAndExam: '1. Dönem 1. Ortak Yazılı Sınavı',
  date: '',
  course: '',
  grade: '9. Sınıf',
  duration: '40 Dakika',
  teacherName: '',
  teacherBranch: '',
  note: 'Soruları dikkatlice okuyunuz. Her sorunun cevabını altına bırakılan alana okunaklı şekilde yazınız. Başarılar dileriz.',
};

const DEFAULT_CONFIG: ExamConfig = {
  questionCount: 6,
  totalPoints: 100,
  questionTypes: ['baglam_temelli', 'acik_uclu', 'maddeli', 'kisa_cevapli'],
  scenarioType: 'MEB İl/İlçe 1. Senaryo',
  difficulty: 'dengeli',
  customPrompt: '',
};

function loadLockedFields(): Partial<Record<keyof ExamHeader, boolean>> {
  try {
    const raw = localStorage.getItem(LOCKED_FIELDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadInitialHeader(locked: Partial<Record<keyof ExamHeader, boolean>>): ExamHeader {
  try {
    const autoSaved = loadAutoSavedState();
    if (autoSaved?.header) {
      return { ...DEFAULT_HEADER, ...autoSaved.header };
    }
    const raw = localStorage.getItem(SAVED_HEADER_STORAGE_KEY);
    if (!raw) return DEFAULT_HEADER;
    const saved = JSON.parse(raw) as Partial<ExamHeader>;
    const merged: ExamHeader = { ...DEFAULT_HEADER };
    (Object.keys(DEFAULT_HEADER) as (keyof ExamHeader)[]).forEach((key) => {
      if (locked[key] && typeof saved[key] === 'string') {
        merged[key] = saved[key] as string;
      }
    });
    return merged;
  } catch {
    return DEFAULT_HEADER;
  }
}

function sanitizeExamQuestions(questions: ExamData['questions']): ExamData['questions'] {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) => {
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
      subQuestions: q.subQuestions?.map((sub) => ({
        ...sub,
        text: cleanPageReferences(sub.text),
      })),
      rubric: {
        ...q.rubric,
        correctCriteria: cleanPageReferences(q.rubric?.correctCriteria || ''),
        sampleCorrectAnswer: cleanPageReferences(q.rubric?.sampleCorrectAnswer || ''),
        partialCriteria: cleanPageReferences(q.rubric?.partialCriteria || ''),
        samplePartialAnswer: cleanPageReferences(q.rubric?.samplePartialAnswer || ''),
        wrongCriteria: cleanPageReferences(q.rubric?.wrongCriteria || ''),
        blankCriteria: cleanPageReferences(q.rubric?.blankCriteria || ''),
        scoringNotes: q.rubric?.scoringNotes ? cleanPageReferences(q.rubric.scoringNotes) : undefined,
      },
    };
  });
}

function cleanDisplayError(msg?: string): string {
  if (!msg) return 'Sınav üretilirken beklenmeyen bir hata oluştu.';
  const str = typeof msg === 'string' ? msg : JSON.stringify(msg);
  if (
    str.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
    str.includes('API key not valid') ||
    str.includes('API_KEY_INVALID') ||
    str.includes('UNAUTHENTICATED') ||
    str.includes('401')
  ) {
    return 'Gemini API anahtarı geçersiz veya yetkilendirilmemiş (401). Lütfen AI Studio panelindeki Settings > Secrets (Ayarlar > Gizli Anahtarlar) bölümünden geçerli bir Gemini API Anahtarı seçtiğinizden veya eklediğinizden emin olunuz.';
  }
  if (str.includes('PERMISSION_DENIED') || str.includes('403')) {
    return 'Gemini API erişim izni reddedildi (403). Lütfen Settings > Secrets panelinden API anahtarınızın model erişim yetkilerini kontrol ediniz.';
  }
  if (str.includes('RESOURCE_EXHAUSTED') || str.includes('429')) {
    return 'Gemini API kullanım kotası aşıldı (429). Lütfen kısa bir süre sonra tekrar deneyiniz veya Settings > Secrets panelinden faturalandırması etkin bir API anahtarı seçiniz.';
  }
  return str;
}

export default function App() {
  const initialAutoSaved = React.useMemo(() => {
    const state = loadAutoSavedState();
    if (state?.examData?.questions) {
      return {
        ...state,
        examData: {
          ...state.examData,
          questions: sanitizeExamQuestions(state.examData.questions),
        },
      };
    }
    return state;
  }, []);

  const [examData, setExamData] = useState<ExamData | null>(() => initialAutoSaved?.examData ?? null);
  const [currentTab, setCurrentTab] = useState<ViewTab>(() => initialAutoSaved?.currentTab ?? 'exam');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [showGeneratorForm, setShowGeneratorForm] = useState<boolean>(() =>
    initialAutoSaved?.examData ? (initialAutoSaved?.showGeneratorForm ?? false) : true
  );
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [regeneratingIds, setRegeneratingIds] = useState<Record<string, boolean>>({});
  const [previousQuestionsMap, setPreviousQuestionsMap] = useState<Record<string, ExamData['questions'][number]>>({});
  const [formResetKey, setFormResetKey] = useState(0);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const [lockedFields, setLockedFields] = useState<Partial<Record<keyof ExamHeader, boolean>>>(() =>
    initialAutoSaved?.lockedFields ?? loadLockedFields()
  );
  const [header, setHeader] = useState<ExamHeader>(() =>
    loadInitialHeader(initialAutoSaved?.lockedFields ?? loadLockedFields())
  );
  const [config, setConfig] = useState<ExamConfig>(() =>
    initialAutoSaved?.config ? { ...DEFAULT_CONFIG, ...initialAutoSaved.config } : DEFAULT_CONFIG
  );
  const [material, setMaterial] = useState<MaterialInput>(() =>
    initialAutoSaved?.material ? { text: '', ...initialAutoSaved.material } : { text: '' }
  );

  // Kullanıcının yaptığı değişiklikleri (başlık ayarları, soru/rubrik düzenlemeleri vb.) periyodik olarak localStorage'a otomatik kaydet
  useAutoSave({
    header,
    lockedFields,
    config,
    examData,
    currentTab,
    showGeneratorForm,
    material,
    intervalMs: 5000,
  });

  const handleToggleLockField = (field: keyof ExamHeader) => {
    setLockedFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // "Yeni Sınav" butonuna tıklandığında uygulamayı yenile, sadece sabitlenen başlık bilgilerini koru
  const handleNewExam = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setExamData(null);
    setError(null);
    setSuccessNotice(null);
    setRegeneratingIds({});
    setPreviousQuestionsMap({});
    setCurrentTab('exam');
    setShowGeneratorForm(true);
    setConfig(DEFAULT_CONFIG);
    setMaterial({ text: '' });
    setFormResetKey((prev) => prev + 1);

    // Yalnızca kullanıcının sabitlediği (kilitlediği) başlık bilgilerini koru
    const nextHeader: ExamHeader = { ...DEFAULT_HEADER };
    (Object.keys(DEFAULT_HEADER) as (keyof ExamHeader)[]).forEach((key) => {
      if (lockedFields[key]) {
        nextHeader[key] = header[key];
      }
    });
    setHeader(nextHeader);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const lockedCount = (Object.keys(DEFAULT_HEADER) as (keyof ExamHeader)[]).filter(
    (k) => !!lockedFields[k]
  ).length;

  // İptal Fonksiyonu
  const handleCancelGenerate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setGenerationStage(0);
    setError('İşlem iptal edildi.');
  };

  // Tekil Soru Yenileme (Alternatif Soru Üretme) Fonksiyonu
  const handleRegenerateQuestion = async (questionIndex: number, customInstruction?: string) => {
    if (!examData) return;
    const targetQuestion = examData.questions[questionIndex];
    if (!targetQuestion) return;

    const qId = targetQuestion.id;
    if (regeneratingIds[qId]) return;

    setRegeneratingIds((prev) => ({ ...prev, [qId]: true }));
    setError(null);

    try {
      const otherQuestions = examData.questions
        .filter((_, idx) => idx !== questionIndex)
        .map((q) => ({
          number: q.number,
          questionText: q.questionText,
          learningOutcome: q.learningOutcome,
        }));

      const response = await fetch('/api/regenerate-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentQuestion: targetQuestion,
          otherQuestions,
          header: examData.header,
          config,
          material: {
            text: material.text,
            pageRangeStart: material.pageRangeStart,
            pageRangeEnd: material.pageRangeEnd,
            syllabusText: material.syllabusText,
            annualPlanText: material.annualPlanText,
            annualPlanScope: material.annualPlanScope,
          },
          customInstruction,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success || !json.question) {
        throw new Error(json.error || 'Alternatif soru üretilirken bir hata oluştu.');
      }

      const gq = json.question;

      // Önceki soruyu geri alma (undo) için sakla
      setPreviousQuestionsMap((prev) => ({
        ...prev,
        [qId]: targetQuestion,
      }));

      const { context: cleanedContext, questionText: cleanedQuestionText, materialRef: extractedMatRef } =
        extractAndCleanMaterialRef(gq.context, gq.questionText, gq.materialRef);

      const replacementQuestion: ExamData['questions'][number] = {
        id: qId,
        number: targetQuestion.number,
        type: gq.type || targetQuestion.type || 'acik_uclu',
        typeLabel: gq.typeLabel || targetQuestion.typeLabel || 'Açık Uçlu Soru',
        learningOutcome: cleanPageReferences(gq.learningOutcome || targetQuestion.learningOutcome),
        processComponent: cleanPageReferences(gq.processComponent || targetQuestion.processComponent),
        context: cleanedContext || '',
        questionText: cleanedQuestionText || '',
        materialRef: extractedMatRef || undefined,
        subQuestions: Array.isArray(gq.subQuestions)
          ? gq.subQuestions.map((sub: any) => ({
              ...sub,
              text: cleanPageReferences(sub.text || ''),
            }))
          : [],
        points: Number(targetQuestion.points) || Number(gq.points) || 10,
        suggestedLines: Number(gq.suggestedLines) || targetQuestion.suggestedLines || 4,
        rubric: {
          correctCriteria: cleanPageReferences(gq.rubric?.correctCriteria || 'Doğru ve eksiksiz cevap verilmiştir.'),
          sampleCorrectAnswer: cleanPageReferences(gq.rubric?.sampleCorrectAnswer || 'İdeal cevap...'),
          partialCriteria: cleanPageReferences(gq.rubric?.partialCriteria || 'Kısmi cevap verilmiştir.'),
          samplePartialAnswer: cleanPageReferences(gq.rubric?.samplePartialAnswer || 'Kısmi cevap örneği...'),
          partialPoints: Number(gq.rubric?.partialPoints) || Math.round((Number(targetQuestion.points) || 10) / 2),
          wrongCriteria: cleanPageReferences(gq.rubric?.wrongCriteria || 'Yanlış veya ilgisiz cevap.'),
          blankCriteria: cleanPageReferences(gq.rubric?.blankCriteria || 'Soru boş bırakılmıştır.'),
          scoringNotes: gq.rubric?.scoringNotes ? cleanPageReferences(gq.rubric.scoringNotes) : undefined,
        },
      };

      setExamData((prev) => {
        if (!prev) return prev;
        const updatedQuestions = prev.questions.map((q) => (q.id === qId ? replacementQuestion : q));
        return {
          ...prev,
          questions: updatedQuestions,
        };
      });

      setSuccessNotice(`${targetQuestion.number}. soru için alternatif soru ve dereceli puanlama anahtarı başarıyla güncellendi.`);
    } catch (err: any) {
      console.error('Tekil soru yenileme hatası:', err);
      setError(cleanDisplayError(err.message || 'Alternatif soru üretilirken bir hata oluştu.'));
    } finally {
      setRegeneratingIds((prev) => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
    }
  };

  // Değiştirilen Soruyu Önceki Haline Geri Alma Fonksiyonu
  const handleUndoQuestion = (questionIndex: number) => {
    if (!examData) return;
    const currentQ = examData.questions[questionIndex];
    if (!currentQ) return;
    const prevQ = previousQuestionsMap[currentQ.id];
    if (!prevQ) return;

    setExamData((prev) => {
      if (!prev) return prev;
      const updatedQuestions = [...prev.questions];
      updatedQuestions[questionIndex] = { ...prevQ, number: currentQ.number };
      return { ...prev, questions: updatedQuestions };
    });

    setPreviousQuestionsMap((prev) => {
      const next = { ...prev };
      delete next[currentQ.id];
      return next;
    });

    setSuccessNotice(`${currentQ.number}. soru önceki haline geri alındı.`);
  };

  // Sınav Oluşturma İstek Fonksiyonu
  const handleGenerateExam = async () => {
    setIsGenerating(true);
    setGenerationStage(1);
    setError(null);
    setSuccessNotice(null);
    setPreviousQuestionsMap({});

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Aşamalı şeffaf ilerleme zamanlayıcıları
    const stageTimer1 = setTimeout(() => setGenerationStage((s) => (s > 0 && s < 2 ? 2 : s)), 1400);
    const stageTimer2 = setTimeout(() => setGenerationStage((s) => (s > 0 && s < 3 ? 3 : s)), 4200);
    const stageTimer3 = setTimeout(() => setGenerationStage((s) => (s > 0 && s < 4 ? 4 : s)), 6800);

    // 150 saniyelik cömert zaman aşımı
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 150000);

    try {
      // Eğer çok büyük bir PDF yüklendiyse ve sayfa aralığı girildiyse ağ yükünü azaltmak için seçili sayfaları filtrele
      let optimizedMaterialText = material.text || '';
      const pStart = parseInt(String(material.pageRangeStart || '').trim(), 10);
      const pEnd = parseInt(String(material.pageRangeEnd || '').trim(), 10);
      if (
        optimizedMaterialText.length > 40000 &&
        optimizedMaterialText.includes('[SAYFA') &&
        (!isNaN(pStart) || !isNaN(pEnd))
      ) {
        const sNum = !isNaN(pStart) && pStart > 0 ? pStart : 1;
        const eNum = !isNaN(pEnd) && pEnd >= sNum ? pEnd : 9999;
        const pageSplitRegex = /===\s*\[SAYFA\s*(\d+)\]\s*===/gi;
        const parts = optimizedMaterialText.split(/===\s*\[SAYFA\s*\d+\]\s*===/gi);
        const matches = [...optimizedMaterialText.matchAll(pageSplitRegex)];
        const selectedBlocks: string[] = [];
        for (let i = 0; i < matches.length; i++) {
          const pNum = parseInt(matches[i][1], 10);
          const pText = (parts[i + 1] || '').trim();
          if (pNum >= sNum && pNum <= eNum && pText) {
            selectedBlocks.push(`=== [SAYFA ${pNum}] ===\n${pText}`);
          }
        }
        if (selectedBlocks.length > 0) {
          optimizedMaterialText = selectedBlocks.join('\n\n');
        }
      }

      const payloadMaterial: MaterialInput = {
        ...material,
        text: optimizedMaterialText,
        // Metin zaten ayıklanmışsa base64 göndererek isteği şişirme
        pdfBase64: optimizedMaterialText ? undefined : material.pdfBase64,
        syllabusPdfBase64: material.syllabusText ? undefined : material.syllabusPdfBase64,
        annualPlanPdfBase64: material.annualPlanText ? undefined : material.annualPlanPdfBase64,
      };

      const response = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          header,
          config,
          material: payloadMaterial,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Sınav hazırlanırken bir sorun oluştu.');
      }

      // Tüm aşamaların tamamlandığını kullanıcıya net şekilde göster
      setGenerationStage(5);
      await new Promise((resolve) => setTimeout(resolve, 450));

      const generated = json.data;

      const userCourse = header.course?.trim() || '';
      const updatedHeader: ExamHeader = {
        ...header,
        course: userCourse,
        teacherBranch: header.teacherBranch || '',
      };
      setHeader(updatedHeader);

      const newExam: ExamData = {
        examTitle: userCourse ? `${userCourse} Dersi ${header.grade} Yazılı Sınavı` : (generated.examTitle || `${header.grade} Yazılı Sınavı`),
        generalInstructions: generated.generalInstructions || header.note,
        header: updatedHeader,
        questions: (generated.questions || []).map((q: any, idx: number) => {
          const { context: cleanedContext, questionText: cleanedQuestionText, materialRef: extractedMatRef } =
            extractAndCleanMaterialRef(q.context, q.questionText, q.materialRef);

          return {
            id: `q-${Date.now()}-${idx}`,
            number: q.number || idx + 1,
            type: q.type || 'acik_uclu',
            typeLabel: q.typeLabel || 'Açık Uçlu Soru',
            learningOutcome: cleanPageReferences(q.learningOutcome || 'MEB TYMM Öğrenme Çıktısı'),
            processComponent: cleanPageReferences(q.processComponent || 'SB1. Süreç Bileşeni'),
            context: cleanedContext || '',
            questionText: cleanedQuestionText || '',
            materialRef: extractedMatRef || undefined,
            subQuestions: (q.subQuestions || []).map((sub: any) => ({
              ...sub,
              text: cleanPageReferences(sub.text || ''),
            })),
            points: Number(q.points) || 10,
            suggestedLines: Number(q.suggestedLines) || 4,
            rubric: {
              correctCriteria: cleanPageReferences(q.rubric?.correctCriteria || 'Doğru ve eksiksiz cevap verilmiştir.'),
              sampleCorrectAnswer: cleanPageReferences(q.rubric?.sampleCorrectAnswer || 'İdeal cevap...'),
              partialCriteria: cleanPageReferences(q.rubric?.partialCriteria || 'Kısmi cevap verilmiştir.'),
              samplePartialAnswer: cleanPageReferences(q.rubric?.samplePartialAnswer || 'Kısmi cevap örneği...'),
              partialPoints: Number(q.rubric?.partialPoints) || 5,
              wrongCriteria: cleanPageReferences(q.rubric?.wrongCriteria || 'Yanlış veya ilgisiz cevap.'),
              blankCriteria: cleanPageReferences(q.rubric?.blankCriteria || 'Soru boş bırakılmıştır.'),
              scoringNotes: q.rubric?.scoringNotes ? cleanPageReferences(q.rubric.scoringNotes) : undefined,
            },
          };
        }),
      };

      setExamData(newExam);
      setShowGeneratorForm(false);
      setCurrentTab('exam');
      const coursePhrase = userCourse ? `${userCourse} dersi için ` : '';
      setSuccessNotice(`Tebrikler! ${coursePhrase}${newExam.questions.length} soru ve dereceli puanlama anahtarı başarıyla hazırlandı.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Sınav üretim hatası:', err);
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        setError('Sınav oluşturma isteği zaman aşımına uğradı. Yüklediğiniz PDF çok büyük olabilir. Lütfen daha az sayfa yükleyiniz veya metin kutusuna ilgili konunun özetini yapıştırarak deneyiniz.');
      } else {
        setError(cleanDisplayError(err.message || 'Sınav üretilirken beklenmeyen bir hata oluştu.'));
      }
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      clearTimeout(timeoutId);
      setIsGenerating(false);
      setGenerationStage(0);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    if (!examData) return;
    const exportMode = currentTab === 'exam' ? 'exam' : currentTab === 'rubric' ? 'rubric' : currentTab === 'matrix' ? 'matrix' : 'both';
    exportExamToWord(examData, exportMode);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-red-500 selection:text-white print:min-h-0 print:bg-white print:p-0 print:m-0">
      {/* Üst Navigasyon */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        hasExam={!!examData && !showGeneratorForm}
        onPrint={handlePrint}
        onExportWord={handleExportWord}
      />

      {/* Sınav Başlık & Okul Ayarları Modalı */}
      <HeaderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        header={header}
        onChange={(updated) => {
          setHeader(updated);
          if (examData) {
            setExamData({ ...examData, header: updated });
          }
        }}
        lockedFields={lockedFields}
        onToggleLockField={handleToggleLockField}
        onSetLockedFields={setLockedFields}
      />

      {/* Ana İçerik */}
      <main className="flex-1 pb-16 print:flex-none print:pb-0 print:p-0 print:m-0">
        
        {/* Materyal Yükleme ve Soru Seçenekleri Formu */}
        {(!examData || showGeneratorForm) && (
          <div className="relative">
            {examData && (
              <div className="max-w-5xl mx-auto px-4 pt-6 flex justify-end print:hidden">
                <button
                  type="button"
                  onClick={() => setShowGeneratorForm(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors"
                >
                  &larr; Mevcut Sınav Kağıdına Geri Dön
                </button>
              </div>
            )}
            <MaterialAndOptionsForm
              key={formResetKey}
              header={header}
              config={config}
              material={material}
              onHeaderChange={setHeader}
              onConfigChange={setConfig}
              onMaterialChange={setMaterial}
              onGenerate={handleGenerateExam}
              onCancelGenerate={handleCancelGenerate}
              onOpenHeaderSettings={() => setIsSettingsOpen(true)}
              onNewExam={handleNewExam}
              lockedCount={lockedCount}
              isGenerating={isGenerating}
              generationStage={generationStage}
              error={error}
            />
          </div>
        )}

        {/* Sınav görünümündeyken Başlık Bilgilerini Düzenle / Sabitle ve Yeni Sınav kartı */}
        {examData && !showGeneratorForm && (
          <div className="max-w-5xl mx-auto px-4 pt-6 print:hidden">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 bg-red-50 text-red-700 rounded-xl shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">
                      Resmî Sınav Başlığı ve Öğretmen Bilgileri
                    </h2>
                    {lockedCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        <Lock className="w-3 h-3 text-amber-700" />
                        {lockedCount} Bilgi Sabitlendi
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Sabitlenmedi
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {header.schoolName || header.teacherName || header.course ? (
                      <span>
                        <strong>Okul:</strong> {header.schoolName || 'Belirtilmedi'} &bull;{' '}
                        <strong>Ders/Sınıf:</strong> {header.course || 'Belirtilmedi'} ({header.grade}) &bull;{' '}
                        <strong>Öğretmen:</strong> {header.teacherName || 'Belirtilmedi'}
                      </span>
                    ) : (
                      'Okul adı, öğretmen adı, branş ve dönem bilgilerinizi girip sabitleyerek her sınavda tekrar yazmaktan kurtulabilirsiniz.'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors"
                >
                  Başlık Bilgilerini Düzenle / Sabitle
                </button>
                <button
                  type="button"
                  onClick={handleNewExam}
                  title="Uygulamayı yenile ve yeni sınav hazırla (Sabitlenen başlık bilgileri korunur)"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-red-600" />
                  <span>Yeni Sınav</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Başarı Bildirimi */}
        {successNotice && !showGeneratorForm && (
          <div className="max-w-5xl mx-auto px-4 pt-4 print:hidden">
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🎉</span>
                <span>{successNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessNotice(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-0.5 rounded hover:bg-emerald-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Hata Bildirimi (Sınav ekranındayken) */}
        {error && !showGeneratorForm && (
          <div className="max-w-5xl mx-auto px-4 pt-4 print:hidden">
            <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-red-900 text-xs font-semibold flex items-center justify-between shadow-xs">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-950 font-bold px-2 py-0.5 rounded hover:bg-red-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Hazır Sınav ve Rubrik Görünümü */}
        {examData && !showGeneratorForm && (
          <div>

            {/* TAB GÖRÜNÜMLERİ */}
            {currentTab === 'exam' && (
              <ExamPaperView
                exam={examData}
                onUpdateExam={setExamData}
                onPrint={handlePrint}
                onExportWord={handleExportWord}
                onSwitchToRubric={() => setCurrentTab('rubric')}
                onRegenerateQuestion={handleRegenerateQuestion}
                onUndoQuestion={handleUndoQuestion}
                regeneratingIds={regeneratingIds}
                previousQuestionsMap={previousQuestionsMap}
              />
            )}

            {currentTab === 'rubric' && (
              <RubricView
                exam={examData}
                onUpdateExam={setExamData}
                onPrint={handlePrint}
                onExportWord={handleExportWord}
                onSwitchToExam={() => setCurrentTab('exam')}
                onRegenerateQuestion={handleRegenerateQuestion}
                regeneratingIds={regeneratingIds}
              />
            )}

            {currentTab === 'matrix' && (
              <MatrixView
                exam={examData}
                onPrint={handlePrint}
                onExportWord={handleExportWord}
                onSwitchToExam={() => setCurrentTab('exam')}
              />
            )}
          </div>
        )}

      </main>

      {/* Alt Footer */}
      <footer className="bg-black py-4 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center text-center">
          <span className="text-sm font-bold text-red-600 tracking-wide">
            Design By TyfR©MaarifSınav
          </span>
        </div>
      </footer>

    </div>
  );
}
