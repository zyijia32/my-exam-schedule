const TIME_SLOTS = [
  { key: 'morning', label: '早晨黃金期', time: '09:00-12:00', hours: 3, type: 'study' },
  { key: 'lunchBreak', label: '午餐與午睡', time: '12:00-13:30', hours: 1.5, type: 'break' },
  { key: 'afternoon1', label: '午後衝刺(一)', time: '13:30-16:30', hours: 3, type: 'study' },
  { key: 'afternoon2', label: '午後衝刺(二)', time: '16:30-19:30', hours: 3, type: 'study' },
  { key: 'dinnerBreak', label: '晚餐與放鬆', time: '19:30-21:30', hours: 2, type: 'break' },
  { key: 'nightStudy', label: '晚自習', time: '21:30-00:30', hours: 3, type: 'study' },
]

const WEEK_DAYS = [
  { key: 'mon', label: '星期一', jsDay: 1 },
  { key: 'tue', label: '星期二', jsDay: 2 },
  { key: 'wed', label: '星期三', jsDay: 3 },
  { key: 'thu', label: '星期四', jsDay: 4 },
  { key: 'fri', label: '星期五', jsDay: 5 },
  { key: 'sat', label: '星期六', jsDay: 6 },
  { key: 'sun', label: '星期日', jsDay: 0 },
]

