"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@repo/utils";

const baseInput =
  "w-full bg-svi-dark border border-svi-border-muted text-svi-white placeholder:text-svi-disabled rounded-lg px-4 py-2.5 text-sm transition-colors focus:border-svi-gold focus:outline-none focus:ring-1 focus:ring-svi-gold disabled:opacity-50 disabled:cursor-not-allowed";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(baseInput, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(baseInput, "min-h-[100px] resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, hint, error, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-svi-muted flex items-center gap-1"
      >
        {label}
        {required && <span className="text-svi-red">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-svi-muted-2">{hint}</p>}
      {error && <p className="text-xs text-svi-error">{error}</p>}
    </div>
  );
}
