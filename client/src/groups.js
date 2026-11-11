import { api } from './api.js'

// The ways articles are grouped. Each article is in one or more of each; each group has its own page and is listed in
// a drop-down in the site menu. The server has the matching list (TAXONOMIES in server/src/index.js).
export const GROUPS = [
  {
    key: 'areas',
    menuLabel: 'Areas of Law',
    basePath: '/areas-of-law',
    list: api.practiceAreas,
    get: api.practiceArea,
    add: api.addPracticeArea,
    adminList: api.adminPracticeAreas,
    remove: api.deletePracticeArea,
    field: 'practice_area_ids', // article form value
    out: 'practice_areas', // on the article returned by the API
    legend: 'Areas of law',
    one: 'area of law',
    example: 'e.g. Family Law',
    help: 'Tick every area of law the article covers. It will be listed on each of those pages.',
  },
  {
    key: 'jurisdictions',
    menuLabel: 'Jurisdictions',
    basePath: '/jurisdictions',
    list: api.jurisdictions,
    get: api.jurisdiction,
    add: api.addJurisdiction,
    adminList: api.adminJurisdictions,
    remove: api.deleteJurisdiction,
    field: 'jurisdiction_ids',
    out: 'jurisdictions',
    legend: 'Jurisdictions',
    one: 'jurisdiction',
    example: 'e.g. Australia',
    help: 'Tick every jurisdiction the article applies to. It will be listed on each of those pages.',
  },
]
