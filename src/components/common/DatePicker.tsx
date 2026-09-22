'use client';

import React, { forwardRef } from 'react';
import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showClearButton?: boolean;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ value, onChange, placeholder, className = '', showClearButton = true, label, required, disabled }, ref) => {
    return (
      <div className="date-picker-wrapper">
        {label && (
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative min-w-[135px]">
          <Input
            ref={ref}
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`date-picker-input h-7 text-xs pl-8 pr-8 border-gray-300 dark:border-gray-600 w-full ${className}`}
            style={{ minWidth: '135px' }}
          />
          <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          {showClearButton && value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
              onClick={() => onChange('')}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export default DatePicker;