const SUBJECTS = {
  calculus: { label: '微積分', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  cs: { label: '計概', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  english: { label: '英文', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  break: { label: '休息', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  free: { label: '自由', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  school: { label: '學校固定課', color: 'bg-slate-100 text-slate-700 border-slate-300' },
}

const FIXED_SCHOOL_SCHEDULE = {
  mon: {
    morning: '工程數學',
    afternoon1: '數位系統',
    afternoon2: '英文聽講',
  },
  tue: {
    morning: '數位系統實驗',
  },
  wed: {
    morning: '物件導向',
    afternoon1: '正念靜坐',
  },
  fri: {
    morning: '羽球/中文',
  },
}

const CALCULUS_PRIORITY_DAYS = ['thu', 'sat', 'wed', 'tue', 'mon', 'fri']
const GENERAL_PRIORITY_DAYS = ['thu', 'sat', 'mon', 'tue', 'wed', 'fri', 'sun']
const STUDY_SUBJECTS = ['calculus', 'cs', 'english']

function toWeeklyIndex(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1
}

function createEntry(subjectKey, title, locked = false) {
  return {
    subjectKey,
    title,
    locked,
  }
}

function canUseForAutoStudy(dayKey, slotKey) {
  const slot = TIME_SLOTS.find((item) => item.key === slotKey)
  if (!slot || slot.type !== 'study') {
    return false
  }
  return true
}

function hasNoFixedSchoolSchedule(today) {
  const year = today.getFullYear()
  const summerStart = new Date(year, 5, 29)
  return today >= summerStart
}

function getDailySeed(today) {
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const date = today.getDate()
  return year * 10000 + month * 100 + date
}

function tieBreakBySeed(a, b, seed) {
  const aScore = (a.charCodeAt(0) + seed) % 7
  const bScore = (b.charCodeAt(0) + seed) % 7
  return aScore - bScore
}

export function getScheduleMeta() {
  return {
    weekDays: WEEK_DAYS,
    timeSlots: TIME_SLOTS,
    subjects: SUBJECTS,
  }
}

export function buildWeeklySchedule(inputHours, options = {}) {
  const leaveDays = options.leaveDays ?? { fri: false, sun: false }
  const today = new Date()
  const todayIndex = toWeeklyIndex(today.getDay())
  const visibleDays = WEEK_DAYS.slice(todayIndex)
  const noFixedSchoolSchedule = hasNoFixedSchoolSchedule(today)

  const grid = {}
  visibleDays.forEach((day) => {
    grid[day.key] = TIME_SLOTS.map(() => null)
  })

  visibleDays.forEach((day) => {
    if (!leaveDays[day.key]) {
      return
    }
    TIME_SLOTS.forEach((_, slotIndex) => {
      grid[day.key][slotIndex] = createEntry('free', '請假/通勤', true)
    })
  })

  if (!noFixedSchoolSchedule) {
    visibleDays.forEach((day) => {
      if (leaveDays[day.key]) {
        return
      }
      const fixedSlots = FIXED_SCHOOL_SCHEDULE[day.key]
      if (!fixedSlots) {
        return
      }
      TIME_SLOTS.forEach((slot, slotIndex) => {
        const lesson = fixedSlots[slot.key]
        if (lesson && grid[day.key]) {
          grid[day.key][slotIndex] = createEntry('school', lesson, true)
        }
      })
    })
  }

  const remaining = {
    calculus: Number(inputHours.calculus) || 0,
    cs: Number(inputHours.cs) || 0,
    english: Number(inputHours.english) || 0,
  }
  const requested = { ...remaining }

  const dayStudyLoad = {}
  const lastSubjectByDay = {}
  const subjectDayLoad = {
    calculus: {},
    cs: {},
    english: {},
  }
  visibleDays.forEach((day) => {
    dayStudyLoad[day.key] = 0
    lastSubjectByDay[day.key] = null
    subjectDayLoad.calculus[day.key] = 0
    subjectDayLoad.cs[day.key] = 0
    subjectDayLoad.english[day.key] = 0
  })

  const dailySeed = getDailySeed(today)

  const addStudyBlock = (subjectKey, dayKey) => {
    if (!grid[dayKey] || remaining[subjectKey] <= 0 || leaveDays[dayKey]) {
      return false
    }

    for (let slotIndex = 0; slotIndex < TIME_SLOTS.length; slotIndex += 1) {
      const slot = TIME_SLOTS[slotIndex]
      if (!grid[dayKey][slotIndex] && canUseForAutoStudy(dayKey, slot.key)) {
        const assignedHours = Math.min(remaining[subjectKey], slot.hours)
        grid[dayKey][slotIndex] = createEntry(
          subjectKey,
          `${SUBJECTS[subjectKey].label}（${assignedHours}h）`,
        )
        remaining[subjectKey] -= assignedHours
        dayStudyLoad[dayKey] += assignedHours
        subjectDayLoad[subjectKey][dayKey] += assignedHours
        lastSubjectByDay[dayKey] = subjectKey
        return true
      }
    }

    return false
  }

  function getCandidateDays(priorityDays, subjectKey) {
    return priorityDays
      .filter((dayKey) => grid[dayKey] && !leaveDays[dayKey])
      .filter((dayKey) =>
        TIME_SLOTS.some(
          (slot, slotIndex) =>
            !grid[dayKey][slotIndex] &&
            canUseForAutoStudy(dayKey, slot.key) &&
            remaining[subjectKey] > 0,
        ),
      )
      .sort((a, b) => {
        if (subjectDayLoad[subjectKey][a] !== subjectDayLoad[subjectKey][b]) {
          return subjectDayLoad[subjectKey][a] - subjectDayLoad[subjectKey][b]
        }
        if (lastSubjectByDay[a] === subjectKey && lastSubjectByDay[b] !== subjectKey) {
          return 1
        }
        if (lastSubjectByDay[b] === subjectKey && lastSubjectByDay[a] !== subjectKey) {
          return -1
        }
        if (dayStudyLoad[a] !== dayStudyLoad[b]) {
          return dayStudyLoad[a] - dayStudyLoad[b]
        }
        return tieBreakBySeed(a, b, dailySeed + subjectKey.length)
      })
  }

  function getSubjectOrder() {
    return STUDY_SUBJECTS.filter((subjectKey) => remaining[subjectKey] > 0).sort((a, b) => {
      const aNeedRatio = requested[a] > 0 ? remaining[a] / requested[a] : 0
      const bNeedRatio = requested[b] > 0 ? remaining[b] / requested[b] : 0
      if (aNeedRatio !== bNeedRatio) {
        return bNeedRatio - aNeedRatio
      }
      if (remaining[a] !== remaining[b]) {
        return remaining[b] - remaining[a]
      }
      return tieBreakBySeed(a, b, dailySeed + 31)
    })
  }

  while (remaining.calculus > 0 || remaining.cs > 0 || remaining.english > 0) {
    let assignedAny = false

    getSubjectOrder().forEach((subjectKey) => {
      if (remaining[subjectKey] <= 0) {
        return
      }
      const priorityDays = subjectKey === 'calculus' ? CALCULUS_PRIORITY_DAYS : GENERAL_PRIORITY_DAYS
      const candidates = getCandidateDays(priorityDays, subjectKey)
      if (candidates.length === 0) {
        return
      }
      if (addStudyBlock(subjectKey, candidates[0])) {
        assignedAny = true
      }
    })

    if (!assignedAny) {
      break
    }
  }

  visibleDays.forEach((day) => {
    TIME_SLOTS.forEach((slot, index) => {
      if (grid[day.key] && !grid[day.key][index]) {
        if (slot.key === 'lunchBreak') {
          grid[day.key][index] = createEntry('break', '午餐 + 休息（1.5小時）')
        } else if (slot.key === 'dinnerBreak') {
          grid[day.key][index] = createEntry('break', '晚餐 + 休息（2小時）')
        } else if (slot.type === 'study') {
          grid[day.key][index] = createEntry('free', SUBJECTS.free.label)
        } else {
          grid[day.key][index] = createEntry('break', '休息')
        }
      }
    })
  })

  const overflow = remaining.calculus + remaining.cs + remaining.english

  return {
    today,
    visibleDays,
    timeSlots: TIME_SLOTS,
    subjects: SUBJECTS,
    grid,
    overflow,
  }
}
