import { pool } from './db.js';

// Inserts dummy authors and articles. Skips if there is already data.
const authors = [
  { name: 'Amelia Hartwell', title: 'Senior Partner', practice_area: 'Corporate Law', email: 'amelia.hartwell@example.com',
    bio: 'Amelia advises growing companies on governance, mergers and shareholder disputes, with over twenty years of experience.' },
  { name: 'Daniel Okafor', title: 'Partner', practice_area: 'Employment Law', email: 'daniel.okafor@example.com',
    bio: 'Daniel represents employers and employees in workplace disputes, restructures and contract negotiations.' },
  { name: 'Priya Raman', title: 'Associate', practice_area: 'Intellectual Property', email: 'priya.raman@example.com',
    bio: 'Priya helps founders and creators protect trademarks, copyright and trade secrets.' },
  { name: 'Marcus Lindqvist', title: 'Barrister', practice_area: 'Criminal Law', email: 'marcus.lindqvist@example.com',
    bio: 'Marcus appears in trial and appellate courts and writes on evidence and procedure.' },
  { name: 'Sofia Alvarez', title: 'Partner', practice_area: 'Family Law', email: 'sofia.alvarez@example.com',
    bio: 'Sofia guides families through separation, custody and financial settlements with a focus on mediation.' },
];

