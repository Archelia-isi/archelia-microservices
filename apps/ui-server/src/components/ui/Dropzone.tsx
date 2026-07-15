import React, { useRef, useState } from 'react';
import './Dropzone.css';

interface DropzoneProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onFilesSelected: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  directoryMode?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode; // Extra content to render inside the dropzone (e.g. progress bar)
}

export default function Dropzone({
  icon,
  title,
  subtitle,
  onFilesSelected,
  accept,
  multiple = false,
  directoryMode = false,
  className = '',
  style,
  children
}: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  // React TypeScript non ha le props directory e webkitdirectory tipizzate in modo standard per input
  const directoryProps = directoryMode ? { webkitdirectory: "true", directory: "true" } : {};

  return (
    <div 
      className={`ui-dropzone ${dragActive ? 'drag-active' : ''} ${className}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      style={style}
    >
      <div className="ui-dropzone-icon-wrapper">
        {icon}
      </div>
      <div className="ui-dropzone-texts">
        <h3 className="ui-dropzone-title">{title}</h3>
        <p className="ui-dropzone-subtitle">{subtitle}</p>
      </div>
      
      {children}
      
      <input 
        type="file" 
        ref={fileInputRef} 
        multiple={multiple} 
        accept={accept} 
        style={{ display: 'none' }} 
        onChange={handleFileInput}
        {...(directoryProps as any)}
      />
    </div>
  );
}
