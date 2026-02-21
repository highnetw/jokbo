'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function EditPerson() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    gender: 'unknown',
    birth_year: '',
    death_year: '',
    photo_year: '',
    phone: '',
    address: '',
    occupation: '',
    notes: '',
  });

  useEffect(() => {
    fetchPerson();
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

    setForm({
      name: data.name || '',
      gender: data.gender || 'unknown',
      birth_year: data.birth_year?.toString() || '',
      death_year: data.death_year?.toString() || '',
      photo_year: data.photo_year?.toString() || '',
      phone: data.phone || '',
      address: data.address || '',
      occupation: data.occupation || '',
      notes: data.notes || '',
    });
    setPhotoPreview(data.photo_url || null);
    setOriginalPhotoUrl(data.photo_url || null);
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('이름은 필수입니다!');
      return;
    }
    setSaving(true);

    let photo_url = originalPhotoUrl;

    // 새 사진으로 교체
    if (photoFile) {
      // 기존 사진 삭제
      if (originalPhotoUrl) {
        const oldFileName = originalPhotoUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('jokbo-photos').remove([oldFileName]);
        }
      }

      // 새 사진 업로드
      const ext = photoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('jokbo-photos')
        .upload(fileName, photoFile);

      if (uploadError) {
        alert('사진 업로드 실패: ' + uploadError.message);
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('jokbo-photos')
        .getPublicUrl(fileName);
      photo_url = urlData.publicUrl;
    }

    // 사진 삭제한 경우
    if (!photoPreview && !photoFile) {
      if (originalPhotoUrl) {
        const oldFileName = originalPhotoUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('jokbo-photos').remove([oldFileName]);
        }
      }
      photo_url = null;
    }

    // 인물 업데이트
    const { error } = await supabase.from('jokbo_persons').update({
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
    }).eq('id', id);

    if (error) {
      alert('저장 실패: ' + error.message);
    } else {
      router.push(`/person/${id}`);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center">
        <p className="text-amber-700 text-lg">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-lg mx-auto">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <Link href={`/person/${id}`}>
            <button className="text-amber-700 hover:text-amber-900">← 뒤로</button>
          </Link>
          <h1 className="text-2xl font-bold text-amber-900">인물 수정</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow space-y-4">

          {/* 사진 */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center border-2 border-amber-300">
              {photoPreview ? (
                <img src={photoPreview} alt="미리보기" className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">👤</span>
              )}
            </div>
            <div className="flex gap-2">
              <label className="cursor-pointer bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-200 transition">
                사진 변경
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="bg-red-100 text-red-500 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-200 transition"
                >
                  사진 삭제
                </button>
              )}
            </div>
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

          {/* 성별 */}
          <div>
            <label className="text-sm font-medium text-amber-800">성별</label>
            <select
              name="gender" value={form.gender} onChange={handleChange}
              className="w-full border border-amber-200 rounded-xl px-4 py-2.5 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="unknown">미지정</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </div>

          {/* 출생/사망연도 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-amber-800">출생연도</label>
              <input
                name="birth_year" value={form.birth_year} onChange={handleChange}
                placeholder="1950" type="number"
                className="w-full border border-amber-200 rounded-xl px-4 py-2.5 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-amber-800">사망연도</label>
              <input
                name="death_year" value={form.death_year} onChange={handleChange}
                placeholder="(생존 시 비워둠)" type="number"
                className="w-full border border-amber-200 rounded-xl px-4 py-2.5 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* 사진 촬영연도 */}
          <div>
            <label className="text-sm font-medium text-amber-800">사진 촬영연도</label>
            <input
              name="photo_year" value={form.photo_year} onChange={handleChange}
              placeholder="2020" type="number"
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
            disabled={saving}
            className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-amber-700 transition disabled:opacity-50"
          >
            {saving ? '저장 중...' : '수정 완료'}
          </button>
        </form>
      </div>
    </main>
  );
}
