import express from 'express';
import * as fontkit from 'fontkit';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LineRuleType, Table, TableRow, TableCell, BorderStyle,File } from 'docx';
import pdfParse from 'pdf-parse';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  },
}));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// API endpoint for file conversion
// app.post('/api/convert', async (req, res) => {
//   try {
//     if (!req.files || Object.keys(req.files).length === 0) {
//       return res.status(400).json({ error: 'No file was uploaded' });
//     }

//     const file = req.files.file;
//     const fileExtension = path.extname(file.name).toLowerCase();
    
//     // Validate file extension
//     if (fileExtension !== '.pdf' && fileExtension !== '.docx') {
//       return res.status(400).json({ error: 'Only .pdf and .docx files are supported' });
//     }

//     // Create a unique filename to avoid collisions
//     const timestamp = Date.now();
//     const uploadPath = path.join(uploadsDir, `${timestamp}_${file.name}`);
    
//     // Save the uploaded file
//     await file.mv(uploadPath);
    
//     let outputFileName;
//     let outputPath;

//     // Convert based on file extension
//     if (fileExtension === '.pdf') {
//       // Convert PDF to DOCX
//       outputFileName = `${path.basename(file.name, '.pdf')}.docx`;
//       outputPath = path.join(uploadsDir, `${timestamp}_${outputFileName}`); 
//       console.log(outputPath);
      
//       await convertPdfToDocx(uploadPath, outputPath);
//     } else {
//       // Convert DOCX to PDF
//       outputFileName = `${path.basename(file.name, '.docx')}.pdf`;
//       outputPath = path.join(uploadsDir, `${timestamp}_${outputFileName}`);
      
//       await convertDocxToPdf(uploadPath, outputPath);
//     }

//     // Return the download link
//     res.json({
//       success: true,
//       message: 'File converted successfully',
//       downloadLink: `/api/download/${timestamp}_${outputFileName}`
//     });

//   } catch (error) {
//     console.error('Conversion error:', error);
//     res.status(500).json({ error: 'File conversion failed', details: error.message });
//   }
// });

