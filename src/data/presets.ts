import { ExamHeader, ExamConfig } from '../types/exam';

export interface SubjectPreset {
  id: string;
  name: string;
  course: string;
  grade: string;
  header: Partial<ExamHeader>;
  config: Partial<ExamConfig>;
  sampleMaterial: string;
}

export const SUBJECT_PRESETS: SubjectPreset[] = [
  {
    id: 'tde-9',
    name: '9. Sınıf - Türk Dili ve Edebiyatı (Hikaye ve Anlatım)',
    course: 'Türk Dili ve Edebiyatı',
    grade: '9. Sınıf',
    header: {
      schoolName: 'Şehit Mehmet Akif Ersoy Anadolu Lisesi',
      academicYear: '2024-2025 Eğitim ve Öğretim Yılı',
      termAndExam: '1. Dönem 1. Ortak Yazılı Sınavı',
      duration: '40 Dakika',
      teacherName: 'Zeynep Yılmaz',
      teacherBranch: 'Türk Dili ve Edebiyatı Öğretmeni',
      note: 'Soruları dikkatlice okuyunuz. Her sorunun cevabını altına bırakılan alana okunaklı şekilde yazınız.',
    },
    config: {
      questionCount: 6,
      totalPoints: 100,
      questionTypes: ['baglam_temelli', 'acik_uclu', 'maddeli', 'kisa_cevapli'],
      scenarioType: 'MEB İl/İlçe 1. Senaryo',
      difficulty: 'dengeli',
      customPrompt: 'Olay hikayesi unsurları, metinde örtük anlam ve anlatıcı bakış açısı üzerine yoğunlaşılsın.',
    },
    sampleMaterial: `ÜNİTE: HİKÂYE (ÖYKÜ) VE İLETİŞİM
Hikâye; yaşanmış veya yaşanması mümkün olan olayların bir yazar tarafından kişi, yer ve zaman bağlamında okuyucuda estetik zevk uyandıracak şekilde anlatıldığı kısa edebi metinlerdir.

Hikâyede Anlatıcı ve Bakış Açıları:
1. Hâkim (İlahi / Tanrısal) Bakış Açısı: Anlatıcı her şeyi bilir, kahramanların iç dünyalarını, geçmişlerini ve geleceklerini görür.
2. Kahraman Bakış Açısı: Olayları bizzat yaşayan veya tanık olan birinci tekil şahıs ("ben" veya "biz") anlatır.
3. Gözlemci (Müşahit) Bakış Açısı: Anlatıcı yalnızca bir kamera gibi dışarıdan gördüklerini aktarır, kişilerin iç duygularını bilemez.

Olay Hikâyesi (Maupassant Tarzı):
Serim, düğüm ve çözüm bölümlerinden oluşur. Merak unsuru ön plandadır. Olaylar mantıksal bir sıra ve sebep-sonuç ilişkisi içinde gelişir, genellikle beklenmedik çarpıcı bir sonla biter. Türk edebiyatında Ömer Seyfettin, Refik Halid Karay başlıca temsilcileridir.

Durum Hikâyesi (Çehov Tarzı):
Günlük yaşamdan bir kesiti, ruh halini yansıtır. Merak ögesi ikinci plandadır. Kesin bir serim-düğüm-çözüm planı aranmaz, bitiş okuyucunun hayal gücüne bırakılır. Sait Faik Abasıyanık ve Memduh Şevket Esendal en önemli temsilcileridir.`,
  },
  {
    id: 'tarih-10',
    name: '10. Sınıf - Tarih (Beylikten Devlete Osmanlı Medeniyeti)',
    course: 'Tarih',
    grade: '10. Sınıf',
    header: {
      schoolName: 'Gazi Mustafa Kemal Fen Lisesi',
      academicYear: '2024-2025 Eğitim ve Öğretim Yılı',
      termAndExam: '1. Dönem 1. Yazılı Sınavı',
      duration: '40 Dakika',
      teacherName: 'Ahmet Demir',
      teacherBranch: 'Tarih Öğretmeni',
      note: 'Cevaplarınızı tarihsel kavramları ve neden-sonuç ilişkilerini kullanarak gerekçelendiriniz.',
    },
    config: {
      questionCount: 6,
      totalPoints: 100,
      questionTypes: ['baglam_temelli', 'acik_uclu', 'maddeli'],
      scenarioType: 'MEB İl/İlçe 2. Senaryo',
      difficulty: 'orta',
      customPrompt: 'İskân politikası, gaza ve cihat anlayışı ile Tımar sisteminin sosyo-ekonomik etkilerine odaklanılsın.',
    },
    sampleMaterial: `ÜNİTE: BEYLİKTEN DEVLETE OSMANLI SİYASETİ VE TEŞKİLATLANMA
Osmanlı Devleti'nin Kuruluş Dönemi Başarısının Nedenleri:
1. Jeopolitik Konum: Bizans sınırında bir uç beyliği olması, Bizans'ın iç karışıklıklar içinde bulunması ve Balkanlar'da siyasi birliğin olmaması.
2. İskân Politikası: Fethedilen Rumeli ve Balkan topraklarına Anadolu'dan getirilen Türkmen ailelerin yerleştirilmesidir. Amaç; fethedilen yerlerin kalıcı olarak Türkleşmesini ve İslamlaşmasını sağlamak, bölge güvenliğini korumak ve fetihlerin devamını kolaylaştırmaktır.
3. İstimalet Politikası (Hoşgörü Politikası): Gayrimüslim halkın dinine, diline, geleneklerine ve mülkiyet haklarına dokunulmaması; adaletli vergi politikası uygulanmasıdır. Bu durum halkın Osmanlı yönetimine bağlılığını artırmıştır.
4. Tımar Sistemi: Devlet mülkiyeti altındaki toprakların gelirlerinin hizmet karşılığı asker ve memurlara bırakılmasıdır. Tımar sahibi topladığı vergilerle hem kendi geçimini sağlar hem de devlete 'Cebelü' adı verilen atlı asker yetiştirirdi. Bu sistemle üretimde süreklilik sağlanmış, hazineden para çıkmadan ordu beslenmiş ve taşrada asayiş korunmuştur.`,
  },
  {
    id: 'biyoloji-9',
    name: '9. Sınıf - Biyoloji (Yaşam Bilimi ve Canlıların Temel Bileşikleri)',
    course: 'Biyoloji',
    grade: '9. Sınıf',
    header: {
      schoolName: 'Cumhuriyet Anadolu Lisesi',
      academicYear: '2024-2025 Eğitim ve Öğretim Yılı',
      termAndExam: '1. Dönem 1. Ortak Yazılı Sınavı',
      duration: '40 Dakika',
      teacherName: 'Merve Kaya',
      teacherBranch: 'Biyoloji Öğretmeni',
      note: 'Bilimsel terimleri doğru kullanmaya özen gösteriniz. Başarılar dileriz.',
    },
    config: {
      questionCount: 5,
      totalPoints: 100,
      questionTypes: ['baglam_temelli', 'maddeli', 'acik_uclu'],
      scenarioType: 'MEB İl/İlçe 1. Senaryo',
      difficulty: 'orta',
      customPrompt: 'Deney düzeneği veya enzim aktivitesi grafiği üzerinden TYMM süreç bileşenlerine uygun veri analizi soruları içersin.',
    },
    sampleMaterial: `ÜNİTE: CANLILARIN YAPISINDA BULUNAN TEMEL BİLEŞİKLER
Enzimler ve Çalışma Mekanizması:
Enzimler biyolojik katalizörlerdir; aktivasyon enerjisini düşürerek reaksiyonları hızlandırırlar ve tepkimeden değişmeden çıkarlar.
- Genellikle protein yapılıdırlar.
- Substratlarına özgüdürler (Anahtar-kilit uyumu).
- Enzimin substratına bağlandığı özel bölgeye 'aktif merkez' denir.

Enzimlerin Çalışma Hızını Etkileyen Faktörler:
1. Sıcaklık: Optimum sıcaklıkta enzimler en hızlı çalışır (insanda ~36.5 - 37 °C). Yüksek sıcaklık protein yapısını geri dönüşümsüz bozar (denatürasyon). Düşük sıcaklıkta ise enzim inaktifleşir fakat yapısı bozulmaz; sıcaklık normale döndüğünde yeniden çalışabilir.
2. pH Değeri: Her enzimin en iyi çalıştığı optimum bir pH aralığı vardır (Örn: Midedeki Pepsin pH 1.5-2, Tükürükteki Amilaz nötr pH 7, İnce bağırsaktaki Tripsin bazik pH 8.5).
3. Substrat Yüzeyi: Enzimler substrata dış yüzeyden etki eder. Substrat yüzeyi arttıkça reaksiyon hızı artar (Kıyılmış etin parça etten daha çabuk sindirilmesi gibi).`,
  },
  {
    id: 'felsefe-11',
    name: '11. Sınıf - Felsefe (Bilgi ve Varlık Felsefesi)',
    course: 'Felsefe',
    grade: '11. Sınıf',
    header: {
      schoolName: 'Necip Fazıl Kısakürek Anadolu Lisesi',
      academicYear: '2024-2025 Eğitim ve Öğretim Yılı',
      termAndExam: '1. Dönem 1. Yazılı Sınavı',
      duration: '40 Dakika',
      teacherName: 'Emre Çelik',
      teacherBranch: 'Felsefe Grubu Öğretmeni',
      note: 'Düşüncelerinizi felsefi temellendirme ilkelerine uygun olarak açıklayınız.',
    },
    config: {
      questionCount: 5,
      totalPoints: 100,
      questionTypes: ['baglam_temelli', 'acik_uclu'],
      scenarioType: 'MEB İl/İlçe 1. Senaryo',
      difficulty: 'dengeli',
      customPrompt: 'Platon mağara alegorisi veya Descartes metodik şüphe metni üzerinden felsefi akıl yürütme sorulsun.',
    },
    sampleMaterial: `ÜNİTE: İLK ÇAĞ FELSEFESİ VE BİLGİ KURAMI
Platon'un İdealar Kuramı ve Bilgi Anlayışı:
Platon'a göre iki evren vardır:
1. Duyular Dünyası (Fenomenler Alemi): İçinde yaşadığımız, duyularımızla algıladığımız sürekli değişen, gelip geçici ve aldatıcı nesneler dünyasıdır. Bu dünyadaki nesneler ideaların kusurlu birer kopyasıdır. Duyular dünyasının bilgisi kesin değildir, sanıdır (doksa).
2. İdealar Dünyası: Yalnızca akılla kavranabilen, değişmeyen, ezeli ve ebedi olan asıl gerçeklikler dünyasıdır. Gerçek bilgi (episteme) ancak ideaların bilgisidir.

Platon'un Mağara Alegorisi:
Mağarada zincirlenmiş mahkûmlar yalnızca arkalarındaki ateşin önünden geçen nesnelerin duvara vuran gölgelerini görür ve bu gölgeleri tek gerçeklik sanırlar. Zincirlerinden kurtulup mağara dışına çıkan kişi ise Güneş'i (İyi İdeasını) ve nesnelerin gerçek biçimlerini görür. Geri dönüp arkadaşlarına anlattığında onlar buna inanmak istemez. Mağara duyular dünyasını, mağara dışı ise idealar dünyasını simgeler.`,
  },
];
