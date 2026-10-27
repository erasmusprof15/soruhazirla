import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeaderSettingsModal } from './components/HeaderSettingsModal';
import { MaterialAndOptionsForm } from './components/MaterialAndOptionsForm';
import { ExamPaperView } from './components/ExamPaperView';
import { RubricView } from './components/RubricView';
import { MatrixView } from './components/MatrixView';
import { ExamData, ExamHeader, ExamConfig, MaterialInput, ViewTab } from './types/exam';
import { exportExamToWord } from './utils/export';
import { cleanPageReferences } from './utils/cleanText';

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

const LOCKED_FIELDS_STORAGE_KEY = 'maarif_locked_header_fields_v1';
const SAVED_HEADER_STORAGE_KEY = 'maarif_saved_header_v1';

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

export default function App() {
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [currentTab, setCurrentTab] = useState<ViewTab>('exam');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [showGeneratorForm, setShowGeneratorForm] = useState(true);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [regeneratingIds, setRegeneratingIds] = useState<Record<string, boolean>>({});
  const [previousQuestionsMap, setPreviousQuestionsMap] = useState<Record<string, ExamData['questions'][number]>>({});
  const [formResetKey, setFormResetKey] = useState(0);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const [lockedFields, setLockedFields] = useState<Partial<Record<keyof ExamHeader, boolean>>>(() =>
    loadLockedFields()
  );
  const [header, setHeader] = useState<ExamHeader>(() =>
    loadInitialHeader(loadLockedFields())
  );
  const [config, setConfig] = useState<ExamConfig>(DEFAULT_CONFIG);
  const [material, setMaterial] = useState<MaterialInput>({
    text: '',
  });

  // Başlık veya kilit durumu değiştikçe localStorage'a kaydet
  React.useEffect(() => {
    try {
      localStorage.setItem(LOCKED_FIELDS_STORAGE_KEY, JSON.stringify(lockedFields));
      localStorage.setItem(SAVED_HEADER_STORAGE_KEY, JSON.stringify(header));
    } catch {
      // ignore storage errors
    }
  }, [header, lockedFields]);

  const handleToggleLockField = (field: keyof ExamHeader) => {
    setLockedFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Sağ üstteki "Yeni Sınav" butonuna tıklandığında uygulamayı yenile, sadece sabitlenen başlık bilgilerini koru
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

      const replacementQuestion: ExamData['questions'][number] = {
        id: qId,
        number: targetQuestion.number,
        type: gq.type || targetQuestion.type || 'acik_uclu',
        typeLabel: gq.typeLabel || targetQuestion.typeLabel || 'Açık Uçlu Soru',
        learningOutcome: cleanPageReferences(gq.learningOutcome || targetQuestion.learningOutcome),
        processComponent: cleanPageReferences(gq.processComponent || targetQuestion.processComponent),
        context: cleanPageReferences(gq.context || ''),
        questionText: cleanPageReferences(gq.questionText || ''),
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
      setError(err.message || 'Alternatif soru üretilirken bir hata oluştu.');
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
    const stageTimer1 = setTimeout(() => setGenerationStage((s) => (s > 0 && s < 2 ? 2 : s)), 1100);
    const stageTimer2 = setTimeout(() => setGenerationStage((s) => (s > 0 && s < 3 ? 3 : s)), 3200);
    const stageTimer3 = setTimeout(() => setGenerationStage((s) => (s > 0 && s < 4 ? 4 : s)), 5200);

    // 120 saniyelik cömert zaman aşımı
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 120000);

    try {
      const response = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          header,
          config,
          material,
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
        questions: (generated.questions || []).map((q: any, idx: number) => ({
          id: `q-${Date.now()}-${idx}`,
          number: q.number || idx + 1,
          type: q.type || 'acik_uclu',
          typeLabel: q.typeLabel || 'Açık Uçlu Soru',
          learningOutcome: cleanPageReferences(q.learningOutcome || 'MEB TYMM Öğrenme Çıktısı'),
          processComponent: cleanPageReferences(q.processComponent || 'SB1. Süreç Bileşeni'),
          context: cleanPageReferences(q.context || ''),
          questionText: cleanPageReferences(q.questionText || ''),
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
        })),
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
        setError(err.message || 'Sınav üretilirken beklenmeyen bir hata oluştu.');
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Üst Navigasyon */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        hasExam={!!examData}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onPrint={handlePrint}
        onExportWord={handleExportWord}
        onNewExam={handleNewExam}
        isGenerating={isGenerating}
        lockedCount={lockedCount}
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
      <main className="flex-1 pb-16">
        
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
              lockedCount={lockedCount}
              isGenerating={isGenerating}
              generationStage={generationStage}
              error={error}
            />
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
      <footer className="bg-white border-t border-slate-200 py-6 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">MaarifSınav</span>
          </div>
          <div className="flex items-center gap-4 font-semibold text-slate-700">
            <span>Design By T.ÜNAL</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
