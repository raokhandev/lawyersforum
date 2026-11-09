import { useEffect, useRef, useState } from 'react'

// A calendar date picker in the site's colours (the browser's own picker can't be styled).
// `value` and `onChange` use the format YYYY-MM-DD. Weeks start on Monday.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const pad = (n) => String(n).padStart(2, '0')
const toValue = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromValue = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '')
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}
const sameDay = (a, b) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate()
// Move to another month, keeping the day of the month where possible.
const addMonths = (d, n) => {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1)
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), daysIn(first.getFullYear(), first.getMonth())))
}

export default function DatePicker({ value, onChange, labelledBy }) {
  const selected = fromValue(value)
  const today = new Date()
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState(selected || today) // the day with keyboard focus; its month is the one shown
  const wrap = useRef(null)
  const trigger = useRef(null)
  const grid = useRef(null)
  const moveFocus = useRef(false)

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return undefined
    const down = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', down)
    return () => document.removeEventListener('mousedown', down)
  }, [open])

  // After keyboard navigation, put the browser focus on the day button.
  useEffect(() => {
    if (open && moveFocus.current) {
      grid.current?.querySelector('button[data-focus="true"]')?.focus()
      moveFocus.current = false
    }
  }, [focus, open])

  function toggle() {
    if (open) { setOpen(false); return }
    setFocus(selected || today)
    setOpen(true)
  }

  function choose(date) {
    onChange(toValue(date))
    setOpen(false)
    trigger.current?.focus()
  }

  function go(date) { moveFocus.current = true; setFocus(date) }

  function onGridKey(e) {
    const keys = {
      ArrowLeft: () => addDays(focus, -1), ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7), ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, -1), PageDown: () => addMonths(focus, 1),
    }
    if (keys[e.key]) { e.preventDefault(); go(keys[e.key]()) }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); trigger.current?.focus() }
  }

  const year = focus.getFullYear()
  const month = focus.getMonth()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7 // blank cells before the 1st (Monday first)
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysIn(year, month) }, (_, i) => new Date(year, month, i + 1))]
  const firstYear = Math.min(today.getFullYear() - 30, year)
  const years = Array.from({ length: today.getFullYear() + 2 - firstYear + 1 }, (_, i) => firstYear + i)
  const display = selected ? selected.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Choose a date'

  return (
    <div className="datepicker" ref={wrap} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        className="date-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={labelledBy}
        onClick={toggle}
      >
        <span className={selected ? '' : 'placeholder'}>{display}</span>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
        </svg>
      </button>

      {open && (
        <div className="date-pop" role="dialog" aria-label="Choose a date">
          <div className="date-head">
            <button type="button" className="date-nav" aria-label="Previous month" onClick={() => setFocus(addMonths(focus, -1))}>‹</button>
            <div className="date-selects">
              <select aria-label="Month" value={month} onChange={(e) => setFocus(addMonths(focus, Number(e.target.value) - month))}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select aria-label="Year" value={year} onChange={(e) => setFocus(addMonths(focus, (Number(e.target.value) - year) * 12))}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="button" className="date-nav" aria-label="Next month" onClick={() => setFocus(addMonths(focus, 1))}>›</button>
          </div>

          <div className="date-grid" ref={grid} role="grid" onKeyDown={onGridKey}>
            {WEEKDAYS.map((d) => <span key={d} className="date-weekday" aria-hidden="true">{d}</span>)}
            {cells.map((d, i) => (d ? (
              <button
                key={i}
                type="button"
                className={`date-day${sameDay(d, selected) ? ' selected' : ''}${sameDay(d, today) ? ' today' : ''}`}
                data-focus={sameDay(d, focus)}
                tabIndex={sameDay(d, focus) ? 0 : -1}
                aria-label={d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                aria-pressed={sameDay(d, selected)}
                onClick={() => choose(d)}
              >
                {d.getDate()}
              </button>
            ) : <span key={i} />))}
          </div>

          <div className="date-foot">
            <button type="button" className="date-link" onClick={() => choose(new Date())}>Today</button>
            <button type="button" className="date-link muted" onClick={() => { setOpen(false); trigger.current?.focus() }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
