import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Trash2, 
  Sliders, 
  GraduationCap, 
  Compass, 
  BookOpen, 
  AlertCircle,
  FileCheck2,
  FileUp,
  Building2,
  Lock,
  Calendar
} from 'lucide-react';
import { ExamHeader, ExamConfig, MaterialInput } from '../types/exam';

interface MaterialAndOptionsFormProps {
  header: ExamHeader;
  config: ExamConfig;
  material: MaterialInput;
  onHeaderChange: (h: ExamHeader) => void;
  onConfigChange: (c: ExamConfig) => void;
  onMaterialChange: (m: MaterialInput) => void;
  onGenerate: () => void;
  onCancelGenerate?: () => void;
  onOpenHeaderSettings?: () => void;
  lockedCount?: number;
  isGenerating: boolean;
  generationStage?: number;
  error: string | null;
}


export const MaterialAndOptionsForm: React.FC<MaterialAndOptionsFormProps> = ({
  header,
  config,
  material,
  onHeaderChange,
  onConfigChange,
  onMaterialChange,
  onGenerate,
  onCancelGenerate,
  onOpenHeaderSettings,
  lockedCount = 0,
  isGenerating,
  generationStage = 0,
  error,
}) => {
  const [materialDragActive, setMaterialDragActive] = useState(false);
  const [isExtractingMaterial, setIsExtractingMaterial] = useState(false);
  const [materialExtractStatus, setMaterialExtractStatus] = useState<string | null>(null);
  const materialFileRef = useRef<HTMLInputElement>(null);

  const [syllabusDragActive, setSyllabusDragActive] = useState(false);
  const [isExtractingSyllabus, setIsExtractingSyllabus] = useState(false);
  const [syllabusExtractStatus, setSyllabusExtractStatus] = useState<string | null>(null);
  const syllabusFileRef = useRef<HTMLInputElement>(null);

  const [annualPlanDragActive, setAnnualPlanDragActive] = useState(false);
  const [isExtractingAnnualPlan, setIsExtractingAnnualPlan] = useState(false);
  const [annualPlanExtractStatus, setAnnualPlanExtractStatus] = useState<string | null>(null);
  const annualPlanFileRef = useRef<HTMLInputElement>(null);

  // 1. DERS MATERYALİ YÜKLEME (Soru ve Bağlam Kaynağı)
  const handleMaterialFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Lütfen geçerli bir PDF dosyası yükleyiniz.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      alert('PDF boyutu 25MB altı olmalıdır.');
      return;
    }

    setIsExtractingMaterial(true);
    setMaterialExtractStatus('Ders materyali inceleniyor...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const res = await fetch('/api/extract-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64, fileName: file.name }),
        });
        const data = await res.json();
        if (data.success && data.text) {
          const pageInfo = data.pages ? `${data.pages} sayfa ` : '';
          setMaterialExtractStatus(`PDF'den ${pageInfo}metin başarıyla ayıklandı.`);
          onMaterialChange({
            ...material,
            fileName: file.name,
            fileSize: file.size,
            pages: data.pages || 1,
            text: data.text,
            pdfBase64: undefined,
          });
        } else {
          setMaterialExtractStatus('Ders materyali PDF olarak yüklendi.');
          onMaterialChange({
            ...material,
            fileName: file.name,
            fileSize: file.size,
            pdfBase64: base64,
          });
        }
      } catch (err) {
        setMaterialExtractStatus('Ders materyali yüklendi.');
        onMaterialChange({
          ...material,
          fileName: file.name,
          fileSize: file.size,
          pdfBase64: base64,
        });
      } finally {
        setIsExtractingMaterial(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeMaterial = () => {
    setMaterialExtractStatus(null);
    onMaterialChange({
      ...material,
      pdfBase64: undefined,
      fileName: undefined,
      fileSize: undefined,
      text: '',
    });
    if (materialFileRef.current) materialFileRef.current.value = '';
  };

  // 2. DERS BİLGİ FORMU YÜKLEME (Öğrenme Çıktıları & Süreç Bileşenleri)
  const handleSyllabusFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Lütfen geçerli bir PDF dosyası yükleyiniz.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      alert('PDF boyutu 25MB altı olmalıdır.');
      return;
    }

    setIsExtractingSyllabus(true);
    setSyllabusExtractStatus('Ders bilgi formu inceleniyor...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const res = await fetch('/api/extract-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64, fileName: file.name }),
        });
        const data = await res.json();
        if (data.success && data.text) {
          setSyllabusExtractStatus(`Ders bilgi formundan ${data.pages || 1} sayfa kazanım metni ayıklandı.`);
          onMaterialChange({
            ...material,
            syllabusFileName: file.name,
            syllabusFileSize: file.size,
            syllabusPages: data.pages || 1,
            syllabusText: data.text,
            syllabusPdfBase64: undefined,
          });
        } else {
          setSyllabusExtractStatus('Ders bilgi formu yüklendi.');
          onMaterialChange({
            ...material,
            syllabusFileName: file.name,
            syllabusFileSize: file.size,
            syllabusPdfBase64: base64,
          });
        }
      } catch (err) {
        setSyllabusExtractStatus('Ders bilgi formu yüklendi.');
        onMaterialChange({
          ...material,
          syllabusFileName: file.name,
          syllabusFileSize: file.size,
          syllabusPdfBase64: base64,
        });
      } finally {
        setIsExtractingSyllabus(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeSyllabus = () => {
    setSyllabusExtractStatus(null);
    onMaterialChange({
      ...material,
      syllabusPdfBase64: undefined,
      syllabusFileName: undefined,
      syllabusFileSize: undefined,
      syllabusText: '',
    });
    if (syllabusFileRef.current) syllabusFileRef.current.value = '';
  };

  // 3. YILLIK PLAN YÜKLEME (Kazanımlar, Haftalar/Tarih Aralığı, Ara Tatil & Yarıyıl Tatili Analizi)
  const handleAnnualPlanFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Lütfen geçerli bir PDF dosyası yükleyiniz.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      alert('PDF boyutu 25MB altı olmalıdır.');
      return;
    }

    setIsExtractingAnnualPlan(true);
    setAnnualPlanExtractStatus('Yıllık plan inceleniyor (haftalar, tatiller ve kazanımlar okunuyor)...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const res = await fetch('/api/extract-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64, fileName: file.name }),
        });
        const data = await res.json();
        if (data.success && data.text) {
          setAnnualPlanExtractStatus(`Yıllık plandan ${data.pages || 1} sayfa (haftalar, tatiller ve kazanımlar) ayıklandı.`);
          onMaterialChange({
            ...material,
            annualPlanFileName: file.name,
            annualPlanFileSize: file.size,
            annualPlanPages: data.pages || 1,
            annualPlanText: data.text,
            annualPlanPdfBase64: undefined,
          });
        } else {
          setAnnualPlanExtractStatus('Yıllık plan PDF olarak yüklendi.');
          onMaterialChange({
            ...material,
            annualPlanFileName: file.name,
            annualPlanFileSize: file.size,
            annualPlanPdfBase64: base64,
          });
        }
      } catch (err) {
        setAnnualPlanExtractStatus('Yıllık plan yüklendi.');
        onMaterialChange({
          ...material,
          annualPlanFileName: file.name,
          annualPlanFileSize: file.size,
          annualPlanPdfBase64: base64,
        });
      } finally {
        setIsExtractingAnnualPlan(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAnnualPlan = () => {
    setAnnualPlanExtractStatus(null);
    onMaterialChange({
      ...material,
      annualPlanPdfBase64: undefined,
      annualPlanFileName: undefined,
      annualPlanFileSize: undefined,
      annualPlanPages: undefined,
      annualPlanText: '',
    });
    if (annualPlanFileRef.current) annualPlanFileRef.current.value = '';
  };

  const toggleQuestionType = (typeId: string) => {
    const current = [...config.questionTypes];
    const index = current.indexOf(typeId);
    if (index > -1) {
      if (current.length === 1) return; // En az bir tip seçili kalmalı
      current.splice(index, 1);
    } else {
      current.push(typeId);
    }
    onConfigChange({ ...config, questionTypes: current });
  };

  const QUESTION_TYPE_OPTIONS = [
    {
      id: 'baglam_temelli',
      title: 'Bağlam Temelli / Senaryo',
      desc: 'Gerçek yaşam durumu, metin, veri veya vaka üzerinden akıl yürütme.',
      badge: 'TYMM Önerilen',
    },
    {
      id: 'acik_uclu',
      title: 'Açık Uçlu Soru',
      desc: 'Öğrencinin kendi cümleleriyle gerekçeli ve derinlemesine yanıtladığı soru.',
      badge: 'Klasik Yazılı',
    },
    {
      id: 'maddeli',
      title: 'Maddeli / Yapılandırılmış',
      desc: 'Ana bağlama bağlı (a, b) aşamalı alt basamaklı sorular.',
      badge: 'Süreç Odaklı',
    },
    {
      id: 'kisa_cevapli',
      title: 'Kısa Cevaplı Madde',
      desc: 'Doğrudan çıkarım, kavram veya tek cümlelik odaklı analiz.',
      badge: 'Hızlı Ölçme',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold mb-3">
            <Compass className="w-3.5 h-3.5" />
            Türkiye Yüzyılı Maarif Modeli (TYMM) Uyumlu Sınav Sistemi
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Sınav Oluşturucu
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Ders kitabınızı, konu özeti PDF'inizi yükleyin veya metni yapıştırın. Yapay zekâ, MEB TYMM 
            standartlarında öğrenme çıktıları, süreç bileşenleri ve tam/kısmi puan kriterleriyle 
            baskıya hazır resmî sınav kağıdı ve rubrik üretsin.
          </p>
        </div>
      </div>

      {/* Resmî Sınav Başlığı ve Öğretmen Bilgileri Hızlı Erişim ve Sabitleme Kartı */}
      {onOpenHeaderSettings && (
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
          <button
            type="button"
            onClick={onOpenHeaderSettings}
            className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors shrink-0 self-start sm:self-center"
          >
            Başlık Bilgilerini Düzenle / Sabitle
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Hata:</strong> {error}
          </div>
        </div>
      )}

      {/* Main Grid: Material on Left, Config on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (7 cols): PDF & Material Input */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. DERS MATERYALİ YÜKLEME KARTI */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">1. Ders Materyali Yükle</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Soru & Bağlam Kaynağı
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Sorular, olaylar, metinler ve deneyler bu dokümandan hazırlanır</p>
                </div>
              </div>
            </div>

            {/* Ders Materyali PDF Dropzone */}
            <div
              onDragEnter={() => setMaterialDragActive(true)}
              onDragLeave={() => setMaterialDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMaterialDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleMaterialFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => materialFileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                materialDragActive
                  ? 'border-blue-500 bg-blue-50/50'
                  : material.fileName
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/60'
              }`}
            >
              <input
                ref={materialFileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleMaterialFile(e.target.files[0]);
                  }
                }}
              />

              {isExtractingMaterial ? (
                <div className="py-4 text-center space-y-1.5">
                  <div className="w-6 h-6 mx-auto border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-blue-800">Ders materyali inceleniyor ve metin ayıklanıyor...</p>
                </div>
              ) : material.fileName ? (
                <div className="flex items-center justify-between p-1.5">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate max-w-xs">{material.fileName}</p>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        {materialExtractStatus || `Materyal yüklendi (${material.fileSize ? `${Math.round(material.fileSize / 1024)} KB` : ''})`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMaterial();
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Materyali kaldır"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1 py-1">
                  <div className="w-9 h-9 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 block">Ders Materyali (PDF) Seçin veya Sürükleyin</span>
                  <span className="text-[11px] text-slate-500 block">Ders kitabı, ünite fasikülü, konu anlatımı metni</span>
                </div>
              )}
            </div>

            {/* Sayfa Aralığı (Başlangıç - Bitiş Sayfası) Doğrudan Seçim Kutusu */}
            <div className="mt-3 p-3 rounded-xl bg-blue-50/50 border border-blue-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-blue-950">
                  Soru Sorulacak Sayfa Aralığı (İsteğe Bağlı – Homojen Konu Dağılımı):
                </label>
                {(material.pageRangeStart || material.pageRangeEnd) && (
                  <button
                    type="button"
                    onClick={() =>
                      onMaterialChange({
                        ...material,
                        pageRangeStart: '',
                        pageRangeEnd: '',
                      })
                    }
                    className="text-[11px] text-slate-400 hover:text-red-600"
                  >
                    Arallığı Temizle
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Başlangıç Sayfası {material.pages ? `(1 - ${material.pages})` : ''}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={material.pages || 999}
                    value={material.pageRangeStart || ''}
                    onChange={(e) =>
                      onMaterialChange({
                        ...material,
                        pageRangeStart: e.target.value,
                      })
                    }
                    placeholder="Örn: 10"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Bitiş Sayfası {material.pages ? `(1 - ${material.pages})` : ''}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={material.pages || 999}
                    value={material.pageRangeEnd || ''}
                    onChange={(e) =>
                      onMaterialChange({
                        ...material,
                        pageRangeEnd: e.target.value,
                      })
                    }
                    placeholder="Örn: 25"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden font-semibold text-slate-900"
                  />
                </div>
              </div>
              <p className="text-[10px] text-blue-900 leading-snug">
                Belirttiğiniz sayfa aralığı (örn. 10–25) <strong>{config.questionCount} eşit sayfa grubuna</strong> bölünür; böylece tek bir konuya veya belirli sayfalara yığılma olmaz, aralıktaki tüm sayfalardan ve konulardan dengeli soru üretilir.
              </p>
            </div>

            {/* Ders Materyali Metin Alanı */}
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Ders Materyali Metni (PDF'den ayıklanır veya metin yapıştırabilirsiniz):</span>
                {material.text && (
                  <button
                    type="button"
                    onClick={() => onMaterialChange({ ...material, text: '' })}
                    className="text-[11px] text-slate-400 hover:text-red-600"
                  >
                    Temizle
                  </button>
                )}
              </label>
              <textarea
                rows={4}
                value={material.text || ''}
                onChange={(e) => onMaterialChange({ ...material, text: e.target.value })}
                placeholder="Örn: Ders kitabından ilgili ünite paragrafı, hikaye parçası, deney veya tarihi kaynak metni..."
                className={`w-full px-3 py-2 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden transition-all ${
                  material.text
                    ? 'bg-blue-50/30 border border-blue-200 text-slate-900'
                    : 'bg-slate-50/50 border border-slate-300 focus:bg-white text-slate-800'
                }`}
              />
            </div>
          </div>

          {/* 2. DERS BİLGİ FORMU (DBF) YÜKLEME KARTI - İSTEĞE BAĞLI */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">2. Ders Bilgi Formu (DBF) Yükle</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      Kazanım & Rubrik Kaynağı
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      İsteğe Bağlı
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Zorunlu değildir. Yüklenirse öğrenme çıktıları, süreç bileşenleri ve puanlama ölçütleri doğrudan bu formdan alınır.
                  </p>
                </div>
              </div>
            </div>

            {/* Ders Bilgi Formu PDF Dropzone */}
            <div
              onDragEnter={() => setSyllabusDragActive(true)}
              onDragLeave={() => setSyllabusDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSyllabusDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleSyllabusFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => syllabusFileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                syllabusDragActive
                  ? 'border-purple-500 bg-purple-50/50'
                  : material.syllabusFileName
                  ? 'border-purple-400 bg-purple-50/30'
                  : 'border-slate-300 hover:border-purple-400 bg-slate-50/60'
              }`}
            >
              <input
                ref={syllabusFileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSyllabusFile(e.target.files[0]);
                  }
                }}
              />

              {isExtractingSyllabus ? (
                <div className="py-4 text-center space-y-1.5">
                  <div className="w-6 h-6 mx-auto border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-purple-800">Ders bilgi formu inceleniyor ve kazanımlar ayıklanıyor...</p>
                </div>
              ) : material.syllabusFileName ? (
                <div className="flex items-center justify-between p-1.5">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate max-w-xs">{material.syllabusFileName}</p>
                      <p className="text-[11px] text-purple-700 font-medium">
                        {syllabusExtractStatus || `Bilgi formu yüklendi (${material.syllabusFileSize ? `${Math.round(material.syllabusFileSize / 1024)} KB` : ''})`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSyllabus();
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Bilgi formunu kaldır"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1 py-1">
                  <div className="w-9 h-9 mx-auto rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 block">Ders Bilgi Formu - DBF (PDF) Seçin veya Sürükleyin</span>
                  <span className="text-[11px] text-slate-500 block">TYMM öğrenme çıktıları, süreç bileşenleri ve ölçme tablosu (İsteğe Bağlı)</span>
                </div>
              )}
            </div>

            {/* Ders Bilgi Formu Metin Alanı */}
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Ders Bilgi Formu / Kazanım Metni (PDF'den ayıklanır veya metin yapıştırabilirsiniz):</span>
                {material.syllabusText && (
                  <button
                    type="button"
                    onClick={() => onMaterialChange({ ...material, syllabusText: '' })}
                    className="text-[11px] text-slate-400 hover:text-red-600"
                  >
                    Temizle
                  </button>
                )}
              </label>
              <textarea
                rows={3}
                value={material.syllabusText || ''}
                onChange={(e) => onMaterialChange({ ...material, syllabusText: e.target.value })}
                placeholder="Örn: 9. Sınıf TYMM Öğrenme Çıktıları: BİY.9.1.1, SB1.2 Süreç Bileşeni, Dereceli Puanlama kriterleri..."
                className={`w-full px-3 py-2 text-xs rounded-xl focus:ring-2 focus:ring-purple-500 outline-hidden transition-all ${
                  material.syllabusText
                    ? 'bg-purple-50/30 border border-purple-200 text-slate-900'
                    : 'bg-slate-50/50 border border-slate-300 focus:bg-white text-slate-800'
                }`}
              />
            </div>
          </div>

          {/* 3. YILLIK PLAN YÜKLEME KARTI - İSTEĞE BAĞLI */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">3. Yıllık Plan Yükle</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Tarih, Hafta & Tatil Analizi
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      İsteğe Bağlı
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Zorunlu değildir. Yüklenirse plandaki kazanımlar (öğrenme çıktıları), haftalar, 1. ve 2. ara tatil ile yarıyıl tatili okunarak seçtiğiniz tarih aralığından soru üretilir.
                  </p>
                </div>
              </div>
            </div>

            {/* Yıllık Plan PDF Dropzone */}
            <div
              onDragEnter={() => setAnnualPlanDragActive(true)}
              onDragLeave={() => setAnnualPlanDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAnnualPlanDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleAnnualPlanFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => annualPlanFileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                annualPlanDragActive
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : material.annualPlanFileName
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-emerald-400 bg-slate-50/60'
              }`}
            >
              <input
                ref={annualPlanFileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleAnnualPlanFile(e.target.files[0]);
                  }
                }}
              />

              {isExtractingAnnualPlan ? (
                <div className="py-4 text-center space-y-1.5">
                  <div className="w-6 h-6 mx-auto border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-emerald-800">
                    Yıllık plan okunuyor (haftalar, ara tatil, yarıyıl tatili ve kazanımlar analiz ediliyor)...
                  </p>
                </div>
              ) : material.annualPlanFileName ? (
                <div className="flex items-center justify-between p-1.5">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate max-w-xs">{material.annualPlanFileName}</p>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        {annualPlanExtractStatus || `Yıllık plan yüklendi (${material.annualPlanFileSize ? `${Math.round(material.annualPlanFileSize / 1024)} KB` : ''})`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAnnualPlan();
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Yıllık planı kaldır"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1 py-1">
                  <div className="w-9 h-9 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 block">Ünitelendirilmiş Yıllık Plan / Çerçeve Plan (PDF) Seçin veya Sürükleyin</span>
                  <span className="text-[11px] text-slate-500 block">
                    Hafta/tarih çizelgesi, ara tatil / yarıyıl tatili dönemleri ve kazanımlar otomatik analiz edilir (İsteğe Bağlı)
                  </span>
                </div>
              )}
            </div>

            {/* Yıllık Plan Tarih / Hafta / Tatil Aralığı Filtresi */}
            <div className="mt-3 p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-emerald-950">
                  Yıllık Plandan Soru Sorulacak Tarih / Hafta / Tatil Aralığı (İsteğe Bağlı):
                </label>
                {material.annualPlanScope && (
                  <button
                    type="button"
                    onClick={() => onMaterialChange({ ...material, annualPlanScope: '' })}
                    className="text-[11px] text-slate-400 hover:text-red-600"
                  >
                    Temizle
                  </button>
                )}
              </div>
              <input
                type="text"
                value={material.annualPlanScope || ''}
                onChange={(e) => onMaterialChange({ ...material, annualPlanScope: e.target.value })}
                placeholder="Örn: '1. Dönem başından 1. Ara Tatile kadar (Eylül - Kasım 1. Hafta)', '1-8. Haftalar', '1. Ara Tatil ile Yarıyıl Tatili arası'..."
                className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden text-slate-900"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    label: '📅 1. Dönem Başı – 1. Ara Tatil Arası (1. Yazılı)',
                    value: 'Okulun açılışından (Eylül 1. Hafta) 1. Dönem Ara Tatiline kadar olan haftalar ve kazanımlar',
                  },
                  {
                    label: '📅 1. Ara Tatil – Yarıyıl Tatili Arası (2. Yazılı)',
                    value: '1. Dönem Ara Tatilinden Yarıyıl Tatiline (Sömestr) kadar olan haftalar ve kazanımlar',
                  },
                  {
                    label: '📅 Yarıyıl Tatili – 2. Ara Tatil Arası (2. Dönem 1. Yazılı)',
                    value: 'Yarıyıl Tatili (2. Dönem başı) ile 2. Dönem Ara Tatili arasındaki haftalar ve kazanımlar',
                  },
                  {
                    label: '📅 2. Ara Tatil – Yıl Sonu Arası (2. Dönem 2. Yazılı)',
                    value: '2. Dönem Ara Tatilinden okul kapanışına (Haziran) kadar olan haftalar ve kazanımlar',
                  },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => onMaterialChange({ ...material, annualPlanScope: chip.value })}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-all ${
                      material.annualPlanScope === chip.value
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white hover:bg-emerald-50 text-emerald-900 border-emerald-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-emerald-800 leading-snug">
                Boş bırakırsanız seçili sınav dönemine (<strong>{header.termAndExam || '1. Dönem 1. Yazılı'}</strong>) karşılık gelen haftalar ve tatil aralıkları yıllık plandan otomatik tespit edilir.
              </p>
            </div>

            {/* Yıllık Plan Metin Alanı */}
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Yıllık Plan Metni / Tablosu (PDF'den otomatik ayıklanır veya buraya yapıştırabilirsiniz):</span>
                {material.annualPlanText && (
                  <button
                    type="button"
                    onClick={() => onMaterialChange({ ...material, annualPlanText: '' })}
                    className="text-[11px] text-slate-400 hover:text-red-600"
                  >
                    Temizle
                  </button>
                )}
              </label>
              <textarea
                rows={4}
                value={material.annualPlanText || ''}
                onChange={(e) => onMaterialChange({ ...material, annualPlanText: e.target.value })}
                placeholder="Örn: Eylül 1-4. Haftalar: Öğrenme Çıktısı BİY.9.1.1... | Kasım 2. Hafta: 1. DÖNEM ARA TATİL | Kasım 3-4. Hafta: BİY.9.1.3... | Ocak 3. Hafta: YARIYIL TATİLİ..."
                className={`w-full px-3 py-2 text-xs rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden transition-all ${
                  material.annualPlanText
                    ? 'bg-emerald-50/30 border border-emerald-200 text-slate-900'
                    : 'bg-slate-50/50 border border-slate-300 focus:bg-white text-slate-800'
                }`}
              />
            </div>
          </div>

        </div>

        {/* Right Column (5 cols): TYMM Question Options & Trigger */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sliders className="w-5 h-5 text-red-600" />
                <h2 className="text-base font-bold text-slate-900">Sınav & Madde Seçenekleri</h2>
              </div>
              <p className="text-xs text-slate-500">
                Soru tipleri ve ölçme-değerlendirme parametreleri
              </p>
            </div>

            {/* Soru Tipleri (Çoklu Seçim) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Soru Tipleri (Madde Türleri)
              </label>
              <div className="space-y-2">
                {QUESTION_TYPE_OPTIONS.map((opt) => {
                  const isChecked = config.questionTypes.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleQuestionType(opt.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        isChecked
                          ? 'border-red-500 bg-red-50/40 text-slate-900'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-red-600 text-white'
                            : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{opt.title}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Soru Sayısı & Toplam Puan */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Soru Sayısı: <span className="font-bold text-red-600">{config.questionCount}</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="12"
                  value={config.questionCount}
                  onChange={(e) => onConfigChange({ ...config, questionCount: Number(e.target.value) })}
                  className="w-full accent-red-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>3 soru</span>
                  <span>MEB standart (~6)</span>
                  <span>12 soru</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Toplam Puan
                </label>
                <select
                  value={config.totalPoints}
                  onChange={(e) => onConfigChange({ ...config, totalPoints: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-hidden font-semibold"
                >
                  <option value={100}>100 Puan (Standart)</option>
                  <option value={50}>50 Puan</option>
                  <option value={80}>80 Puan</option>
                </select>
              </div>
            </div>

            {/* Zorluk Seviyesi */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bilişsel Düzey / Zorluk
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['dengeli', 'temel', 'orta', 'ileri'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onConfigChange({ ...config, difficulty: d })}
                      className={`py-1.5 text-[11px] font-semibold rounded-lg capitalize transition-all ${
                        config.difficulty === d
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Öğretmen Özel Talimatı / Sayfa & Kazanım Sınırı */}
            <div className="rounded-xl border-2 border-red-200/90 bg-red-50/25 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-red-600" />
                  <label className="block text-xs font-bold text-slate-900">
                    Özel Öğretmen İsteği / Sayfa & Kazanım Sınırı:
                  </label>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                  En Yüksek Öncelikli Kural
                </span>
              </div>

              {material.pages && material.pages > 1 && (
                <div className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    Yüklenen doküman <strong>{material.pages} sayfa</strong>. Belirli sayfalardan sormak için örn: <strong>"Sayfa 10-15 arası"</strong> yazabilirsiniz.
                  </span>
                </div>
              )}

              <textarea
                rows={3}
                value={config.customPrompt}
                onChange={(e) => onConfigChange({ ...config, customPrompt: e.target.value })}
                placeholder="Örn: '15-20. sayfalar arasından soru hazırla', 'Yalnızca hücresel solunum konusunu sor', '2 soru deney ve grafik yorumlama olsun'..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-hidden leading-relaxed shadow-2xs text-slate-900"
              />

              {/* Hızlı Şablon Butonları */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-slate-500">
                  Hızlı Ekle (Tıklayarak istek kutusuna ekleyebilirsiniz):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '📄 Sayfa Aralığı', template: 'Sayfa 10-15 arasındaki konulardan hazırla' },
                    { label: '📅 Yıllık Plan Aralığı', template: 'Yıllık planda 1. Dönem Ara Tatiline kadar olan haftalardaki kazanımlardan hazırla' },
                    { label: '🎯 Tek Konu Odaklı', template: 'Yalnızca belirtilen temel konudan ve kavramlardan sor' },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => {
                        const current = config.customPrompt.trim();
                        const updated = current ? `${current}. ${btn.template}` : btn.template;
                        onConfigChange({ ...config, customPrompt: updated });
                      }}
                      className="text-[11px] font-medium px-2 py-1 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-300 rounded-md transition-all shadow-2xs"
                    >
                      {btn.label}
                    </button>
                  ))}
                  {config.customPrompt && (
                    <button
                      type="button"
                      onClick={() => onConfigChange({ ...config, customPrompt: '' })}
                      className="text-[10px] text-slate-400 hover:text-red-600 px-1 py-1"
                    >
                      Temizle
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-normal">
                💡 <strong>Kesin Kural:</strong> Buraya yazdığınız sayfa aralığı (örn: "Sayfa 10-15 arası") veya konu kısıtlaması yapay zekâ tarafından en yüksek öncelikle zorunlu tutulur; başka sayfalardan kesinlikle soru üretilmez.
              </p>
            </div>

            {/* GENERATE ACTION BUTTON OR SINGLE TRANSPARENT PROGRESS PANEL */}
            <div className="pt-2">
              {!isGenerating ? (
                <>
                  <button
                    type="button"
                    onClick={onGenerate}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl shadow-lg shadow-red-600/25 transition-all transform active:scale-[0.99]"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Sınav Kağıdı & Rubriği Oluştur</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Türkiye Yüzyılı Maarif Modeli öğrenme çıktıları & süreç bileşenleri otomatik atanır.
                  </p>
                </>
              ) : (
                <div className="p-4 bg-white border-2 border-red-200 rounded-2xl shadow-sm space-y-3.5">
                  {/* Üst Başlık ve İlerleme Çubuğu */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin shrink-0" />
                        <span className="text-xs font-extrabold text-slate-900">
                          {generationStage >= 5
                            ? 'Sınav ve Cevap Anahtarı Hazırlandı!'
                            : 'Sınav Kağıdı ve Cevap Anahtarı Hazırlanıyor...'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        {generationStage <= 1
                          ? 'Aşama 1 / 4'
                          : generationStage === 2
                          ? 'Aşama 2 / 4'
                          : generationStage === 3
                          ? 'Aşama 3 / 4'
                          : generationStage === 4
                          ? 'Aşama 4 / 4'
                          : 'Tamamlandı'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-500 rounded-full"
                        style={{
                          width:
                            generationStage <= 1
                              ? '25%'
                              : generationStage === 2
                              ? '55%'
                              : generationStage === 3
                              ? '80%'
                              : generationStage === 4
                              ? '94%'
                              : '100%',
                        }}
                      />
                    </div>
                  </div>

                  {/* Aşama Aşama Şeffaf İşlem Listesi */}
                  <div className="space-y-2 pt-1">
                    {[
                      {
                        step: 1,
                        doneLabel: '1. Ders dokümanı, kazanımlar ve sayfa aralığı analiz edildi.',
                        activeLabel: '1. Ders dokümanı, kazanımlar ve sayfa aralığı analiz ediliyor...',
                        waitLabel: '1. Ders dokümanı ve sayfa aralığı analizi',
                        subText:
                          material.pageRangeStart || material.pageRangeEnd
                            ? `Sayfa ${material.pageRangeStart || 1}–${material.pageRangeEnd || material.pages || 'Son'} aralığı ${config.questionCount} soru için eşit gruplara ayrıldı`
                            : 'Yüklenen dokümanlar, kazanımlar ve kapsam sınırları okundu',
                      },
                      {
                        step: 2,
                        doneLabel: `2. ${config.questionCount} adet sınav sorusu sayfa ve konu dağılımına uygun hazırlandı.`,
                        activeLabel: `2. Sorular hazırlanıyor (${config.questionCount} soru tüm konulara dengeli dağıtılıyor)...`,
                        waitLabel: '2. Soruların hazırlanması',
                        subText: 'Belirtilen sayfa aralığındaki tüm alt konular homojen taranıyor',
                      },
                      {
                        step: 3,
                        doneLabel: '3. Sorular hazırlandı, sayfa sınırı ve kazanım kontrolleri tamamlandı.',
                        activeLabel: '3. Sorular hazırlandı, sayfa ve kazanım uygunluğu kontrol ediliyor...',
                        waitLabel: '3. Soru ve kapsam kontrolü',
                        subText: 'Tek konuya yığılma önlendi ve sayfa atıfları temizlendi',
                      },
                      {
                        step: 4,
                        doneLabel: '4. Cevap anahtarı ve dereceli puanlama anahtarı (rubrik) hazırlandı.',
                        activeLabel: '4. Cevap anahtarı ve dereceli puanlama anahtarı (rubrik) hazırlanıyor...',
                        waitLabel: '4. Cevap anahtarı ve rubrik hazırlanması',
                        subText: 'Tam puan, kısmi puan kriterleri ve örnek cevaplar oluşturuluyor',
                      },
                    ].map((item) => {
                      const isDone = generationStage > item.step;
                      const isCurrent = generationStage === item.step;
                      return (
                        <div
                          key={item.step}
                          className={`flex items-start gap-2.5 p-2 rounded-xl border text-left transition-all ${
                            isDone
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                              : isCurrent
                              ? 'bg-red-50/70 border-red-300 text-slate-900 shadow-2xs'
                              : 'bg-slate-50/60 border-slate-200/70 text-slate-400'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : isCurrent ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold leading-snug">
                              {isDone ? item.doneLabel : isCurrent ? item.activeLabel : item.waitLabel}
                            </div>
                            {(isDone || isCurrent) && (
                              <div className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                                {item.subText}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tek Kart İçinde İptal Butonu */}
                  {onCancelGenerate && (
                    <div className="pt-1 flex justify-center border-t border-slate-100">
                      <button
                        type="button"
                        onClick={onCancelGenerate}
                        className="px-3.5 py-1.5 text-[11px] font-semibold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                      >
                        İşlemi İptal Et / Sıfırla
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800 text-xs text-left">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">İşlem Tamamlanamadı:</strong>
                    <span>{error}</span>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
