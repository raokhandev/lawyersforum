import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import useFetch from '../useFetch.js'
import AuthorCard from '../components/AuthorCard.jsx'
import ArticleCarousel from '../components/ArticleCarousel.jsx'

// Under every article: the author's card, then the author's other articles in a scrolling row.
function AfterArticle({ authorId, currentId }) {
  const { data: author } = useFetch(() => api.author(authorId), [authorId])
  const { data: articles } = useFetch(api.articles, [])
  if (!author) return null
  const others = (articles || []).filter((a) => a.author_id === authorId && a.id !== currentId)
  return (
    <div className="after-article">
      <section aria-label="About the author"><AuthorCard author={author} /></section>
      {others.length > 0 && (
        <section className="more-by-author">
          <ArticleCarousel articles={others} label={`More articles by ${author.name}`} />
        </section>
      )}
    </div>
  )
}

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
      {data && data.author_id && <AfterArticle authorId={data.author_id} currentId={data.id} />}
    </>
  )
}
