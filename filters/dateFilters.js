import { DateTime } from 'luxon'

const nth = (d) => {
  if (d > 3 && d < 21) return 'th'
  switch (d % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

const rssDate = (date) => {
    return date.toISOString()
}

const humanDate = (date) => {
    const d = DateTime.fromISO(date.toISOString())
    return `${d.toFormat(`LLLL`)} ${d.toFormat(`d`)}, ${d.toFormat(`yyyy`)}`
}

const postDateNoYear = (date) => {
    const d = DateTime.fromISO(date.toISOString())
    return `${d.toFormat(`MMMM d`)}${nth(d.day)}`
}

export default {
    rssDate,
    humanDate,
    postDateNoYear,
}