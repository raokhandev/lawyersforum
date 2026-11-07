import { api } from '../api.js'
import useFetch from '../useFetch.js'
import ArticleCard from '../components/ArticleCard.jsx'

export default function Articles() {
  const { data, error, loading } = useFetch(api.articles)
  return (
    <>
      <h1>Articles</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {data && data.length === 0 && <p>No articles yet.</p>}
      <div className="grid">
        {data && data.map((a) => <ArticleCard key={a.id} article={a} />)}
      </div>
    </>
  )
}
