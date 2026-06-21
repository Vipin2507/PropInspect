import { Inbox } from 'lucide-react'

export function EmptyState({
  title,
  description,
  message,
}: {
  title: string
  description?: string
  message?: string
}) {
  const body = description ?? message
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <Inbox className="mb-4 text-slate-300" size={52} aria-hidden="true" />
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {body && <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>}
    </div>
  )
}
