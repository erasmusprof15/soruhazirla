import React from 'react';
import { 
  FileText, 
  Award, 
  Printer, 
  Download, 
  Sparkles, 
  BookOpen, 
  Settings2,
  TableProperties
} from 'lucide-react';
import { ViewTab } from '../types/exam';

interface NavbarProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  hasExam: boolean;
  onOpenSettings: () => void;
  onPrint: () => void;
  onExportWord: () => void;
  onNewExam: () => void;
  isGenerating: boolean;
  lockedCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  hasExam,
  onOpenSettings,
  onPrint,
  onExportWord,
  onNewExam,
  lockedCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Main Navbar Row */}
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-red-800 flex items-center justify-center text-white shadow-md shadow-red-500/20 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                Maarif<span className="text-red-600">Sınav</span>
              </span>
            </div>
          </div>

          {/* Desktop Tab Navigation (when exam exists) */}
          {hasExam && (
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => onTabChange('exam')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  currentTab === 'exam'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-red-600" />
                <span>1. Sınav Kağıdı</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('rubric')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  currentTab === 'rubric'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-4 h-4 text-emerald-600" />
                <span>2. Cevap Anahtarı (Rubrik)</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('matrix')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  currentTab === 'matrix'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableProperties className="w-4 h-4 text-blue-600" />
                <span>3. Dağılım Çizelgesi</span>
              </button>
            </div>
          )}

          {/* Action Buttons in Banner */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onOpenSettings}
              title="Resmî Sınav Başlığı ve Öğretmen Bilgileri"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Başlık Bilgileri</span>
              <span className="sm:hidden">Başlık</span>
              {lockedCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-200/90 text-amber-900 text-[10px] font-bold rounded-full">
                  🔒 {lockedCount}
                </span>
              )}
            </button>

            {hasExam && (
              <>
                <button
                  type="button"
                  onClick={onExportWord}
                  title="Word (.doc) formatında indir"
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Word İndir</span>
                </button>

                <button
                  type="button"
                  onClick={onPrint}
                  title="Yazdır veya PDF olarak kaydet"
                  className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all"
                >
                  <Printer className="w-3.5 h-3.5 text-white" />
                  <span>Yazdır/PDF kaydet</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onNewExam}
              title="Uygulamayı yenile ve yeni sınav hazırla (Sabitlenen başlık bilgileri korunur)"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span>Yeni Sınav</span>
            </button>
          </div>

        </div>

        {/* Mobile Tab Navigation Bar (shown when exam exists on small screens) */}
        {hasExam && (
          <div className="md:hidden pb-2.5 pt-0.5">
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => onTabChange('exam')}
                className={`py-1.5 text-[11px] font-bold rounded-lg text-center transition-all ${
                  currentTab === 'exam'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Sınav Kağıdı
              </button>

              <button
                type="button"
                onClick={() => onTabChange('rubric')}
                className={`py-1.5 text-[11px] font-bold rounded-lg text-center transition-all ${
                  currentTab === 'rubric'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Rubrik
              </button>

              <button
                type="button"
                onClick={() => onTabChange('matrix')}
                className={`py-1.5 text-[11px] font-bold rounded-lg text-center transition-all ${
                  currentTab === 'matrix'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Çizelge
              </button>
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
