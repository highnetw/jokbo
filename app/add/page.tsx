'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const FAMILY_TREES = [
  { id: 'woo_family',  label: '우정형 패밀리' },
  { id: 'kim_family',  label: '김억조 패밀리' },
  { id: 'min_family',  label: '민천금 부친 패밀리' },
  { id: 'kwon_family', label: '권두오 부친 패밀리' },
];

export default function AddPerson() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [familyTreeIds, setFamilyTreeIds] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: '',
    gender: 'male',
    birth_year: '',
    death_year: '',
    photo_year: '',
    phone: '',
    address: '',
    occupation: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFamilyTree = (id: string) => {
    setFamilyTreeIds(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('이름은 필수입니다!');
      return;
    }
    setLoading(true);

    let photo_url = null;

    if (photoFile) {
      const ext = photoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('jokbo-photos')
        .upload(fileName, photoFile);

      if (uploadError) {
        alert('사진 업로드 실패: ' + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('jokbo-photos')
        .getPublicUrl(fileName);
      photo_url = urlData.publicUrl;
    }

    const { error } = await supabase.from('jokbo_persons').insert([{
      name: form.name.trim(),
      gender: form.gender,
      birth_year: form.birth_year ? parseInt(form.birth_year) : null,
      death_year: form.death_year ? parseInt(form.death_year) : null,
      photo_url,
      photo_year: form.photo_year ? parseInt(form.photo_year) : null,
      phone: form.phone || null,
      address: form.address || null,
      occupation: form.occupation || null,
      notes: form.notes || null,
      family_tree_ids: familyTreeIds.length > 0 ? familyTreeIds : null,
    }]);

    if (error) {
      alert('저장 실패: ' + error.message);
    } else {
      alert('저장 완료!');
      router.push('/');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/">
            <button className="text-amber-700 hover:text-amber-900">← 뒤로</button>
          </Link>
          <h1 className="text-2xl font-bold text-amber-900">인물 추가</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow space-y-4">

          {/* 사진 업로드 */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center border-2 border-amber-300">
              {photoPreview ? (
                <img src={photoPreview} alt="미리보기" className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">👤</span>
              )}
            </div>
            <label className="cursor-pointer bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-200 transition">
              사진 선택
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          </div>

          {/* 이름 */}
          <div>
            <label className="text-sm font-medium text-amber-800">이름 *</label>
            <input
              name="name" value={form.name} onChange={handleChange}
              placeholder="홍길동"
              className="w-full border border-amber-200 rounded-xl px-4 py-2.5 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 성별 - 라디오 버튼 */}
          <div>
            <label className="text-sm font-medium text-amber-800">성별</label>
            <div className="flex gap-3 mt-2">
              {[
                { value: 'male',    label: '👨 남성' },
                { value: 'female',  label: '👩 여성' },
                { value: 'unknown', label: '❓ 미지정' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`flex-1 text-center py-2.5 rounded-xl border-2 cursor-pointer font-medium text-sm transition
                    ${form.gender === opt.value
                      ? 'border-amber-500 bg-amber-100 text-amber-800'
                      : 'border-amber-200 bg-white text-gray-500 hover:border-amber-300'}`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={opt.value}
                    checked={form.gender === opt.value}
                    onChange={handleChange}
                    className="hidden"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* 패밀리 - 체크박스 */}
          <div>
            <label className="text-sm font-medium text-amber-800">패밀리</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {FAMILY_TREES.map(f => (
                <label
                  key={f.id}
                  className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border-2 cursor-pointer text-sm font-medium transition
                    ${familyTreeIds.includes(f.id)
                      ? 'border-amber-500 bg-amber-100 text-amber-800'
                      : 'border-amber-200 bg-white text-gray-500 hover:border-amber-300'}`}
                >
                  <input
                    type="checkbox"
                    checked={familyTreeIds.includes(f.id)}
                    onChange={() => handleFamilyTree(f.id)}
                    className="hidden"
                  />
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                    ${familyTreeIds.includes(f.id) ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}`}>
                    {familyTreeIds.includes(f.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {f.label}
                </label>
              ))}
            </div>
          </div>

          {/* 출생/사망연도 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-amber-800">출생연도</label>
              <input
                name="birth_year" value={form.birth_year} onChange={handleChange}
                placeholder="1950"
                type="number"
                className="w-full border border-amber-200 rounded-xl px-4 py-2.5 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-amber-800">사망연도</label>
              <input
                name="death_year" value={form.death_year} onChange={handleChange}
                placeholder="(생존 시 비워둠)"
                type="number"
                className="w-full border border-amber-200 rounded-xl px-4 py-2.5 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* 사진 촬영연도 */}
          <div>
            <label className="text-sm font-medium text-amber-800">사진 촬영연도</label>
            <input
              name="photo_year" value={form.photo_year} onChange={handleChange}
              placeholder="2020"
              type="number"
              className="w-full border border-amber-200 rounded-xl px-4 py-2.5 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 연락처 */}
          <div>
            <label className="text-sm font-medium text-amber-800">연락처</label>
            <input
              name="phone" value={form.phone} onChange={handleChange}
              placeholder="010-0000-0000"
              className="w-full border border-amber-200 rounded-xl px-4 py-2.5 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 주소 */}
          <div>
            <label className="text-sm font-medium text-amber-800">주소</label>
            <input
              name="address" value={form.address} onChange={handleChange}
              placeholder="서울시 강남구..."
              className="w-full border border-amber-200 rounded-xl px-4 py-2.5 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 직업 */}
          <div>
            <label className="text-sm font-medium text-amber-800">대표 직업</label>
            <input
              name="occupation" value={form.occupation} onChange={handleChange}
              placeholder="교사, 의사, 농업..."
              className="w-full border border-amber-200 rounded-xl px-4 py-2.5 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* 특기사항 */}
          <div>
            <label className="text-sm font-medium text-amber-800">특기사항</label>
            <textarea
              name="notes" value={form.notes} onChange={handleChange}
              placeholder="메모..."
              rows={3}
              className="w-full border border-amber-200 rounded-xl px-4 py-2.5 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          {/* 저장 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-amber-700 transition disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장하기'}
          </button>
        </form>
      </div>
    </main>
  );
}
