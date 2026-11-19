import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';

export default function ImageUploader({
  onImageSelected,
  selectedFile,
  previewUrl,
  onClear,
  disabled = false,
  title = "Upload Microscopy Image",
  subtitle = "Single cell or bone marrow aspirate slide"
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const fileInputRef = useRef(null);

  const supportedFormats = ['image/jpeg', 'image/png', 'image/jpg'];
  const maxSizeBytes = 20 * 1024 * 1024; // 20 MB

  const validateAndHandleFile = (file) => {
    setErrorMessage(null);
    if (!file) return;

    if (!supportedFormats.includes(file.type)) {
      setErrorMessage('Invalid file format. Only JPG, JPEG, and PNG images are supported.');
      return;
    }

    if (file.size > maxSizeBytes) {
      setErrorMessage(`File exceeds 20MB limit (${formatBytes(file.size)}). Please choose a smaller image.`);
      return;
    }

    onImageSelected(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      {errorMessage && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            disabled
              ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-60'
              : isDragging
              ? 'border-medical-accent bg-medical-accent-light'
              : 'border-slate-300 bg-white hover:border-medical-accent hover:bg-slate-50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="hidden"
            disabled={disabled}
          />
          <div className="mx-auto w-12 h-12 rounded-full bg-medical-accent-light flex items-center justify-center text-medical-accent mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-medical-primary mb-1">
            {title}
          </h4>
          <p className="text-xs text-medical-secondary mb-3">
            {subtitle}
          </p>
          <div className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            <span>Drag & drop or browse</span>
            <span>•</span>
            <span>JPG, JPEG, PNG (max 20MB)</span>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-medical-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-medical-border">
            <div className="flex items-center gap-2 text-xs font-semibold text-medical-primary">
              <ImageIcon className="w-4 h-4 text-medical-accent" />
              <span>Selected Specimen</span>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium p-1 hover:bg-red-50 rounded"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-32 h-32 rounded-lg border border-medical-border overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Specimen Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 text-xs space-y-1 w-full">
              <p className="font-semibold text-medical-primary truncate max-w-xs sm:max-w-md">
                {selectedFile.name}
              </p>
              <p className="text-medical-secondary">
                File size: <span className="font-medium text-slate-700">{formatBytes(selectedFile.size)}</span>
              </p>
              <p className="text-medical-secondary">
                MIME Type: <span className="font-mono text-[11px] text-slate-700">{selectedFile.type || 'image/jpeg'}</span>
              </p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Ready for AI evaluation
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
