import React from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, htmlFor, required = false, error, children }: FormFieldProps) {
  return (
    <div className="mb-6">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-[#111827] mb-2">
        {label}
        {required && (
          <span className="text-[#ef4444] ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-2 text-sm text-[#ef4444]">
          {error}
        </p>
      )}
    </div>
  );
}
