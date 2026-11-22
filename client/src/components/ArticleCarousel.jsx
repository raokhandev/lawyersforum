import { useCallback, useEffect, useRef, useState } from 'react'
import ArticleCard from './ArticleCard.jsx'

// One row of article tiles (four across on a laptop). When there are more than fit, previous / next buttons
// scroll the row a page at a time. (The row can also be swiped or scrolled with a trackpad.)
export default function ArticleCarousel({ articles, label, sides = false }) {
  const track = useRef(null)
  const [state, setState] = useState({ scrollable: false, atStart: true, atEnd: true, pages: 1, current: 0 })

  const update = useCallback(() => {
    const el = track.current
    if (!el) return
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0
    const step = el.clientWidth + gap
    const pages = Math.max(1, Math.ceil((el.scrollWidth - 2) / step))
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
    setState({
      pages,
      current: atEnd ? pages - 1 : Math.min(pages - 1, Math.round(el.scrollLeft / step)),
      scrollable: el.scrollWidth > el.clientWidth + 2,
      atStart: el.scrollLeft <= 2,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    })
  }, [])

  useEffect(() => {
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [update, articles.length])

  function page(direction) {
    const el = track.current
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0
    el.scrollBy({ left: direction * (el.clientWidth + gap), behavior: 'smooth' })
  }

  function goTo(i) {
    const el = track.current
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0
    el.scrollTo({ left: i * (el.clientWidth + gap), behavior: 'smooth' })
  }

  const prev = <button type="button" className="carousel-btn" aria-label="Previous articles" disabled={state.atStart} onClick={() => page(-1)}>‹</button>
  const next = <button type="button" className="carousel-btn" aria-label="Next articles" disabled={state.atEnd} onClick={() => page(1)}>›</button>

  if (sides) {
    return (
      <div className="carousel carousel-sides">
        <div className="carousel-head"><h2>{label}</h2></div>
        <div className="carousel-row">
          {state.scrollable && prev}
          <div className="carousel-track" ref={track} onScroll={update}>
            {articles.map((a) => (
              <div className="carousel-item" key={a.id}><ArticleCard article={a} compact /></div>
            ))}
          </div>
          {state.scrollable && next}
        </div>
        {state.scrollable && state.pages > 1 && (
          <div className="carousel-dots" role="group" aria-label="Pages of articles">
            {Array.from({ length: state.pages }, (_, i) => (
              <button
                key={i} type="button" className={i === state.current ? 'active' : ''}
                aria-label={`Page ${i + 1} of ${state.pages}`} aria-current={i === state.current ? 'true' : undefined}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="carousel">
      <div className="carousel-head">
        <h2>{label}</h2>
        {state.scrollable && (
          <div className="carousel-buttons">
            <button type="button" className="carousel-btn" aria-label="Previous articles" disabled={state.atStart} onClick={() => page(-1)}>‹</button>
            <button type="button" className="carousel-btn" aria-label="Next articles" disabled={state.atEnd} onClick={() => page(1)}>›</button>
          </div>
        )}
      </div>
      <div className="carousel-track" ref={track} onScroll={update}>
        {articles.map((a) => (
          <div className="carousel-item" key={a.id}><ArticleCard article={a} compact /></div>
        ))}
      </div>
    </div>
  )
}
