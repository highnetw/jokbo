import { Node, Edge, MarkerType } from '@xyflow/react';

export type PersonRow = {
  id: string;
  name: string;
  gender: string;
  birth_year: number | null;
  death_year: number | null;
  photo_url: string | null;
};

export type RelRow = {
  person_id: string;
  related_person_id: string;
  relation_type: string;
};

const NODE_W = 130;
const NODE_H = 110;
const H_GAP = 40;
const V_GAP = 120;

export function buildTreeData(
  persons: PersonRow[],
  rels: RelRow[],
  centerPersonId?: string  // 지정하면 이 사람 중심으로만 필터
): { nodes: Node[]; edges: Edge[] } {

  // ── 중심 인물 기준 필터링 ──────────────────────────────
  let filteredPersons = persons;
  let filteredRels = rels;

  if (centerPersonId) {
    const includeIds = new Set<string>();

    // 관계 맵 (전체 기준으로 먼저 구성)
    const coupleMapFull = new Map<string, string>();
    const childrenOfFull = new Map<string, Set<string>>();
    const parentsOfFull = new Map<string, Set<string>>();

    rels.forEach(r => {
      if (r.relation_type === 'husband' || r.relation_type === 'wife') {
        coupleMapFull.set(r.person_id, r.related_person_id);
        coupleMapFull.set(r.related_person_id, r.person_id);
      }
      if (r.relation_type === 'son' || r.relation_type === 'daughter') {
        if (!childrenOfFull.has(r.person_id)) childrenOfFull.set(r.person_id, new Set());
        childrenOfFull.get(r.person_id)!.add(r.related_person_id);
        if (!parentsOfFull.has(r.related_person_id)) parentsOfFull.set(r.related_person_id, new Set());
        parentsOfFull.get(r.related_person_id)!.add(r.person_id);
      }
    });

    // 위로: 부모 → 조부모 → 증조부모 (최대 3세대 위)
    const addAncestors = (id: string, depth: number) => {
      includeIds.add(id);
      // 배우자도 포함
      const spouse = coupleMapFull.get(id);
      if (spouse) includeIds.add(spouse);
      if (depth <= 0) return;
      (parentsOfFull.get(id) || new Set()).forEach(parentId => {
        addAncestors(parentId, depth - 1);
      });
    };

    // 아래로: 자녀 → 손자 → 증손자 (최대 3세대 아래)
    const addDescendants = (id: string, depth: number) => {
      includeIds.add(id);
      const spouse = coupleMapFull.get(id);
      if (spouse) includeIds.add(spouse);
      if (depth <= 0) return;
      (childrenOfFull.get(id) || new Set()).forEach(childId => {
        addDescendants(childId, depth - 1);
      });
    };

    addAncestors(centerPersonId, 3);
    addDescendants(centerPersonId, 3);

    filteredPersons = persons.filter(p => includeIds.has(p.id));
    filteredRels = rels.filter(r =>
      includeIds.has(r.person_id) && includeIds.has(r.related_person_id)
    );
  }

  // ── 이하 기존 buildTree 로직 (filteredPersons/rels 사용) ──

  const coupleMap = new Map<string, string>();
  const couples = new Set<string>();
  filteredRels.forEach(r => {
    if (r.relation_type === 'husband' || r.relation_type === 'wife') {
      const key = [r.person_id, r.related_person_id].sort().join('|');
      couples.add(key);
      coupleMap.set(r.person_id, r.related_person_id);
      coupleMap.set(r.related_person_id, r.person_id);
    }
  });

  const childrenOf = new Map<string, Set<string>>();
  const parentsOf = new Map<string, Set<string>>();
  filteredRels.forEach(r => {
    if (r.relation_type === 'son' || r.relation_type === 'daughter') {
      if (!childrenOf.has(r.person_id)) childrenOf.set(r.person_id, new Set());
      childrenOf.get(r.person_id)!.add(r.related_person_id);
      if (!parentsOf.has(r.related_person_id)) parentsOf.set(r.related_person_id, new Set());
      parentsOf.get(r.related_person_id)!.add(r.person_id);
    }
  });

  const getRepId = (id: string) => {
    const spouse = coupleMap.get(id);
    if (!spouse) return id;
    return [id, spouse].sort()[0];
  };

  const familyChildren = new Map<string, Set<string>>();
  filteredPersons.forEach(p => {
    const rep = getRepId(p.id);
    if (!familyChildren.has(rep)) familyChildren.set(rep, new Set<string>());
    (childrenOf.get(p.id) || new Set<string>()).forEach((childId: string) => {
      familyChildren.get(rep)!.add(childId);
    });
  });

  // depth 계산 (위상정렬)
  const depthMap = new Map<string, number>();
  const roots = filteredPersons.filter(p => !parentsOf.has(p.id));

  const inDegree = new Map<string, number>();
  filteredPersons.forEach(p => inDegree.set(p.id, 0));
  parentsOf.forEach((parents, childId) => { inDegree.set(childId, parents.size); });

  const topoQueue: string[] = [];
  roots.forEach(p => { depthMap.set(p.id, 0); topoQueue.push(p.id); });

  while (topoQueue.length > 0) {
    const cur = topoQueue.shift()!;
    const d = depthMap.get(cur) ?? 0;
    (childrenOf.get(cur) || new Set()).forEach(childId => {
      const newDepth = d + 1;
      const existing = depthMap.get(childId);
      if (existing === undefined || newDepth > existing) depthMap.set(childId, newDepth);
      const remaining = (inDegree.get(childId) ?? 1) - 1;
      inDegree.set(childId, remaining);
      if (remaining <= 0) topoQueue.push(childId);
    });
  }

  // displayDepth (배우자 y좌표 보정)
  const displayDepth = new Map<string, number>(depthMap);
  filteredPersons.forEach(p => { if (!displayDepth.has(p.id)) displayDepth.set(p.id, 0); });

  let changed = true;
  while (changed) {
    changed = false;
    coupleMap.forEach((spouseId, personId) => {
      const pd = displayDepth.get(personId);
      const sd = displayDepth.get(spouseId);
      if (pd !== undefined && sd === undefined) { displayDepth.set(spouseId, pd); changed = true; }
      else if (sd !== undefined && pd === undefined) { displayDepth.set(personId, sd); changed = true; }
      else if (pd !== undefined && sd !== undefined && pd !== sd) {
        const pHasParent = parentsOf.has(personId);
        const sHasParent = parentsOf.has(spouseId);
        let ref: number;
        if (pHasParent && !sHasParent) ref = pd;
        else if (sHasParent && !pHasParent) ref = sd;
        else ref = Math.max(pd, sd);
        displayDepth.set(personId, ref);
        displayDepth.set(spouseId, ref);
        changed = true;
      }
    });
  }

  // 레이아웃 배치
  const posMap = new Map<string, { x: number; y: number }>();
  const placed = new Set<string>();

  const getSubtreeWidth = (repId: string, visited = new Set<string>()): number => {
    if (visited.has(repId)) return NODE_W;
    visited.add(repId);
    const spouseId = coupleMap.get(repId);
    const children = Array.from(familyChildren.get(repId) || new Set<string>());
    const coupleW = spouseId ? NODE_W * 2 + H_GAP : NODE_W;
    if (children.length === 0) return coupleW;
    let childrenTotalW = 0;
    children.forEach((childId, i) => {
      childrenTotalW += getSubtreeWidth(getRepId(childId), new Set(visited));
      if (i < children.length - 1) childrenTotalW += H_GAP;
    });
    return Math.max(coupleW, childrenTotalW);
  };

  const placeSubtree = (repId: string, centerX: number, depth: number) => {
    if (placed.has(repId)) return;
    placed.add(repId);
    const spouseId = coupleMap.get(repId);
    const y = (displayDepth.get(repId) ?? depth) * (NODE_H + V_GAP);
    const coupleW = spouseId ? NODE_W * 2 + H_GAP : NODE_W;
    const startX = centerX - coupleW / 2;
    posMap.set(repId, { x: startX, y });
    if (spouseId && !placed.has(spouseId)) {
      placed.add(spouseId);
      posMap.set(spouseId, { x: startX + NODE_W + H_GAP, y });
    }
    const children = Array.from(familyChildren.get(repId) || new Set<string>());
    if (children.length === 0) return;
    const childWidths = children.map(childId => getSubtreeWidth(getRepId(childId)));
    const totalChildW = childWidths.reduce((a, b) => a + b, 0) + H_GAP * (children.length - 1);
    let cx = centerX - totalChildW / 2;
    children.forEach((childId, i) => {
      const childRep = getRepId(childId);
      const childDepth = displayDepth.get(childId) ?? depth + 1;
      if (!placed.has(childRep)) placeSubtree(childRep, cx + childWidths[i] / 2, childDepth);
      cx += childWidths[i] + H_GAP;
    });
  };

  let curX = NODE_W;
  roots.forEach(root => {
    const rep = getRepId(root.id);
    if (!placed.has(rep)) {
      const w = getSubtreeWidth(rep);
      placeSubtree(rep, curX + w / 2, 0);
      curX += w + H_GAP * 3;
    }
  });

  filteredPersons.forEach(p => {
    if (!placed.has(p.id)) {
      const d = displayDepth.get(p.id) ?? 0;
      posMap.set(p.id, { x: curX, y: d * (NODE_H + V_GAP) });
      curX += NODE_W + H_GAP;
    }
  });

  // 노드
  const newNodes: Node[] = filteredPersons.map(p => ({
    id: p.id,
    type: 'person',
    position: posMap.get(p.id) || { x: 0, y: 0 },
    data: {
      id: p.id,
      name: p.name,
      gender: p.gender,
      birth_year: p.birth_year,
      death_year: p.death_year,
      photo_url: p.photo_url,
      isCenter: p.id === centerPersonId,
    },
  }));

  // 엣지
  const newEdges: Edge[] = [];
  const addedEdges = new Set<string>();

  couples.forEach(key => {
    const [a, b] = key.split('|');
    newEdges.push({
      id: `couple-${key}`,
      source: a,
      target: b,
      sourceHandle: 'right',
      targetHandle: 'left',
      type: 'straight',
      style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '6,4' },
    });
  });

  filteredRels.forEach(r => {
    if (r.relation_type === 'son' || r.relation_type === 'daughter') {
      const edgeId = `child-${r.person_id}-${r.related_person_id}`;
      if (!addedEdges.has(edgeId)) {
        addedEdges.add(edgeId);
        newEdges.push({
          id: edgeId,
          source: r.person_id,
          target: r.related_person_id,
          type: 'smoothstep',
          style: { stroke: '#92400e', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#92400e' },
        });
      }
    }
  });

  return { nodes: newNodes, edges: newEdges };
}
