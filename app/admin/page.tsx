'use client';

import { useState } from 'react';
import { supabase, fetchAllRows } from '@/lib/supabase';
import { effectiveBirthYear } from '@/lib/treeBuilder';
import Link from 'next/link';

type BackupData = {
  exported_at: string;
  version: number;
  persons: object[];
  relationships: object[];
};

export default function AdminPage() {
/* 백업에 비번 내가 삽입 */
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const [restorePreview, setRestorePreview] = useState<BackupData | null>(null);
  const [restoreFile, setRestoreFile] = useState<BackupData | null>(null);
  const [loading, setLoading] = useState(false);

  const msg = (text: string, err = false) => {
    setStatus(text);
    setIsError(err);
  };
/* 내가 비번 백업 삽입 */
    const handleLogin = () => {
    if (passwordInput === '1103') {
      setIsAuthenticated(true);
    } else {
      alert('비밀번호가 틀렸습니다!');
      setPasswordInput('');
    }
  };

  // ── 백업 ──────────────────────────────────────────────
  const handleBackup = async () => {
    setLoading(true);
    msg('백업 데이터 불러오는 중...');

    let persons: (object & { birth_year?: number | null })[];
    let relationships: object[];
    try {
      persons = await fetchAllRows('jokbo_persons', '*');
      relationships = await fetchAllRows('jokbo_relationships', '*');
    } catch (err) {
      msg('백업 실패: ' + (err instanceof Error ? err.message : String(err)), true);
      setLoading(false);
      return;
    }
    persons.sort((a, b) => effectiveBirthYear(a.birth_year) - effectiveBirthYear(b.birth_year));

    const backup: BackupData = {
      exported_at: new Date().toISOString(),
      version: 1,
      persons,
      relationships,
    };

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `jokbo_backup_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);

    msg(`✅ 백업 완료! 인물 ${persons?.length}명 · 관계 ${relationships?.length}건`);
    setLoading(false);
  };

  // ── 복원 파일 선택 ─────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestorePreview(null);
    setRestoreFile(null);
    msg('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as BackupData;
        if (!data.persons || !data.relationships) {
          msg('올바른 백업 파일이 아닙니다.', true);
          return;
        }
        setRestorePreview(data);
        setRestoreFile(data);
      } catch {
        msg('파일 파싱 오류: JSON 형식이 아닙니다.', true);
      }
    };
    reader.readAsText(file);
  };

  // ── 복원 실행 ─────────────────────────────────────────
  const handleRestore = async () => {
    if (!restoreFile) return;
    setLoading(true);
    msg('복원 중... 잠시만 기다려 주세요.');

    // 기존 데이터 전체 삭제
    const { error: delRel } = await supabase
      .from('jokbo_relationships')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (delRel) { msg('관계 삭제 실패: ' + delRel.message, true); setLoading(false); return; }

    const { error: delPer } = await supabase
      .from('jokbo_persons')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (delPer) { msg('인물 삭제 실패: ' + delPer.message, true); setLoading(false); return; }

    // 인물 복원 (50개씩 청크)
    const CHUNK = 50;
    for (let i = 0; i < restoreFile.persons.length; i += CHUNK) {
      const chunk = restoreFile.persons.slice(i, i + CHUNK);
      const { error } = await supabase.from('jokbo_persons').insert(chunk);
      if (error) { msg('인물 복원 실패: ' + error.message, true); setLoading(false); return; }
    }

    // 관계 복원
    for (let i = 0; i < restoreFile.relationships.length; i += CHUNK) {
      const chunk = restoreFile.relationships.slice(i, i + CHUNK);
      const { error } = await supabase.from('jokbo_relationships').insert(chunk);
      if (error) { msg('관계 복원 실패: ' + error.message, true); setLoading(false); return; }
    }

    msg(`✅ 복원 완료! 인물 ${restoreFile.persons.length}명 · 관계 ${restoreFile.relationships.length}건`);
    setRestorePreview(null);
    setRestoreFile(null);
    setLoading(false);
  };
/* 내가 비번 때문에 수정 */
  // 👇 기존 return 위에 추가
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-amber-900 mb-2">⚙️ 관리자 인증</h1>
        <p className="text-amber-700 text-sm mb-6">비밀번호를 입력하세요</p>
        <input
          type="password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          placeholder="비밀번호"
          className="border border-amber-300 rounded-lg px-4 py-2 mb-4 text-center"
        />
        <button
          onClick={handleLogin}
          className="bg-amber-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-amber-700 transition"
        >
          확인
        </button>
      </main>
    );
  }

  /*여기까지 내가 비번 때문에 수정 */
  return (
    <main className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-lg mx-auto">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="text-amber-700 hover:text-amber-900">← 목록으로</button>
          </Link>
          <h1 className="text-2xl font-bold text-amber-900">⚙️ 관리자</h1>
        </div>

        {/* 백업 카드 */}
        <div className="bg-white rounded-2xl shadow p-6 mb-4">
          <h2 className="text-lg font-bold text-amber-900 mb-1">📦 데이터 백업</h2>
          <p className="text-sm text-gray-500 mb-4">
            전체 인물 · 관계 데이터를 JSON 파일로 다운로드합니다.
          </p>
          <button
            onClick={handleBackup}
            disabled={loading}
            className="w-full bg-amber-600 text-white py-3 rounded-xl font-medium hover:bg-amber-700 transition disabled:opacity-50"
          >
            {loading ? '처리 중...' : '⬇️ 백업 파일 다운로드'}
          </button>
        </div>

        {/* 복원 카드 */}
        <div className="bg-white rounded-2xl shadow p-6 mb-4">
          <h2 className="text-lg font-bold text-amber-900 mb-1">🔄 데이터 복원</h2>
          <p className="text-sm text-gray-500 mb-1">
            백업 JSON 파일을 선택하면 현재 데이터를{' '}
            <span className="text-red-500 font-medium">모두 지우고</span> 복원합니다.
          </p>
          <p className="text-xs text-red-400 mb-4">⚠️ 복원 전 반드시 백업을 먼저 받아두세요!</p>

          <label className="block w-full border-2 border-dashed border-amber-200 rounded-xl p-4 text-center cursor-pointer hover:border-amber-400 transition mb-4">
            <span className="text-amber-600 text-sm">📂 백업 파일 선택 (.json)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {/* 파일 미리보기 + 복원 버튼 */}
          {restorePreview && (
            <div className="bg-amber-50 rounded-xl p-4 mb-2">
              <p className="text-sm font-medium text-amber-900 mb-2">📋 백업 파일 정보</p>
              <div className="text-sm text-amber-700 space-y-1 mb-4">
                <p>📅 백업 일시: {new Date(restorePreview.exported_at).toLocaleString('ko-KR')}</p>
                <p>👥 인물 수: <span className="font-semibold">{restorePreview.persons.length}명</span></p>
                <p>🔗 관계 수: <span className="font-semibold">{restorePreview.relationships.length}건</span></p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 mb-3">
                현재 DB의 모든 데이터가 삭제되고 이 백업으로 교체됩니다.
              </div>

              <button
                onClick={handleRestore}
                disabled={loading}
                className="w-full bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition disabled:opacity-50"
              >
                {loading ? '복원 중...' : '🔄 복원 실행'}
              </button>
            </div>
          )}
        </div>

        {/* 상태 메시지 */}
        {status && (
          <div className={`rounded-2xl p-4 text-center text-sm font-medium ${
            isError
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {status}
          </div>
        )}

      </div>
    </main>
  );
}
