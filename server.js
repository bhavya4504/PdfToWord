import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import puppeteer from 'puppeteer';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
}));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(express.static(path.join(__dirname, 'dist')));

// File Conversion API
app.post('/api/convert', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const ext = path.extname(file.name).toLowerCase();
    if (!['.pdf', '.docx'].includes(ext)) {
      return res.status(400).json({ error: 'Only .pdf and .docx files are supported' });
    }

    const timestamp = Date.now();
    const uploadPath = path.join(uploadsDir, `${timestamp}_${file.name}`);
    await file.mv(uploadPath);

    let outputPath, outputFileName;

    if (ext === '.pdf') {
      outputFileName = `${path.basename(file.name, '.pdf')}.docx`;
      outputPath = path.join(uploadsDir, `${timestamp}_${outputFileName}`);
      await convertPdfToDocx(uploadPath, outputPath);
    } else {
      outputFileName = `${path.basename(file.name, '.docx')}.pdf`;
      outputPath = path.join(uploadsDir, `${timestamp}_${outputFileName}`);
      await convertDocxToPdf(uploadPath, outputPath);
    }

    res.json({
      success: true,
      message: 'File converted successfully',
      downloadLink: `/api/download/${timestamp}_${outputFileName}`,
    });

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'File conversion failed', details: error.message });
  }
});

// File Download API
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, filename.split('_').slice(1).join('_'), () => {
      fs.unlinkSync(filePath); // Clean up file after download
    });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// PDF to DOCX Conversion
async function convertPdfToDocx(pdfPath, docxPath) {
  try {
    const pdfData = fs.readFileSync(pdfPath);
    const pdfText = (await pdfParse(pdfData)).text;

    const doc = new Document({
      sections: [{
        children: pdfText.split('\n').map(line => new Paragraph({
          children: [new TextRun(line)],
        })),
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(docxPath, buffer);
  } catch (error) {
    throw new Error('PDF to DOCX conversion failed: ' + error.message);
  }
}

// DOCX to PDF Conversion
async function convertDocxToPdf(docxPath, pdfPath) {
  try {
    const docxBuffer = fs.readFileSync(docxPath);
    const { value: html } = await mammoth.convertToHtml({ buffer: docxBuffer });

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    await page.pdf({ path: pdfPath, format: 'A4' });
    await browser.close();
  } catch (error) {
    throw new Error('DOCX to PDF conversion failed: ' + error.message);
  }
}

// Catch-all for React App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
