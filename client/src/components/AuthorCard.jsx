import { Link } from 'react-router-dom'

// An author's profile card (photo, name, title, summary, link). Used on the About Us page and under every article.
export default function AuthorCard({ author }) {
  return (
    <article className="profile">
      {author.photo_url
        ? <div className="profile-photo" role="img" aria-label={author.name} style={{ backgroundImage: `url("${author.photo_url}")` }} />
        : <div className="profile-photo placeholder" aria-hidden="true">{author.name.charAt(0)}</div>}
      <div className="profile-body">
        <h2>{author.name}</h2>
        {(author.title || author.practice_area) && (
          <p className="meta">{[author.title, author.practice_area].filter(Boolean).join(' · ')}</p>
        )}
        {author.summary && <p className="profile-summary">{author.summary}</p>}
        <p><Link to={`/authors/${author.id}`}>Read full profile →</Link></p>
      </div>
    </article>
  )
}
