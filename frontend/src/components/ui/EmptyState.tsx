import React from 'react';
import { twMerge } from 'tailwind-merge';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        'flex flex-col items-center justify-center p-8 text-center text-muted-foreground',
        className
      )}
      {...props}
    >
      {icon && <div className="mb-4 text-4xl">{icon}</div>}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      {description && <p className="text-sm">{description}</p>}
    </div>
  );
};

export default EmptyState;
