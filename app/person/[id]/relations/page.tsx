'use client';

import { useEffect, useState } from 'react';
import { supabase, fetchAllRows } from '@/lib/supabase';
import { effectiveBirthYear } from '@/lib/treeBuilder';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Person = {
  id: string;
  name: string;
  gender: string;
  birth_year: number | null;
  photo_url: string | null;
};

type RelationType = 'father' | 'mother' | 'husband' | 'wife' | 'son' | 'daughter';

const reverseRelation: Record<RelationType, (myGender: string) => string> = {
  father:   (g) => g === 'female' ? 'daughter' : 'son',
  mother:   (g) => g === 'female' ? 'daughter' : 'son',
  husband:  () => 'wife',
  wife:     () => 'husband',
  son:      (g) => g === 'female' ? 'mother' : 'father',
  daughter: (g) => g === 'female' ? 'mother' : 'father',
};

const relationOptions: { value: RelationType; label: string; emoji: string }[] = [
  { value: 'father',   label: '아버지', emoji: '👨' },
  { value: 'mother',   label: '어머니', emoji: '👩' },
  { value: 'husband',  label: '남편',   emoji: '🤵' },
  { value: 'wife',     label: '아내',   emoji: '👰' },
  { value: 'son',      label: '아들',   emoji: '👦' },
  { value: 'daughter', label: '딸',     emoji: '👧' },
];

export default function RelationsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [currentPerson, setCurrentPerson] = useState<Person | null>(null);
  const [allPersons, setAllPersons] = useState<Person[]>([]);
  const [selectedRelation, setSelectedRelation] = useState<RelationType | null>(null);
  const [search, setSearch] = useState('');

  const [saving, setSaving] = useState(false);
  const [existingRelations, setExistingRelations] = useState<string[]>([]);

  // 확인 모달
  const [confirmTarget, setConfirmTarget] = useState<Person | null>(null);

  useEffect(() => {
    fetchCurrentPerson();
    fetchAllPersons();
    fetchExistingRelations();
  }, [id]);

  const fetchCurrentPerson = async () => {
    const { data } = await supabase
      .from('jokbo_persons')
      .select('id, name, gender, birth_year, photo_url')
      .eq('id', id)
      .single();
    setCurrentPerson(data);
  };

  const fetchAllPersons = async () => {
    const data = await fetchAllRows<Person>(
      'jokbo_persons',
      'id, name, gender, birth_year, photo_url'
    );
    const others = data.filter(p => p.id !== id);
    others.sort((a, b) => effectiveBirthYear(a.birth_year) - effectiveBirthYear(b.birth_year));
    setAllPersons(others);
  };

  const fetchExistingRelations = async () => {
    const { data } = await supabase
      .from('jokbo_relationships')
      .select('related_person_id')
      .eq('person_id', id);
    setExistingRelations((data || []).map((r: { related_person_id: string }) => r.related_person_id));
  };

  const handleConfirm = async () => {
    if (!confirmTarget || !selectedRelation || !currentPerson) return;
    setSaving(true);

    // 내 → 상대 관계 저장
    const { error: e1 } = await supabase.from('jokbo_relationships').insert({
      person_id: id,
      related_person_id: confirmTarget.id,
      relation_type: selectedRelation,
    });

    if (e1) {
      alert('저장 실패: ' + e1.message);
      setSaving(false);
      return;
    }

    // 역관계 자동 저장
    const reverse = reverseRelation[selectedRelation](currentPerson.gender);
    const { error: e2 } = await supabase.from('jokbo_relationships').insert({
      person_id: confirmTarget.id,
      related_person_id: id,
      relation_type: reverse,
    });

    if (e2) {
      console.error('역관계 저장 실패:', e2.message);
    }

    setSaving(false);
    router.push(`/person/${id}`);
  };

  const filteredPersons = allPersons.filter(p =>
    p.name.includes(search) && !existingRelations.includes(p.id)
  );

  const genderEmoji = (gender: string) => {
    if (gender === 'male') return '👴';
    if (gender === 'female') return '👵';
    return '👤';
  };

  const selectedLabel = relationOptions.find(o => o.value === selectedRelation)?.label || '';

  return (
    <main className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-lg mx-auto">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/person/${id}`}>
            <button className="text-amber-700 hover:text-amber-900">← 뒤로</button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">관계 추가</h1>
            {currentPerson && (
              <p className="text-amber-600 text-sm">{currentPerson.name} 님의 가족 관계</p>
            )}
          </div>
        </div>

        {/* Step 1: 관계 유형 선택 */}
        <div className="bg-white rounded-2xl shadow p-5 mb-4">
          <h2 className="font-bold text-amber-900 mb-3">
            1단계 · <span className="text-amber-600">관계</span>를 선택하세요
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {relationOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedRelation(opt.value)}
                className={`flex flex-col items-center p-3 rounded-xl border-2 transition ${
                  selectedRelation === opt.value
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-amber-100 hover:border-amber-300'
                }`}
              >
                <span className="text-2xl mb-1">{opt.emoji}</span>
                <span className="text-xs font-medium text-amber-800">{opt.label}</span>
              </button>
            ))}
          </div>


        </div>

        {/* Step 2: 인물 선택 */}
        {selectedRelation && (
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="font-bold text-amber-900 mb-3">
              2단계 · <span className="text-amber-600">{selectedLabel}</span>이(가) 누구인가요?
            </h2>

            <input
              type="text"
              placeholder="이름으로 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-amber-200 rounded-xl px-4 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            {filteredPersons.length === 0 ? (
              <p className="text-center text-amber-400 text-sm py-4">
                {allPersons.length === 0 ? '등록된 다른 인물이 없습니다' : '검색 결과 없음'}
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPersons.map(person => (
                  <button
                    key={person.id}
                    onClick={() => setConfirmTarget(person)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-amber-50 transition text-left border border-transparent hover:border-amber-200"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center flex-shrink-0">
                      {person.photo_url ? (
                        <img src={person.photo_url} alt={person.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">{genderEmoji(person.gender)}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-amber-900">{person.name}</p>
                      <p className="text-xs text-amber-500">
                        {person.gender === 'male' ? '남성' : person.gender === 'female' ? '여성' : ''}
                        {person.birth_year && ` · ${person.birth_year}년생`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 확인 모달 */}
      {confirmTarget && selectedRelation && currentPerson && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">관계를 저장할까요?</h3>

            <div className="bg-amber-50 rounded-xl p-4 mb-4 text-center">
              <p className="text-amber-900 font-medium text-lg">{currentPerson.name}</p>
              <p className="text-amber-500 text-sm my-1">의 {selectedLabel}</p>
              <p className="text-amber-900 font-medium text-lg">{confirmTarget.name}</p>

            </div>

            <p className="text-gray-400 text-xs text-center mb-4">
              역관계도 자동으로 저장됩니다
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmTarget(null)}
                className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl font-medium hover:bg-amber-700 transition disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
