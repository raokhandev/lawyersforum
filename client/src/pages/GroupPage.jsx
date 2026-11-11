import { useParams } from 'react-router-dom'
import useFetch from '../useFetch.js'
import ArticleCard from '../components/ArticleCard.jsx'

// One area of law or jurisdiction: lists every article filed under it, newest first.
export default function GroupPage({ group }) {
  const { slug } = useParams()
  const { data, error, loading } = useFetch(() => group.get(slug), [group, slug])
  return (
    <>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <>
          <p className="eyebrow">{group.menuLabel}</p>
          <h1>{data.name}</h1>
          {data.articles.length === 0 && <p>No articles here yet.</p>}
          <div className="grid">
            {data.articles.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </>
      )}
    </>
  )
}
