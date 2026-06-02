import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, RefreshCw, TriangleAlert } from 'lucide-react'
import StudyConfigPanel from './components/StudyConfigPanel'
import ScheduleTable from './components/ScheduleTable'
import { buildWeeklySchedule } from './lib/scheduler'
import { persistScheduleConfig, readConfigFromStorage } from './lib/configSync'
import { usePullToRefresh } from './hooks/usePullToRefresh'

function formatDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultTargetDate() {
  const date = new Date()
  date.setDate(date.getDate() + 28)
  return formatDateInput(date)
}

function createDefaultConfig() {
  return {
    totalHours: { calculus: '8', cs: '6', english: '5' },
    targetDate: getDefaultTargetDate(),
    leaveDays: { fri: false, sun: false },
  }
}

function resolveInitialConfig() {
  return readConfigFromStorage() ?? createDefaultConfig()
}

function getWeeksRemaining(targetDateString) {
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const targetDate = new Date(targetDateString)
  if (Number.isNaN(targetDate.getTime())) {
    return 1
  }
  const startOfTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  const diffMs = startOfTarget.getTime() - startOfToday.getTime()
  if (diffMs <= 0) {
    return 1
  }
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7))
}

function toWeeklyHours(totalHours, weeksRemaining) {
  const safeWeeks = Math.max(1, weeksRemaining)
  return {
    calculus: Math.ceil((Number(totalHours.calculus) || 0) / safeWeeks),
    cs: Math.ceil((Number(totalHours.cs) || 0) / safeWeeks),
    english: Math.ceil((Number(totalHours.english) || 0) / safeWeeks),
  }
}

function getExamCountdown() {
  const today = new Date()
  const currentYear = today.getFullYear()
  let examDate = new Date(currentYear, 6, 21)
  if (today > examDate) {
    examDate = new Date(currentYear + 1, 6, 21)
  }
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const daysLeft = Math.ceil((examDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24))
  return {
    examDate,
    daysLeft: Math.max(0, daysLeft),
  }
}

function PullToRefreshIndicator({ pullDistance, isRefreshing, threshold }) {
  const progress = Math.min(pullDistance / threshold, 1)
  if (progress <= 0 && !isRefreshing) {
    return null
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center md:hidden"
      style={{ transform: `translateY(${Math.min(pullDistance, threshold)}px)` }}
    >
      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm">
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? '重新載入中…' : progress >= 1 ? '放開即可重整' : '下拉同步設定'}
      </div>
    </div>
  )
}

function App() {
  const initialConfig = useMemo(() => resolveInitialConfig(), [])
  const [totalHours, setTotalHours] = useState(initialConfig.totalHours)
  const [targetDate, setTargetDate] = useState(initialConfig.targetDate ?? getDefaultTargetDate())
  const [leaveDays, setLeaveDays] = useState(initialConfig.leaveDays)
  const [actionMessage, setActionMessage] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const onChange = (event) => setIsMobileView(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const weeksRemaining = useMemo(() => getWeeksRemaining(targetDate), [targetDate, refreshTick])
  const weeklyHours = useMemo(
    () => toWeeklyHours(totalHours, weeksRemaining),
    [totalHours, weeksRemaining],
  )
  const schedule = useMemo(
    () => buildWeeklySchedule(weeklyHours, { leaveDays }),
    [weeklyHours, leaveDays, refreshTick],
  )
  const examCountdown = useMemo(() => getExamCountdown(), [refreshTick])

  const showMessage = (message) => {
    setActionMessage(message)
    window.setTimeout(() => setActionMessage(''), 4000)
  }

  const applyConfig = useCallback((config) => {
    if (!config) {
      return false
    }
    setTotalHours(config.totalHours)
    setTargetDate(config.targetDate ?? getDefaultTargetDate())
    setLeaveDays(config.leaveDays)
    setRefreshTick((tick) => tick + 1)
    return true
  }, [])

  const saveConfig = useCallback(() => {
    const config = { totalHours, targetDate, leaveDays }
    persistScheduleConfig(config)
    showMessage('設定已儲存，同步連結也已更新。')
  }, [totalHours, targetDate, leaveDays])

  const refreshConfig = useCallback(async () => {
    const config = readConfigFromStorage()
    if (!config) {
      showMessage('找不到已儲存的設定，已保留目前畫面。')
      return
    }
    applyConfig(config)
    showMessage('已重新載入最新設定與課表。')
  }, [applyConfig])

  const { pullDistance, isRefreshing } = usePullToRefresh(refreshConfig, {
    enabled: isMobileView,
  })

  const copySyncLink = async () => {
    const config = { totalHours, targetDate, leaveDays }
    persistScheduleConfig(config)
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      showMessage('已複製同步連結！請在手機開啟同一個網址，或存成書籤。')
    } catch {
      showMessage('無法自動複製，請手動複製網址列上的連結。')
    }
  }

  const updateHours = (subjectKey, rawValue) => {
    setTotalHours((prev) => ({
      ...prev,
      [subjectKey]: rawValue,
    }))
  }

  const updateLeaveDay = (dayKey, checked) => {
    setLeaveDays((prev) => ({
      ...prev,
      [dayKey]: checked,
    }))
  }

  return (
    <>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} threshold={72} />
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-3 md:gap-5 md:p-6">
        <header className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 p-5 text-white shadow-sm md:p-7">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            <p className="text-sm font-medium">轉學考動態排程系統</p>
          </div>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">今日起到週日的可行讀書計畫</h1>
          <p className="mt-2 max-w-3xl text-sm text-indigo-100 md:text-base">
            系統會依現在日期自動隱藏過去欄位、保留學校固定課程，並把微積分優先排進星期四與星期六。
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm">
            <Clock3 className="h-4 w-4" />
            <span>
              距離轉學考（{examCountdown.examDate.getFullYear()}/7/21）還有{' '}
              <span className="font-bold">{examCountdown.daysLeft}</span> 天
            </span>
          </div>
        </header>

        <StudyConfigPanel
          totalHours={totalHours}
          weeklyHours={weeklyHours}
          targetDate={targetDate}
          weeksRemaining={weeksRemaining}
          onHoursChange={updateHours}
          onTargetDateChange={setTargetDate}
          leaveDays={leaveDays}
          onLeaveDayChange={updateLeaveDay}
          onSaveConfig={saveConfig}
          onRefreshConfig={refreshConfig}
          onCopySyncLink={copySyncLink}
          actionMessage={actionMessage}
        />
        <ScheduleTable schedule={schedule} />

        {schedule.overflow > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              目前仍有 <span className="font-semibold">{schedule.overflow}</span>{' '}
              小時無法排入。你可延後目標日期、減少每週時數，或取消部分請假日。
            </p>
          </div>
        )}

        <section className="md:hidden">
          <button
            type="button"
            onClick={refreshConfig}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            重新載入設定
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">
            滑到頁面最上方後往下拉，也可以同步最新設定
          </p>
        </section>
      </main>
    </>
  )
}

export default App
