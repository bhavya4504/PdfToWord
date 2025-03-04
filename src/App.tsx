import React, { useState } from 'react';
import { AlertCircle, FileUp, FileDown, FileText, File, Check, Loader2 } from 'lucide-react';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [downloadLink, setDownloadLink] = useState('');
  const [error, setError] = useState('');
  const [convertedFileName, setConvertedFileName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError('');
    setDownloadLink('');
    
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension !== 'pdf' && fileExtension !== 'docx') {
        setError('Only PDF and DOCX files are supported');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to convert');
      return;
    }
    
    try {
      setIsUploading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('file', file);
      
      setIsUploading(false);
      setIsConverting(true);
      
      const response = await fetch('http://localhost:3001/api/convert', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Conversion failed');
      }
      
      setDownloadLink(data.downloadLink);
      
      // Extract the filename from the download link
      const fileName = data.downloadLink.split('/').pop();
      if (fileName) {
        // Remove timestamp prefix
        setConvertedFileName(fileName.substring(fileName.indexOf('_') + 1));
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsConverting(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return null;
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    return fileExtension === 'pdf' ? <File className="w-8 h-8 text-red-500" /> : <FileText className="w-8 h-8 text-blue-500" />;
  };

  const getTargetFormat = () => {
    if (!file) return '';
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    return fileExtension === 'pdf' ? 'DOCX' : 'PDF';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">PDF Converter Tool</h1>
          <p className="text-xl text-gray-600">Convert between PDF and DOCX formats easily</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
                  Upload your file
                </label>
                
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                     onClick={() => document.getElementById('file-upload')?.click()}>
                  <div className="space-y-1 text-center">
                    <div className="flex justify-center">
                      <FileUp className="h-12 w-12 text-gray-400" />
                    </div>
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.docx" />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF or DOCX up to 50MB
                    </p>
                  </div>
                </div>
              </div>
              
              {file && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    {getFileIcon()}
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <div className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      Convert to {getTargetFormat()}
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 p-4 rounded-lg flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <p className="ml-3 text-sm text-red-700">{error}</p>
                </div>
              )}
              
              <div>
                <button
                  type="submit"
                  disabled={!file || isUploading || isConverting}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    (!file || isUploading || isConverting) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Uploading...
                    </>
                  ) : isConverting ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Converting...
                    </>
                  ) : (
                    'Convert File'
                  )}
                </button>
              </div>
            </form>
            
            {downloadLink && (
              <div className="mt-6 bg-green-50 p-4 rounded-lg">
                <div className="flex">
                  <Check className="h-5 w-5 text-green-500" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Conversion successful!</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Your file has been converted successfully.</p>
                    </div>
                    <div className="mt-4">
                      <div className="-mx-2 -my-1.5 flex">
                        <a
                          href={`http://localhost:3001${downloadLink}`}
                          download={convertedFileName}
                          className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-green-800 bg-green-100 hover:bg-green-200"
                        >
                          <FileDown className="-ml-0.5 mr-2 h-4 w-4" />
                          Download {convertedFileName}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="px-4 py-5 bg-gray-50 sm:px-6">
            <div className="text-sm text-gray-500 text-center">
              <p>Supported conversions: PDF to DOCX and DOCX to PDF</p>
              <p className="mt-1">Maximum file size: 50MB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;