// API endpoint for file conversion
app.post('/api/convert', async (req, res) => {
  try {
      if (!req.files || Object.keys(req.files).length === 0) {
          return res.status(400).json({ error: 'No file was uploaded' });
      }

      const file = req.files.file;
      const fileExtension = path.extname(file.name).toLowerCase();

      // Validate file extension
      if (fileExtension !== '.pdf' && fileExtension !== '.docx') {
          return res.status(400).json({ error: 'Only .pdf and .docx files are supported' });
      }

      // Create a unique filename to avoid collisions
      const timestamp = Date.now();
      const uploadPath = path.join(uploadsDir, `${timestamp}_${file.name}`); 
      console.log(uploadPath);

      // Save the uploaded file
      await file.mv(uploadPath);

      let outputFileName;
      let outputPath;

      // Convert based on file extension
      if (fileExtension === '.pdf') {
          // Convert PDF to DOCX
          outputFileName = `${path.basename(file.name, '.pdf')}.docx`;
          outputPath = path.join(uploadsDir, `${timestamp}_${outputFileName}`);
          console.log(outputPath);

          // Extract text from PDF using pdf-parse
          const pdfData = await pdfParse(fs.readFileSync(uploadPath));
          const pdfText = pdfData.text;

          await convertPdfToDocx(pdfText, outputPath); // Pass pdfText, not uploadPath
      } else {
          // Convert DOCX to PDF
          outputFileName = `${path.basename(file.name, '.docx')}.pdf`;
          outputPath = path.join(uploadsDir, `${timestamp}_${outputFileName}`);
          console.log(outputPath);
          await convertDocxToPdf(uploadPath, outputPath);
      }

      // Return the download link
      res.json({
          success: true,
          message: 'File converted successfully',
          downloadLink: `/api/download/${timestamp}_${outputFileName}`
      });

  } catch (error) {
      console.error('Conversion error:', error);
      res.status(500).json({ error: 'File conversion failed', details: error.message });
  }
});
// API endpoint for file download
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  console.log(filePath)
  if (fs.existsSync(filePath)) {
    res.download(filePath, filename.substring(filename.indexOf('_') + 1));
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Function to convert PDF to DOCX with improved structure preservation
// async function convertPdfToDocx(pdfPath, docxPath) {
//   try {
//     // Read the PDF file
//     const pdfBytes = fs.readFileSync(pdfPath);
    
//     // Extract text from PDF using pdf-parse with more options
//     const pdfData = await pdfParse(pdfBytes, {
//       // Enable more detailed extraction
//       pagerender: function(pageData) {
//         return pageData.getTextContent()
//           .then(function(textContent) {
//             let lastY, text = '';
//             for (let item of textContent.items) {
//               if (lastY == item.transform[5] || !lastY) {
//                 text += item.str;
//               } else {
//                 text += '\n' + item.str;
//               }
//               lastY = item.transform[5];
//             }
//             return text;
//           });
//       }
//     });
    
//     // Try to identify document structure
//     const sections = identifyDocumentSections(pdfData.text);
    
//     // Create a new DOCX document
//     const doc = new Document({
//       sections: [{
//         properties: {},
//         children: createStructuredDocument(sections),
//       }],
//     });
    
//     // Save the DOCX file
//     const buffer = await Packer.toBuffer(doc);
//     fs.writeFileSync(docxPath, buffer);
    
//     return docxPath;
//   } catch (error) {
//     console.error('PDF to DOCX conversion error:', error);
//     throw error;
//   }
// }
// async function convertPdfToDocx(pdfPath, outputPath) {
//   try {
//     console.log("Converting PDF to DOCX for path:", pdfPath);

//     // Parse PDF content
//     const pdfData = await pdfParse(fs.readFileSync(pdfPath));
//     const sections = identifyDocumentSections(pdfData.text);

//     // Create DOCX content
//     const doc = new Document({
//       sections: [{
//         properties: {},
//         children: createStructuredDocument(sections),
//       }],
//     });

//     // Save DOCX file
//     const buffer = await Packer.toBuffer(doc);
//     await fs.promises.writeFile(outputPath, buffer);
//     console.log("PDF to DOCX conversion complete:", outputPath);

//     return outputPath;
//   } catch (error) {
//     console.error("Error during PDF to DOCX conversion:", error);
//     throw error;
//   }
// }

async function convertPdfToDocx(pdfContent, outputPath) {
  try {
    if (!pdfContent || pdfContent.length === 0) {
      throw new Error("PDF content is empty or invalid");
    }

    const paragraphs = pdfContent
      .split("\n")
      .map((line) => {
        if (!line.trim()) return null;
        return new Paragraph({
          children: [new TextRun(line)],
        });
      })
      .filter(Boolean);

    if (paragraphs.length === 0) {
      throw new Error("No valid content to convert");
    }

    const doc = new File({
      sections: [{ properties: {}, children: paragraphs }],
    });

    const buffer = await Packer.toBuffer(doc);

    try {
      await fs.promises.writeFile(outputPath, buffer);
      console.log(`DOCX saved successfully: ${outputPath}`);
    } catch (writeError) {
      console.error(`Error writing DOCX file: ${writeError}`);
      throw writeError; // Re-throw to be caught by the outer catch
    }

    console.log("Conversion completed successfully!");
  } catch (error) {
    console.error(`Conversion error: ${error}`);
    throw error; // Re-throw to allow further error handling
  }
}

// Function to identify document sections from PDF text
function identifyDocumentSections(text) {
  // Split text into lines
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);
  
  // Initialize sections array
  const sections = [];
  
  // Variables to track current section
  let currentSection = null;
  let inList = false;
  let listItems = [];
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line is a heading (all caps, short, or ends with colon)
    const isHeading = (
      line.toUpperCase() === line && line.length < 50 ||
      (line.length < 30 && !line.includes('.')) ||
      line.endsWith(':')
    );
    
    // Check if line is a list item
    const isListItem = /^[\s]*[•\-\*\d+\.\)]\s+/.test(line);
    
    if (isHeading) {
      // If we were in a list, add it to the current section
      if (inList && listItems.length > 0) {
        if (currentSection) {
          currentSection.content.push({ type: 'list', items: [...listItems] });
        }
        inList = false;
        listItems = [];
      }
      
      // Start a new section
      currentSection = { type: 'section', heading: line, content: [] };
      sections.push(currentSection);
    } else if (isListItem) {
      // Start or continue a list
      inList = true;
      listItems.push(line.replace(/^[\s]*[•\-\*\d+\.\)]\s+/, '').trim());
    } else {
      // If we were in a list, add it to the current section
      if (inList && listItems.length > 0) {
        if (currentSection) {
          currentSection.content.push({ type: 'list', items: [...listItems] });
        }
        inList = false;
        listItems = [];
      }
      
      // Add paragraph to current section or create a new section if none exists
      if (currentSection) {
        currentSection.content.push({ type: 'paragraph', text: line });
      } else {
        currentSection = { type: 'section', heading: null, content: [{ type: 'paragraph', text: line }] };
        sections.push(currentSection);
      }
    }
  }
  
  // If we ended with a list, add it
  if (inList && listItems.length > 0 && currentSection) {
    currentSection.content.push({ type: 'list', items: [...listItems] });
  }
  
  return sections;
}

