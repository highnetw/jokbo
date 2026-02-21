import { Handle, Position } from '@xyflow/react';

type NodeData = {
  id: string;
  name: string;
  gender: string;
  birth_year: number | null;
  death_year: number | null;
  photo_url: string | null;
  isCenter?: boolean;
};

export function PersonNode({ data }: { data: NodeData }) {
  const isMale = data.gender === 'male';
  const isFemale = data.gender === 'female';
  const bgColor = isMale ? '#dbeafe' : isFemale ? '#fce7f3' : '#f3f4f6';
  const borderColor = data.isCenter
    ? '#d97706'
    : isMale ? '#3b82f6' : isFemale ? '#ec4899' : '#9ca3af';
  const shadow = data.isCenter
    ? '0 0 0 3px #fbbf24, 0 4px 12px rgba(217,119,6,0.4)'
    : '0 2px 6px rgba(0,0,0,0.1)';

  return (
    <div style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Top} style={{ background: borderColor }} />

      <a href={`/person/${data.id}`}>
        <div style={{
          background: bgColor,
          border: `2px solid ${borderColor}`,
          borderRadius: 12,
          padding: '8px 12px',
          minWidth: 110,
          textAlign: 'center',
          cursor: 'pointer',
          boxShadow: shadow,
        }}>
          {data.isCenter && (
            <div style={{ fontSize: 10, color: '#d97706', fontWeight: 'bold', marginBottom: 2 }}>⭐ 중심 인물</div>
          )}
          {data.photo_url ? (
            <img
              src={data.photo_url}
              alt={data.name}
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 4px' }}
            />
          ) : (
            <div style={{ fontSize: 24, marginBottom: 2 }}>
              {isMale ? '👨' : isFemale ? '👩' : '👤'}
            </div>
          )}
          <div style={{ fontWeight: 'bold', fontSize: 13, color: '#1f2937' }}>{data.name}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            {data.birth_year && data.death_year
              ? `${data.birth_year}~${data.death_year}`
              : data.birth_year
              ? `${data.birth_year}년생`
              : ''}
          </div>
        </div>
      </a>

      <Handle type="source" position={Position.Bottom} style={{ background: borderColor }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: '#f59e0b' }} />
      <Handle type="target" position={Position.Left} id="left" style={{ background: '#f59e0b' }} />
    </div>
  );
}

// ⚠️ 반드시 모듈 최상위에 정의 (컴포넌트 함수 밖)
export const nodeTypes = { person: PersonNode };
