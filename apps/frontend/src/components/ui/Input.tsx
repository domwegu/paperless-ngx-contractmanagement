import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, className = '', ...rest }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-700">{label}</label>}
      <div className="relative flex items-center">
        {prefix && <div className="absolute left-3 text-gray-400 pointer-events-none">{prefix}</div>}
        <input
          ref={ref}
          className={`w-full px-3 py-2 text-sm rounded-md border bg-white text-gray-900 placeholder:text-gray-400 border-gray-300 hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150 ${error ? 'border-red-500' : ''} ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-9' : ''} ${className}`}
          {...rest}
        />
        {suffix && <div className="absolute right-3 text-gray-400 pointer-events-none">{suffix}</div>}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
);
Input.displayName = 'Input';
