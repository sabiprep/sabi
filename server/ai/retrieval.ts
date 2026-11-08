export type ApprovedKnowledgeChunk = {
  id: string;
  content: string;
  document?: {
    title?: string | null;
    subject?: string | null;
    topic?: string | null;
    source_reference?: string | null;
    status?: string | null;
  } | null;
};

export function formatApprovedKnowledgeContext(rows: ApprovedKnowledgeChunk[]): string {
  return rows
    .filter((row) => row.document?.status === 'approved' && row.content.trim())
    .slice(0, 5)
    .map((row, index) => {
      const title = row.document?.title || 'Approved learning resource';
      const subject = row.document?.subject || 'General';
      const topic = row.document?.topic || 'Not classified';
      const source = row.document?.source_reference || 'Sabi knowledge library';
      const content = row.content.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 5000);
      return `[Resource ${index + 1}] ${title} | ${subject} | ${topic} | Source: ${source}\n${content}`;
    })
    .join('\n\n');
}

export async function searchApprovedKnowledge(
  db: any,
  input: { query: string; subject?: string; topic?: string; limit?: number },
): Promise<ApprovedKnowledgeChunk[]> {
  const query = input.query.trim().slice(0, 256);
  if (query.length < 2) return [];
  let request = db.from('knowledge_chunks')
    .select('id, content, document:knowledge_documents!inner(title, subject, topic, source_reference, status)')
    .eq('document.status', 'approved')
    .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
    .limit(Math.max(1, Math.min(5, input.limit || 5)));
  if (input.subject) request = request.eq('document.subject', input.subject);
  if (input.topic) request = request.eq('document.topic', input.topic);
  const { data, error } = await request;
  if (error) throw error;
  return (data || []).filter((row: ApprovedKnowledgeChunk) => row.document?.status === 'approved');
}
