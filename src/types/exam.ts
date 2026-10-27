export interface ExamHeader {
  schoolName: string;
  academicYear: string;
  termAndExam: string;
  date: string;
  course: string;
  grade: string;
  duration: string;
  teacherName: string;
  teacherBranch: string;
  note: string;
}

export interface QuestionRubric {
  correctCriteria: string;
  sampleCorrectAnswer: string;
  partialCriteria: string;
  samplePartialAnswer: string;
  partialPoints: number;
  wrongCriteria: string;
  blankCriteria: string;
  scoringNotes?: string;
}

export interface SubQuestion {
  label: string;
  text: string;
  points: number;
}

export interface ExamQuestion {
  id: string;
  number: number;
  type: string;
  typeLabel: string;
  learningOutcome: string; // TYMM Öğrenme Çıktısı (örn: TDE.9.1.2)
  processComponent: string; // TYMM Süreç Bileşeni (SB)
  context?: string; // Metin, durum senaryosu veya vaka
  questionText: string;
  subQuestions?: SubQuestion[];
  points: number;
  suggestedLines: number;
  rubric: QuestionRubric;
}

export interface ExamConfig {
  questionCount: number;
  totalPoints: number;
  questionTypes: string[];
  scenarioType: string;
  difficulty: 'temel' | 'orta' | 'ileri' | 'dengeli';
  customPrompt: string;
}

export interface MaterialInput {
  // 1. Ders Materyali (Soru ve bağlam kaynağı)
  pdfBase64?: string;
  fileName?: string;
  fileSize?: number;
  pages?: number;
  text?: string;
  pageRangeStart?: string;
  pageRangeEnd?: string;

  // 2. Ders Bilgi Formu - DBF (Öğrenme çıktıları, süreç bileşenleri ve ölçme kriterleri kaynağı) - İsteğe Bağlı
  syllabusPdfBase64?: string;
  syllabusFileName?: string;
  syllabusFileSize?: number;
  syllabusPages?: number;
  syllabusText?: string;

  // 3. Yıllık Plan (Kazanımlar/Öğrenme çıktıları, tarih/hafta aralığı, ara tatil ve yarıyıl tatili analizi) - İsteğe Bağlı
  annualPlanPdfBase64?: string;
  annualPlanFileName?: string;
  annualPlanFileSize?: number;
  annualPlanPages?: number;
  annualPlanText?: string;
  annualPlanScope?: string;
}

export interface ExamData {
  examTitle: string;
  generalInstructions?: string;
  header: ExamHeader;
  questions: ExamQuestion[];
}

export type ViewTab = 'exam' | 'rubric' | 'matrix';
export type PageLayout = 'single' | 'two-column';
