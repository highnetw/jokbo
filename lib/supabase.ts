import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 브라우저에서는 프록시 경로 사용 (CORS 우회), 서버에서는 직접 연결
const supabaseProxyUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/supabase`
    : supabaseUrl

export const supabase = createClient(supabaseProxyUrl, supabaseAnonKey)
