import React, { useState } from 'react';
import { 
  Award, 
  ArrowLeft, 
  Edit3, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  MinusCircle, 
  Info,
  RefreshCw
} from 'lucide-react';
import { ExamData, QuestionRubric } from '../types/exam';
import { cleanPageReferences } from '../utils/cleanText';

interface RubricViewProps {
  exam: ExamData;
  onUpdateExam: (exam: ExamData) => void;
  onPrint: () => void;
  onExportWord: () => void;
  onSwitchToExam: () => void;
  onRegenerateQuestion?: (questionIndex: number, customInstruction?: string) => Promise<void>;
  regeneratingIds?: Record<string, boolean>;
}

export const RubricView: React.FC<RubricViewProps> = ({
  exam,
  onUpdateExam,
  onPrint,
  onExportWord,
  onSwitchToExam,
  onRegenerateQuestion,
  regeneratingIds = {},
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { header, questions } = exam;

  const updateQuestionRubric = (index: number, rubricUpdates: Partial<QuestionRubric>) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      rubric: {
        ...updatedQuestions[index].rubric,
        ...rubricUpdates,
      },
    };
    onUpdateExam({ ...exam, questions: updatedQuestions });
  };

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      
      {/* Action Toolbar (print:hidden) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-6 shadow-xs print:hidden flex flex-wrap items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <button
            onClick={onSwitchToExam}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>1. Sınav Kağıdına Dön</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              2. Aşama: TYMM Cevap Anahtarı (Rubrik)
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Toplam {questions.length} soru &bull; {totalPoints} Puan
            </span>
          </div>
        </div>

      </div>

      {/* A4 RUBRIC SHEET (Kompakt & Kağıt Dostu Bütünleşik Tablo Düzeni) */}
      <div 
        id="exam-rubric-print"
        className="bg-white rounded-xl shadow-xl border border-slate-200/80 p-5 sm:p-7 print:p-0 print:border-none print:shadow-none print:rounded-none text-slate-900 transition-all font-sans"
      >
        
        {/* BÜTÜNLEŞİK RESMÎ BAŞLIK VE BİLGİ TABLOSU */}
        <table className="w-full border-collapse border-2 border-black mb-3 text-xs leading-tight">
          <tbody>
            <tr>
              <td colSpan={4} className="border border-black py-1.5 px-3 text-center">
                <div className="font-bold uppercase tracking-wide text-xs sm:text-sm">
                  T.C. {header.schoolName || 'MİLLÎ EĞİTİM BAKANLIĞI'}
                </div>
                <div className="font-extrabold uppercase text-xs sm:text-sm text-red-950 print:text-black">
                  {header.academicYear} &bull; {header.course ? `${header.course} DERSİ ` : ''}{header.grade} &bull; {header.termAndExam}
                </div>
                <div className="font-bold uppercase text-[11px] text-slate-700 print:text-black mt-0.5">
                  {header.grade?.includes('9')
                    ? 'TÜRKİYE YÜZYILI MAARİF MODELİ (TYMM) CEVAP ANAHTARI VE DERECELİ PUANLAMA ANAHTARI'
                    : 'MEB CEVAP ANAHTARI VE DERECELİ PUANLAMA ANAHTARI'}
                </div>
              </td>
            </tr>
            <tr className="bg-slate-50 print:bg-transparent">
              <td className="border border-black py-1 px-2.5 w-1/4">
                <strong>Ders:</strong> {header.course || '-'}
              </td>
              <td className="border border-black py-1 px-2.5 w-1/4">
                <strong>Sınıf:</strong> {header.grade || '-'}
              </td>
              <td className="border border-black py-1 px-2.5 w-1/4">
                <strong>Sınav Süresi:</strong> {header.duration || '-'}
              </td>
              <td className="border border-black py-1 px-2.5 w-1/4">
                <strong>Toplam Puan:</strong> {totalPoints} Puan
              </td>
            </tr>
          </tbody>
        </table>

        {/* SORU BAZLI BÜTÜNLEŞİK RUBRİK TABLOLARI */}
        <div className="space-y-2.5 print:space-y-2">
          {questions.map((q, idx) => {
            const isEditing = editingIndex === idx;
            const isRegenerating = !!regeneratingIds[q.id];
            const r = q.rubric;

            return (
              <div 
                key={q.id || idx}
                className="relative page-break-inside-avoid"
              >
                {isRegenerating && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] z-20 flex items-center justify-center print:hidden">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full shadow-xs">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                      <span className="text-xs font-bold text-amber-900">
                        Soru {q.number} için alternatif soru ve rubrik üretiliyor...
                      </span>
                    </div>
                  </div>
                )}

                <table className="w-full border-collapse border border-slate-400 print:border-black text-xs leading-snug">
                  <tbody>
                    {/* 1. Üst Başlık Satırı */}
                    <tr className="bg-slate-100 print:bg-slate-100">
                      <td colSpan={2} className="border border-slate-400 print:border-black py-1.5 px-2.5 font-bold text-slate-900">
                        <span>Soru {q.number}</span>
                        <span className="mx-1.5 text-slate-400">&bull;</span>
                        <span className="font-semibold text-slate-700">{q.typeLabel || 'Açık Uçlu Soru'}</span>
                        {q.learningOutcome && (
                          <span className="font-normal text-[11px] text-slate-600 print:text-black ml-2">
                            (<strong>Kazanım:</strong> {cleanPageReferences(q.learningOutcome)}
                            {q.processComponent ? ` | SB: ${cleanPageReferences(q.processComponent)}` : ''})
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-400 print:border-black py-1 px-2 text-right whitespace-nowrap w-[16%]">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {onRegenerateQuestion && (
                            <button
                              type="button"
                              onClick={() => onRegenerateQuestion(idx)}
                              disabled={isRegenerating}
                              className="print:hidden inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded transition-colors disabled:opacity-50"
                              title="Bu soru yerine yeni bir alternatif soru ve cevap anahtarı üret"
                            >
                              <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                              <span>Değiştir</span>
                            </button>
                          )}
                          <span className="font-extrabold text-xs text-red-900 print:text-black">
                            {q.points} Puan
                          </span>
                          <button
                            onClick={() => setEditingIndex(isEditing ? null : idx)}
                            className="print:hidden p-0.5 text-slate-500 hover:text-slate-900 rounded"
                            title="Kriterleri Düzenle"
                          >
                            {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Edit3 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* 2. Soru Kökü Satırı */}
                    <tr>
                      <td colSpan={3} className="border border-slate-300 print:border-black py-1.5 px-2.5 bg-slate-50/50 print:bg-transparent">
                        <span className="font-bold text-slate-800 mr-1">Soru:</span>
                        <span className="italic text-slate-900">{cleanPageReferences(q.questionText)}</span>
                        {q.subQuestions && q.subQuestions.length > 0 && (
                          <div className="mt-1 pl-3 space-y-0.5 not-italic text-[11px]">
                            {q.subQuestions.map((sub, sIdx) => (
                              <div key={sIdx}>
                                <strong>{sub.label}</strong> {cleanPageReferences(sub.text)} <em>({sub.points} P)</em>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>

                    {isEditing ? (
                      <tr>
                        <td colSpan={3} className="border border-slate-300 p-3 bg-red-50/20">
                          <div className="space-y-2.5 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="font-bold text-emerald-800 block mb-0.5">Doğru Cevap (Tam Puan) Kriteri:</label>
                                <textarea
                                  rows={2}
                                  value={r.correctCriteria}
                                  onChange={(e) => updateQuestionRubric(idx, { correctCriteria: e.target.value })}
                                  className="w-full p-1.5 border rounded bg-white text-xs"
                                />
                              </div>
                              <div>
                                <label className="font-bold text-emerald-800 block mb-0.5">Tam Puan Örnek İdeal Cevap:</label>
                                <textarea
                                  rows={2}
                                  value={r.sampleCorrectAnswer}
                                  onChange={(e) => updateQuestionRubric(idx, { sampleCorrectAnswer: e.target.value })}
                                  className="w-full p-1.5 border rounded bg-white text-xs"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="font-bold text-amber-800 block mb-0.5">
                                  Kısmi Cevap Kriteri (Puan: 
                                  <input
                                    type="number"
                                    value={r.partialPoints}
                                    onChange={(e) => updateQuestionRubric(idx, { partialPoints: Number(e.target.value) })}
                                    className="w-12 ml-1 px-1 py-0.5 border rounded inline-block"
                                  /> P):
                                </label>
                                <textarea
                                  rows={2}
                                  value={r.partialCriteria}
                                  onChange={(e) => updateQuestionRubric(idx, { partialCriteria: e.target.value })}
                                  className="w-full p-1.5 border rounded bg-white text-xs"
                                />
                              </div>
                              <div>
                                <label className="font-bold text-amber-800 block mb-0.5">Kısmi Puan Örnek Cevap:</label>
                                <textarea
                                  rows={2}
                                  value={r.samplePartialAnswer}
                                  onChange={(e) => updateQuestionRubric(idx, { samplePartialAnswer: e.target.value })}
                                  className="w-full p-1.5 border rounded bg-white text-xs"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="font-bold text-rose-800 block mb-0.5">Yanlış Cevap Kriteri (0 Puan):</label>
                                <input
                                  type="text"
                                  value={r.wrongCriteria}
                                  onChange={(e) => updateQuestionRubric(idx, { wrongCriteria: e.target.value })}
                                  className="w-full p-1.5 border rounded bg-white text-xs"
                                />
                              </div>
                              <div>
                                <label className="font-bold text-slate-700 block mb-0.5">Boş Cevap Kriteri (0 Puan):</label>
                                <input
                                  type="text"
                                  value={r.blankCriteria}
                                  onChange={(e) => updateQuestionRubric(idx, { blankCriteria: e.target.value })}
                                  className="w-full p-1.5 border rounded bg-white text-xs"
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => setEditingIndex(null)}
                              className="px-3 py-1 bg-slate-900 text-white rounded font-bold text-xs"
                            >
                              Kriterleri Kaydet
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {/* 3. TAM PUAN (DOĞRU CEVAP) */}
                        <tr className="bg-emerald-50/20 print:bg-transparent">
                          <td className="border border-slate-300 print:border-black py-1.5 px-2.5 w-[20%] align-top font-bold text-emerald-900 print:text-black">
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 print:hidden" />
                              <span>Tam Puan</span>
                            </div>
                            <span className="text-[10px] font-normal text-slate-600 block">(Doğru Cevap)</span>
                          </td>
                          <td className="border border-slate-300 print:border-black py-1.5 px-2.5 w-[68%] align-top">
                            <div>
                              <strong>Kriter:</strong> {r.correctCriteria}
                            </div>
                            {r.sampleCorrectAnswer && (
                              <div className="mt-0.5 text-slate-800 print:text-black">
                                <strong className="text-emerald-900 print:text-black">Örnek Cevap:</strong>{' '}
                                <span className="italic">"{r.sampleCorrectAnswer}"</span>
                              </div>
                            )}
                          </td>
                          <td className="border border-slate-300 print:border-black py-1.5 px-2 w-[12%] align-middle text-center font-extrabold text-emerald-900 print:text-black">
                            {q.points} Puan
                          </td>
                        </tr>

                        {/* 4. KISMİ PUAN (KISMİ CEVAP) */}
                        <tr className="bg-amber-50/20 print:bg-transparent">
                          <td className="border border-slate-300 print:border-black py-1.5 px-2.5 align-top font-bold text-amber-900 print:text-black">
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 print:hidden" />
                              <span>Kısmi Puan</span>
                            </div>
                            <span className="text-[10px] font-normal text-slate-600 block">(Kısmi Cevap)</span>
                          </td>
                          <td className="border border-slate-300 print:border-black py-1.5 px-2.5 align-top">
                            <div>
                              <strong>Kriter:</strong> {r.partialCriteria}
                            </div>
                            {r.samplePartialAnswer && (
                              <div className="mt-0.5 text-slate-800 print:text-black">
                                <strong className="text-amber-900 print:text-black">Örnek Kısmi Cevap:</strong>{' '}
                                <span className="italic">"{r.samplePartialAnswer}"</span>
                              </div>
                            )}
                          </td>
                          <td className="border border-slate-300 print:border-black py-1.5 px-2 align-middle text-center font-bold text-amber-900 print:text-black">
                            {r.partialPoints} Puan
                          </td>
                        </tr>

                        {/* 5. YANLIŞ / BOŞ CEVAP (0 PUAN - Tek Kompakt Satır) */}
                        <tr className="print:bg-transparent">
                          <td className="border border-slate-300 print:border-black py-1 px-2.5 align-top font-semibold text-slate-700 print:text-black">
                            <div className="flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 print:hidden" />
                              <MinusCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 print:hidden" />
                              <span>Yanlış / Boş</span>
                            </div>
                          </td>
                          <td className="border border-slate-300 print:border-black py-1 px-2.5 align-top text-[11px] text-slate-700 print:text-black">
                            <strong>Yanlış:</strong> {r.wrongCriteria || 'Konuyla ilgisiz veya yanlış yanıt.'}
                            <span className="mx-1.5 text-slate-400">|</span>
                            <strong>Boş:</strong> {r.blankCriteria || 'Soruya yanıt verilmemiştir.'}
                          </td>
                          <td className="border border-slate-300 print:border-black py-1 px-2 align-middle text-center font-bold text-slate-600 print:text-black">
                            0 Puan
                          </td>
                        </tr>
                      </>
                    )}

                    {/* Öğretmen Puanlama Notu (Varsa) */}
                    {r.scoringNotes && (
                      <tr>
                        <td colSpan={3} className="border border-slate-300 print:border-black py-1 px-2.5 bg-slate-50 print:bg-transparent text-[11px] text-slate-600 print:text-black">
                          <span className="inline-flex items-center gap-1">
                            <Info className="w-3 h-3 text-blue-600 shrink-0 print:hidden" />
                            <strong>Ölçme Notu:</strong> {r.scoringNotes}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

              </div>
            );
          })}
        </div>

        {/* EN ALT ÖĞRETMEN İMZA ALANI (Kompakt Tek Satır) */}
        <div className="mt-4 pt-2 border-t border-black page-break-inside-avoid">
          <div className="flex items-center justify-between text-[11px] sm:text-xs leading-tight">
            <div>
              <span className="font-semibold text-slate-700 print:text-black">
                {header.grade?.includes('9') ? 'Türkiye Yüzyılı Maarif Modeli Ölçme ve Değerlendirme Kriterleri' : 'MEB Ortaöğretim Ölçme ve Değerlendirme Kriterleri'}
              </span>
              <span className="mx-2 text-slate-400">|</span>
              <span className="text-slate-500 print:text-black">
                Tarih: {header.date || new Date().toLocaleDateString('tr-TR')}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="font-bold">
                {header.teacherName || '................................'}
              </span>
              {header.teacherBranch ? <span className="ml-1">({header.teacherBranch})</span> : null}
              <span className="mx-2 text-slate-400">|</span>
              <span className="font-medium">İmza: ........................</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