// Function to create structured DOCX content
// function createStructuredDocument(sections) {
//   const children = [];
  
//   // Add title
//   children.push(
//     new Paragraph({
//       text: "Converted from PDF",
//       heading: HeadingLevel.HEADING_1,
//       alignment: AlignmentType.CENTER,
//       spacing: {
//         after: 200,
//       },
//     })
//   );
  
//   // Process each section
//   for (const section of sections) {
//     // Add section heading if it exists
//     if (section.heading) {
//       children.push(
//         new Paragraph({
//           text: section.heading,
//           heading: HeadingLevel.HEADING_2,
//           spacing: {
//             before: 240,
//             after: 120,
//           },
//         })
//       );
//     }
    
//     // Process section content
//     for (const item of section.content) {
//       if (item.type === 'paragraph') {
//         children.push(
//           new Paragraph({
//             text: item.text,
//             spacing: {
//               after: 120,
//             },
//           })
//         );
//       } else if (item.type === 'list') {
//         // Add list items
//         for (let i = 0; i < item.items.length; i++) {
//           children.push(
//             new Paragraph({
//               text: `• ${item.items[i]}`,
//               indent: {
//                 left: 720, // 0.5 inches in twips
//               },
//               spacing: {
//                 after: 80,
//               },
//             })
//           );
//         }
//       }
//     }
//   }
  
//   // Add information about the original file
//   children.push(
//     new Paragraph({
//       children: [
//         new TextRun({
//           text: "Original filename: ",
//           bold: true,
//         }),
//         new TextRun(path.basename(pdfPath).substring(path.basename(pdfPath).indexOf('_') + 1)),
//       ],
//       spacing: {
//         before: 240,
//         after: 120,
//       },
//     })
//   );
  
//   children.push(
//     new Paragraph({
//       children: [
//         new TextRun({
//           text: "Conversion timestamp: ",
//           bold: true,
//         }),
//         new TextRun(new Date().toLocaleString()),
//       ],
//       spacing: {
//         after: 120,
//       },
//     })
//   );
  
//   return children;
// }
// Ensure pdfPath is a parameter here
// function createStructuredDocument(pdfPath, pdfText) {
//   if (!pdfPath) {
//     throw new Error("pdfPath is required");
//   }

//   console.log("Creating structured DOCX from:", pdfPath);
//   const doc = new docx.Document({
//     sections: [{
//       properties: {},
//       children: [new docx.Paragraph({ text: pdfText })],
//     }],
//   });

//   const buffer = docx.Packer.toBuffer(doc);
//   return buffer;
// }
function createStructuredDocument(sections) {
  const children = [];

  // Add document title
  children.push(
    new Paragraph({
      text: "Converted Document",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Process each section
  sections.forEach((section) => {
    if (section.heading) {
      children.push(
        new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 150 },
        })
      );
    }

    // Process section content (paragraphs and lists)
    section.content.forEach((item) => {
      if (item.type === "paragraph") {
        children.push(new Paragraph(item.text));
      } else if (item.type === "list") {
        item.items.forEach((listItem) => {
          children.push(
            new Paragraph({
              children: [new TextRun(listItem)],
              bullet: { level: 0 },
            })
          );
        });
      }
    });
  });

  return children;
}
// Function to convert DOCX to PDF with improved structure preservation
// async function convertDocxToPdf(docxPath, pdfPath) {
//   try {
//     // Read the DOCX file and extract content with styles
//     const docxBuffer = fs.readFileSync(docxPath);
//     const result = await mammoth.extractRawText({ buffer: docxBuffer });
//     const text = result.value;
    
