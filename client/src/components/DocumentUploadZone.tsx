import { useRef, useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { Input } from './ui/Input';

interface DocumentUploadZoneProps {
  documents: Array<{ id: string; file_name: string; extraction_status: string }>;
  onUpload: (files: File[]) => Promise<void>;
  isUploading?: boolean;
}

export function DocumentUploadZone({ documents, onUpload, isUploading }: DocumentUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    setUploadingCount(files.length);
    try {
      await onUpload(files);
    } finally {
      setUploadingCount(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-brand-cream bg-brand-soft-light px-4 py-8 hover:bg-brand-cream/50">
        {isUploading || uploadingCount > 0 ? (
          <Loader2 className="h-7 w-7 animate-spin text-brand-primary" />
        ) : (
          <Upload className="h-7 w-7 text-brand-primary" />
        )}
        <span className="text-sm font-medium text-brand-navy">
          {uploadingCount > 0 ? `Uploading ${uploadingCount} file(s)...` : 'Upload multiple documents'}
        </span>
        <span className="text-xs text-brand-slate">PDF, TXT, DOC — optional · select multiple files</span>
        <Input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.txt,.doc,.docx"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {documents.length > 0 && (
        <ul className="space-y-1.5 rounded-lg border border-brand-cream bg-brand-soft-light p-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate">{doc.file_name}</span>
              <span className="shrink-0 text-xs text-green-600">{doc.extraction_status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
