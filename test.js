import { PDFDocument } from 'pdf-lib';
import * as fontkit from 'fontkit';

try{
    PDFDocument.registerFontkit(fontkit);
    console.log("fontkit registration success");
} catch (e) {
    console.log("Error: ", e);
}