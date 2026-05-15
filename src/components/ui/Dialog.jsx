import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'
import * as React from 'react'
import { cn } from '../../lib/utils.js'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef(
  /** @param {React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>} props */
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay ref={ref} className={cn('ui-dialog-overlay', className)} {...props} />
  ),
)
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef(
  /** @param {React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>} props */
  ({ className, children, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content ref={ref} className={cn('ui-dialog-content', className)} {...props}>
        {children}
        <DialogPrimitive.Close type="button" className="ui-dialog-close" aria-label="Закрыть">
          <Cross2Icon width={16} height={16} strokeWidth={2} />
          <span className="sr-only">Закрыть</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  ),
)
DialogContent.displayName = DialogPrimitive.Content.displayName

/** @param {React.HTMLAttributes<HTMLDivElement>} props */
function DialogHeader({ className, ...props }) {
  return <div className={cn('ui-dialog-header', className)} {...props} />
}
DialogHeader.displayName = 'DialogHeader'

/** @param {React.HTMLAttributes<HTMLDivElement>} props */
function DialogFooter({ className, ...props }) {
  return <div className={cn('ui-dialog-footer', className)} {...props} />
}
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef(
  /** @param {React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>} props */
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title ref={ref} className={cn('ui-dialog-title', className)} {...props} />
  ),
)
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef(
  /** @param {React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>} props */
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('ui-dialog-description', className)}
      {...props}
    />
  ),
)
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
