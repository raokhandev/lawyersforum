import { Link } from 'react-router-dom'
import { api } from '../api.js'
import useFetch from '../useFetch.js'
import ArticleCard from '../components/ArticleCard.jsx'
import { EDITOR_NAME } from '../config.js'

// Home page slots the admin can pin articles to (see Admin page). Empty slots are auto-filled with the newest unpinned articles.
const SLOTS = ['featured', 'left1', 'left2', 'bottom1', 'bottom2', 'bottom3']

const fmt = (d) => new Date(d).toLocaleDateString()

// Pinned articles take their slot; remaining slots are filled in order from the unpinned articles (newest first).
function placeSlots(articles, order) {
  const out = {}
  const pinned = new Set()
  for (const a of articles) {
    if (a.home_slot && order.includes(a.home_slot) && !out[a.home_slot]) { out[a.home_slot] = a; pinned.add(a.id) }
  }
  const free = articles.filter((a) => !pinned.has(a.id))
  for (const slot of order) if (!out[slot]) out[slot] = free.shift()
  out.more = free
  return out
}

function EditorSection({ editor }) {
  return (
    <section>
      <h2 className="section-title">About the Editor</h2>
      <article className="profile editor-profile">
        {editor.photo_url
          ? <div className="profile-photo" role="img" aria-label={editor.name} style={{ backgroundImage: `url("${editor.photo_url}")` }} />
          : <div className="profile-photo placeholder" aria-hidden="true">{editor.name.charAt(0)}</div>}
        <div className="profile-body">
          <h3>{editor.name}</h3>
          {editor.summary && <p className="profile-summary">{editor.summary}</p>}
          <p><Link className="btn" to={`/authors/${editor.id}`}>Read more</Link></p>
        </div>
      </article>
    </section>
  )
}

function Featured({ article }) {
  const tileImage = article.tile_image_url || article.image_url
  const style = tileImage ? { backgroundImage: `url("${tileImage}")` } : undefined
  return (
    <article className="featured" style={style}>
      <p className="kicker">Featured</p>
      <h2><Link to={`/articles/${article.id}`}>{article.title}</Link></h2>
      <p className="featured-meta">
        {article.author_name ? `By ${article.author_name} · ` : ''}{fmt(article.created_at)}
      </p>
      <Link className="btn" to={`/articles/${article.id}`}>Read article</Link>
    </article>
  )
}

export default function Home() {
  const { data, error, loading } = useFetch(api.articles)
  const { data: authors } = useFetch(api.authors)
  const editor = authors && authors.find((a) => a.name === EDITOR_NAME)
  const { featured, left1, left2, bottom1, bottom2, bottom3, more } = placeSlots(data || [], SLOTS)
  const side = [[left1, 'side-1'], [left2, 'side-2']]
  const extra = [bottom1, bottom2, bottom3].filter(Boolean)

  return (
    <>
      <section className="hero">
        <h1>Legal insight from the people who practise it</h1>
        <p>Lawyers Forum brings together articles and analysis from our network of authors.</p>
        <div className="hero-actions">
          <Link className="btn" to="/articles">Read articles</Link>
          <Link className="btn btn-outline" to="/about">About Us</Link>
        </div>
      </section>

      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {data && data.length === 0 && <p>No articles yet.</p>}

      {featured && (
        <section className="showcase">
          <div className="showcase-featured"><Featured article={featured} /></div>
          {side.map(([a, cls]) => a && (
            <div key={a.id} className={`showcase-side ${cls}`}><ArticleCard article={a} compact /></div>
          ))}
          {extra.map((a) => (
            <div key={a.id} className="showcase-extra"><ArticleCard article={a} compact /></div>
          ))}
        </section>
      )}

      {more.length > 0 && (
        <>
          <h2 className="section-title">More articles</h2>
          <div className="grid">
            {more.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </>
      )}

      {editor && <EditorSection editor={editor} />}
    </>
  )
}
