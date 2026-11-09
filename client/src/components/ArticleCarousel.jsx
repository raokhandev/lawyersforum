import { useCallback, useEffect, useRef, useState } from 'react'
import ArticleCard from './ArticleCard.jsx'

// One row of article tiles (four across on a laptop). When there are more than fit, previous / next buttons
// scroll the row a page at a time. (The row can also be swiped or scrolled with a trackpad.)
export default function ArticleCarousel({ articles, label }) {
  const track = useRef(null)
  const [state, setState] = useState({ scrollable: false, atStart: true, atEnd: true })

  const update = useCallback(() => {
    const el = track.current
    if (!el) return
    setState({
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
