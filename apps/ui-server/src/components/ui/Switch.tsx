import './Switch.css';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  return (
    <label className={`ui-switch-container ${disabled ? 'disabled' : ''}`}>
      <div className="ui-switch-wrapper">
        <input 
          type="checkbox" 
          className="ui-switch-input" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)} 
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
