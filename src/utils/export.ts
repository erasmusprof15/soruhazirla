import { ExamData } from '../types/exam';
import { cleanPageReferences, isTopicHeading } from './cleanText';

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

  // 1. SINAV KAĞIDI (Kağıt Tasarruflu Kompakt Resmî Düzen)
  if (type === 'exam' || type === 'both') {
    bodyHtml += `
      <div style="font-family: 'Segoe UI', 'Calibri', Arial, sans-serif; max-width: 100%; margin: 0 auto; color: #000;">
        <!-- Birleştirilmiş Kompakt Başlık ve Öğrenci Bilgi Tablosu -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5pt; border: 1.2pt solid #000; font-size: 8.5pt; line-height: 1.1;">
          <tr>
            <td colspan="3" style="border: 1pt solid #000; padding: 3pt 6pt; text-align: center; font-weight: bold; font-size: 9pt; text-transform: uppercase; line-height: 1.15;">
              T.C. ${exam.header.schoolName || 'MİLLÎ EĞİTİM BAKANLIĞI'}<br />
              <span style="font-size: 8.5pt;">${exam.header.academicYear} &bull; ${exam.header.course ? `${exam.header.course} DERSİ ` : ''}${exam.header.termAndExam}</span>
            </td>
          </tr>
          <tr>
            <td style="border: 0.75pt solid #000; padding: 2pt 5pt; width: 38%;">
              <strong>Sınıf:</strong> ${exam.header.grade} / ....
            </td>
            <td style="border: 0.75pt solid #000; padding: 2pt 5pt; width: 34%;">
              <strong>Adı Soyadı:</strong>
            </td>
            <td rowspan="2" style="border: 0.75pt solid #000; padding: 2pt 5pt; width: 28%; vertical-align: middle; font-size: 8pt; line-height: 1.2;">
              <strong>Aldığı Not</strong> &nbsp; <strong>Rakamla:</strong> ...............<br />
              <strong>Yazıyla:</strong> ......................................
            </td>
          </tr>
          <tr>
            <td style="border: 0.75pt solid #000; padding: 2pt 5pt;">
              <strong>Tarih:</strong> ${exam.header.date || '.../.../202..'} &nbsp;|&nbsp; <strong>Süre:</strong> ${exam.header.duration}
            </td>
            <td style="border: 0.75pt solid #000; padding: 2pt 5pt;">
              <strong>Numarası:</strong> ....................
            </td>
          </tr>
        </table>

        <!-- Kompakt Sorular Listesi -->
        <div style="margin-top: 2pt;">
          ${exam.questions.map((q) => {
            const cleanedContext = cleanPageReferences(q.context);
            const isValidContext = cleanedContext && !isTopicHeading(cleanedContext);
            const compactLineCount = Math.min(4, Math.max(2, Math.round((Number(q.suggestedLines) || 3) * 0.6)));
            const answerLinesHtml = Array.from({ length: compactLineCount })
              .map(() => `<div style="border-bottom: 0.6pt dotted #999; height: 10pt; line-height: 10pt; font-size: 1pt; width: 100%; margin: 0; padding: 0;">&nbsp;</div>`)
              .join('');

            return `
            <div style="margin-bottom: 3.5pt; page-break-inside: avoid;">
              ${
                isValidContext
                  ? `<div style="font-size: 8.5pt; font-weight: normal; line-height: 1.15; margin-bottom: 1pt; text-align: justify;">
                      <strong>${q.number}.</strong> <em>${formatText(cleanedContext)}</em>
                    </div>
                    <div style="font-size: 8.5pt; font-weight: normal; line-height: 1.15; margin-bottom: 1.5pt; text-align: justify;">
                      ${formatText(q.questionText)} <strong>(${q.points} Puan)</strong>
                    </div>`
                  : `<div style="font-size: 8.5pt; font-weight: normal; line-height: 1.15; margin-bottom: 1.5pt; text-align: justify;">
                      <strong>${q.number}.</strong> ${formatText(q.questionText)} <strong>(${q.points} Puan)</strong>
                    </div>`
              }
              ${
                q.subQuestions && q.subQuestions.length > 0
                  ? `<div style="margin-left: 8pt; margin-bottom: 1.5pt;">
                      ${q.subQuestions
                        .map(
                          (sub) =>
                            `<div style="margin-bottom: 1pt; font-size: 8pt; font-weight: normal; line-height: 1.15;"><strong>${sub.label}</strong> ${formatText(sub.text)} <em>(${sub.points} P)</em></div>`
                        )
                        .join('')}
                    </div>`
                  : ''
              }
              <div style="margin-top: 1pt; margin-bottom: 1pt;">
                ${answerLinesHtml}
              </div>
            </div>
          `;
          }).join('')}
        </div>

        <!-- Kompakt Alt Yönerge ve İmza Satırı -->
        <table style="width: 100%; margin-top: 4pt; border-top: 0.75pt solid #000; border-collapse: collapse; page-break-inside: avoid;">
          <tr>
            <td style="width: 62%; padding-top: 2pt; text-align: left; font-size: 8pt; line-height: 1.15;">
              <em>${formatText(exam.header.note || 'Soruları dikkatlice okuyunuz. Her sorunun cevabını altına bırakılan alana okunaklı şekilde yazınız. Başarılar dileriz.')}</em>
            </td>
            <td style="width: 38%; padding-top: 2pt; text-align: right; font-size: 8.5pt; line-height: 1.15;">
              <strong>${exam.header.teacherName || ''}</strong> ${exam.header.teacherBranch ? `(${exam.header.teacherBranch})` : ''} &nbsp;|&nbsp; İmza: ...............
            </td>
          </tr>
        </table>
        <p style="margin: 0; padding: 0; font-size: 1pt; line-height: 1pt; height: 1pt; mso-line-height-rule: exactly;">&nbsp;</p>
      </div>
    `;
  }

  if (type === 'both') {
    bodyHtml += '<br clear="all" style="page-break-before:always" />';
  }

  // 2. CEVAP ANAHTARI (DERECELİ PUANLAMA ANAHTARI / RUBRİK - Bütünleşik & Kağıt Dostu Tablo Düzeni)
  if (type === 'rubric' || type === 'both') {
    bodyHtml += `
      <div style="font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; max-width: 100%; margin: 0 auto; color: #000;">
        
        <!-- BÜTÜNLEŞİK RESMÎ BAŞLIK VE BİLGİ TABLOSU -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6pt; border: 1.2pt solid #000; font-size: 9pt; line-height: 1.15;">
          <tr>
            <td colspan="3" style="border: 1pt solid #000; padding: 3.5pt 6pt; text-align: center; font-weight: bold; font-size: 9.5pt; text-transform: uppercase; line-height: 1.2;">
              T.C. ${exam.header.schoolName || 'MİLLÎ EĞİTİM BAKANLIĞI'}<br />
              <span style="font-size: 9pt;">${exam.header.academicYear} &bull; ${exam.header.course ? `${exam.header.course} DERSİ ` : ''}${exam.header.grade} &bull; ${exam.header.termAndExam}</span><br />
              <span style="font-size: 8.5pt;">
                CEVAP ANAHTARI VE DERECELİ PUANLAMA ANAHTARI
              </span>
            </td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="border: 0.75pt solid #000; padding: 2.5pt 5pt; width: 33.3%;"><strong>Sınıf:</strong> ${exam.header.grade || '-'}</td>
            <td style="border: 0.75pt solid #000; padding: 2.5pt 5pt; width: 33.3%;"><strong>Sınav Süresi:</strong> ${exam.header.duration || '-'}</td>
            <td style="border: 0.75pt solid #000; padding: 2.5pt 5pt; width: 33.4%;"><strong>Toplam Puan:</strong> ${totalPoints} Puan</td>
          </tr>
        </table>

        <!-- SORU BAZLI TEK PARÇA BÜTÜNLEŞİK RUBRİK TABLOLARI -->
        <div>
          ${exam.questions.map((q) => {
            const r = q.rubric;
            const subQuestionsHtml =
              q.subQuestions && q.subQuestions.length > 0
                ? `<div style="margin-top: 2pt; padding-left: 6pt;">
                    ${q.subQuestions
                      .map(
                        (sub) =>
                          `<div style="font-size: 8pt; line-height: 1.1;"><strong>${sub.label}</strong> ${formatText(sub.text)} <em>(${sub.points} P)</em></div>`
                      )
                      .join('')}
                  </div>`
                : '';

            return `
              <table style="width: 100%; border-collapse: collapse; border: 1pt solid #000; margin-bottom: 5pt; page-break-inside: avoid; font-size: 8.5pt; line-height: 1.15;">
                <!-- 1. Üst Başlık ve Kazanım Satırı -->
                <tr style="background-color: #f1f5f9;">
                  <td colspan="2" style="border: 0.75pt solid #000; padding: 2.5pt 5pt; text-align: left; width: 88%;">
                    <strong>Soru ${q.number}</strong> &bull; <strong>${q.typeLabel || 'Açık Uçlu Soru'}</strong>
                    ${
                      q.learningOutcome
                        ? ` &nbsp;|&nbsp; <span style="font-size: 8pt;"><strong>Kazanım:</strong> ${formatText(q.learningOutcome)}${
                            q.processComponent ? ` &bull; <strong>SB:</strong> ${formatText(q.processComponent)}` : ''
                          }</span>`
                        : ''
                    }
                  </td>
                  <td style="border: 0.75pt solid #000; padding: 2.5pt 4pt; text-align: center; font-weight: bold; width: 12%;">
                    ${q.points} Puan
                  </td>
                </tr>

                <!-- 2. Soru Kökü Satırı -->
                <tr>
                  <td colspan="3" style="border: 0.75pt solid #000; padding: 2.5pt 5pt; background-color: #ffffff;">
                    <strong>Soru:</strong> <em>${formatText(q.questionText)}</em>
                    ${
                      q.materialRef
                        ? `<div style="font-size: 8pt; color: #334155; margin-top: 2pt;"><strong>Kaynak / İlgili Bölüm:</strong> ${formatText(q.materialRef)}</div>`
                        : ''
                    }
                    ${subQuestionsHtml}
                  </td>
                </tr>

                <!-- 3. Tam Puan (Doğru Cevap) Satırı -->
                <tr>
                  <td style="border: 0.75pt solid #000; padding: 2.5pt 5pt; width: 18%; vertical-align: top; font-weight: bold;">
                    Tam Puan<br />
                    <span style="font-size: 7.5pt; font-weight: normal;">(Doğru Cevap)</span>
                  </td>
                  <td style="border: 0.75pt solid #000; padding: 2.5pt 5pt; width: 70%; vertical-align: top;">
                    <strong>Kriter:</strong> ${formatText(r.correctCriteria || 'Doğru ve eksiksiz cevap verilmiştir.')}
                    ${
                      r.sampleCorrectAnswer
                        ? `<br /><strong>Örnek Cevap:</strong> <em>&quot;${formatText(r.sampleCorrectAnswer)}&quot;</em>`
                        : ''
                    }
                  </td>
                  <td style="border: 0.75pt solid #000; padding: 2.5pt 4pt; width: 12%; text-align: center; vertical-align: middle; font-weight: bold;">
                    ${q.points} Puan
                  </td>
                </tr>

                <!-- 4. Kısmi Puan (Kısmi Cevap) Satırı -->
                <tr>
                  <td style="border: 0.75pt solid #000; padding: 2.5pt 5pt; width: 18%; vertical-align: top; font-weight: bold;">
                    Kısmi Puan<br />
                    <span style="font-size: 7.5pt; font-weight: normal;">(Kısmi Cevap)</span>
                  </td>
                  <td style="border: 0.75pt solid #000; padding: 2.5pt 5pt; width: 70%; vertical-align: top;">
                    <strong>Kriter:</strong> ${formatText(r.partialCriteria || 'Kısmi cevap verilmiştir.')}
                    ${
                      r.samplePartialAnswer
                        ? `<br /><strong>Örnek Kısmi Cevap:</strong> <em>&quot;${formatText(r.samplePartialAnswer)}&quot;</em>`
                        : ''
                    }
                  </td>
                  <td style="border: 0.75pt solid #000; padding: 2.5pt 4pt; width: 12%; text-align: center; vertical-align: middle; font-weight: bold;">
                    ${r.partialPoints} Puan
                  </td>
                </tr>

                <!-- 5. Yanlış / Boş Cevap (0 Puan) Satırı -->
                <tr>
                  <td style="border: 0.75pt solid #000; padding: 2pt 5pt; width: 18%; vertical-align: top; font-weight: bold;">
                    Yanlış / Boş
                  </td>
                  <td style="border: 0.75pt solid #000; padding: 2pt 5pt; width: 70%; vertical-align: top; font-size: 8pt;">
                    <strong>Yanlış:</strong> ${formatText(r.wrongCriteria || 'Konuyla ilgisiz veya yanlış cevap verilmiştir.')}
                    &nbsp;|&nbsp;
                    <strong>Boş:</strong> ${formatText(r.blankCriteria || 'Soruya yanıt verilmemiştir.')}
                  </td>
                  <td style="border: 0.75pt solid #000; padding: 2pt 4pt; width: 12%; text-align: center; vertical-align: middle; font-weight: bold;">
                    0 Puan
                  </td>
                </tr>

                ${
                  r.scoringNotes
                    ? `<tr>
                        <td colspan="3" style="border: 0.75pt solid #000; padding: 2pt 5pt; background-color: #f8fafc; font-size: 8pt;">
                          <strong>Ölçme Notu:</strong> ${formatText(r.scoringNotes)}
                        </td>
                      </tr>`
                    : ''
                }
              </table>
            `;
          }).join('')}
        </div>

        <!-- KOMPAKT ALT ÖĞRETMEN İMZA SATIRI -->
        <table style="width: 100%; margin-top: 5pt; border-top: 0.75pt solid #000; border-collapse: collapse; page-break-inside: avoid; font-size: 8.5pt;">
          <tr>
            <td style="width: 50%; padding-top: 2.5pt; text-align: left;">
              Tarih: ${exam.header.date || new Date().toLocaleDateString('tr-TR')}
            </td>
            <td style="width: 50%; padding-top: 2.5pt; text-align: right;">
              <strong>${exam.header.teacherName || '................................'}</strong> ${exam.header.teacherBranch ? `(${exam.header.teacherBranch})` : ''} &nbsp;|&nbsp; İmza: ...............
            </td>
          </tr>
        </table>
        <p style="margin: 0; padding: 0; font-size: 1pt; line-height: 1pt; height: 1pt; mso-line-height-rule: exactly;">&nbsp;</p>
      </div>
    `;
  }

  // 3. DAĞILIM ÇİZELGESİ (MATRIX - Bütünleşik & Kompakt Tablo)
  if (type === 'matrix') {
    bodyHtml += `
      <div style="font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; max-width: 100%; margin: 0 auto; color: #000;">
        <table style="width: 100%; border-collapse: collapse; border: 1.2pt solid #000; font-size: 9pt; margin-bottom: 6pt;">
          <thead>
            <tr>
              <th colspan="5" style="border: 1pt solid #000; padding: 3.5pt 6pt; text-align: center; font-weight: bold; font-size: 9.5pt; text-transform: uppercase; line-height: 1.2;">
                T.C. ${exam.header.schoolName || 'MİLLÎ EĞİTİM BAKANLIĞI'}<br />
                <span style="font-size: 9pt;">${exam.header.academicYear} &bull; ${exam.header.course} DERSİ ${exam.header.grade}</span><br />
                <span style="font-size: 8.5pt;">
                  ${exam.header.termAndExam} &bull; SORU VE KAZANIM DAĞILIM TABLOSU
                </span>
              </th>
            </tr>
            <tr style="background-color: #f1f5f9; text-align: center; font-weight: bold;">
              <th style="border: 0.75pt solid #000; padding: 3pt 5pt; width: 10%;">Soru No</th>
              <th style="border: 0.75pt solid #000; padding: 3pt 5pt; width: 18%;">Madde / Soru Türü</th>
              <th style="border: 0.75pt solid #000; padding: 3pt 5pt; width: 36%; text-align: left;">Öğrenme Çıktısı (Kazanım)</th>
              <th style="border: 0.75pt solid #000; padding: 3pt 5pt; width: 26%; text-align: left;">TYMM Süreç Bileşeni (SB)</th>
              <th style="border: 0.75pt solid #000; padding: 3pt 5pt; width: 10%;">Soru Puanı</th>
            </tr>
          </thead>
          <tbody>
            ${exam.questions.map((q) => `
              <tr style="page-break-inside: avoid;">
                <td style="border: 0.75pt solid #000; padding: 2.5pt 5pt; text-align: center; font-weight: bold;">
                  S${q.number}
                </td>
                <td style="border: 0.75pt solid #000; padding: 2.5pt 5pt; text-align: center;">
                  ${q.typeLabel}
                </td>
                <td style="border: 0.75pt solid #000; padding: 2.5pt 5pt;">
                  ${formatText(q.learningOutcome)}
                </td>
                <td style="border: 0.75pt solid #000; padding: 2.5pt 5pt;">
                  ${formatText(q.processComponent)}
                </td>
                <td style="border: 0.75pt solid #000; padding: 2.5pt 5pt; text-align: center; font-weight: bold;">
                  ${q.points} P
                </td>
              </tr>
            `).join('')}
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td colspan="4" style="border: 0.75pt solid #000; padding: 3pt 5pt; text-align: right; text-transform: uppercase;">
                Toplam Sınav Puanı:
              </td>
              <td style="border: 0.75pt solid #000; padding: 3pt 5pt; text-align: center; font-size: 9.5pt;">
                ${totalPoints} Puan
              </td>
            </tr>
          </tbody>
        </table>

        <table style="width: 100%; margin-top: 5pt; border-top: 0.75pt solid #000; border-collapse: collapse; page-break-inside: avoid; font-size: 9pt;">
          <tr>
            <td style="width: 50%; padding-top: 2.5pt;"></td>
            <td style="width: 50%; padding-top: 2.5pt; text-align: right;">
              <strong>${exam.header.teacherName || 'Ders Öğretmeni'}</strong> ${exam.header.teacherBranch ? `(${exam.header.teacherBranch})` : ''} &nbsp;|&nbsp; İmza: ........................
            </td>
          </tr>
        </table>
        <p style="margin: 0; padding: 0; font-size: 1pt; line-height: 1pt; height: 1pt; mso-line-height-rule: exactly;">&nbsp;</p>
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
          margin: 0.6cm 0.8cm 0.5cm 0.8cm;
          mso-header-margin: 0pt;
          mso-footer-margin: 0pt;
          mso-paper-source: 0;
        }
        div.Section1 { 
          page: Section1;
          margin: 0;
          padding: 0;
        }
        body { 
          font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; 
          font-size: 9pt; 
          line-height: 1.15; 
          color: #000000;
          margin: 0;
          padding: 0;
        }
        p, div {
          margin-top: 0pt;
          margin-bottom: 0pt;
          mso-margin-top-alt: 0pt;
          mso-margin-bottom-alt: 0pt;
        }
        p.MsoNormal, li.MsoNormal, div.MsoNormal {
          margin: 0pt;
          margin-bottom: 0.0001pt;
          font-size: 9pt;
          font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
        }
        table {
          mso-displayed-decimal-separator: ",";
          mso-displayed-thousand-separator: ".";
          mso-padding-alt: 1.5pt 3.5pt 1.5pt 3.5pt;
        }
        td, th {
          mso-line-height-rule: exactly;
          line-height: 11pt;
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
