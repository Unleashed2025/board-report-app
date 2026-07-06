import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../data/DataContext.jsx';

export default function ExcelUpload() {
  const inputRef = useRef(null);
  const { dataLoaded, lastUpdated, sourceFilename, updateFromExcel } = useData();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) {
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      updateFromExcel(workbook, file.name);
      setError('');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to load that workbook.');
    }
  };

  const handleInputChange = async (event) => {
    const [file] = Array.from(event.target.files || []);
    await handleFile(file);
    event.target.value = '';
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);
    const [file] = Array.from(event.dataTransfer.files || []);
    await handleFile(file);
  };

  const borderClass = error
    ? 'border-red-500'
    : dataLoaded
      ? 'border-[#059669]'
      : isDragging
        ? 'border-[#0EA5E9] bg-[#0EA5E9]/5'
        : 'border-[#2A4A6F]';

  return (
    <div className="mb-12">
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleInputChange} />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`cursor-pointer rounded-xl border border-dashed border-2 bg-[#1A334F] p-10 text-center transition-all duration-200 ${borderClass}`}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9]">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 16V4m0 0-4 4m4-4 4 4m5 8v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1" />
          </svg>
        </div>
        <h2 className="mt-5 text-2xl font-bold text-white">Upload your Sales Dashboard Excel</h2>
        <p className="mt-2 text-sm text-[#5A7A95]">Drag &amp; drop or click to browse</p>

        {dataLoaded && sourceFilename ? (
          <div className="mt-5 inline-flex flex-col items-center gap-1 rounded-lg border border-[#059669]/30 bg-[#059669]/10 px-4 py-3 text-sm text-white">
            <span className="font-semibold text-[#6EE7B7]">✓ Data loaded</span>
            <span>{sourceFilename}</span>
            {lastUpdated ? <span className="text-xs text-[#A7F3D0]">{lastUpdated.toLocaleString('en-GB')}</span> : null}
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </div>
    </div>
  );
}
