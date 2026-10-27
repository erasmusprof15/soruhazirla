import React from 'react';
import { TableProperties, ArrowLeft } from 'lucide-react';
import { ExamData } from '../types/exam';
import { cleanPageReferences } from '../utils/cleanText';

interface MatrixViewProps {
  exam: ExamData;
  onPrint: () => void;
  onExportWord: () => void;
  onSwitchToExam: () => void;
}

export const MatrixView: React.FC<MatrixViewProps> = ({
  exam,
  onPrint,
  onExportWord,
  onSwitchToExam,
}) => {
  const { header, questions } = exam;
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 mb-6 shadow-xs print:hidden flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onSwitchToExam}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sınav Kağıdına Dön</span>
          </button>
          
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
            <TableProperties className="w-3.5 h-3.5 text-blue-600" />
            3. Aşama: MEB TYMM Konu ve Soru Dağılım Çizelgesi
          </span>
        </div>
      </div>

      {/* Sheet */}
      <div 
        id="exam-matrix-print"
        className="bg-white rounded-xl shadow-xl border border-slate-200/80 p-8 sm:p-10 print:p-0 print:border-none print:shadow-none print:rounded-none text-slate-900 font-sans"
      >
        
        {/* Başlık */}
        <div className="border-2 border-black p-4 mb-6 text-center">
          <div className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-1">
            T.C. {header.schoolName}
          </div>
          <div className="text-sm sm:text-base font-extrabold uppercase tracking-wide mb-1">
            {header.academicYear} &bull; {header.course} DERSİ {header.grade}
          </div>
          <div className="text-xs sm:text-sm font-bold uppercase tracking-normal text-slate-700 print:text-black">
            {header.termAndExam} &bull; {header.grade?.includes('9') ? 'TÜRKİYE YÜZYILI MAARİF MODELİ (TYMM) SORU VE KAZANIM DAĞILIM TABLOSU' : 'MEB ORTAÖĞRETİM KAZANIM VE SORU DAĞILIM TABLOSU'}
          </div>
        </div>

        {/* Tablo */}
        <table className="w-full border-collapse border-2 border-black text-xs">
          <thead>
            <tr className="bg-slate-100 print:bg-slate-200 text-center font-bold">
              <th className="border border-black p-2 w-[8%]">Soru No</th>
              <th className="border border-black p-2 w-[18%]">Madde / Soru Türü</th>
              <th className="border border-black p-2 w-[34%] text-left">Öğrenme Çıktısı (Kazanım)</th>
              <th className="border border-black p-2 w-[30%] text-left">TYMM Süreç Bileşeni (SB)</th>
              <th className="border border-black p-2 w-[10%]">Soru Puanı</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id || q.number} className="page-break-inside-avoid">
                <td className="border border-black p-2.5 text-center font-bold">
                  S{q.number}
                </td>
                <td className="border border-black p-2.5 text-center font-medium">
                  {q.typeLabel}
                </td>
                <td className="border border-black p-2.5">
                  {cleanPageReferences(q.learningOutcome)}
                </td>
                <td className="border border-black p-2.5">
                  {cleanPageReferences(q.processComponent)}
                </td>
                <td className="border border-black p-2.5 text-center font-bold">
                  {q.points} P
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold">
              <td colSpan={4} className="border border-black p-2.5 text-right uppercase">
                Toplam Sınav Puanı:
              </td>
              <td className="border border-black p-2.5 text-center text-sm">
                {totalPoints} Puan
              </td>
            </tr>
          </tbody>
        </table>

        {/* İmza */}
        <div className="mt-8 pt-4 border-t-2 border-black flex items-end justify-end text-xs sm:text-sm">
          <div className="text-right shrink-0">
            <p className="font-bold text-sm">{header.teacherName || 'Ders Öğretmeni'}</p>
            <p className="text-xs">{header.teacherBranch || ''}</p>
            <p className="pt-4 text-xs font-medium">İmza: ........................................</p>
          </div>
        </div>

      </div>

    </div>
  );
};