//     // Also try to extract document structure
//     const structureResult = await mammoth.convertToHtml({ buffer: docxBuffer });
//     const htmlContent = structureResult.value;
    
//     // Create a new PDF document
//     const pdfDoc = await PDFDocument.create();
    
//     // Add a font
//     const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
//     const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
//     const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    
//     // Add a page
//     const page = pdfDoc.addPage();
    
//     // Set page dimensions
//     const { width, height } = page.getSize();
//     const margin = 50;
//     const contentWidth = width - (margin * 2);
    
//     // Add title
//     page.drawText("Converted from DOCX", {
//       x: margin,
//       y: height - margin,
//       size: 24,
//       font: boldFont,
//       color: rgb(0, 0, 0),
//     });
    
//     // Try to identify document structure from HTML
//     const sections = extractSectionsFromHtml(htmlContent);
    
//     // Split text into paragraphs
//     const paragraphs = text.split(/\r?\n\r?\n/).filter(p => p.trim());
    
//     // Process text content with better structure
//     let currentPage = page;
//     let currentY = height - margin - 40; // Start below title
//     const fontSize = 12;
//     const lineHeight = fontSize * 1.2;
    
//     // Function to add text with proper wrapping
//     const addTextWithWrapping = (text, y, font, size, isHeading = false) => {
//       const words = text.split(/\s+/);
//       let currentLine = "";
//       let lines = [];
      
//       // Create wrapped lines
//       for (const word of words) {
//         const testLine = currentLine ? `${currentLine} ${word}` : word;
//         const textWidth = font.widthOfTextAtSize(testLine, size);
        
//         if (textWidth < contentWidth) {
//           currentLine = testLine;
//         } else {
//           lines.push(currentLine);
//           currentLine = word;
//         }
//       }
      
//       if (currentLine) {
//         lines.push(currentLine);
//       }
      
//       // Draw the lines
//       let lineY = y;
//       const headingLineHeight = isHeading ? size * 1.5 : lineHeight;
      
//       for (const line of lines) {
//         // Check if we need a new page
//         if (lineY < margin) {
//           currentPage = pdfDoc.addPage();
//           lineY = height - margin;
//         }
        
//         currentPage.drawText(line, {
//           x: margin,
//           y: lineY,
//           size: size,
//           font: font,
//           color: rgb(0, 0, 0),
//         });
        
//         lineY -= headingLineHeight;
//       }
      
//       return lineY;
//     };
    
//     // Process sections if available, otherwise use paragraphs
//     if (sections.length > 0) {
//       for (const section of sections) {
//         // Add heading
//         if (section.heading) {
//           const headingSize = 16;
//           currentY = addTextWithWrapping(section.heading, currentY, boldFont, headingSize, true) - 10;
//         }
        
//         // Add content
//         for (const content of section.content) {
//           if (content.type === 'paragraph') {
//             currentY = addTextWithWrapping(content.text, currentY, font, fontSize) - 10;
//           } else if (content.type === 'list') {
//             for (const item of content.items) {
//               currentY = addTextWithWrapping(`• ${item}`, currentY - 5, font, fontSize) - 5;
//             }
//           }
//         }
//       }
//     } else {
//       // Fallback to simple paragraphs
//       for (const paragraph of paragraphs) {
//         currentY = addTextWithWrapping(paragraph, currentY, font, fontSize) - 15;
//       }
//     }
    
//     // Add information about the original file
//     const infoY = currentY - lineHeight * 3;
//     if (infoY > margin) {
//       currentPage.drawText(`Original filename: ${path.basename(docxPath).substring(path.basename(docxPath).indexOf('_') + 1)}`, {
//         x: margin,
//         y: infoY,
//         size: fontSize,
//         font: boldFont,
//         color: rgb(0, 0, 0),
//       });
      
//       currentPage.drawText(`Conversion timestamp: ${new Date().toLocaleString()}`, {
//         x: margin,
//         y: infoY - lineHeight,
//         size: fontSize,
//         font: font,
//         color: rgb(0, 0, 0),
//       });
//     }
    
//     // Save the PDF file
//     const pdfBytes = await pdfDoc.save();
//     fs.writeFileSync(pdfPath, pdfBytes);
    
