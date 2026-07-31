import { Camera } from 'lucide-react'
import { cn } from '../../utils/cn'

export function PhotoUploadDropzone({
  onClick,
  photoCount = 0,
  disabled,
  className,
}: {
  onClick?: () => void
  photoCount?: number
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed',
        'border-brand-200 bg-brand-50/50 px-4 py-5 text-center',
        'transition-all duration-fast ease-out touch-manipulation',
        'hover:border-brand-400 hover:bg-brand-50 active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
        'disabled:opacity-50 disabled:pointer-events-none',
        className
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-600">
        <Camera size={22} aria-hidden />
      </span>
      <span className="text-sm font-semibold text-brand-700">
        {photoCount > 0 ? `${photoCount} photo${photoCount === 1 ? '' : 's'}` : 'Add Photo'}
      </span>
      <span className="text-caption text-ink-400">Tap to capture or choose</span>
    </button>
  )
}
