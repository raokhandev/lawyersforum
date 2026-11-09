import { Link } from 'react-router-dom'

// An article tile: the featured image fills the box, a dark overlay keeps the text readable, and the title and
// author/date sit in front. The whole tile is clickable.
export default function ArticleCard({ article, compact = false }) {
  const tileImage = article.tile_image_url || article.image_url
  const style = tileImage ? { backgroundImage: `url("${tileImage}")` } : undefined
  return (
    <article className={`tile${compact ? ' compact' : ''}`} style={style}>
      <div className="tile-text">
        <h3><Link className="tile-link" to={`/articles/${article.id}`}>{article.title}</Link></h3>
        <p className="tile-meta">
          {article.author_name ? `${article.author_name} · ` : ''}
          {new Date(article.created_at).toLocaleDateString()}
        </p>
      </div>
    </article>
  )
}
