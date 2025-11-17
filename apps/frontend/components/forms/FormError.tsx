import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormErrorProps {
  message: string;
}

export function FormError({ message }: FormErrorProps) {
  return (
    <div className="flex items-start p-4 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg" role="alert">
      <AlertCircle className="text-[#ef4444] mr-3 flex-shrink-0 mt-0.5" size={20} />
      <p className="text-sm text-[#ef4444]">{message}</p>
    </div>
  );
}
