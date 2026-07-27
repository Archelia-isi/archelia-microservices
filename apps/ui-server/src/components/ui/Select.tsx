import React from 'react';
import { ChevronDown } from 'lucide-react';
import './Select.css';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
}

export default function Select({ options, placeholder, className = '', ...props }: SelectProps) {
  return (
    <div className={`ui-select-wrapper ${className}`}>
      <select className="ui-select" {...props}>
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="ui-select-icon">
        <ChevronDown size={16} />
      </div>
    </div>
  );
}
