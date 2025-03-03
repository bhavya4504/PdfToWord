import React, { useState } from 'react';
import { AlertCircle, FileUp, FileText, Check } from 'lucide-react';

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
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size exceeds 50MB limit');
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

      const response = await fetch('http://localhost:3001/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      const data = await response.json();
      setDownloadLink(data.downloadLink);

      const fileName = data.downloadLink.split('/').pop();
      if (fileName) {
        setConvertedFileName(fileName.substring(fileName.indexOf('_') + 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsUploading(false);
      setIsConverting(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return null;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    return fileExtension === 'pdf' ? (
      <FileText className="w-8 h-8 text-red-500" />
    ) : (
      <FileText className="w-8 h-8 text-blue-500" />
    );
  };

  const getTargetFormat = () => {
    if (!file) return '';
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    return fileExtension === 'pdf' ? 'DOCX' : 'PDF';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 text-center">PDF Converter Tool</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
              Upload your file
            </label>
            <div
              className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <FileUp className="h-12 w-12 text-gray-400" />
              <p className="ml-4">Click to upload (PDF/DOCX)</p>
              <input
                id="file-upload"
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                accept=".pdf,.docx"
              />
            </div>
          </div>

          {file && (
            <div className="p-4 bg-gray-50 rounded-lg flex items-center">
              {getFileIcon()}
              <p className="ml-3 text-sm font-medium text-gray-900">{file.name}</p>
              <p className="ml-auto">Convert to {getTargetFormat()}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 p-4 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || isUploading || isConverting}
            className="w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700"
          >
            {isUploading || isConverting ? 'Processing...' : 'Convert File'}
          </button>
        </form>

        {downloadLink && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg flex items-center">
            <Check className="h-5 w-5 text-green-500" />
            <a
              href={`http://localhost:3001${downloadLink}`}
              download={convertedFileName}
              className="ml-3 text-green-700"
            >
              Download {convertedFileName}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
