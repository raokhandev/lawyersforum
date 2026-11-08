import { Link } from 'react-router-dom'
import { api } from '../api.js'
import useFetch from '../useFetch.js'
import ArticleCard from '../components/ArticleCard.jsx'

const fmt = (d) => new Date(d).toLocaleDateString()

function Featured({ article }) {
  return (
    <article className="featured">
      <p className="kicker">Featured</p>
      <h2><Link to={`/articles/${article.id}`}>{article.title}</Link></h2>
      {article.summary && <p className="featured-summary">{article.summary}</p>}
      <p className="featured-meta">
        {article.author_name ? `By ${article.author_name} · ` : ''}{fmt(article.created_at)}
      </p>
      <Link className="btn" to={`/articles/${article.id}`}>Read article</Link>
    </article>
  )
}

export default function Home() {
  const { data, error, loading } = useFetch(api.articles)
  const [featured, ...rest] = data || []
  const around = rest.slice(0, 4)
  const more = rest.slice(4)

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
          {around.map((a, i) => (
            <div key={a.id} className={`showcase-side side-${i + 1}`}><ArticleCard article={a} compact /></div>
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
    </>
  )
}
