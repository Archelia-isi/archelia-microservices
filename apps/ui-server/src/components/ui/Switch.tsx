import React from 'react';
import './Switch.css';
import { soundEngine } from '../../utils/SoundEngine';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      soundEngine.playToggleOn();
    } else {
      soundEngine.playToggleOff();
    }
    onChange(e.target.checked);
  };

  return (
    <label className={`ui-switch-container ${disabled ? 'disabled' : ''}`}>
      <div className="ui-switch-wrapper">
        <input 
          type="checkbox" 
          className="ui-switch-input" 
          checked={checked} 
          onChange={handleChange} 
          disabled={disabled}
        />
        <div className="ui-switch-track">
          <div className="ui-switch-thumb" />
        </div>
      </div>
      {label && <span className="ui-switch-label">{label}</span>}
    </label>
  );
}