const articles = [
  { a: 2, days: 1, title: 'Data Protection Basics for Small Businesses',
    summary: 'What personal data you hold, why you hold it, and the simple steps that keep you compliant.',
    content: 'Even a small business handles personal data: customer emails, staff records, delivery addresses. Data protection law applies regardless of size, so it pays to know what you hold and why.\n\nStart with a simple inventory of the data you collect, where it is stored and who can see it. Collect only what you need, keep it only as long as necessary, and tell people clearly how you will use it.\n\nHave a plan for breaches, too. Knowing who to notify, and how quickly, turns a crisis into a manageable incident.' },
  { a: 0, days: 2, title: 'What Every Founder Should Know Before Taking Investment',
    summary: 'Term sheets, dilution and control: the clauses that matter most in a first funding round.',
    content: 'Raising your first round of investment is exciting, but the paperwork can shape your company for years. Before signing anything, take time to understand how each clause affects ownership and control.\n\nDilution is the most visible effect: every new share issued reduces the percentage you hold. Less obvious are liquidation preferences, which decide who is paid first, and how much, when the company is sold.\n\nBoard composition and veto rights also deserve attention. A small number of protective provisions can give investors a say over decisions that founders assume they control. Get advice early, and negotiate while you still have leverage.' },
  { a: 1, days: 4, title: 'Remote Work and the Law: Where Employers Get Caught Out',
    summary: 'Flexible working has created new legal risks around contracts, tax and health and safety.',
    content: 'Remote and hybrid working are now normal, yet many employment contracts were written for an office. Employers should check that their documents reflect where and how people actually work.\n\nWorking from another jurisdiction can create tax and employment-law obligations that neither side expected. Health and safety duties also extend to a home workspace, and employers remain responsible for reasonable adjustments.\n\nThe safest approach is a clear remote-working policy, agreed in writing, and reviewed whenever working patterns change.' },
  { a: 2, days: 6, title: 'Trademark or Copyright? Choosing the Right Protection',
    summary: 'Two different tools for two different problems, and why many brands need both.',
    content: 'Trademarks and copyright are often confused, but they protect different things. A trademark protects the signs that identify a business: names, logos and slogans. Copyright protects original creative works such as text, images, music and software.\n\nA logo can be both: the design is a creative work, and its use in trade makes it a brand identifier. Registering the trademark gives stronger and clearer rights against copycats.\n\nBefore launching a brand, search existing registers and keep records of who created your creative assets.' },
  { a: 3, days: 9, title: 'Your Rights During a Police Interview',
    summary: 'A plain-language guide to what to expect and why legal advice matters from the start.',
    content: 'Being asked to attend a police interview is stressful, whether or not you have done anything wrong. Understanding your rights beforehand helps you make calm decisions.\n\nYou are generally entitled to free and independent legal advice before and during questioning. Anything you say can later be used as evidence, so it is wise to speak to a lawyer before deciding how to respond.\n\nIf you are asked to attend voluntarily, you can still ask for advice first. Keep a note of what was said and when.' },
  { a: 4, days: 12, title: 'Mediation vs Court: Resolving Family Disputes with Less Conflict',
    summary: 'How mediation can save time, cost and stress when a relationship ends.',
    content: 'Court is not the only route when a relationship ends. Mediation brings both sides together with a neutral third party to reach an agreement they can live with.\n\nIt is usually quicker and cheaper than litigation, and it keeps decisions in the hands of the family rather than a judge. That is especially valuable where children are involved and parents must keep working together.\n\nMediation is not right for every situation, particularly where there is abuse or a serious imbalance of power. A family lawyer can help you decide.' },
  { a: 0, days: 15, title: 'Understanding Shareholder Agreements',
    summary: 'Why a short document agreed early can prevent costly disputes later.',
    content: 'A shareholder agreement sets out how a company will be run and what happens when owners disagree or want to leave. Without one, default company law applies, and it rarely fits the real relationship between the owners.\n\nKey topics include decision-making, transfer of shares, what happens if an owner leaves, and how disputes are resolved. Dealing with these while everyone is on good terms is far easier than doing so in the middle of a disagreement.' },
  { a: 1, days: 18, title: 'Redundancy: A Practical Guide for Employers',
    summary: 'Fair selection, genuine consultation and clear documentation reduce risk.',
    content: 'Redundancy is one of the most legally sensitive decisions an employer can make. A fair process matters as much as the business reason behind it.\n\nEmployers should identify a genuine need, consult affected staff in good time, apply objective selection criteria and consider alternatives such as redeployment. Each step should be recorded.\n\nSkipping consultation or choosing people unfairly is the most common cause of claims.' },
  { a: 2, days: 21, title: 'Protecting Your Ideas: A Short Guide to Trade Secrets',
    summary: 'Not every valuable idea can be registered. Here is how to keep it confidential.',
    content: 'Some of a business\'s most valuable assets, such as recipes, customer lists and methods, cannot be registered. They are protected only for as long as they are kept secret.\n\nTo protect a trade secret, limit who can access it, use confidentiality agreements with staff and partners, and mark sensitive documents clearly. Courts look at the steps you took when deciding whether information deserves protection.' },
  { a: 3, days: 25, title: 'How Bail Decisions Are Made',
    summary: 'The factors courts weigh when deciding whether someone waits for trial at home or in custody.',
    content: 'When someone is charged with an offence, the court must decide whether they can stay in the community until trial. This is a bail decision.\n\nCourts consider the seriousness of the allegation, the person\'s history, the risk of absconding or reoffending and the risk of interference with witnesses. Conditions such as reporting or curfews may be imposed to reduce those risks.\n\nGood preparation, including a stable address and supportive references, can make a real difference.' },
  { a: 4, days: 30, title: 'Wills and Estate Planning: Why Not to Wait',
    summary: 'A valid will gives you control and spares your family uncertainty.',
    content: 'Many people put off writing a will, but without one the law decides who inherits, and the result may not match your wishes.\n\nA clear will names your beneficiaries, appoints executors and can set out guardians for young children. It should be reviewed after major life events such as marriage, divorce or the birth of a child.\n\nUsing a qualified lawyer helps ensure the will is valid and carried out smoothly.' },
];

const [[{ n: existing }]] = await pool.query(
  'SELECT (SELECT COUNT(*) FROM authors) + (SELECT COUNT(*) FROM articles) AS n'
);
if (existing > 0) {
  console.log('Tables already contain data; seed skipped.');
} else {
  const ids = [];
  for (const au of authors) {
    const [r] = await pool.query(
      'INSERT INTO authors (name, title, practice_area, bio, email) VALUES (?, ?, ?, ?, ?)',
      [au.name, au.title, au.practice_area, au.bio, au.email]
    );
    ids.push(r.insertId);
  }
  for (const ar of articles) {
    await pool.query(
      'INSERT INTO articles (title, summary, content, author_id, created_at) VALUES (?, ?, ?, ?, NOW() - INTERVAL ? DAY)',
      [ar.title, ar.summary, ar.content, ids[ar.a], ar.days]
    );
  }
  console.log(`Seeded ${authors.length} authors and ${articles.length} articles.`);
}
await pool.end();
