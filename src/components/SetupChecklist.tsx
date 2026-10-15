import { useSetupStatus } from '../useSetupStatus'

export function SetupChecklist() {
  return (
    <ul className="space-y-0.5">
      {useSetupStatus().map((item) => (
        <li key={item.label} className="flex gap-2">
          <span className={`w-3 shrink-0 ${item.ok ? 'text-emerald-400' : item.pending ? 'text-zinc-500' : 'text-rose-400'}`}>{item.ok ? '✓' : item.pending ? '…' : '✗'}</span>
          <span className="w-20 shrink-0 text-zinc-300">{item.label}</span>
          <span className="text-zinc-500">{item.detail}</span>
        </li>
      ))}
    </ul>
  )
}
