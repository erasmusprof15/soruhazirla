import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  MoveUp, 
  MoveDown, 
  Eye, 
  EyeOff,
  RefreshCw,
  Sparkles,
  RotateCcw,
  X
} from 'lucide-react';
import { ExamData, ExamQuestion } from '../types/exam';
import { cleanPageReferences } from '../utils/cleanText';

interface ExamPaperViewProps {
  exam: ExamData;
  onUpdateExam: (exam: ExamData) => void;
  onPrint: () => void;
  onExportWord: () => void;
  onSwitchToRubric: () => void;
  onRegenerateQuestion?: (questionIndex: number, customInstruction?: string) => Promise<void>;
  onUndoQuestion?: (questionIndex: number) => void;
  regeneratingIds?: Record<string, boolean>;
  previousQuestionsMap?: Record<string, ExamQuestion>;
}

export const ExamPaperView: React.FC<ExamPaperViewProps> = ({
  exam,
  onUpdateExam,
  onPrint,
  onExportWord,
  onSwitchToRubric,
  onRegenerateQuestion,
  onUndoQuestion,
  regeneratingIds = {},
  previousQuestionsMap = {},
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [customRegenInstruction, setCustomRegenInstruction] = useState<Record<string, string>>({});
  const [showOutcomesOnPaper, setShowOutcomesOnPaper] = useState(false);
  const [lineStyle, setLineStyle] = useState<'dotted' | 'solid' | 'box'>('dotted');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  const { header, questions } = exam;

  // Soru Düzenleme
  const updateQuestion = (index: number, updated: Partial<ExamQuestion>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updated };
    onUpdateExam({ ...exam, questions: newQuestions });
  };

  // Soru Silme
  const deleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      return;
    }
    const newQuestions = questions.filter((_, i) => i !== index);
    // Numaraları yeniden sırala
    const reindexed = newQuestions.map((q, idx) => ({ ...q, number: idx + 1 }));
    onUpdateExam({ ...exam, questions: reindexed });
  };

  // Soru Ekleme
  const addQuestion = () => {
    const newNumber = questions.length + 1;
    const newQ: ExamQuestion = {
      id: `q-${Date.now()}`,
      number: newNumber,
      type: 'acik_uclu',
      typeLabel: 'Açık Uçlu Soru',
      learningOutcome: `${header.course.substring(0, 3).toUpperCase()}.${header.grade.charAt(0)}.1.1. Yeni Öğrenme Çıktısı`,
      processComponent: 'SB1.2. Çıkarım Yapma ve Değerlendirme',
      context: 'İlgili durum veya metin bağlamı buraya yazılabilir...',
      questionText: 'Metinden hareketle gerekçelendirerek açıklayınız.',
      points: 10,
      suggestedLines: 5,
      rubric: {
        correctCriteria: 'Eksiksiz ve doğru gerekçelendirme yapılmıştır.',
        sampleCorrectAnswer: 'Örnek tam puanlık cevap metni...',
        partialCriteria: 'Kavram anlaşılmış ancak açıklama yetersizdir.',
        samplePartialAnswer: 'Örnek kısmi cevap metni...',
        partialPoints: 5,
        wrongCriteria: 'Konuyla ilgisiz veya yanlış cevap verilmiştir.',
        blankCriteria: 'Soru boş bırakılmıştır.',
      },
    };
    onUpdateExam({ ...exam, questions: [...questions, newQ] });
    setEditingId(newQ.id);
  };

  // Soru Sırasını Değiştir
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= questions.length) return;
    const newQuestions = [...questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[target];
    newQuestions[target] = temp;
    const reindexed = newQuestions.map((q, idx) => ({ ...q, number: idx + 1 }));
    onUpdateExam({ ...exam, questions: reindexed });
  };

  const triggerRegenerate = async (idx: number, qId: string, instruction?: string) => {
    if (!onRegenerateQuestion) return;
    await onRegenerateQuestion(idx, instruction);
    setSelectedQuestionId(null);
    setCustomRegenInstruction((prev) => ({ ...prev, [qId]: '' }));
  };

  const totalCalculatedPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      
      {/* Action Bar / Controls (Excluded from print) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-3 shadow-xs print:hidden flex flex-wrap items-center justify-between gap-4">
        
        {/* Left Options */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowOutcomesOnPaper(!showOutcomesOnPaper)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              showOutcomesOnPaper
                ? 'bg-red-50 text-red-700 border-red-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Öğrenci kağıdında TYMM kazanım ve süreç bileşeni etiketlerini göster/gizle"
          >
            {showOutcomesOnPaper ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Kazanım Etiketleri: {showOutcomesOnPaper ? 'Görünüyor' : 'Gizli'}</span>
          </button>

          {/* Line Style */}
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <span className="text-[11px] text-slate-400">Çizgi:</span>
            {(['dotted', 'solid', 'box'] as const).map((style) => (
              <button
                key={style}
                onClick={() => setLineStyle(style)}
                className={`px-2 py-1 rounded text-[11px] font-medium border ${
                  lineStyle === style
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {style === 'dotted' ? 'Noktalı' : style === 'solid' ? 'Düz' : 'Kutu'}
              </button>
            ))}
          </div>

          {/* Font Size */}
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <span className="text-[11px] text-slate-400">Boyut:</span>
            {(['sm', 'base', 'lg'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`px-2 py-1 rounded text-[11px] font-medium border ${
                  fontSize === size
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {size === 'sm' ? 'Küçük' : size === 'base' ? 'Normal' : 'Büyük'}
              </button>
            ))}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={addQuestion}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Soru Ekle</span>
          </button>
        </div>

      </div>

      {/* Bilgilendirme Bandı: Tıkla ve Alternatif Soru Üret (print:hidden) */}
      <div className="mb-6 px-4 py-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 print:hidden">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>İpucu:</strong> Beğenmediğiniz veya değiştirmek istediğiniz herhangi bir <strong>sorunun üzerine tıklayarak</strong> sadece o soru için yeni bir alternatif soru üretebilirsiniz.
          </span>
        </div>
      </div>

      {/* A4 PAPER CONTAINER */}
      <div 
        id="exam-paper-print"
        className={`bg-white rounded-xl shadow-xl border border-slate-200/80 p-8 sm:p-12 print:p-0 print:border-none print:shadow-none print:rounded-none text-slate-900 transition-all font-serif ${
          fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm'
        }`}
        style={{ minHeight: '29.7cm' }}
      >
        
        {/* RESMÎ MEB SINAV BAŞLIĞI */}
        <div className="border-2 border-black p-4 mb-4 text-center">
          <div className="text-sm sm:text-base font-bold tracking-wider uppercase mb-1">
            T.C.
          </div>
          <div className="text-base sm:text-lg font-extrabold tracking-wide uppercase mb-1">
            {header.schoolName}
          </div>
          <div className="text-xs sm:text-sm font-bold uppercase tracking-normal">
            {header.academicYear} &bull; {header.termAndExam}
          </div>
        </div>

        {/* ÖĞRENCİ VE DERS BİLGİ TABLOSU */}
        <table className="w-full border-collapse border border-black mb-6 text-xs sm:text-sm">
          <tbody>
            <tr>
              <td className="border border-black p-2 font-semibold w-1/4 bg-slate-50/50 print:bg-transparent">
                DERS:
              </td>
              <td className="border border-black p-2 w-1/4 font-bold">
                {header.course}
              </td>
              <td className="border border-black p-2 font-semibold w-1/4 bg-slate-50/50 print:bg-transparent">
                ADI SOYADI:
              </td>
              <td className="border border-black p-2 w-1/4">
                &nbsp;
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-semibold bg-slate-50/50 print:bg-transparent">
                SINIFI / ŞUBESİ:
              </td>
              <td className="border border-black p-2 font-bold">
                {header.grade} / ...........
              </td>
              <td className="border border-black p-2 font-semibold bg-slate-50/50 print:bg-transparent">
                NUMARASI:
              </td>
              <td className="border border-black p-2">
                &nbsp;
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-semibold bg-slate-50/50 print:bg-transparent">
                TARİH:
              </td>
              <td className="border border-black p-2">
                {header.date || '..... / ..... / 202...'}
              </td>
              <td className="border border-black p-2 font-semibold bg-slate-50/50 print:bg-transparent">
                ALDIĞI NOT:
              </td>
              <td className="border border-black p-2 text-xs">
                <div className="flex flex-col gap-1">
                  <div><strong>Rakamla:</strong> ..............................</div>
                  <div><strong>Yazıyla:</strong> ..............................</div>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-black p-2 text-xs italic bg-slate-100/70 print:bg-transparent">
                <div className="flex items-center justify-between">
                  <span><strong>Sınav Süresi:</strong> {header.duration}</span>
                  <span><strong>Toplam Puan:</strong> {totalCalculatedPoints} Puan</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* SORULAR LİSTESİ */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const isEditing = editingId === q.id;
            const isSelected = selectedQuestionId === q.id;
            const isRegenerating = !!regeneratingIds[q.id];
            const hasPreviousVersion = !!previousQuestionsMap[q.id];

            return (
              <div 
                key={q.id || idx} 
                className={`relative group page-break-inside-avoid transition-all ${
                  isEditing
                    ? 'p-4 rounded-xl bg-red-50/30 border-2 border-red-300'
                    : isSelected
                    ? 'p-3 -mx-3 rounded-xl bg-amber-50/40 ring-2 ring-amber-400 print:p-0 print:mx-0 print:bg-transparent print:ring-0'
                    : 'hover:bg-slate-50/80 hover:ring-1 hover:ring-slate-300 p-2 -mx-2 rounded-xl print:p-0 print:mx-0 print:hover:bg-transparent print:hover:ring-0'
                }`}
              >
                {/* Yükleniyor (Alternatif Soru Üretiliyor) Katmanı */}
                {isRegenerating && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] z-20 rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-amber-400 print:hidden">
                    <div className="flex items-center gap-2.5 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full shadow-xs">
                      <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                      <span className="font-sans text-xs font-bold text-amber-900">
                        Soru {q.number} için alternatif soru ve cevap anahtarı üretiliyor...
                      </span>
                    </div>
                  </div>
                )}

                {/* Üst Sağ Hızlı Aksiyon Çubuğu (print:hidden) */}
                <div className={`absolute right-2 top-2 ${isSelected ? 'flex' : 'hidden group-hover:flex'} print:hidden items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm z-10 font-sans`}>
                  {onRegenerateQuestion && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerRegenerate(idx, q.id);
                      }}
                      disabled={isRegenerating}
                      title="Bu soru yerine hemen yeni bir alternatif soru üret"
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                      <span>Alternatif Soru Üret</span>
                    </button>
                  )}

                  {hasPreviousVersion && onUndoQuestion && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUndoQuestion(idx);
                      }}
                      title="Önceki soruya geri dön"
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Geri Al</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveQuestion(idx, 'up');
                    }}
                    disabled={idx === 0}
                    title="Yukarı taşı"
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveQuestion(idx, 'down');
                    }}
                    disabled={idx === questions.length - 1}
                    title="Aşağı taşı"
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedQuestionId(null);
                      setEditingId(isEditing ? null : q.id);
                    }}
                    title={isEditing ? 'Tamamla' : 'Soruyu Manuel Düzenle'}
                    className="p-1 text-slate-500 hover:text-red-600"
                  >
                    {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Edit3 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteQuestion(idx);
                    }}
                    title="Soruyu Sil"
                    className="p-1 text-slate-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sorunun Üzerine Tıklandığında Açılan Alternatif Soru Üretim Paneli (print:hidden) */}
                {isSelected && !isEditing && onRegenerateQuestion && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mb-3 p-3.5 bg-white border-2 border-amber-400 rounded-xl shadow-md font-sans text-xs space-y-2.5 print:hidden"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-extrabold rounded text-[11px]">
                          Soru {q.number} Seçildi
                        </span>
                        <span className="font-bold text-slate-800">
                          Bu soru yerine nasıl bir alternatif soru üretilsin?
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedQuestionId(null)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                        title="Kapat"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => triggerRegenerate(idx, q.id)}
                        disabled={isRegenerating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Hemen Alternatif Soru Üret (Aynı Kazanım)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerRegenerate(idx, q.id, 'Farklı bir günlük hayat senaryosu veya örnek olay kullanarak yeni bir soru üret.')}
                        disabled={isRegenerating}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors"
                      >
                        ✨ Farklı Senaryo / Örnek Olay
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerRegenerate(idx, q.id, 'Daha temel düzeyde, anlaşılır ve daha kolay cevaplanabilir bir soru üret.')}
                        disabled={isRegenerating}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors"
                      >
                        📉 Daha Kolay Olsun
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerRegenerate(idx, q.id, 'Analiz, çıkarım ve üst düzey eleştirel düşünme gerektiren daha zor bir soru üret.')}
                        disabled={isRegenerating}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors"
                      >
                        📈 Daha Zor / Yorum Ağırlıklı
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerRegenerate(idx, q.id, 'Deney, gözlem veya karşılaştırmalı veri/vaka analizi içeren bir soru üret.')}
                        disabled={isRegenerating}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors"
                      >
                        🧪 Deney / Vaka Analizi
                      </button>

                      {hasPreviousVersion && onUndoQuestion && (
                        <button
                          type="button"
                          onClick={() => {
                            onUndoQuestion(idx);
                            setSelectedQuestionId(null);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Önceki Soruya Dön</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={customRegenInstruction[q.id] || ''}
                        onChange={(e) =>
                          setCustomRegenInstruction((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (customRegenInstruction[q.id] || '').trim()) {
                            triggerRegenerate(idx, q.id, customRegenInstruction[q.id]);
                          }
                        }}
                        placeholder="Özel bir isteğiniz varsa yazın (örn: 'Enzimlerin çalışma hızını etkileyen faktörlerden sor')..."
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => triggerRegenerate(idx, q.id, customRegenInstruction[q.id])}
                        disabled={isRegenerating || !(customRegenInstruction[q.id] || '').trim()}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-lg transition-colors shrink-0"
                      >
                        Özel İstekle Üret
                      </button>
                    </div>
                  </div>
                )}

                {isEditing ? (
                  /* INLINE EDIT MODE */
                  <div className="space-y-3 font-sans text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-red-200">
                      <span className="font-bold text-red-900">Soru #{q.number} Düzenleniyor</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1">
                          <span>Puan:</span>
                          <input
                            type="number"
                            value={q.points}
                            onChange={(e) => updateQuestion(idx, { points: Number(e.target.value) })}
                            className="w-16 px-2 py-1 border rounded"
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          <span>Satır Sayısı:</span>
                          <input
                            type="number"
                            min="2"
                            max="15"
                            value={q.suggestedLines}
                            onChange={(e) => updateQuestion(idx, { suggestedLines: Number(e.target.value) })}
                            className="w-14 px-2 py-1 border rounded"
                          />
                        </label>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 bg-red-600 text-white font-bold rounded"
                        >
                          Tamam
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold block mb-0.5">Bağlam Metni / Senaryo (Varsa):</label>
                      <textarea
                        rows={3}
                        value={q.context || ''}
                        onChange={(e) => updateQuestion(idx, { context: e.target.value })}
                        className="w-full p-2 border rounded text-xs bg-white"
                        placeholder="Metin parçası, şiir, vaka veya öncül bilgi..."
                      />
                    </div>

                    <div>
                      <label className="font-semibold block mb-0.5">Soru Kökü:</label>
                      <textarea
                        rows={2}
                        value={q.questionText}
                        onChange={(e) => updateQuestion(idx, { questionText: e.target.value })}
                        className="w-full p-2 border rounded text-xs bg-white font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <label className="font-semibold block mb-0.5">Öğrenme Çıktısı:</label>
                        <input
                          type="text"
                          value={q.learningOutcome}
                          onChange={(e) => updateQuestion(idx, { learningOutcome: e.target.value })}
                          className="w-full p-1.5 border rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-semibold block mb-0.5">Süreç Bileşeni (SB):</label>
                        <input
                          type="text"
                          value={q.processComponent}
                          onChange={(e) => updateQuestion(idx, { processComponent: e.target.value })}
                          className="w-full p-1.5 border rounded bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* NORMAL QUESTION DISPLAY (Tıklanınca alternatif soru üretim paneli açılır) */
                  <div
                    onClick={() => setSelectedQuestionId(isSelected ? null : q.id)}
                    className="cursor-pointer"
                    title="Bu soruyu değiştirmek / alternatif soru üretmek için tıklayın"
                  >
                    {/* Soru Başlığı */}
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-bold text-base sm:text-lg">
                          {q.number}.
                        </span>
                        <span className="font-bold text-sm sm:text-base">
                          ({q.points} Puan)
                        </span>
                        
                        {/* TYMM Etiketi (Opsiyonel) */}
                        {showOutcomesOnPaper && (
                          <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                            {q.learningOutcome} &bull; {q.processComponent}
                          </span>
                        )}

                        <span className="hidden group-hover:inline-flex print:hidden items-center gap-1 text-[11px] font-sans font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <RefreshCw className="w-2.5 h-2.5" />
                          Değiştirmek için soruya tıklayın
                        </span>
                      </div>
                    </div>

                    {/* Soru Bağlamı / Senaryosu (Varsa) */}
                    {cleanPageReferences(q.context) && (
                      <div className="border-l-2 border-black pl-3.5 py-1 mb-2.5 italic text-slate-800 text-justify bg-slate-50/40 print:bg-transparent">
                        {cleanPageReferences(q.context)}
                      </div>
                    )}

                    {/* Soru Kökü */}
                    <div className="font-bold mb-2 text-justify leading-relaxed">
                      {cleanPageReferences(q.questionText)}
                    </div>

                    {/* Alt Sorular (Maddeli için) */}
                    {q.subQuestions && q.subQuestions.length > 0 && (
                      <div className="pl-4 space-y-1.5 mb-2 font-medium">
                        {q.subQuestions.map((sub, sIdx) => (
                          <div key={sIdx} className="flex items-start gap-2">
                            <span className="font-bold">{sub.label}</span>
                            <span className="flex-1">{cleanPageReferences(sub.text)}</span>
                            <span className="text-xs italic">({sub.points} Puan)</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CEVAPLAMA ALANI (Noktalı / Çizgili / Boşluk) */}
                    <div className="mt-2 mb-2">
                      {lineStyle === 'box' ? (
                        <div 
                          className="border border-slate-400 rounded p-2 text-[10px] text-slate-400 font-sans"
                          style={{ minHeight: `${Math.max(60, q.suggestedLines * 22)}px` }}
                        >
                          Cevap:
                        </div>
                      ) : (
                        <div className="space-y-4 pt-1">
                          {Array.from({ length: q.suggestedLines || 4 }).map((_, lineIdx) => (
                            <div 
                              key={lineIdx} 
                              className={`w-full ${
                                lineStyle === 'dotted'
                                  ? 'border-b border-dotted border-slate-400'
                                  : 'border-b border-slate-300'
                              }`} 
                            />
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>

        {/* EN ALT BİLGİ: ÖĞRETMEN VE İMZA ALANI */}
        <div className="mt-12 pt-6 border-t-2 border-black page-break-inside-avoid">
          <div className="flex items-end justify-between text-xs sm:text-sm">
            
            <div className="space-y-1">
              <p className="font-bold italic">
                {header.note || 'Soruları dikkatlice okuyunuz. Her sorunun cevabını altına bırakılan alana okunaklı şekilde yazınız. Başarılar dileriz.'}
              </p>
            </div>

            <div className="text-right space-y-1">
              <p className="font-bold text-sm">
                {header.teacherName || '................................'}
              </p>
              <p className="text-xs">
                {header.teacherBranch || ''}
              </p>
              <p className="pt-4 text-xs font-medium">
                İmza: ........................................
              </p>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
