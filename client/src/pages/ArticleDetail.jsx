import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import useFetch from '../useFetch.js'

export default function ArticleDetail() {
  const { id } = useParams()
  const { data, error, loading } = useFetch(() => api.article(id), [id])
  useEffect(() => {
    if (data) document.title = `${data.title} | Lawyers Forum`
    return () => { document.title = 'Lawyers Forum' }
  }, [data])
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
          {/<\/?[a-z][\s\S]*?>/i.test(data.content)
            // Written with the admin editor: HTML that the server has already cleaned of anything unsafe.
            ? <div className="article-body" dangerouslySetInnerHTML={{ __html: data.content }} />
            // Older articles are plain text, with paragraphs separated by blank lines.
            : data.content.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        </article>
      )}
    </>
  )
}
