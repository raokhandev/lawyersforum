import { Link } from 'react-router-dom'
import { api } from '../api.js'
import useFetch from '../useFetch.js'
import ArticleCard from '../components/ArticleCard.jsx'

export default function Home() {
  const { data, error, loading } = useFetch(api.articles)
  return (
    <>
      <section className="hero">
        <h1>Legal insight from the people who practise it</h1>
        <p>Lawyers Forum brings together articles and analysis from our network of lawyers.</p>
        <div className="hero-actions">
          <Link className="btn" to="/articles">Read articles</Link>
          <Link className="btn btn-outline" to="/lawyers">Meet the lawyers</Link>
        </div>
      </section>
      <h2>Latest articles</h2>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {data && data.length === 0 && <p>No articles yet.</p>}
      <div className="grid">
        {data && data.slice(0, 3).map((a) => <ArticleCard key={a.id} article={a} />)}
      </div>
    </>
  )
}
