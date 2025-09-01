import React from 'react';
import { twMerge } from 'tailwind-merge';

interface Option {
  label: string;
  value: string;
}

interface SelectProps { // Removed extends React.SelectHTMLAttributes<HTMLSelectElement>
  options: Option[];
  selectedValue: string;
  onChange: (value: string) => void;
  id?: string; // Add id prop
  className?: string; // Add className prop
  // Add other HTML select attributes if needed, e.g., disabled, name etc.
}

const Select: React.FC<SelectProps> = ({ className, options, selectedValue, onChange, id, ...props }) => {
  return (
    <select
      id={id} // Use id prop
      className={twMerge(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      value={selectedValue}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Select;