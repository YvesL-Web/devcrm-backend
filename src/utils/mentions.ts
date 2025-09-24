export function extractMentionEmails(text: string): string[] {
  if (!text) return []
  // match @email@example.com (simple, robuste)
  const re = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,})/g
  const emails = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    emails.add(m[1].toLowerCase())
  }
  return Array.from(emails)
}
