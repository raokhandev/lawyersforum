import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import useFetch from '../useFetch.js'

export default function ArticleDetail() {
  const { id } = useParams()
  const { data, error, loading } = useFetch(() => api.article(id), [id])
  return (
    <>
      <p><Link to="/articles">← All articles</Link></p>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <article className="article">
          {data.image_url && <img className="article-image" src={data.image_url} alt="" />}
          <h1>{data.title}</h1>
          <p className="meta">
            {data.author_name ? `By ${data.author_name} · ` : ''}
            {new Date(data.created_at).toLocaleDateString()}
          </p>
          {data.content.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        </article>
      )}
    </>
  )
}