//     return pdfPath;
//   } catch (error) {
//     console.error('DOCX to PDF conversion error:', error);
//     throw error;
//   }
// }
// async function convertDocxToPdf(docxPath, pdfPath) {
//   try {
//       // Read the DOCX file and extract content with styles
//       const docxBuffer = fs.readFileSync(docxPath);
//       const result = await mammoth.extractRawText({ buffer: docxBuffer });
//       const text = result.value;

//       // Also try to extract document structure
//       const structureResult = await mammoth.convertToHtml({ buffer: docxBuffer });
//       const htmlContent = structureResult.value;

//       // Create a new PDF document
//       const pdfDoc = await PDFDocument.create();

//       // Load the custom font
//       const fontBytes = fs.readFileSync(path.join(__dirname, 'fonts', 'DejaVuSans.ttf')); // Replace with your font path
//       const customFont = await pdfDoc.embedFont(fontBytes);

//       // Add a page
//       const page = pdfDoc.addPage();

//       // Set page dimensions
//       const { width, height } = page.getSize();
//       const margin = 50;
//       const contentWidth = width - (margin * 2);

//       // Add title
//       page.drawText("Converted from DOCX", {
//           x: margin,
//           y: height - margin,
//           size: 24,
//           font: customFont, // Use the custom font
//           color: rgb(0, 0, 0),
//       });

//       // Try to identify document structure from HTML
//       const sections = extractSectionsFromHtml(htmlContent);

//       // Split text into paragraphs
//       const paragraphs = text.split(/\r?\n\r?\n/).filter(p => p.trim());

//       // Process text content with better structure
//       let currentPage = page;
//       let currentY = height - margin - 40; // Start below title
//       const fontSize = 12;
//       const lineHeight = fontSize * 1.2;

//       // Function to add text with proper wrapping
//       const addTextWithWrapping = (text, y, font, size, isHeading = false) => {
//           const words = text.split(/\s+/);
//           let currentLine = "";
//           let lines = [];

//           // Create wrapped lines
//           for (const word of words) {
//               const testLine = currentLine ? `${currentLine} ${word}` : word;
//               const textWidth = customFont.widthOfTextAtSize(testLine, size); // Use customFont

//               if (textWidth < contentWidth) {
//                   currentLine = testLine;
//               } else {
//                   lines.push(currentLine);
//                   currentLine = word;
//               }
//           }

//           if (currentLine) {
//               lines.push(currentLine);
//           }

//           // Draw the lines
//           let lineY = y;
//           const headingLineHeight = isHeading ? size * 1.5 : lineHeight;

//           for (const line of lines) {
//               // Check if we need a new page
//               if (lineY < margin) {
//                   currentPage = pdfDoc.addPage();
//                   lineY = height - margin;
//               }

//               currentPage.drawText(line, {
//                   x: margin,
//                   y: lineY,
//                   size: size,
//                   font: customFont, // Use the custom font
//                   color: rgb(0, 0, 0),
//               });

//               lineY -= headingLineHeight;
//           }

//           return lineY;
//       };

//       // Process sections if available, otherwise use paragraphs
//       if (sections.length > 0) {
//           for (const section of sections) {
//               // Add heading
//               if (section.heading) {
//                   const headingSize = 16;
//                   currentY = addTextWithWrapping(section.heading, currentY, customFont, headingSize, true) - 10;
//               }

//               // Add content
//               for (const content of section.content) {
//                   if (content.type === 'paragraph') {
//                       currentY = addTextWithWrapping(content.text, currentY, customFont, fontSize) - 10;
//                   } else if (content.type === 'list') {
//                       for (const item of content.items) {
//                           currentY = addTextWithWrapping(`• ${item}`, currentY - 5, customFont, fontSize) - 5;
//                       }
//                   }
//               }
//           }
//       } else {
//           // Fallback to simple paragraphs
//           for (const paragraph of paragraphs) {
//               currentY = addTextWithWrapping(paragraph, currentY, customFont, fontSize) - 15;
//           }
//       }

//       // Add information about the original file
//       const infoY = currentY - lineHeight * 3;
//       if (infoY > margin) {
//           currentPage.drawText(`Original filename: ${path.basename(docxPath).substring(path.basename(docxPath).indexOf('_') + 1)}`, {
//               x: margin,
//               y: infoY,
//               size: fontSize,
//               font: customFont,
//               color: rgb(0, 0, 0),
//           });

