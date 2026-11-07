import { Link } from 'react-router-dom'

export default function ArticleCard({ article }) {
  return (
    <article className="card">
      <h3><Link to={`/articles/${article.id}`}>{article.title}</Link></h3>
      <p className="meta">
        {article.author_name ? `${article.author_name} · ` : ''}
        {new Date(article.created_at).toLocaleDateString()}
      </p>
      {article.summary && <p>{article.summary}</p>}
      <Link to={`/articles/${article.id}`} className="more">Read more →</Link>
    </article>
  )
}
