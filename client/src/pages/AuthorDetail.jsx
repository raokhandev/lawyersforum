import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import useFetch from '../useFetch.js'
import ArticleCarousel from '../components/ArticleCarousel.jsx'

export default function AuthorDetail() {
  const { id } = useParams()
  const { data, error, loading } = useFetch(() => api.author(id), [id])
  const { data: allArticles } = useFetch(api.articles, [])
  const articles = (allArticles || []).filter((a) => String(a.author_id) === String(id))
  const bio = (data && (data.description || data.summary)) || ''
  return (
    <>
      <p><Link to="/about">← About Us</Link></p>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <article className="author-page">
          {data.photo_url
            ? <img src={data.photo_url} alt={data.name} />
            : <div className="avatar placeholder">{data.name.charAt(0)}</div>}
          <div>
            <h1>{data.name}</h1>
            {(data.title || data.practice_area) && (
              <p className="meta">{[data.title, data.practice_area].filter(Boolean).join(' · ')}</p>
            )}
            {/<\/?[a-z][\s\S]*?>/i.test(bio)
              // Written with the admin editor: HTML the server has already cleaned.
              ? <div className="article-body" dangerouslySetInnerHTML={{ __html: bio }} />
              : bio.split(/\n{2,}/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
            {data.email && <p><a href={`mailto:${data.email}`}>{data.email}</a></p>}
          </div>
        </article>
      )}
      {data && articles.length > 0 && (
        <section className="more-by-author author-articles">
          <ArticleCarousel articles={articles} label={`Articles by ${data.name}`} />
        </section>
      )}
    </>
  )
}
