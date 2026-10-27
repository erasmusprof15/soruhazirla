import { ExamData } from '../types/exam';
import { cleanPageReferences } from './cleanText';

export function printDocument(elementId: string) {
  const content = document.getElementById(elementId);
  if (!content) return;

  window.print();
}

export function exportExamToWord(exam: ExamData, type: 'exam' | 'rubric' | 'matrix' | 'both' = 'both') {
  const safeCourse = exam.header.course?.trim() || 'Sinav';
  const safeGrade = exam.header.grade?.trim() || '';
  const title = `${safeCourse}_${safeGrade}_${
    type === 'exam'
      ? 'Sinav_Kagidi'
      : type === 'rubric'
      ? 'Cevap_Anahtari_Rubrik'
      : type === 'matrix'
      ? 'Soru_Dagilim_Cizelgesi'
      : 'Sinav_ve_Cevap_Anahtari'
  }`;

  const totalPoints = exam.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const formatText = (text?: string): string => {
    if (!text) return '';
    const cleaned = cleanPageReferences(text);
    return cleaned
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br />');
  };

  let bodyHtml = '';

  // 1. SINAV KAĞIDI
  if (type === 'exam' || type === 'both') {
    bodyHtml += `
      <div style="font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #000;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; text-align: center; border: 2pt solid #000;">
          <tr>
            <td style="padding: 10px; font-weight: bold; font-size: 12.5pt; text-transform: uppercase;">
              T.C.<br />
              ${exam.header.schoolName || 'MİLLÎ EĞİTİM BAKANLIĞI'}<br />
              ${exam.header.academicYear}<br />
              ${exam.header.termAndExam}
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; border: 1pt solid #000; font-size: 10.5pt;">
          <tr>
            <td style="border: 1pt solid #000; padding: 6px 10px; width: 50%;"><strong>Ders:</strong> ${exam.header.course}</td>
            <td style="border: 1pt solid #000; padding: 6px 10px; width: 50%;"><strong>Adı Soyadı:</strong> </td>
          </tr>
          <tr>
            <td style="border: 1pt solid #000; padding: 6px 10px;"><strong>Sınıfı / Şubesi:</strong> ${exam.header.grade} / ....</td>
            <td style="border: 1pt solid #000; padding: 6px 10px;"><strong>Numarası:</strong> </td>
          </tr>
          <tr>
            <td style="border: 1pt solid #000; padding: 6px 10px;"><strong>Tarih:</strong> ${exam.header.date || '..../..../202...'}</td>
            <td style="border: 1pt solid #000; padding: 6px 10px; font-size: 9.5pt;">
              <strong>Aldığı Not:</strong><br />
              <strong>Rakamla:</strong> ..............................<br />
              <strong>Yazıyla:</strong> ..............................
            </td>
          </tr>
          <tr>
            <td colspan="2" style="border: 1pt solid #000; padding: 6px 10px; background-color: #f2f2f2; font-size: 9.5pt;">
              <strong>Sınav Süresi:</strong> ${exam.header.duration} &nbsp;|&nbsp; <strong>Toplam Puan:</strong> ${totalPoints} Puan
            </td>
          </tr>
        </table>

        <div style="margin-top: 15px;">
          ${exam.questions.map((q) => `
            <div style="margin-bottom: 24px; page-break-inside: avoid;">
              <div style="font-size: 11pt; margin-bottom: 6px;">
                <strong>${q.number}. (${q.points} Puan)</strong>
              </div>
              ${cleanPageReferences(q.context) ? `<div style="background-color: #f9f9f9; border-left: 3pt solid #333; padding: 8px 12px; font-style: italic; margin-bottom: 8px; font-size: 10pt;">${formatText(q.context)}</div>` : ''}
              <div style="font-size: 10.5pt; font-weight: bold; margin-bottom: 10px;">${formatText(q.questionText)}</div>
              ${q.subQuestions && q.subQuestions.length > 0 ? `
                <div style="margin-left: 15px; margin-bottom: 10px;">
                  ${q.subQuestions.map(sub => `
                    <div style="margin-bottom: 6px; font-size: 10pt;"><strong>${sub.label}</strong> ${formatText(sub.text)} <em>(${sub.points} Puan)</em></div>
                  `).join('')}
                </div>
              ` : ''}
              <div style="border: 1pt dashed #aaa; min-height: ${Math.max(60, q.suggestedLines * 22)}px; margin-top: 6px; padding: 6px; color: #888; font-size: 9pt;">
                <em>Cevap Alanı:</em>
              </div>
            </div>
          `).join('')}
        </div>

        <table style="width: 100%; margin-top: 35px; border-collapse: collapse; page-break-inside: avoid;">
          <tr>
            <td style="width: 50%; text-align: left; font-size: 10pt;">
              <em><strong>${formatText(exam.header.note || 'Soruları dikkatlice okuyunuz. Her sorunun cevabını altına bırakılan alana okunaklı şekilde yazınız. Başarılar dileriz.')}</strong></em>
            </td>
            <td style="width: 50%; text-align: right; font-size: 10.5pt;">
              <strong>${exam.header.teacherName || ''}</strong><br />
              ${exam.header.teacherBranch || ''}<br />
              <br />
              İmza: ....................
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  if (type === 'both') {
    bodyHtml += '<br clear="all" style="page-break-before:always" /><br />';
  }

  // 2. CEVAP ANAHTARI (DERECELİ PUANLAMA ANAHTARI / RUBRİK)
  // Yazdır (Print) formatındaki tüm içerik ve görsel hiyerarşi birebir yansıtılmıştır.
  if (type === 'rubric' || type === 'both') {
    bodyHtml += `
      <div style="font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #000;">
        
        <!-- RESMÎ BAŞLIK KUTUSU -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; text-align: center; border: 2pt solid #000;">
          <tr>
            <td style="padding: 10px; font-size: 11pt; font-weight: bold; text-transform: uppercase;">
              T.C. ${exam.header.schoolName || ''}<br />
              <span style="font-size: 12.5pt; font-weight: 800; color: #7f1d1d;">${exam.header.academicYear} &bull; ${exam.header.course} DERSİ ${exam.header.grade}</span><br />
              <span style="font-size: 10.5pt; font-weight: bold; color: #1e293b;">
                ${exam.header.termAndExam} &bull; ${
                  exam.header.grade?.includes('9')
                    ? 'TÜRKİYE YÜZYILI MAARİF MODELİ (TYMM) DERECELİ PUANLAMA ANAHTARI'
                    : 'MEB DERECELİ PUANLAMA ANAHTARI'
                }
              </span>
            </td>
          </tr>
        </table>

        <!-- BİLGİLENDİRME BANTI -->
        <table style="width: 100%; border-collapse: collapse; border: 1pt solid #000; margin-bottom: 20px; font-size: 9.5pt; background-color: #f8fafc;">
          <tr>
            <td style="padding: 6px 10px; width: 25%; border-right: 1pt solid #cbd5e1;"><strong>Ders:</strong> ${exam.header.course}</td>
            <td style="padding: 6px 10px; width: 25%; border-right: 1pt solid #cbd5e1;"><strong>Sınıf:</strong> ${exam.header.grade}</td>
            <td style="padding: 6px 10px; width: 25%; border-right: 1pt solid #cbd5e1;"><strong>Sınav Süresi:</strong> ${exam.header.duration}</td>
            <td style="padding: 6px 10px; width: 25%;"><strong>Sınav Toplamı:</strong> ${totalPoints} Puan</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 6px 10px; border-top: 1pt solid #000; font-size: 8.5pt; color: #334155;">
              * Öğrenme Çıktısı (Kazanım) ve TYMM Süreç Bileşeni (SB) sütunundaki bilgiler &quot;ders bilgi formu&quot; dokümanından yararlanılarak hazırlanmıştır.
            </td>
          </tr>
        </table>

        <!-- SORU BAZLI DETAYLI RUBRİK KARTLARI -->
        <div>
          ${exam.questions.map((q) => {
            const r = q.rubric;
            return `
              <div style="border: 1.5pt solid #000; margin-bottom: 22px; page-break-inside: avoid; background-color: #ffffff;">
                
                <!-- Soru Başlık Çubuğu -->
                <table style="width: 100%; border-collapse: collapse; background-color: #f1f5f9; border-bottom: 1.5pt solid #000;">
                  <tr>
                    <td style="padding: 8px 10px; font-weight: bold; font-size: 10.5pt; text-align: left;">
                      <strong>Soru ${q.number} (${q.points} Puan)</strong> &bull; <span style="font-weight: 600; color: #334155;">${q.typeLabel || 'Açık Uçlu Soru'}</span>
                    </td>
                    <td style="padding: 8px 10px; font-weight: bold; font-size: 9.5pt; text-align: right; width: 140px;">
                      <span style="background-color: #fee2e2; border: 1pt solid #f87171; color: #991b1b; padding: 3px 8px; font-weight: 800;">
                        Tam Puan: ${q.points} P
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Soru Kökü ve TYMM Süreç Bileşeni Özeti -->
                <table style="width: 100%; border-collapse: collapse; border-bottom: 1pt solid #cbd5e1; font-size: 9pt; background-color: #f8fafc;">
                  <tr>
                    <td style="padding: 8px 10px; width: 50%; vertical-align: top; border-right: 1pt solid #cbd5e1; background-color: #fafafa;">
                      <strong style="color: #7f1d1d; display: block; margin-bottom: 3px; font-size: 9.5pt;">
                        Öğrenme Çıktısı (Kazanım):
                      </strong>
                      <span>${formatText(q.learningOutcome || '-')}</span>
                    </td>
                    <td style="padding: 8px 10px; width: 50%; vertical-align: top; background-color: #fafafa;">
                      <strong style="color: #1e3a8a; display: block; margin-bottom: 3px; font-size: 9.5pt;">
                        TYMM Süreç Bileşeni (SB):
                      </strong>
                      <span>${formatText(q.processComponent || '-')}</span>
                    </td>
                  </tr>
                  ${cleanPageReferences(q.context) ? `
                    <tr>
                      <td colspan="2" style="padding: 6px 10px; border-top: 1pt solid #e2e8f0; background-color: #fcfcfc;">
                        <strong style="color: #475569;">Bağlam / Açıklama:</strong>
                        <span style="font-style: italic;">${formatText(q.context)}</span>
                      </td>
                    </tr>
                  ` : ''}
                  <tr>
                    <td colspan="2" style="padding: 8px 10px; border-top: 1pt solid #e2e8f0; background-color: #ffffff;">
                      <strong style="color: #334155; display: block; margin-bottom: 3px;">Soru Kökü:</strong>
                      <div style="font-style: italic; font-weight: 500; color: #0f172a;">${formatText(q.questionText)}</div>
                      ${q.subQuestions && q.subQuestions.length > 0 ? `
                        <div style="margin-top: 6px; padding-left: 12px;">
                          ${q.subQuestions.map(sub => `
                            <div style="margin-top: 3px; font-size: 9pt;"><strong>${sub.label}</strong> ${formatText(sub.text)} <em>(${sub.points} Puan)</em></div>
                          `).join('')}
                        </div>
                      ` : ''}
                    </td>
                  </tr>
                </table>

                <!-- PUANLAMA KRİTERLERİ TABLOSU -->
                <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                  <thead>
                    <tr style="background-color: #f1f5f9; border-bottom: 1pt solid #000; text-align: left;">
                      <th style="padding: 6px 8px; border-right: 1pt solid #cbd5e1; width: 25%; font-weight: bold; color: #334155;">
                        Cevap Düzeyi &amp; Ölçüt
                      </th>
                      <th style="padding: 6px 8px; border-right: 1pt solid #cbd5e1; width: 60%; font-weight: bold; color: #334155;">
                        Ölçme Kriteri ve Örnek Öğrenci Cevabı
                      </th>
                      <th style="padding: 6px 8px; text-align: center; width: 15%; font-weight: bold; color: #334155;">
                        Puan Değeri
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <!-- 1. DOĞRU CEVAP (TAM PUAN) -->
                    <tr style="border-bottom: 1pt solid #cbd5e1; background-color: #f0fdf4;">
                      <td style="padding: 8px; border-right: 1pt solid #cbd5e1; vertical-align: top; font-weight: bold; color: #166534;">
                        ✔ Doğru Cevap<br />
                        <span style="font-size: 8.5pt; font-weight: normal; color: #15803d;">(Tam Puan)</span>
                      </td>
                      <td style="padding: 8px; border-right: 1pt solid #cbd5e1; vertical-align: top;">
                        <div><strong>Kriter:</strong> ${formatText(r.correctCriteria || 'Doğru ve eksiksiz cevap verilmiştir.')}</div>
                        <div style="margin-top: 6px; padding: 6px 8px; background-color: #ffffff; border: 1pt solid #86efac; font-size: 8.5pt; font-style: italic; color: #0f172a;">
                          <strong style="font-style: normal; color: #166534;">Örnek İdeal Cevap:</strong> &quot;${formatText(r.sampleCorrectAnswer || '')}&quot;
                        </div>
                      </td>
                      <td style="padding: 8px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 11pt; color: #166534;">
                        ${q.points} Puan
                      </td>
                    </tr>

                    <!-- 2. KISMİ CEVAP (KISMİ PUAN) -->
                    <tr style="border-bottom: 1pt solid #cbd5e1; background-color: #fffbeb;">
                      <td style="padding: 8px; border-right: 1pt solid #cbd5e1; vertical-align: top; font-weight: bold; color: #92400e;">
                        ▲ Kısmi Cevap<br />
                        <span style="font-size: 8.5pt; font-weight: normal; color: #b45309;">(Kısmi Puan)</span>
                      </td>
                      <td style="padding: 8px; border-right: 1pt solid #cbd5e1; vertical-align: top;">
                        <div><strong>Kriter:</strong> ${formatText(r.partialCriteria || 'Kısmi cevap verilmiştir.')}</div>
                        <div style="margin-top: 6px; padding: 6px 8px; background-color: #ffffff; border: 1pt solid #fde68a; font-size: 8.5pt; font-style: italic; color: #0f172a;">
                          <strong style="font-style: normal; color: #92400e;">Örnek Kısmi Cevap:</strong> &quot;${formatText(r.samplePartialAnswer || '')}&quot;
                        </div>
                      </td>
                      <td style="padding: 8px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 11pt; color: #92400e;">
                        ${r.partialPoints} Puan
                      </td>
                    </tr>

                    <!-- 3. YANLIŞ CEVAP (0 PUAN) -->
                    <tr style="border-bottom: 1pt solid #cbd5e1; background-color: #fff1f2;">
                      <td style="padding: 8px; border-right: 1pt solid #cbd5e1; vertical-align: top; font-weight: bold; color: #9f1239;">
                        ✖ Yanlış Cevap<br />
                        <span style="font-size: 8.5pt; font-weight: normal; color: #be123c;">(0 Puan)</span>
                      </td>
                      <td style="padding: 8px; border-right: 1pt solid #cbd5e1; vertical-align: top; color: #334155;">
                        <strong>Kriter:</strong> ${formatText(r.wrongCriteria || 'Konuyla ilgisiz veya yanlış cevap verilmiştir.')}
                      </td>
                      <td style="padding: 8px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 10pt; color: #64748b;">
                        0 Puan
                      </td>
                    </tr>

                    <!-- 4. BOŞ CEVAP (0 PUAN) -->
                    <tr style="background-color: #ffffff;">
                      <td style="padding: 8px; border-right: 1pt solid #cbd5e1; vertical-align: top; font-weight: bold; color: #475569;">
                        ○ Boş Cevap<br />
                        <span style="font-size: 8.5pt; font-weight: normal; color: #64748b;">(0 Puan)</span>
                      </td>
                      <td style="padding: 8px; border-right: 1pt solid #cbd5e1; vertical-align: top; color: #334155;">
                        <strong>Kriter:</strong> ${formatText(r.blankCriteria || 'Soruya herhangi bir yanıt verilmemiştir.')}
                      </td>
                      <td style="padding: 8px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 10pt; color: #64748b;">
                        0 Puan
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- Öğretmen Puanlama Notu -->
                ${r.scoringNotes ? `
                  <div style="padding: 6px 10px; background-color: #f1f5f9; border-top: 1pt solid #cbd5e1; font-size: 8.5pt; color: #334155;">
                    <strong>ℹ Ölçme Notu:</strong> ${formatText(r.scoringNotes)}
                  </div>
                ` : ''}

              </div>
            `;
          }).join('')}
        </div>

        <!-- EN ALT ÖĞRETMEN İMZA ALANI -->
        <table style="width: 100%; margin-top: 35px; border-top: 2pt solid #000; padding-top: 15px; page-break-inside: avoid; font-size: 10pt;">
          <tr>
            <td style="width: 60%; vertical-align: bottom;">
              <div style="font-weight: 600; color: #334155; margin-bottom: 4px;">
                ${
                  exam.header.grade?.includes('9')
                    ? 'Türkiye Yüzyılı Maarif Modeli Ölçme ve Değerlendirme Kriterleri'
                    : 'MEB Ortaöğretim Ölçme ve Değerlendirme Kriterleri'
                }
              </div>
              <div style="font-size: 9pt; color: #64748b;">
                Hazırlanma Tarihi: ${exam.header.date || new Date().toLocaleDateString('tr-TR')}
              </div>
            </td>
            <td style="width: 40%; text-align: right; vertical-align: bottom;">
              <div style="font-weight: bold; font-size: 11pt; color: #0f172a;">
                ${exam.header.teacherName || '................................'}
              </div>
              <div style="font-size: 9.5pt; color: #334155; margin-top: 2px;">
                ${exam.header.teacherBranch || ''}
              </div>
              <div style="margin-top: 24px; font-size: 9.5pt;">
                İmza: ........................................
              </div>
            </td>
          </tr>
        </table>

      </div>
    `;
  }

  // 3. DAĞILIM ÇİZELGESİ (MATRIX)
  if (type === 'matrix') {
    bodyHtml += `
      <div style="font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #000;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; text-align: center; border: 2pt solid #000;">
          <tr>
            <td style="padding: 10px; font-size: 11pt; font-weight: bold; text-transform: uppercase;">
              T.C. ${exam.header.schoolName || ''}<br />
              <span style="font-size: 12.5pt; font-weight: 800;">${exam.header.academicYear} &bull; ${exam.header.course} DERSİ ${exam.header.grade}</span><br />
              <span style="font-size: 10pt; font-weight: bold;">
                ${exam.header.termAndExam} &bull; ${
                  exam.header.grade?.includes('9')
                    ? 'TÜRKİYE YÜZYILI MAARİF MODELİ (TYMM) SORU VE KAZANIM DAĞILIM TABLOSU'
                    : 'MEB ORTAÖĞRETİM KAZANIM VE SORU DAĞILIM TABLOSU'
                }
              </span>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; border: 1.5pt solid #000; font-size: 9.5pt; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: center; font-weight: bold;">
              <th style="border: 1pt solid #000; padding: 6px; width: 10%;">Soru No</th>
              <th style="border: 1pt solid #000; padding: 6px; width: 20%;">Madde / Soru Türü</th>
              <th style="border: 1pt solid #000; padding: 6px; width: 35%; text-align: left;">Öğrenme Çıktısı (Kazanım)</th>
              <th style="border: 1pt solid #000; padding: 6px; width: 25%; text-align: left;">TYMM Süreç Bileşeni (SB)</th>
              <th style="border: 1pt solid #000; padding: 6px; width: 10%;">Soru Puanı</th>
            </tr>
          </thead>
          <tbody>
            ${exam.questions.map((q) => `
              <tr style="page-break-inside: avoid;">
                <td style="border: 1pt solid #000; padding: 6px; text-align: center; font-weight: bold;">
                  S${q.number}
                </td>
                <td style="border: 1pt solid #000; padding: 6px; text-align: center;">
                  ${q.typeLabel}
                </td>
                <td style="border: 1pt solid #000; padding: 6px;">
                  ${formatText(q.learningOutcome)}
                </td>
                <td style="border: 1pt solid #000; padding: 6px;">
                  ${formatText(q.processComponent)}
                </td>
                <td style="border: 1pt solid #000; padding: 6px; text-align: center; font-weight: bold;">
                  ${q.points} P
                </td>
              </tr>
            `).join('')}
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td colspan="4" style="border: 1pt solid #000; padding: 8px; text-align: right; text-transform: uppercase;">
                Toplam Sınav Puanı:
              </td>
              <td style="border: 1pt solid #000; padding: 8px; text-align: center; font-size: 11pt;">
                ${totalPoints} Puan
              </td>
            </tr>
          </tbody>
        </table>

        <table style="width: 100%; margin-top: 35px; border-top: 2pt solid #000; padding-top: 15px; page-break-inside: avoid; font-size: 10pt;">
          <tr>
            <td style="width: 60%; vertical-align: bottom;">
              <div style="font-weight: 600; color: #334155; margin-bottom: 4px;">
                * Öğrenme Çıktısı (Kazanım) ve TYMM Süreç Bileşeni (SB) sütunundaki bilgiler "ders bilgi formu" dokümanından yararlanılarak hazırlanmıştır.
              </div>
              <div style="font-size: 8.5pt; color: #64748b;">
                * Bu tablo MEB Ölçme ve Değerlendirme Yönetmeliği gereği zümre sınav evraklarına eklenir.
              </div>
            </td>
            <td style="width: 40%; text-align: right; vertical-align: bottom;">
              <div style="font-weight: bold; font-size: 11pt;">${exam.header.teacherName || 'Ders Öğretmeni'}</div>
              <div style="font-size: 9.5pt; color: #334155;">${exam.header.teacherBranch || ''}</div>
              <div style="margin-top: 24px; font-size: 9.5pt;">İmza: ........................................</div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  const fullDocHtml = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 595.3pt 841.9pt; /* A4 */
          margin: 1.5cm 1.5cm 1.5cm 1.5cm;
          mso-header-margin: 35.4pt;
          mso-footer-margin: 35.4pt;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        body { 
          font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; 
          font-size: 10.5pt; 
          line-height: 1.25; 
          color: #000000;
        }
        table {
          mso-displayed-decimal-separator: ",";
          mso-displayed-thousand-separator: ".";
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${bodyHtml}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', fullDocHtml], {
    type: 'application/msword;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9_\-\u00C0-\u017F]/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
