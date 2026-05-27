/* Re-export of @radix-ui/react-toast with project tokens.
 * Wire ToastProvider + ToastViewport at app root (apps/web in PR 24).
 */
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../lib/cn';

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse',
      'gap-2 p-4 sm:bottom-4 sm:right-4 sm:max-w-md',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const toastVariants = cva(
  cn(
    'group pointer-events-auto relative flex w-full items-center gap-3',
    'overflow-hidden rounded-md border p-4 pr-8 shadow-md',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
  ),
  {
    variants: {
      tone: {
        info: 'bg-[var(--color-surface-raised)] border-[var(--color-border)] text-[var(--color-text)]',
        success: 'bg-[var(--color-success-500)] text-white border-transparent',
        warning: 'bg-[var(--color-warning-500)] text-black border-transparent',
        danger: 'bg-[var(--color-danger-500)] text-white border-transparent',
      },
    },
    defaultVariants: { tone: 'info' },
  },
);

export interface ToastProps
  extends
    React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>,
    VariantProps<typeof toastVariants> {}

export const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitive.Root>, ToastProps>(
  ({ className, tone, ...props }, ref) => (
    <ToastPrimitive.Root ref={ref} className={cn(toastVariants({ tone }), className)} {...props} />
  ),
);
Toast.displayName = ToastPrimitive.Root.displayName;

export const ToastTitle = ToastPrimitive.Title;
export const ToastDescription = ToastPrimitive.Description;
export const ToastClose = ToastPrimitive.Close;
export const ToastAction = ToastPrimitive.Action;
