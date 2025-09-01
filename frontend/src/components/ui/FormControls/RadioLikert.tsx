import React from 'react';
import { twMerge } from 'tailwind-merge';

interface Option {
  label: string;
  value: string;
}

interface RadioLikertProps {
  name: string;
  selectedValue: string; // Changed from value to selectedValue and type to string
  onChange: (value: string) => void; // Changed type to string
  options: Option[]; // Changed to accept array of Option objects
  className?: string;
}

const RadioLikert: React.FC<RadioLikertProps> = ({
  name,
  selectedValue, // Changed from value
  onChange,
  options, // No default options here, must be provided
  className,
}) => {
  return (
    <div className={twMerge('flex items-center justify-center space-x-2', className)}>
      {/* Removed "동의함" and "동의하지않음" as they are specific to Likert scale */}
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-center cursor-pointer"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={selectedValue === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
            aria-label={`Option ${option.label}`}
          />
          <span
            className={`w-6 h-6 flex items-center justify-center border rounded-full text-sm transition-all ${
              selectedValue === option.value
                ? 'bg-primary text-primary-foreground scale-110'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {option.label} {/* Display label instead of 'O'/'o' */}
          </span>
        </label>
      ))}
    </div>
  );
};

export default RadioLikert;