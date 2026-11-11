import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

// A drop-down in the site menu (Areas of Law, Jurisdictions): lists every group, each linking to its page.
// The list is reloaded on each page change, so one added in the admin shows up straight away.
export default function GroupMenu({ group }) {
  const { pathname } = useLocation()
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    let active = true
    group.list().then((a) => active && setItems(a)).catch(() => {})
    setOpen(false)
    return () => { active = false }
  }, [pathname, group])

  // Close when clicking elsewhere or pressing Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const inSection = pathname.startsWith(`${group.basePath}/`)
  return (
    // Hover opens it only with a mouse; on touch screens a tap toggles it (a tap also fires "enter", which would
    // otherwise open and then immediately close it).
    <div
      className={`nav-dropdown${open ? ' open' : ''}`} ref={ref}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOpen(true) }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpen(false) }}
    >
      <button
        type="button" className={`nav-dropdown-toggle${inSection ? ' active' : ''}`}
        aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}
      >
        {group.menuLabel} <span className="caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="nav-dropdown-menu">
          {items.map((a) => (
            <li key={a.id}><NavLink to={`${group.basePath}/${a.slug}`}>{a.name}</NavLink></li>
          ))}
          {items.length === 0 && <li className="empty">Nothing here yet.</li>}
        </ul>
      )}
    </div>
  )
}
