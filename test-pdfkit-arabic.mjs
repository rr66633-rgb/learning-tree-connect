import PDFDocument from 'pdfkit';
import fs from 'fs';
import https from 'https';

const fontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf';
const fontPath = '/tmp/NotoSansArabic-Regular.ttf';

function downloadFont() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(fontPath)) return resolve();
    console.log('Downloading font...');
    const file = fs.createWriteStream(fontPath);
    https.get(fontUrl, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

async function main() {
  await downloadFont();
  console.log('Font ready, generating PDF...');
  
  const doc = new PDFDocument({ size: 'A4' });
  doc.pipe(fs.createWriteStream('/tmp/test-arabic.pdf'));
  doc.registerFont('Arabic', fontPath);
  doc.font('Arabic').fontSize(20);
  doc.text('الخطة الأسبوعية', { align: 'right', features: ['rtla', 'liga'] });
  doc.fontSize(16);
  doc.text('نظرة عامة على الموضوع', { align: 'right', features: ['rtla', 'liga'] });
  doc.text('أنشطة اللغة العربية', { align: 'right', features: ['rtla', 'liga'] });
  doc.text('سنتعرف هذا الأسبوع على الفصول الأربعة', { align: 'right', features: ['rtla', 'liga'] });
  doc.end();
  console.log('PDF generated at /tmp/test-arabic.pdf');
}

main().catch(console.error);
