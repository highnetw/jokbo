'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isKnownYear } from '@/lib/treeBuilder';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Person = {
  id: string;
  name: string;
  gender: string;
  birth_year: number | null;
  death_year: number | null;
  photo_url: string | null;
  photo_year: number | null;
  phone: string | null;
  address: string | null;
  occupation: string | null;
  notes: string | null;
  created_at: string;
};

type Relationship = {
  id: string;
  person_id: string;
  related_person_id: string;
  relation_type: string;
  marriage_year: number | null;
  related_person: {
    id: string;
    name: string;
    gender: string;
    photo_url: string | null;
  };
};

const relationLabel: Record<string, string> = {
  father:   '아버지',
  mother:   '어머니',
  husband:  '남편',
  wife:     '아내',
  son:      '아들',
  daughter: '딸',
};

export default function PersonDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [person, setPerson] = useState<Person | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRelTarget, setDeleteRelTarget] = useState<Relationship | null>(null);
  const [deletingRel, setDeletingRel] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchPerson();
    fetchRelationships();
  }, [id]);

  const fetchPerson = async () => {
    const { data, error } = await supabase
      .from('jokbo_persons')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      router.push('/');
      return;
    }
    setPerson(data);
    setLoading(false);
  };

  const fetchRelationships = async () => {
    const { data, error } = await supabase
      .from('jokbo_relationships')
      .select(`
        id,
        person_id,
        related_person_id,
        relation_type,
        marriage_year,
        related_person:jokbo_persons!related_person_id (
          id, name, gender, photo_url
        )
      `)
      .eq('person_id', id);

    if (error) {
      console.error('관계 조회 오류:', error.message);
    }
    setRelationships((data as unknown as Relationship[]) || []);
  };

  const handleDeleteRelation = async () => {
    if (!deleteRelTarget) return;
    setDeletingRel(true);

    // 양방향 삭제
    await supabase.from('jokbo_relationships')
      .delete()
      .eq('person_id', id)
      .eq('related_person_id', deleteRelTarget.related_person.id);

    await supabase.from('jokbo_relationships')
      .delete()
      .eq('person_id', deleteRelTarget.related_person.id)
      .eq('related_person_id', id);

    setDeletingRel(false);
    setDeleteRelTarget(null);
    fetchRelationships();
  };

  const handleDelete = async () => {
    setDeleteError('');

    const { data: settings } = await supabase
      .from('jokbo_settings')
      .select('value')
      .eq('key', 'delete_password')
      .single();

    const correctPassword = settings?.value || '1103';

    if (deletePassword !== correctPassword) {
      setDeleteError('비밀번호가 틀렸습니다.');
      return;
    }

    if (person?.photo_url) {
      const fileName = person.photo_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from('jokbo-photos').remove([fileName]);
      }
    }

    await supabase.from('jokbo_relationships').delete().eq('person_id', id);
    await supabase.from('jokbo_relationships').delete().eq('related_person_id', id);

    const { error } = await supabase.from('jokbo_persons').delete().eq('id', id);

    if (error) {
      setDeleteError('삭제 실패: ' + error.message);
      return;
    }

    router.push('/');
  };

  const genderEmoji = (gender: string) => {
    if (gender === 'male') return '👴';
    if (gender === 'female') return '👵';
    return '👤';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center">
        <p className="text-amber-700 text-lg">불러오는 중...</p>
      </main>
    );
  }

  if (!person) return null;

  const isDeceased = person.death_year != null;

  return (
    <main className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-lg mx-auto">

{/* 헤더 */}
<div className="flex flex-col gap-2 mb-6">
  {/* 1줄: 목록으로 + 중심계보도 */}
  <div className="flex items-center gap-2">
    <Link href="/">
      <button className="text-amber-700 hover:text-amber-900 font-medium">← 목록으로</button>
    </Link>
    <Link href={`/tree/${id}`}>
      <button className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-200 transition">
        🌳 중심 계보도
      </button>
    </Link>
  </div>
  {/* 2줄: 수정 + 삭제 오른쪽 정렬 */}
  <div className="flex gap-2 justify-end">
    <Link href={`/person/${id}/edit`}>
      <button className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-200 transition">
        ✏️ 수정
      </button>
    </Link>
    <button
      onClick={() => setShowDeleteModal(true)}
      className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-200 transition"
    >
      🗑️ 삭제
    </button>
  </div>
</div>

        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl shadow p-6 mb-4">
          <div className="flex flex-col items-center mb-6">
            <div className="w-36 h-36 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center border-4 border-amber-200 mb-3">
              {person.photo_url ? (
                <img src={person.photo_url} alt={person.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl">{genderEmoji(person.gender)}</span>
              )}
            </div>
            {person.photo_year && (
              <p className="text-xs text-amber-400">{person.photo_year}년 사진</p>
            )}
          </div>

          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-amber-900 mb-1">{person.name}</h1>
            <div className="flex items-center justify-center gap-2 text-amber-600">
              {person.gender !== 'unknown' && (
                <span className="text-sm">{person.gender === 'male' ? '남성' : '여성'}</span>
              )}
              {isKnownYear(person.birth_year) && (
                <span className="text-sm">
                  {isDeceased
                    ? isKnownYear(person.death_year)
                      ? `${person.birth_year} ~ ${person.death_year}년 (향년 ${person.death_year - person.birth_year}세)`
                      : `${person.birth_year} ~ ? (졸년 미상)`
                    : `${person.birth_year}년생`}
                </span>
              )}
            </div>
            {isDeceased && (
              <span className="inline-block mt-2 bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                故 (작고)
              </span>
            )}
          </div>

          <div className="space-y-3 border-t border-amber-100 pt-4">
            {person.occupation && <InfoRow icon="💼" label="직업" value={person.occupation} />}
            {person.phone && <InfoRow icon="📞" label="연락처" value={person.phone} />}
            {person.address && <InfoRow icon="📍" label="주소" value={person.address} />}
            {person.notes && <InfoRow icon="📝" label="메모" value={person.notes} />}
            {!person.occupation && !person.phone && !person.address && !person.notes && (
              <p className="text-center text-amber-400 text-sm py-2">추가 정보 없음</p>
            )}
          </div>
        </div>

        {/* 가족 관계 */}
        <div className="bg-white rounded-2xl shadow p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-amber-900">👨‍👩‍👧 가족 관계</h2>
            <Link href={`/person/${id}/relations`}>
              <button className="text-sm bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl hover:bg-amber-200 transition">
                + 관계 추가
              </button>
            </Link>
          </div>

          {relationships.length === 0 ? (
            <p className="text-center text-amber-400 text-sm py-2">등록된 가족 관계 없음</p>
          ) : (
            <div className="space-y-2">
              {relationships.map(rel => (
                <div key={rel.id} className="flex items-center gap-2">
                  <Link href={`/person/${rel.related_person.id}`} className="flex-1">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-amber-50 transition cursor-pointer">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center flex-shrink-0">
                        {rel.related_person.photo_url ? (
                          <img src={rel.related_person.photo_url} alt={rel.related_person.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{genderEmoji(rel.related_person.gender)}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-amber-900">{rel.related_person.name}</p>
                        <p className="text-xs text-amber-500">
                          {relationLabel[rel.relation_type] || rel.relation_type}
                          {rel.marriage_year && ` · ${rel.marriage_year}년 결혼`}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => setDeleteRelTarget(rel)}
                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition flex-shrink-0"
                    title="관계 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 관계 삭제 확인 모달 */}
      {deleteRelTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">관계를 삭제할까요?</h3>
            <div className="bg-red-50 rounded-xl p-4 mb-4 text-center">
              <p className="text-amber-900 font-medium">{person?.name}</p>
              <p className="text-red-400 text-sm my-1">↕ {relationLabel[deleteRelTarget.relation_type]} 관계</p>
              <p className="text-amber-900 font-medium">{deleteRelTarget.related_person.name}</p>
            </div>
            <p className="text-gray-400 text-xs text-center mb-4">양방향 관계가 모두 삭제됩니다</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteRelTarget(null)}
                className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                취소
              </button>
              <button
                onClick={handleDeleteRelation}
                disabled={deletingRel}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition disabled:opacity-50"
              >
                {deletingRel ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">정말 삭제할까요?</h3>
            <p className="text-gray-500 text-sm mb-4">
              <span className="font-medium text-amber-900">{person.name}</span> 님의 정보가 영구 삭제됩니다.
            </p>
            <input
              type="password"
              placeholder="삭제 비밀번호"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDelete()}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-2 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            {deleteError && (
              <p className="text-red-500 text-sm mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteError(''); }}
                className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-amber-500 font-medium">{label}</p>
        <p className="text-amber-900">{value}</p>
      </div>
    </div>
  );
}
