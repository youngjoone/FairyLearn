import React from 'react';
import { twMerge } from 'tailwind-merge';

interface RadioLikertProps {
  name: string;
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  className?: string;
}

const RadioLikert: React.FC<RadioLikertProps> = ({
  name,
  value,
  onChange,
  options = [1, 2, 3, 4, 5],
  className,
}) => {
  return (
        <div className={twMerge('flex items-center justify-center space-x-2', className)}>
      <span>동의함</span>
      {options.map((option) => (
        <label
          key={option}
          className="flex items-center cursor-pointer"
        >
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="sr-only"
            aria-label={`Option ${option}`}
          />
          <span
            className={`w-6 h-6 flex items-center justify-center border rounded-full text-sm transition-all ${
              value === option
                ? 'bg-primary text-primary-foreground scale-110'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {value === option ? 'O' : 'o'}
          </span>
        </label>
      ))}
      <span>동의하지않음</span>
    </div>
  );
};

export default RadioLikert;
