import { env } from '../config/env.js'

const BASE = 'https://api.github.com'

type HeadersDict = Record<string, string>

function buildHeaders(customToken?: string): HeadersDict {
  const headers: HeadersDict = {
    Accept: 'application/vnd.github+json'
  }
  const token = (customToken ?? env.GITHUB_TOKEN)?.trim()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export async function ghGET<T = unknown>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: buildHeaders(token)
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`GitHub GET ${path} failed: ${res.status} ${msg}`)
  }
  return res.json() as Promise<T>
}

export async function ghSearchPRs(
  owner: string,
  repo: string,
  sinceISO: string,
  untilISO: string,
  token?: string
): Promise<any[]> {
  const q = encodeURIComponent(
    `repo:${owner}/${repo} is:pr is:merged merged:${sinceISO}..${untilISO}`
  )
  const data = await ghGET<{ items: any[] }>(`/search/issues?q=${q}&per_page=100`, token)
  return data.items ?? []
}

export async function ghCompare(
  owner: string,
  repo: string,
  base: string,
  head: string,
  token?: string
): Promise<any> {
  return ghGET<any>(
    `/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
    token
  )
}

export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const m = repoUrl.match(/github\.com[:/]{1,2}([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/)
  if (!m) throw new Error('Invalid GitHub repo URL')
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') }
}

export type DraftItem = { type: 'FEATURE' | 'FIX' | 'CHORE'; title: string; url?: string }

export function classify(title: string, labels: string[] = []): 'FEATURE' | 'FIX' | 'CHORE' {
  const t = title.toLowerCase()
  const l = labels.map((x) => x.toLowerCase())
  if (
    t.includes('feat') ||
    l.includes('feature') ||
    l.includes('enhancement') ||
    t.includes('add ')
  )
    return 'FEATURE'
  if (t.includes('fix') || t.includes('bug') || l.includes('bug')) return 'FIX'
  return 'CHORE'
}

export function buildBodyMd(groups: Record<'FEATURE' | 'FIX' | 'CHORE', DraftItem[]>): string {
  const order: Array<'FEATURE' | 'FIX' | 'CHORE'> = ['FEATURE', 'FIX', 'CHORE']
  let md = ''
  for (const key of order) {
    const arr = groups[key]
    if (!arr || arr.length === 0) continue
    md += `\n## ${key === 'FEATURE' ? 'Features' : key === 'FIX' ? 'Fixes' : 'Chores'}\n`
    for (const it of arr) {
      const link = it.url ? ` ([link](${it.url}))` : ''
      md += `- ${it.title}${link}\n`
    }
  }
  return md.trim() || 'Minor improvements.'
}
