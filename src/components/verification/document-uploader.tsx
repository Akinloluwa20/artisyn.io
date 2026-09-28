'use client';

import { AlertCircle, CheckCircle2, FileText, Upload, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

const BYTES_PER_MB = 1024 * 1024;

export const DEFAULT_MAX_DOCUMENTS = 10;
export const DEFAULT_MAX_FILE_SIZE_MB = 10;
export const DEFAULT_ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

type AcceptedFileType = (typeof DEFAULT_ACCEPTED_FILE_TYPES)[number] | string;

export type VerificationDocument = {
  id: string;
  file: File;
};

export interface DocumentUploaderProps {
  maxDocuments?: number;
  maxFileSizeMb?: number;
  acceptedFileTypes?: readonly AcceptedFileType[];
  onSubmit?: (files: File[]) => void | Promise<void>;
  onFilesChange?: (files: File[]) => void;
  className?: string;
}

type ValidationError = {
  id: string;
  message: string;
};

export function formatFileSize(size: number) {
  if (size < BYTES_PER_MB) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / BYTES_PER_MB).toFixed(1)} MB`;
}

function formatAcceptedTypes(types: readonly AcceptedFileType[]) {
  return types
    .map((type) => {
      if (type === 'application/pdf') return 'PDF';
      if (type.startsWith('image/'))
        return type.replace('image/', '').toUpperCase();
      return type;
    })
    .join(', ');
}

function createDocument(file: File): VerificationDocument {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
  };
}

export function DocumentUploader({
  maxDocuments = DEFAULT_MAX_DOCUMENTS,
  maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB,
  acceptedFileTypes = DEFAULT_ACCEPTED_FILE_TYPES,
  onSubmit,
  onFilesChange,
  className,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const acceptedTypesLabel = useMemo(
    () => formatAcceptedTypes(acceptedFileTypes),
    [acceptedFileTypes],
  );
  const acceptAttribute = acceptedFileTypes.join(',');
  const maxFileSizeBytes = maxFileSizeMb * BYTES_PER_MB;

  const updateDocuments = (nextDocuments: VerificationDocument[]) => {
    setDocuments(nextDocuments);
    onFilesChange?.(nextDocuments.map((document) => document.file));
  };

  const validateFiles = (files: File[]) => {
    const nextErrors: ValidationError[] = [];
    const remainingSlots = maxDocuments - documents.length;

    if (files.length > remainingSlots) {
      nextErrors.push({
        id: 'max-documents',
        message: `You can upload up to ${maxDocuments} documents.`,
      });
    }

    const validFiles = files
      .slice(0, Math.max(0, remainingSlots))
      .filter((file) => {
        if (!acceptedFileTypes.includes(file.type)) {
          nextErrors.push({
            id: `${file.name}-type`,
            message: `${file.name} is not an accepted file type.`,
          });
          return false;
        }

        if (file.size > maxFileSizeBytes) {
          nextErrors.push({
            id: `${file.name}-size`,
            message: `${file.name} exceeds the ${maxFileSizeMb} MB file size limit.`,
          });
          return false;
        }

        return true;
      });

    return {
      validFiles,
      nextErrors,
    };
  };

  const addFiles = (fileList: FileList | File[]) => {
    const incomingFiles = Array.from(fileList);

    if (incomingFiles.length === 0) {
      return;
    }

    const { validFiles, nextErrors } = validateFiles(incomingFiles);

    setErrors(nextErrors);

    if (validFiles.length > 0) {
      updateDocuments([...documents, ...validFiles.map(createDocument)]);
    }

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeDocument = (id: string) => {
    const nextDocuments = documents.filter((document) => document.id !== id);
    updateDocuments(nextDocuments);
    setErrors([]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (documents.length === 0) {
      setErrors([
        {
          id: 'required',
          message:
            'Upload at least one verification document before submitting.',
        },
      ]);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit?.(documents.map((document) => document.file));
      setErrors([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('space-y-4', className)}
      noValidate
    >
      <div>
        <label className="text-sm font-medium text-[#020817]">
          Verification documents
        </label>
        <p className="mt-1 text-sm text-[#6B6878]">
          Upload up to {maxDocuments} documents. Accepted formats:{' '}
          {acceptedTypesLabel}. Max {maxFileSizeMb} MB per file.
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          'flex min-h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-white px-6 py-8 text-center transition-colors',
          isDragging
            ? 'border-[#605DEC] bg-indigo-50'
            : 'border-[#BDBCDB] hover:border-[#605DEC] hover:bg-gray-50',
        )}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-[#605DEC]">
          <Upload className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="mt-3 text-sm font-semibold text-[#020817]">
          Click to upload or drag files here
        </span>
        <span className="mt-1 text-xs text-[#6B6878]">
          {documents.length}/{maxDocuments} documents selected
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptAttribute}
        onChange={(event) => {
          if (event.target.files) {
            addFiles(event.target.files);
          }
        }}
        className="hidden"
      />

      {errors.length > 0 && (
        <div className="space-y-2" aria-live="polite">
          {errors.map((error) => (
            <p
              key={error.id}
              className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>{error.message}</span>
            </p>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <ul className="space-y-3">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[#605DEC]">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#020817]">
                  {document.file.name}
                </p>
                <p className="mt-0.5 text-xs text-[#6B6878]">
                  {document.file.type || 'Unknown type'} •{' '}
                  {formatFileSize(document.file.size)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeDocument(document.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Remove ${document.file.name}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={documents.length === 0 || isSubmitting}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#605DEC] px-4 text-sm font-medium text-white transition-colors hover:bg-[#5558e3] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {isSubmitting ? 'Submitting...' : 'Submit documents'}
      </button>
    </form>
  );
}
