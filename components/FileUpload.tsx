import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
}

const MAX_FILES = 5;

const FileUpload: React.FC<FileUploadProps> = ({ onFilesChange }) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const selectedFiles = Array.from(files).slice(0, MAX_FILES);
    onFilesChange(selectedFiles);

    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    
    // Clean up old object URLs
    previews.forEach(url => URL.revokeObjectURL(url));
    setPreviews(newPreviews);
  }, [onFilesChange, previews]);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    
    // FIX: Correctly create an array from the input element's `files` property (`FileList`),
    // which is array-like, instead of the element itself. Also removed invalid `Awaited<any>` syntax.
    // This resolves all related type errors.
    const newFiles = Array.from((document.getElementById('file-upload-input') as HTMLInputElement).files ?? []).filter((_, i) => i !== index);
    
    const dt = new DataTransfer();
    newFiles.forEach(file => dt.items.add(file));
    
    (document.getElementById('file-upload-input') as HTMLInputElement).files = dt.files;
    
    onFilesChange(newFiles);
    setPreviews(newPreviews);
  }

  return (
    <div className="w-full space-y-4">
      <label
        htmlFor="file-upload-input"
        className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ${dragActive ? 'border-yellow-400 bg-white/20' : 'border-yellow-200/50 hover:border-yellow-300 hover:bg-white/10'}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-10 h-10 mb-3 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          <p className="mb-2 text-sm text-yellow-100"><span className="font-semibold">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-yellow-200/80">Upload up to {MAX_FILES} portrait photos</p>
        </div>
        <input id="file-upload-input" type="file" className="hidden" multiple accept="image/*" onChange={handleChange} />
      </label>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {previews.map((src, index) => (
            <div key={index} className="relative group">
              <img src={src} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded-lg shadow-md" />
              <button
                onClick={() => removeFile(index)}
                className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;