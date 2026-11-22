import { useEffect } from 'react'
import { api } from '../api.js'
import useFetch from '../useFetch.js'
import EditorSection from '../components/EditorSection.jsx'
import { EDITOR_NAME } from '../config.js'

export default function WriteForUs() {
  const { data: authors } = useFetch(api.authors)
  const editor = authors && authors.find((a) => a.name === EDITOR_NAME)
  useEffect(() => {
    document.title = 'Write for Lawyers Forum | Lawyers Forum'
    return () => { document.title = 'Lawyers Forum' }
  }, [])
  const email = <a href="mailto:Editor@LawyersForum.org">Editor@LawyersForum.org</a>
  return (
    <>
      <div className="article-body write-page">
        <h1>Write for Lawyers Forum – Article Contributions Welcome</h1>
        <p>Lawyers Forum welcomes legal professionals from all jurisdictions to contribute articles and share their legal knowledge, experience and perspectives with our readers.</p>
        <p>We encourage lawyers to submit well-researched articles on legal developments, legislation, court judgments and other matters relating to their respective jurisdictions.</p>

        <h2>How to Submit an Article</h2>
        <p>Legal professionals interested in contributing to Lawyers Forum are invited to email the following documents to {email}:</p>
        <ul>
          <li>An up-to-date Curriculum Vitae (CV).</li>
          <li>Copies of relevant professional and academic qualifications.</li>
          <li>A recent professional photograph for the author&apos;s profile.</li>
          <li>The proposed article for publication.</li>
        </ul>

        <h2>Editorial Review and Verification</h2>
        <p>All submissions are subject to editorial review. The Editor reserves the right to request further information, supporting documents or clarification to verify an author&apos;s identity, qualifications, professional standing and the accuracy of the submitted material.</p>
        <p>Submission of an article does not guarantee publication. The Editor reserves the right to accept, decline or request amendments to any submission.</p>

        <h2>Contact the Editor</h2>
        <p>For article submissions, general enquiries or further information, please contact:</p>
        <p><strong>Email:</strong> {email}</p>
        <p>We look forward to welcoming contributions from legal professionals around the world and promoting the exchange of legal knowledge across jurisdictions.</p>
      </div>
      {editor && <EditorSection editor={editor} />}
    </>
  )
}