//           currentPage.drawText(`Conversion timestamp: ${new Date().toLocaleString()}`, {
//               x: margin,
//               y: infoY - lineHeight,
//               size: fontSize,
//               font: customFont,
//               color: rgb(0, 0, 0),
//           });
//       }

//       // Save the PDF file
//       const pdfBytes = await pdfDoc.save();
//       fs.writeFileSync(pdfPath, pdfBytes);

//       return pdfPath;
//   } catch (error) {
//       console.error('DOCX to PDF conversion error:', error);
//       throw error;
//   }
// } 
// async function convertDocxToPdf(docxPath, pdfPath) {
//   try {
//       // Read the DOCX file and extract content with styles
//       const docxBuffer = fs.readFileSync(docxPath);
//       const result = await mammoth.extractRawText({ buffer: docxBuffer });
//       const text = result.value;

//       // Also try to extract document structure
//       const structureResult = await mammoth.convertToHtml({ buffer: docxBuffer });
//       const htmlContent = structureResult.value;

//       // Create a new PDF document
//       const pdfDoc = await PDFDocument.create();

//       // Register fontkit BEFORE embedding the font
//       try {
//           PDFDocument.registerFontkit(fontkit);
//           console.log("fontkit registered successfully");
//       } catch (registrationError) {
//           console.error("Error registering fontkit:", registrationError);
//           throw registrationError; // Stop the process if registration fails
//       }

//       // Load the custom font
//       const fontBytes = fs.readFileSync(path.join(__dirname, 'fonts', 'DejaVuSans.ttf')); // Replace with your font path
//       const customFont = await pdfDoc.embedFont(fontBytes);

//       // Add a page
//       const page = pdfDoc.addPage();

//       // Set page dimensions
//       const { width, height } = page.getSize();
//       const margin = 50;
//       const contentWidth = width - (margin * 2);

//       // Add title
//       page.drawText("Converted from DOCX", {
//           x: margin,
//           y: height - margin,
//           size: 24,
//           font: customFont, // Use the custom font
//           color: rgb(0, 0, 0),
//       });

//       // Try to identify document structure from HTML
//       const sections = extractSectionsFromHtml(htmlContent);

//       // Split text into paragraphs
//       const paragraphs = text.split(/\r?\n\r?\n/).filter(p => p.trim());

//       // Process text content with better structure
//       let currentPage = page;
//       let currentY = height - margin - 40; // Start below title
//       const fontSize = 12;
//       const lineHeight = fontSize * 1.2;

//       // Function to add text with proper wrapping
//       const addTextWithWrapping = (text, y, font, size, isHeading = false) => {
//           const words = text.split(/\s+/);
//           let currentLine = "";
//           let lines = [];

//           // Create wrapped lines
//           for (const word of words) {
//               const testLine = currentLine ? `${currentLine} ${word}` : word;
//               const textWidth = customFont.widthOfTextAtSize(testLine, size); // Use customFont

//               if (textWidth < contentWidth) {
//                   currentLine = testLine;
//               } else {
//                   lines.push(currentLine);
//                   currentLine = word;
//               }
//           }

//           if (currentLine) {
//               lines.push(currentLine);
//           }

//           // Draw the lines
//           let lineY = y;
//           const headingLineHeight = isHeading ? size * 1.5 : lineHeight;

//           for (const line of lines) {
//               // Check if we need a new page
//               if (lineY < margin) {
//                   currentPage = pdfDoc.addPage();
//                   lineY = height - margin;
//               }

//               currentPage.drawText(line, {
//                   x: margin,
//                   y: lineY,
//                   size: size,
//                   font: customFont, // Use the custom font
//                   color: rgb(0, 0, 0),
//               });

//               lineY -= headingLineHeight;
//           }

//           return lineY;
//       };

//       // Process sections if available, otherwise use paragraphs
//       if (sections.length > 0) {
//           for (const section of sections) {
//               // Add heading
//               if (section.heading) {
//                   const headingSize = 16;
//                   currentY = addTextWithWrapping(section.heading, currentY, customFont, headingSize, true) - 10;
//               }

