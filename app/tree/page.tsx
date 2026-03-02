'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from '@/components/PersonNode';
import { buildTreeData, PersonRow, RelRow } from '@/lib/treeBuilder';

const FAMILY_TABS = [
  { id: 'all', label: '전체' },
  { id: 'woo_family', label: '🌳우정형' },
  { id: 'kim_family', label: '🌳김억조' },
  { id: 'min_family', label: '🌳민천금' },
  { id: 'kwon_family', label: '🌳권두오' },
];

function TreeInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFamily, setSelectedFamily] = useState('all');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string, name: string }[]>([]);
  const { fitView } = useReactFlow();
  const [dropdownTop, setDropdownTop] = useState(100);
  const searchRef = React.useRef<HTMLDivElement>(null);

  const [allPersons, setAllPersons] = useState<PersonRow[]>([]);
  const [allRels, setAllRels] = useState<RelRow[]>([]);

  // 최초 1회 DB에서 전체 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      const { data: persons } = await supabase
        .from('jokbo_persons')
        .select('id, name, gender, birth_year, death_year, photo_url, family_tree_ids');

      // fetchData 함수 안에서 persons 받은 직후에 추가
      console.log('persons sample:', persons?.slice(0, 3));

      // 1000개 제한 우회: 페이지네이션으로 전체 로드
      let allRelsData: RelRow[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: relsPage } = await supabase
          .from('jokbo_relationships')
          .select('person_id, related_person_id, relation_type')
          .range(from, from + pageSize - 1);
        if (!relsPage || relsPage.length === 0) break;
        allRelsData = [...allRelsData, ...relsPage];
        if (relsPage.length < pageSize) break;
        from += pageSize;
      }

      if (persons && allRelsData.length > 0) {
        setAllPersons(persons as PersonRow[]);
        setAllRels(allRelsData as RelRow[]);
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

  useEffect(() => {
    buildTree();
    setTimeout(() => fitView({ padding: 0.2, duration: 600 }), 100);
  }, [buildTree]);

  const selectedTab = FAMILY_TABS.find(t => t.id === selectedFamily);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (!value.trim()) { setSearchResults([]); return; }
    // 검색창 실제 bottom 위치 측정
    if (searchRef.current) {
      const rect = searchRef.current.getBoundingClientRect();
      setDropdownTop(rect.bottom + 6);
    }
    const limit = value.length === 1 ? 40 : 20;
    const results = allPersons.filter(p => p.name.includes(value)).sort((a, b) => a.name.localeCompare(b.name, 'ko')).slice(0, limit);
    setSearchResults(results);
  };

  const handleSelectPerson = (personId: string) => {
    setSearch('');
    setSearchResults([]);
    fitView({ nodes: [{ id: personId }], duration: 800, padding: 0.5 });
    // 하이라이트
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, isHighlighted: n.id === personId },
    })));
    setTimeout(() => {
      setNodes(nds => nds.map(n => ({
        ...n,
        data: { ...n.data, isHighlighted: false },
      })));
    }, 3000);
  };

  return (
    <main className="w-screen h-screen bg-amber-50 flex flex-col">

      {/* 헤더 */}
      <div className="flex items-center px-6 py-3 bg-white shadow-sm z-10">
        {/* 왼쪽 */}
        <div className="flex-1">
          <Link href="/">
            <button className="text-amber-700 hover:text-amber-900 font-medium whitespace-nowrap">
              ← 인물로
            </button>
          </Link>
        </div>

        {/* 가운데 제목 */}
        <h1 className="text-xl font-bold text-amber-900 whitespace-nowrap">
          {selectedFamily === 'all' ? '계보도 (전체)' : `${selectedTab?.label} 계보도`}
        </h1>

        {/* 오른쪽 균형용 */}
        <div className="flex-1" />
      </div>

      {/* 패밀리 탭 */}
      <div className="flex gap-2 px-6 py-2 bg-white border-b border-amber-100 z-10 overflow-x-auto">
        {FAMILY_TABS.map(tab => {
          const count = tab.id === 'all'
            ? allPersons.length
            : allPersons.filter(p => p.family_tree_ids?.includes(tab.id)).length;

          return (
            <button
              key={tab.id}
              onClick={() => setSelectedFamily(tab.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition
          ${selectedFamily === tab.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
            >
              {tab.label} {count > 0 ? `(${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* 검색창 - 탭바 아래 우측 정렬 */}
      <div className="flex justify-end px-6 py-2 bg-white border-b border-amber-100 z-10 relative" ref={searchRef}>
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="이름 검색..."
          className="border border-amber-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-48"
        />
        {searchResults.length > 0 && (
          <div className="absolute right-6 top-full mt-1 bg-white rounded-xl shadow-lg border border-amber-100 z-50 w-48 max-h-72 overflow-y-auto">
            {searchResults.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectPerson(p.id)}
                className="w-full text-left px-4 py-2 text-sm text-amber-900 hover:bg-amber-50 first:rounded-t-xl last:rounded-b-xl"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
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

export default function TreePage() {
  return (
    <ReactFlowProvider>
      <TreeInner />
    </ReactFlowProvider>
  );
}
