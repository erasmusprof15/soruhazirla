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
  Printer,
  Download,
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

        {/* Aksiyon Butonları */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportWord}
            title="Cevap Anahtarını Word (.doc) olarak indir"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Word İndir (Cevap Anahtarı)</span>
          </button>

          <button
            type="button"
            onClick={onPrint}
            title="Cevap Anahtarını yazdır veya PDF olarak kaydet"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-white" />
            <span>Yazdır (A4)</span>
          </button>
        </div>

      </div>

      {/* A4 RUBRIC SHEET */}
      <div 
        id="exam-rubric-print"
        className="bg-white rounded-xl shadow-xl border border-slate-200/80 p-8 sm:p-10 print:p-0 print:border-none print:shadow-none print:rounded-none text-slate-900 transition-all font-sans"
        style={{ minHeight: '29.7cm' }}
      >
        
        {/* RESMÎ BAŞLIK */}
        <div className="border-2 border-black p-4 mb-6 text-center">
          <div className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-1">
            T.C. {header.schoolName}
          </div>
          <div className="text-sm sm:text-base font-extrabold uppercase tracking-wide mb-1 text-red-950 print:text-black">
            {header.academicYear} &bull; {header.course} DERSİ {header.grade}
          </div>
          <div className="text-xs sm:text-sm font-bold uppercase tracking-normal text-slate-700 print:text-black">
            {header.termAndExam} &bull; {header.grade?.includes('9') ? 'TÜRKİYE YÜZYILI MAARİF MODELİ (TYMM) DERECELİ PUANLAMA ANAHTARI' : 'MEB DERECELİ PUANLAMA ANAHTARI'}
          </div>
        </div>

        {/* BİLGİLENDİRME BANT */}
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 mb-6 text-xs text-slate-700 print:border-black print:bg-transparent">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><strong>Ders:</strong> {header.course}</div>
            <div><strong>Sınıf:</strong> {header.grade}</div>
            <div><strong>Sınav Süresi:</strong> {header.duration}</div>
            <div><strong>Sınav Toplamı:</strong> {totalPoints} Puan</div>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-slate-200 print:border-black text-[11px] text-slate-600 print:text-black font-medium">
            * Öğrenme Çıktısı (Kazanım) ve TYMM Süreç Bileşeni (SB) sütunundaki bilgiler "ders bilgi formu" dokümanından yararlanılarak hazırlanmıştır.
          </div>
        </div>

        {/* SORU BAZLI DETAYLI RUBRİK LİSTESİ */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const isEditing = editingIndex === idx;
            const isRegenerating = !!regeneratingIds[q.id];
            const r = q.rubric;

            return (
              <div 
                key={q.id || idx}
                className="relative border-2 border-slate-300 print:border-black rounded-xl overflow-hidden page-break-inside-avoid"
              >
                {isRegenerating && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] z-20 flex items-center justify-center print:hidden">
                    <div className="flex items-center gap-2.5 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full shadow-xs">
                      <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                      <span className="text-xs font-bold text-amber-900">
                        Soru {q.number} için alternatif soru ve rubrik üretiliyor...
                      </span>
                    </div>
                  </div>
                )}

                {/* Soru Başlık Çubuğu */}
                <div className="bg-slate-100 print:bg-slate-200 p-3 border-b-2 border-slate-300 print:border-black flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">
                      Soru {q.number} ({q.points} Puan) &bull; <span className="font-semibold text-slate-700">{q.typeLabel}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onRegenerateQuestion && (
                      <button
                        type="button"
                        onClick={() => onRegenerateQuestion(idx)}
                        disabled={isRegenerating}
                        className="print:hidden flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors disabled:opacity-50"
                        title="Bu soru yerine yeni bir alternatif soru ve cevap anahtarı üret"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                        <span>Alternatif Soru Üret</span>
                      </button>
                    )}

                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 print:border-black">
                      Tam Puan: {q.points} P
                    </span>
                    <button
                      onClick={() => setEditingIndex(isEditing ? null : idx)}
                      className="print:hidden p-1 text-slate-500 hover:text-slate-900 rounded"
                      title="Kriterleri Düzenle"
                    >
                      {isEditing ? <Check className="w-4 h-4 text-emerald-600" /> : <Edit3 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Soru Kökü ve TYMM Süreç Bileşeni Özeti */}
                <div className="p-4 bg-slate-50/60 print:bg-transparent border-b border-slate-200 text-xs space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-2 bg-white print:border print:border-slate-300 rounded-lg border border-slate-200">
                      <strong className="text-red-900 block font-bold mb-0.5">
                        Öğrenme Çıktısı (Kazanım):
                      </strong>
                      <span>{cleanPageReferences(q.learningOutcome)}</span>
                    </div>
                    <div className="p-2 bg-white print:border print:border-slate-300 rounded-lg border border-slate-200">
                      <strong className="text-blue-900 block font-bold mb-0.5">
                        TYMM Süreç Bileşeni (SB):
                      </strong>
                      <span>{cleanPageReferences(q.processComponent)}</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <strong className="text-slate-700 block">Soru Kökü:</strong>
                    <p className="text-slate-900 font-medium italic mt-0.5">{cleanPageReferences(q.questionText)}</p>
                  </div>
                </div>

                {/* PUANLAMA KRİTERLERİ TABLOSU */}
                {isEditing ? (
                  /* Düzenleme Alanı */
                  <div className="p-4 space-y-3 bg-red-50/20 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-emerald-800 block mb-1">Doğru Cevap (Tam Puan) Kriteri:</label>
                        <textarea
                          rows={2}
                          value={r.correctCriteria}
                          onChange={(e) => updateQuestionRubric(idx, { correctCriteria: e.target.value })}
                          className="w-full p-2 border rounded bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-emerald-800 block mb-1">Tam Puan Örnek İdeal Cevap:</label>
                        <textarea
                          rows={2}
                          value={r.sampleCorrectAnswer}
                          onChange={(e) => updateQuestionRubric(idx, { sampleCorrectAnswer: e.target.value })}
                          className="w-full p-2 border rounded bg-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-amber-800 block mb-1">
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
                          className="w-full p-2 border rounded bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-amber-800 block mb-1">Kısmi Puan Örnek Cevap:</label>
                        <textarea
                          rows={2}
                          value={r.samplePartialAnswer}
                          onChange={(e) => updateQuestionRubric(idx, { samplePartialAnswer: e.target.value })}
                          className="w-full p-2 border rounded bg-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-rose-800 block mb-1">Yanlış Cevap Kriteri (0 Puan):</label>
                        <input
                          type="text"
                          value={r.wrongCriteria}
                          onChange={(e) => updateQuestionRubric(idx, { wrongCriteria: e.target.value })}
                          className="w-full p-2 border rounded bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Boş Cevap Kriteri (0 Puan):</label>
                        <input
                          type="text"
                          value={r.blankCriteria}
                          onChange={(e) => updateQuestionRubric(idx, { blankCriteria: e.target.value })}
                          className="w-full p-2 border rounded bg-white text-xs"
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
                ) : (
                  /* Görüntüleme Tablosu */
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-300 print:border-black text-slate-700 text-left">
                          <th className="p-2.5 font-bold w-1/4 border-r border-slate-200">
                            Cevap Düzeyi & Ölçüt
                          </th>
                          <th className="p-2.5 font-bold w-3/5 border-r border-slate-200">
                            Ölçme Kriteri ve Örnek Öğrenci Cevabı
                          </th>
                          <th className="p-2.5 font-bold w-[15%] text-center">
                            Puan Değeri
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 print:divide-black">
                        
                        {/* 1. DOĞRU CEVAP (TAM PUAN) */}
                        <tr className="bg-emerald-50/30 print:bg-transparent">
                          <td className="p-3 border-r border-slate-200 print:border-black align-top font-semibold text-emerald-900">
                            <div className="flex items-center gap-1.5 mb-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Doğru Cevap</span>
                            </div>
                            <span className="text-[11px] font-normal text-emerald-700 block">
                              (Tam Puan)
                            </span>
                          </td>
                          <td className="p-3 border-r border-slate-200 print:border-black align-top space-y-1.5">
                            <div>
                              <strong className="text-slate-800">Kriter:</strong> {r.correctCriteria}
                            </div>
                            <div className="p-2 rounded bg-white print:border print:border-slate-300 text-slate-800 text-[11px] italic">
                              <strong className="not-italic text-emerald-800">Örnek İdeal Cevap:</strong> "{r.sampleCorrectAnswer}"
                            </div>
                          </td>
                          <td className="p-3 align-middle text-center font-extrabold text-sm text-emerald-800">
                            {q.points} Puan
                          </td>
                        </tr>

                        {/* 2. KISMİ CEVAP (KISMİ PUAN) */}
                        <tr className="bg-amber-50/30 print:bg-transparent">
                          <td className="p-3 border-r border-slate-200 print:border-black align-top font-semibold text-amber-900">
                            <div className="flex items-center gap-1.5 mb-1">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Kısmi Cevap</span>
                            </div>
                            <span className="text-[11px] font-normal text-amber-700 block">
                              (Kısmi Puan)
                            </span>
                          </td>
                          <td className="p-3 border-r border-slate-200 print:border-black align-top space-y-1.5">
                            <div>
                              <strong className="text-slate-800">Kriter:</strong> {r.partialCriteria}
                            </div>
                            <div className="p-2 rounded bg-white print:border print:border-slate-300 text-slate-800 text-[11px] italic">
                              <strong className="not-italic text-amber-800">Örnek Kısmi Cevap:</strong> "{r.samplePartialAnswer}"
                            </div>
                          </td>
                          <td className="p-3 align-middle text-center font-extrabold text-sm text-amber-800">
                            {r.partialPoints} Puan
                          </td>
                        </tr>

                        {/* 3. YANLIŞ CEVAP (0 PUAN) */}
                        <tr className="bg-rose-50/20 print:bg-transparent">
                          <td className="p-3 border-r border-slate-200 print:border-black align-top font-semibold text-rose-900">
                            <div className="flex items-center gap-1.5 mb-1">
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Yanlış Cevap</span>
                            </div>
                            <span className="text-[11px] font-normal text-rose-700 block">
                              (0 Puan)
                            </span>
                          </td>
                          <td className="p-3 border-r border-slate-200 print:border-black align-top text-slate-700">
                            <strong>Kriter:</strong> {r.wrongCriteria}
                          </td>
                          <td className="p-3 align-middle text-center font-bold text-slate-500">
                            0 Puan
                          </td>
                        </tr>

                        {/* 4. BOŞ CEVAP (0 PUAN) */}
                        <tr className="print:bg-transparent">
                          <td className="p-3 border-r border-slate-200 print:border-black align-top font-semibold text-slate-700">
                            <div className="flex items-center gap-1.5 mb-1">
                              <MinusCircle className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>Boş Cevap</span>
                            </div>
                            <span className="text-[11px] font-normal text-slate-500 block">
                              (0 Puan)
                            </span>
                          </td>
                          <td className="p-3 border-r border-slate-200 print:border-black align-top text-slate-700">
                            <strong>Kriter:</strong> {r.blankCriteria || 'Soruya herhangi bir yanıt verilmemiştir.'}
                          </td>
                          <td className="p-3 align-middle text-center font-bold text-slate-500">
                            0 Puan
                          </td>
                        </tr>

                      </tbody>
                    </table>
                  </div>
                )}

                {/* Öğretmen Puanlama Notu (Varsa) */}
                {r.scoringNotes && (
                  <div className="p-2.5 bg-slate-100/70 border-t border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span><strong>Ölçme Notu:</strong> {r.scoringNotes}</span>
                  </div>
                )}

              </div>
            );
          })}
        </div>

        {/* EN ALT ÖĞRETMEN İMZA ALANI */}
        <div className="mt-12 pt-6 border-t-2 border-black page-break-inside-avoid">
          <div className="flex items-end justify-between text-xs sm:text-sm">
            <div className="space-y-1">
              <p className="font-semibold text-slate-600 print:text-black">
                {header.grade?.includes('9') ? 'Türkiye Yüzyılı Maarif Modeli Ölçme ve Değerlendirme Kriterleri' : 'MEB Ortaöğretim Ölçme ve Değerlendirme Kriterleri'}
              </p>
              <p className="text-[11px] text-slate-400 print:text-black">
                Hazırlanma Tarihi: {header.date || new Date().toLocaleDateString('tr-TR')}
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
