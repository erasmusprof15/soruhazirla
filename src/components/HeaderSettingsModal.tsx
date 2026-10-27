import React from 'react';
import { X, Building2, Lock, Unlock, Pin } from 'lucide-react';
import { ExamHeader } from '../types/exam';

interface HeaderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  header: ExamHeader;
  onChange: (updated: ExamHeader) => void;
  lockedFields: Partial<Record<keyof ExamHeader, boolean>>;
  onToggleLockField: (field: keyof ExamHeader) => void;
  onSetLockedFields: (fields: Partial<Record<keyof ExamHeader, boolean>>) => void;
}

const ALL_HEADER_KEYS: (keyof ExamHeader)[] = [
  'schoolName',
  'academicYear',
  'termAndExam',
  'course',
  'grade',
  'date',
  'duration',
  'teacherName',
  'teacherBranch',
  'note',
];

export const HeaderSettingsModal: React.FC<HeaderSettingsModalProps> = ({
  isOpen,
  onClose,
  header,
  onChange,
  lockedFields,
  onToggleLockField,
  onSetLockedFields,
}) => {
  if (!isOpen) return null;

  const handleChange = (field: keyof ExamHeader, value: string) => {
    onChange({ ...header, [field]: value });
  };

  const lockedCount = ALL_HEADER_KEYS.filter((k) => !!lockedFields[k]).length;
  const isAllLocked = lockedCount === ALL_HEADER_KEYS.length;

  const handleLockAll = () => {
    if (isAllLocked) {
      onSetLockedFields({});
    } else {
      const next: Partial<Record<keyof ExamHeader, boolean>> = {};
      ALL_HEADER_KEYS.forEach((k) => {
        next[k] = true;
      });
      onSetLockedFields(next);
    }
  };

  const handleLockCommonTeacherInfo = () => {
    onSetLockedFields({
      ...lockedFields,
      schoolName: true,
      academicYear: true,
      termAndExam: true,
      duration: true,
      teacherName: true,
      teacherBranch: true,
      note: true,
    });
  };

  const renderLockButton = (field: keyof ExamHeader) => {
    const isLocked = !!lockedFields[field];
    return (
      <button
        type="button"
        onClick={() => onToggleLockField(field)}
        title={
          isLocked
            ? 'Bu bilgi sabitlendi. Yeni Sınav dediğinizde silinmez. Kilidi açmak için tıklayın.'
            : 'Bu bilgiyi sabitlemek (kilitlemek) için tıklayın.'
        }
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
          isLocked
            ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
        }`}
      >
        {isLocked ? (
          <>
            <Lock className="w-3 h-3 text-amber-700" />
            <span>Sabitlendi</span>
          </>
        ) : (
          <>
            <Unlock className="w-3 h-3 text-slate-500" />
            <span>Sabitle</span>
          </>
        )}
      </button>
    );
  };

  const inputClass = (field: keyof ExamHeader) =>
    `w-full px-3.5 py-2 text-sm rounded-lg focus:ring-2 focus:ring-red-500 outline-hidden transition-colors ${
      lockedFields[field]
        ? 'bg-amber-50/40 border-2 border-amber-400 text-slate-900 font-medium'
        : 'bg-white border border-slate-300 text-slate-900'
    }`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-100 text-red-700 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Resmî Sınav Başlığı ve Öğretmen Bilgileri</h3>
              <p className="text-xs text-slate-500">MEB Sınav Kağıdının üst ve alt antetinde yer alacak bilgiler</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sabitleme / Kilitleme Kontrol Barı */}
        <div className="px-6 py-3 bg-amber-50/80 border-b border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start sm:items-center gap-2 text-xs text-amber-950">
            <Pin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Bilgileri Sabitle (Kilitle):</strong> Sabitlediğiniz alanlar <strong>"Yeni Sınav"</strong> dediğinizde veya farklı sınıf/ders sınavı hazırlarken silinmez, hazır gelir.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleLockCommonTeacherInfo}
              className="px-2.5 py-1.5 text-[11px] font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg transition-colors shadow-2xs"
              title="Okul, Eğitim Yılı, Dönem, Süre ve Öğretmen bilgilerini sabitler"
            >
              Okul & Öğretmeni Sabitle
            </button>
            <button
              type="button"
              onClick={handleLockAll}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors shadow-2xs ${
                isAllLocked
                  ? 'bg-slate-800 hover:bg-slate-900 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {isAllLocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Tüm Kilitleri Aç</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Tümünü Sabitle</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[68vh] overflow-y-auto">
          
          {/* Okul Adı */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Okul Adı
              </label>
              {renderLockButton('schoolName')}
            </div>
            <input
              type="text"
              value={header.schoolName}
              onChange={(e) => handleChange('schoolName', e.target.value)}
              placeholder="Örn: Atatürk Anadolu Lisesi Müdürlüğü"
              className={inputClass('schoolName')}
            />
          </div>

          {/* Eğitim Yılı & Dönem/Sınav */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Eğitim ve Öğretim Yılı
                </label>
                {renderLockButton('academicYear')}
              </div>
              <input
                type="text"
                value={header.academicYear}
                onChange={(e) => handleChange('academicYear', e.target.value)}
                placeholder="2024-2025 Eğitim-Öğretim Yılı"
                className={inputClass('academicYear')}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Dönem ve Sınav Türü
                </label>
                {renderLockButton('termAndExam')}
              </div>
              <select
                value={header.termAndExam}
                onChange={(e) => handleChange('termAndExam', e.target.value)}
                className={inputClass('termAndExam')}
              >
                <option value="1. Dönem 1. Ortak Yazılı Sınavı">1. Dönem 1. Ortak Yazılı Sınavı</option>
                <option value="1. Dönem 2. Ortak Yazılı Sınavı">1. Dönem 2. Ortak Yazılı Sınavı</option>
                <option value="2. Dönem 1. Ortak Yazılı Sınavı">2. Dönem 1. Ortak Yazılı Sınavı</option>
                <option value="2. Dönem 2. Ortak Yazılı Sınavı">2. Dönem 2. Ortak Yazılı Sınavı</option>
                <option value="Mazeret Sınavı">Mazeret Sınavı</option>
                <option value="Sorumluluk Sınavı">Sorumluluk Sınavı</option>
              </select>
            </div>
          </div>

          {/* Ders & Sınıf Seviyesi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Ders Adı
                </label>
                {renderLockButton('course')}
              </div>
              <input
                type="text"
                value={header.course}
                onChange={(e) => handleChange('course', e.target.value)}
                placeholder="Örn: Biyoloji"
                className={inputClass('course')}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Sınıf Düzeyi
                </label>
                {renderLockButton('grade')}
              </div>
              <select
                value={header.grade}
                onChange={(e) => handleChange('grade', e.target.value)}
                className={inputClass('grade')}
              >
                <option value="9. Sınıf">9. Sınıf</option>
                <option value="10. Sınıf">10. Sınıf</option>
                <option value="11. Sınıf">11. Sınıf</option>
                <option value="12. Sınıf">12. Sınıf</option>
              </select>
            </div>
          </div>

          {/* Tarih & Sınav Süresi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Sınav Tarihi
                </label>
                {renderLockButton('date')}
              </div>
              <input
                type="text"
                value={header.date}
                onChange={(e) => handleChange('date', e.target.value)}
                placeholder="Örn: 04.11.2024 veya boş bırakın"
                className={inputClass('date')}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Sınav Süresi
                </label>
                {renderLockButton('duration')}
              </div>
              <input
                type="text"
                value={header.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                placeholder="Örn: 40 Dakika (1 Ders Saati)"
                className={inputClass('duration')}
              />
            </div>
          </div>

          {/* Öğretmen Bilgileri */}
          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Öğretmen Bilgileri (Kağıdın En Altında Yer Alır)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Öğretmen Adı Soyadı
                  </label>
                  {renderLockButton('teacherName')}
                </div>
                <input
                  type="text"
                  value={header.teacherName}
                  onChange={(e) => handleChange('teacherName', e.target.value)}
                  placeholder="Örn: Ayşe Demir"
                  className={inputClass('teacherName')}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Öğretmen Branşı
                  </label>
                  {renderLockButton('teacherBranch')}
                </div>
                <input
                  type="text"
                  value={header.teacherBranch}
                  onChange={(e) => handleChange('teacherBranch', e.target.value)}
                  placeholder="Örn: Biyoloji Öğretmeni"
                  className={inputClass('teacherBranch')}
                />
              </div>
            </div>
          </div>

          {/* Sınav Yönergesi */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Sınav Yönergesi / Öğrenciye Not (Kağıdın En Altında Yer Alır)
              </label>
              {renderLockButton('note')}
            </div>
            <textarea
              rows={2}
              value={header.note}
              onChange={(e) => handleChange('note', e.target.value)}
              placeholder="Örn: Soruları dikkatlice okuyunuz. Cevaplarınızı ilgili soru altındaki alana okunaklı yazınız. Başarılar dileriz."
              className={inputClass('note')}
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="text-xs text-slate-600">
            {lockedCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                {lockedCount} bilgi sabitlendi (Yeni Sınavda korunacak)
              </span>
            ) : (
              <span className="text-slate-500">Henüz sabitlenen (kilitlenen) bilgi yok.</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
          >
            Bilgileri Kaydet ve Kapat
          </button>
        </div>

      </div>
    </div>
  );
};

