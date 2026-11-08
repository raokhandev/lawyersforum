import { Link } from 'react-router-dom'

export default function ArticleCard({ article, compact = false }) {
  return (
    <article className={`card${compact ? ' compact' : ''}`}>
      {article.image_url && (
        <Link to={`/articles/${article.id}`}><img className="card-image" src={article.image_url} alt="" /></Link>
      )}
      <h3><Link to={`/articles/${article.id}`}>{article.title}</Link></h3>
      <p className="meta">
        {article.author_name ? `${article.author_name} · ` : ''}
        {new Date(article.created_at).toLocaleDateString()}
      </p>
      {article.summary && <p className="card-summary">{article.summary}</p>}
      <Link to={`/articles/${article.id}`} className="more">Read more →</Link>
    </article>
  )
}
