import React from 'react';
import './TextInput.css';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function TextInput({
  label,
  error,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  ...props
}: TextInputProps) {
  return (
    <div className={`ui-input-container ${fullWidth ? 'full-width' : ''} ${className}`}>
      {label && <label className="ui-input-label">{label}</label>}
      <div className={`ui-input-wrapper ${error ? 'has-error' : ''}`}>
        {leftIcon && <span className="ui-input-icon left">{leftIcon}</span>}
        <input 
          className={`ui-input ${leftIcon ? 'has-left-icon' : ''} ${rightIcon ? 'has-right-icon' : ''}`}
          {...props} 
        />
        {rightIcon && <span className="ui-input-icon right">{rightIcon}</span>}
      </div>
      {error && <span className="ui-input-error">{error}</span>}
    </div>
  );
}
