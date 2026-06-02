import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, TriangleAlert } from 'lucide-react'
import StudyConfigPanel from './components/StudyConfigPanel'
import ScheduleTable from './components/ScheduleTable'
import { buildWeeklySchedule } from './lib/scheduler'
import { readConfigFromUrl, writeConfigToUrl } from './lib/configSync'

const STORAGE_KEY = 'exam-schedule-config-v1'

function loadSavedConfig() {
  const fromUrl = readConfigFromUrl()
  if (fromUrl) {
    return fromUrl
  }
  if (typeof window === 'undefined') {
    return null
  }
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (!saved) {
    return null
  }
  try {
    return JSON.parse(saved)
  } catch {
    return null
  }
}

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

function App() {
  const [totalHours, setTotalHours] = useState(() => {
    const saved = loadSavedConfig()
    return {
      calculus: saved?.totalHours?.calculus ?? '8',
      cs: saved?.totalHours?.cs ?? '6',
      english: saved?.totalHours?.english ?? '5',
    }
  })
  const [targetDate, setTargetDate] = useState(() => {
    const saved = loadSavedConfig()
    return saved?.targetDate ?? getDefaultTargetDate()
  })
  const [leaveDays, setLeaveDays] = useState(() => {
    const saved = loadSavedConfig()
    return {
      fri: saved?.leaveDays?.fri ?? false,
      sun: saved?.leaveDays?.sun ?? false,
    }
  })
  const [syncMessage, setSyncMessage] = useState('')

  const weeksRemaining = useMemo(() => getWeeksRemaining(targetDate), [targetDate])
  const weeklyHours = useMemo(
    () => toWeeklyHours(totalHours, weeksRemaining),
    [totalHours, weeksRemaining],
  )
  const schedule = useMemo(
    () => buildWeeklySchedule(weeklyHours, { leaveDays }),
    [weeklyHours, leaveDays],
  )
  const examCountdown = useMemo(() => getExamCountdown(), [])

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

  useEffect(() => {
    const config = { totalHours, targetDate, leaveDays }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    writeConfigToUrl(config)
  }, [totalHours, targetDate, leaveDays])

  const copySyncLink = async () => {
    const config = { totalHours, targetDate, leaveDays }
    writeConfigToUrl(config)
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setSyncMessage('已複製同步連結！請在手機開啟同一個網址，或存成書籤。')
    } catch {
      setSyncMessage('無法自動複製，請手動複製網址列上的連結。')
    }
    window.setTimeout(() => setSyncMessage(''), 4000)
  }

  return (
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
        onCopySyncLink={copySyncLink}
        syncMessage={syncMessage}
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
    </main>
  )
}

export default App