//               // Add content
//               for (const content of section.content) {
//                   if (content.type === 'paragraph') {
//                       currentY = addTextWithWrapping(content.text, currentY, customFont, fontSize) - 10;
//                   } else if (content.type === 'list') {
//                       for (const item of content.items) {
//                           currentY = addTextWithWrapping(`• ${item}`, currentY - 5, customFont, fontSize) - 5;
//                       }
//                   }
//               }
//           }
//       } else {
//           // Fallback to simple paragraphs
//           for (const paragraph of paragraphs) {
//               currentY = addTextWithWrapping(paragraph, currentY, customFont, fontSize) - 15;
//           }
//       }

//       // Add information about the original file
//       const infoY = currentY - lineHeight * 3;
//       if (infoY > margin) {
//           currentPage.drawText(`Original filename: ${path.basename(docxPath).substring(path.basename(docxPath).indexOf('_') + 1)}`, {
//               x: margin,
//               y: infoY,
//               size: fontSize,
//               font: customFont,
//               color: rgb(0, 0, 0),
//           });

//           currentPage.drawText(`Conversion timestamp: ${new Date().toLocaleString()}`, {
//               x: margin,
//               y: infoY - lineHeight,
//               size: fontSize,
//               font: customFont,
//               color: rgb(0, 0, 0),
//           });
//       }

//       // Save the PDF file
//       const pdfBytes = await pdfDoc.save();
//       fs.writeFileSync(pdfPath, pdfBytes);

//       return pdfPath;
//   } catch (error) {
//       console.error('DOCX to PDF conversion error:', error);
//       throw error;
//   }
// }

// async function convertDocxToPdf(docxPath, pdfPath) {
//   try {
//     // Read the DOCX file and extract content with styles
//     //const docxBuffer = await fs.readFile(docxPath);
//     const docxBuffer = await fs.promises.readFile(docxPath);
//     const result = await mammoth.extractRawText({ buffer: docxBuffer });
//     const text = result.value;

//     // Extract HTML for better structure
//     const structureResult = await mammoth.convertToHtml({ buffer: docxBuffer });
//     const htmlContent = structureResult.value;

//     // Create a new PDF document
//     const pdfDoc = await PDFDocument.create();

//     // Load the custom font (no need to register fontkit)
//     const fontBytes = await fs.readFile(path.join(__dirname, 'fonts', 'DejaVuSans.ttf'));
//     const customFont = await pdfDoc.embedFont(fontBytes);

//     // Add a page
//     let page = pdfDoc.addPage();
//     const { width, height } = page.getSize();
//     const margin = 50;
//     const contentWidth = width - margin * 2;

//     // Draw title
//     page.drawText('Converted from DOCX', {
//       x: margin,
//       y: height - margin,
//       size: 24,
//       font: customFont,
//       color: rgb(0, 0, 0),
//     });

//     // Text splitting and wrapping
//     const paragraphs = text.split(/\r?\n\r?\n/).filter((p) => p.trim());
//     let currentY = height - margin - 40;
//     const fontSize = 12;
//     const lineHeight = fontSize * 1.5;

//     const addTextWithWrapping = (text, y) => {
//       const words = text.split(' ');
//       let currentLine = '';

//       for (const word of words) {
//         const testLine = currentLine ? `${currentLine} ${word}` : word;
//         const textWidth = customFont.widthOfTextAtSize(testLine, fontSize);

//         if (textWidth < contentWidth) {
//           currentLine = testLine;
//         } else {
//           if (y < margin) {
//             page = pdfDoc.addPage();
//             y = height - margin;
//           }
//           page.drawText(currentLine, {
//             x: margin,
//             y,
//             size: fontSize,
//             font: customFont,
//             color: rgb(0, 0, 0),
//           });
//           currentLine = word;
//           y -= lineHeight;
//         }
//       }

//       if (currentLine) {
//         if (y < margin) {
//           page = pdfDoc.addPage();
//           y = height - margin;
//         }
//         page.drawText(currentLine, {
//           x: margin,
//           y,
//           size: fontSize,
//           font: customFont,
//           color: rgb(0, 0, 0),
//         });
//         y -= lineHeight;
//       }

//       return y;
//     };

//     // Process paragraphs
//     for (const paragraph of paragraphs) {
//       currentY = addTextWithWrapping(paragraph, currentY) - 10;
//     }

