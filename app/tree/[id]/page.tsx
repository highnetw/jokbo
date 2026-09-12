'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchAllRows } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PersonNode, nodeTypes } from '@/components/PersonNode';
import { buildTreeData, PersonRow, RelRow } from '@/lib/treeBuilder';

export default function CenterTreePage() {
  const params = useParams();
  const centerId = params.id as string;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [centerName, setCenterName] = useState('');

  const build = useCallback(async () => {
    const persons = await fetchAllRows<PersonRow>(
      'jokbo_persons',
      'id, name, gender, birth_year, death_year, photo_url, family_tree_ids'
    );
    const rels = await fetchAllRows<RelRow>(
      'jokbo_relationships',
      'person_id, related_person_id, relation_type'
    );

    if (persons.length === 0 || rels.length === 0) { setLoading(false); return; }

    const center = persons.find(p => p.id === centerId);
    if (center) setCenterName(center.name);

    const { nodes: n, edges: e } = buildTreeData(persons, rels, centerId);
    setNodes(n);
    setEdges(e);
    setLoading(false);
  }, [centerId, setNodes, setEdges]);

  useEffect(() => { build(); }, [build]);

  return (
    <main className="w-screen h-screen bg-amber-50 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 bg-white shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link href={`/person/${centerId}`}>
            <button className="text-amber-700 hover:text-amber-900 font-medium">← 인물로</button>
          </Link>
          <Link href="/tree">
            <button className="text-amber-500 hover:text-amber-700 text-sm">계보도</button>
          </Link>
        </div>
        <h1 className="text-xl font-bold text-amber-900">
          🌳 {centerName} 계보도
        </h1>
        {/* {<div className="flex items-center gap-4 text-xs text-gray-500">
          <span><span style={{ color: '#3b82f6' }}>■</span> 남성</span>
          <span><span style={{ color: '#ec4899' }}>■</span> 여성</span>
          <span><span style={{ color: '#f59e0b' }}>- -</span> 부부</span>
          <span><span style={{ color: '#92400e' }}>→</span> 부모-자녀</span>
        </div>} */}
      </div>

      {/* 중심 인물 안내 배너 */}
      <div className="bg-amber-100 border-b border-amber-200 px-6 py-2 text-center text-sm text-amber-700">
        <span className="font-semibold">{centerName}</span> 위아래로 3세대 </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-amber-700 text-lg">계보도 그리는 중...</p>
        </div>
      ) : (
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            nodesDraggable={false}   // 👈 이것만 추가
          >
            <Background color="#fde68a" gap={20} />
            <Controls />
            <MiniMap
              nodeColor={n => {
                const g = (n.data as { gender: string }).gender;
                return g === 'male' ? '#93c5fd' : g === 'female' ? '#f9a8d4' : '#d1d5db';
              }}
              style={{ background: '#fffbeb' }}
            />
          </ReactFlow>
        </div>
      )}
    </main>
  );
}
