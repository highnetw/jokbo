import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 브라우저에서는 프록시 경로 사용 (CORS 우회), 서버에서는 직접 연결
const supabaseProxyUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/supabase`
    : supabaseUrl

export const supabase = createClient(supabaseProxyUrl, supabaseAnonKey)

// Supabase(PostgREST)는 .range()로 명시하지 않으면 한 번에 최대 1000행만 반환한다.
// 테이블 행 수가 1000을 넘으면 나머지가 조용히 잘려나가므로, 전체 조회는 항상 이 함수로 페이지네이션한다.
export async function fetchAllRows<T>(table: string, select: string): Promise<T[]> {
  let rows: T[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows = rows.concat(data as T[]);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}