//     // Add footer
//     if (currentY > margin) {
//       page.drawText(`Original filename: ${path.basename(docxPath)}`, {
//         x: margin,
//         y: currentY - 20,
//         size: fontSize,
//         font: customFont,
//         color: rgb(0, 0, 0),
//       });

//       page.drawText(`Converted on: ${new Date().toLocaleString()}`, {
//         x: margin,
//         y: currentY - 40,
//         size: fontSize,
//         font: customFont,
//         color: rgb(0, 0, 0),
//       });
//     }

//     // Save the PDF
//     const pdfBytes = await pdfDoc.save();
//     await fs.writeFile(pdfPath, pdfBytes);
//     console.log('✅ DOCX successfully converted to PDF:', pdfPath);
//   } catch (error) {
//     console.error('❌ Error during DOCX to PDF conversion:', error);
//   }
// }

async function convertDocxToPdf(docxPath, pdfPath) {
  try {
    const docxBuffer = await fs.promises.readFile(docxPath);

    // Extract text from DOCX using mammoth
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    const text = result.value;

    // Create PDF and register fontkit
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Load and embed a custom font
    const fontBytes = await fs.promises.readFile(path.join(__dirname, 'fonts', 'DejaVuSans.ttf'));
    const customFont = await pdfDoc.embedFont(fontBytes);

    // Add page and content
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    page.drawText(text, {
      x: 50,
      y: height - 100,
      size: 12,
      font: customFont,
      color: rgb(0, 0, 0),
    });

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    await fs.promises.writeFile(pdfPath, pdfBytes);

    console.log('✅ DOCX successfully converted to PDF:', pdfPath);
  } catch (error) {
    console.error('❌ Error during DOCX to PDF conversion:', error);
  }
}

// Function to extract sections from HTML content
function extractSectionsFromHtml(html) {
  const sections = [];
  let currentSection = null;
  
  // Simple regex-based extraction (a more robust solution would use a proper HTML parser)
  const headingRegex = /<h(\d)[^>]*>(.*?)<\/h\1>/gi;
  const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
  const listRegex = /<ul[^>]*>(.*?)<\/ul>/gi;
  const listItemRegex = /<li[^>]*>(.*?)<\/li>/gi;
  
  // Extract headings and create sections
  let lastIndex = 0;
  let match;
  
  while ((match = headingRegex.exec(html)) !== null) {
    const headingText = match[2].replace(/<[^>]*>/g, '').trim();
    
    currentSection = { type: 'section', heading: headingText, content: [] };
    sections.push(currentSection);
    
    lastIndex = match.index + match[0].length;
  }
  
  // If no headings found, create a default section
  if (sections.length === 0) {
    currentSection = { type: 'section', heading: null, content: [] };
    sections.push(currentSection);
  }
  
  // Extract paragraphs
  paragraphRegex.lastIndex = 0;
  while ((match = paragraphRegex.exec(html)) !== null) {
    const paragraphText = match[1].replace(/<[^>]*>/g, '').trim();
    
    if (paragraphText) {
      // Find which section this paragraph belongs to
      let targetSection = sections[0];
      for (let i = sections.length - 1; i >= 0; i--) {
        if (match.index > headingRegex.lastIndex) {
          targetSection = sections[i];
          break;
        }
      }
      
      targetSection.content.push({ type: 'paragraph', text: paragraphText });
    }
  }
  
  // Extract lists
  listRegex.lastIndex = 0;
  while ((match = listRegex.exec(html)) !== null) {
    const listContent = match[1];
    const listItems = [];
    
    // Extract list items
    let itemMatch;
    listItemRegex.lastIndex = 0;
    while ((itemMatch = listItemRegex.exec(listContent)) !== null) {
      const itemText = itemMatch[1].replace(/<[^>]*>/g, '').trim();
      if (itemText) {
        listItems.push(itemText);
      }
    }
    
    if (listItems.length > 0) {
      // Find which section this list belongs to
      let targetSection = sections[0];
      for (let i = sections.length - 1; i >= 0; i--) {
        if (match.index > headingRegex.lastIndex) {
          targetSection = sections[i];
          break;
        }
      }
      
      targetSection.content.push({ type: 'list', items: listItems });
    }
  }
  
  return sections;
}

// Catch-all handler to serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});