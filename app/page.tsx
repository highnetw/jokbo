'use client';

import { useEffect, useState } from 'react';
import { fetchAllRows } from '@/lib/supabase';
import { effectiveBirthYear, isKnownYear } from '@/lib/treeBuilder';
import Link from 'next/link';

type Person = {
  id: string;
  name: string;
  gender: string;
  birth_year: number | null;
  death_year: number | null;
  photo_url: string | null;
  occupation: string | null;
};

export default function Home() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    const data = await fetchAllRows<Person>(
      'jokbo_persons',
      'id, name, gender, birth_year, death_year, photo_url, occupation'
    );
    data.sort((a, b) => effectiveBirthYear(a.birth_year) - effectiveBirthYear(b.birth_year));
    setPersons(data);
    setLoading(false);
  };

  const filtered = persons.filter(p => p.name.includes(search));

  return (
    <main className="min-h-screen bg-amber-50 p-6">
     <div className="max-w-4xl mx-auto">
  {/* 제목 */}
  <h1 className="text-2xl font-bold text-amber-900 text-center mb-1">FAMILY</h1>
  <p className="text-amber-700 text-center mb-6">총 {persons.length}명</p>

  {/* 버튼 행 */}
  <div className="flex justify-between mb-8">
    <Link href="/tree">
      <button className="bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-700 transition">
        🌳 가계도 열기
      </button>
    </Link>
    <div className="flex gap-2">
      <Link href="/add">
        <button className="bg-amber-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-amber-700 transition">
          인물 추가하기
        </button>
      </Link>
      <Link href="/admin">
        <button className="bg-gray-200 text-gray-600 px-2 py-1.5 rounded-xl font-medium hover:bg-gray-300 transition text-sm">
          ⚙️
        </button>
      </Link>
    </div>
  </div>
        {/* 검색 */}
        <input
          type="text"
          placeholder="이름으로 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-amber-300 rounded-xl px-4 py-3 mb-6 text-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        />

        {/* 인물 목록 */}
        {loading ? (
          <p className="text-center text-amber-700">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-amber-700">등록된 인물이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(person => (
              <Link href={`/person/${person.id}`} key={person.id}>
                <div className="bg-white rounded-2xl p-4 shadow hover:shadow-md transition cursor-pointer border border-amber-100">
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-amber-100 mb-3 flex items-center justify-center">
                    {person.photo_url ? (
                      <img src={person.photo_url} alt={person.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">
                        {person.gender === 'male' ? '👴' : person.gender === 'female' ? '👵' : '👤'}
                      </span>
                    )}
                  </div>
                  <h2 className="font-bold text-amber-900 text-center text-lg">{person.name}</h2>
                  <p className="text-amber-600 text-center text-sm">
                    {isKnownYear(person.birth_year) && `${person.birth_year}년생`}
                    {person.death_year != null && ` ~ ${isKnownYear(person.death_year) ? person.death_year : '?'}`}
                  </p>
                  {person.occupation && (
                    <p className="text-amber-500 text-center text-xs mt-1">{person.occupation}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
