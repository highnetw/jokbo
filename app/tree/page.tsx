'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
import { nodeTypes } from '@/components/PersonNode';
import { buildTreeData, PersonRow, RelRow } from '@/lib/treeBuilder';

const FAMILY_TABS = [
  { id: 'all', label: '전체' },
  { id: 'woo_family', label: '🌳 우정형' },
  { id: 'kim_family', label: '🌳 김억조' },
  { id: 'min_family', label: '🌳 민천금 부친' },
  { id: 'kwon_family', label: '🌳 권두오 부친' },
];

export default function TreePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFamily, setSelectedFamily] = useState('all');

  const [allPersons, setAllPersons] = useState<PersonRow[]>([]);
  const [allRels, setAllRels] = useState<RelRow[]>([]);

  // 최초 1회 DB에서 전체 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      const { data: persons } = await supabase
        .from('jokbo_persons')
        .select('id, name, gender, birth_year, death_year, photo_url, family_tree_ids');
      const { data: rels } = await supabase
        .from('jokbo_relationships')
        .select('person_id, related_person_id, relation_type');

      if (persons && rels) {
        setAllPersons(persons as PersonRow[]);
        setAllRels(rels as RelRow[]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // 탭 변경 시 필터링해서 트리 재빌드
  const buildTree = useCallback(() => {
    if (allPersons.length === 0) return;

    const filteredPersons = selectedFamily === 'all'
      ? allPersons
      : allPersons.filter(p =>
        (p as any).family_tree_ids?.includes(selectedFamily)
      );

    const filteredIds = new Set(filteredPersons.map(p => p.id));
    const filteredRels = allRels.filter(r =>
      filteredIds.has(r.person_id) && filteredIds.has(r.related_person_id)
    );

    const { nodes: n, edges: e } = buildTreeData(filteredPersons, filteredRels);
    setNodes(n);
    setEdges(e);
  }, [allPersons, allRels, selectedFamily, setNodes, setEdges]);

  useEffect(() => { buildTree(); }, [buildTree]);

  const selectedTab = FAMILY_TABS.find(t => t.id === selectedFamily);

  return (
    <main className="w-screen h-screen bg-amber-50 flex flex-col">

      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-3 bg-white shadow-sm z-10">
        <Link href="/">
          <button className="text-amber-700 hover:text-amber-900 font-medium">← 인물로</button>
        </Link>
        <h1 className="text-xl font-bold text-amber-900">
          🌳 {selectedFamily === 'all' ? ' 계보도 (전체)' : `${selectedTab?.label} 계보도`}
        </h1>
        {/* {<div className="flex items-center gap-4 text-xs text-gray-500">
          <span><span style={{ color: '#3b82f6' }}>■</span> 남성</span>
          <span><span style={{ color: '#ec4899' }}>■</span> 여성</span>
          <span><span style={{ color: '#f59e0b' }}>- -</span> 부부</span>
          <span><span style={{ color: '#92400e' }}>→</span> 부모-자녀</span>
        </div>} */}
      </div>

      {/* 패밀리 탭 */}
      <div className="flex gap-2 px-6 py-2 bg-white border-b border-amber-100 z-10 overflow-x-auto">
        {FAMILY_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedFamily(tab.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition
              ${selectedFamily === tab.id
                ? 'bg-amber-600 text-white'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
