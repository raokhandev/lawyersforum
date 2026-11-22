import { Link } from 'react-router-dom'

// "About the Editor": shown at the end of the home page and the Write for Lawyers Forum page.
export default function EditorSection({ editor }) {
  return (
    <section>
      <h2 className="section-title">About the Editor</h2>
      <article className="profile editor-profile">
        {editor.photo_url
          ? <div className="profile-photo" role="img" aria-label={editor.name} style={{ backgroundImage: `url("${editor.photo_url}")` }} />
          : <div className="profile-photo placeholder" aria-hidden="true">{editor.name.charAt(0)}</div>}
        <div className="profile-body">
          <h3>{editor.name}</h3>
          {editor.summary && <p className="profile-summary">{editor.summary}</p>}
          <p><Link className="btn" to={`/authors/${editor.id}`}>Read more</Link></p>
        </div>
      </article>
    </section>
  )
}
