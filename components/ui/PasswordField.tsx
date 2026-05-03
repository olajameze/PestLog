import { useState } from 'react';

type PasswordFieldProps = {
  label: string;
  id: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  error?: string;
};

export default function PasswordField({
  label,
  id,
  value,
  onChange,
  placeholder,
  required = false,
  readOnly = false,
  error,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="form-input w-full pr-20"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-1 text-xs font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-controls={id}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

