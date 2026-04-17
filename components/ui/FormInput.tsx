

interface FormInputProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  as?: 'input' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
  className?: string;
  readOnly?: boolean;
}

export default function FormInput({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  as = 'input',
  options,
  className = '',
  readOnly = false,
}: FormInputProps) {
  const baseClasses = 'form-input w-full border border-zinc-300 rounded-xl px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:ring-offset-0 transition-all placeholder-slate-400 text-slate-900 bg-white';

  const Element = as === 'textarea' ? 'textarea' : as === 'select' ? 'select' : 'input';

  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Element
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        className={`${baseClasses} ${className}`}
        rows={as === 'textarea' ? 4 : undefined}
      >
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Element>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

