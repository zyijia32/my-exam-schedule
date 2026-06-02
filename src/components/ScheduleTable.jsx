function isSameBlock(a, b) {
  return (
    a &&
    b &&
    a.subjectKey === b.subjectKey &&
    a.title === b.title &&
    Boolean(a.locked) === Boolean(b.locked)
  )
}

function buildMergedMap(timeSlots, dayBlocks) {
  const mergedMap = {}
  let row = 0
  while (row < timeSlots.length) {
    const current = dayBlocks[row]
    let span = 1
    while (row + span < timeSlots.length && isSameBlock(current, dayBlocks[row + span])) {
      span += 1
    }
    mergedMap[row] = { block: current, rowSpan: span }
    for (let skip = row + 1; skip < row + span; skip += 1) {
      mergedMap[skip] = null
    }
    row += span
  }
  return mergedMap
}

function getBlockTag(block) {
  if (block.locked && block.subjectKey === 'school') {
    return '固定課程'
  }
  if (block.locked && block.subjectKey === 'free') {
    return '請假/通勤'
  }
  return null
}

function ScheduleTable({ schedule }) {
  const { visibleDays, timeSlots, grid, subjects } = schedule
  const dayMergedMaps = {}
  visibleDays.forEach((day) => {
    dayMergedMaps[day.key] = buildMergedMap(timeSlots, grid[day.key] ?? [])
  })

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 md:p-5">
        <h2 className="text-lg font-semibold text-slate-800">動態課表（連續節次自動合併）</h2>
        <p className="mt-1 text-sm text-slate-500">
          午餐休息與晚餐休息已固定保留；其餘時段依可用時間安排課程，連續同類課程會自動合併成大格。
        </p>
      </div>

      <div className="overflow-x-auto p-3 md:p-4">
        <table className="min-w-full table-fixed border-collapse text-center">
          <thead>
            <tr>
              <th className="w-36 border border-slate-200 bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-600">
                時間
              </th>
              {visibleDays.map((day) => (
                <th
                  key={day.key}
                  className="min-w-[160px] border border-slate-200 bg-slate-100 px-2 py-2 text-sm font-semibold text-slate-700"
                >
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, rowIndex) => (
              <tr key={slot.key}>
                <td className="border border-slate-200 bg-white px-2 py-2 align-middle">
                  <p className="text-sm font-semibold text-slate-600">{slot.label}</p>
                  <p className="text-base font-bold text-slate-800">{slot.time}</p>
                </td>

                {visibleDays.map((day) => {
                  const merged = dayMergedMaps[day.key][rowIndex]
                  if (merged === null) {
                    return null
                  }
                  const block = merged.block
                  const colorClass = subjects[block?.subjectKey]?.color ?? subjects.break.color
                  const tag = getBlockTag(block)
                  return (
                    <td
                      key={`${day.key}-${slot.key}`}
                      rowSpan={merged.rowSpan}
                      className="border border-slate-200 bg-white p-1.5 align-middle"
                    >
                      <div className={`rounded-lg border px-2 py-3 text-sm ${colorClass}`}>
                        <p className="font-semibold leading-snug">{block.title}</p>
                        {tag && <p className="mt-1 text-[11px]">{tag}</p>}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default ScheduleTable
