import { BookOpenText, Calculator, Languages, Link2 } from 'lucide-react'

const inputConfigs = [
  {
    key: 'calculus',
    label: '微積分時數',
    icon: Calculator,
    accent: 'text-red-600',
  },
  {
    key: 'cs',
    label: '計概時數',
    icon: BookOpenText,
    accent: 'text-purple-600',
  },
  {
    key: 'english',
    label: '英文時數',
    icon: Languages,
    accent: 'text-emerald-600',
  },
]

function StudyConfigPanel({
  totalHours,
  weeklyHours,
  targetDate,
  weeksRemaining,
  onHoursChange,
  onTargetDateChange,
  leaveDays,
  onLeaveDayChange,
  onCopySyncLink,
  syncMessage,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">讀完影片目標設定</h2>
        <button
          type="button"
          onClick={onCopySyncLink}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
        >
          <Link2 className="h-4 w-4" />
          複製同步連結
        </button>
      </div>
      {syncMessage ? (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {syncMessage}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-slate-500">
        先填「剩餘影片總時數」，再選目標日期，系統會自動換算每週需要讀的時數。
      </p>
      <p className="mt-1 text-xs text-slate-500">
        手機與電腦請使用同一個同步連結（或書籤），設定才會一致；僅開一般網址會各自記憶。
      </p>
      <p className="mt-1 text-xs text-slate-500">
        排課會優先以 3 小時時段安排；若該科剩餘不足 3 小時，會自動填入剩餘時數（例如 2h）。
      </p>

      <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700 md:flex-row md:items-center md:justify-between">
          <span className="font-medium">影片讀完目標日期</span>
          <input
            type="date"
            value={targetDate}
            onChange={(event) => onTargetDateChange(event.target.value)}
            className="w-full rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-sm outline-none ring-indigo-200 transition focus:ring md:w-auto"
          />
        </label>
        <p className="mt-2 text-xs text-indigo-700">
          剩餘週數：<span className="font-semibold">{weeksRemaining}</span> 週（含本週）
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
        <p className="text-sm font-medium text-amber-900">請假 / 通勤日設定</p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-700">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={leaveDays.fri}
              onChange={(event) => onLeaveDayChange('fri', event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-300"
            />
            星期五請假通勤
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={leaveDays.sun}
              onChange={(event) => onLeaveDayChange('sun', event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-300"
            />
            星期日請假通勤
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {inputConfigs.map(({ key, label, icon: Icon, accent }) => (
          <label
            key={key}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <Icon className={`h-4 w-4 ${accent}`} />
            <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">{label}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={totalHours[key]}
              onChange={(event) => onHoursChange(key, event.target.value)}
              className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-sm outline-none ring-indigo-200 transition focus:ring"
            />
            <span className="w-24 text-right text-xs font-semibold text-slate-600">
              每週約 {weeklyHours[key]}h
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}

export default StudyConfigPanel
