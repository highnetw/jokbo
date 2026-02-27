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

const NODE_W = 195;
const NODE_H = 165;
const H_GAP = 60;
const V_GAP = 180;

export function buildTreeData(
  persons: PersonRow[],
  rels: RelRow[],
  centerPersonId?: string
): { nodes: Node[]; edges: Edge[] } {

  // ── 중심 인물 기준 필터링 ──────────────────────────────
  let filteredPersons = persons;
  let filteredRels = rels;

  if (centerPersonId) {
    const includeIds = new Set<string>();

    const coupleMapFull = new Map<string, string>();
    const childrenOfFull = new Map<string, Set<string>>();
    const parentsOfFull = new Map<string, Set<string>>();

    // 전체 관계 맵 먼저 구성 (centerPersonId 교체에 필요)
    rels.forEach(r => {
      if (r.relation_type === 'husband' || r.relation_type === 'wife') {
        coupleMapFull.set(r.person_id, r.related_person_id);
        coupleMapFull.set(r.related_person_id, r.person_id);
      }
      let parentId: string | null = null;
      let childId: string | null = null;
      if (r.relation_type === 'son' || r.relation_type === 'daughter') {
        parentId = r.person_id; childId = r.related_person_id;
      } else if (r.relation_type === 'father' || r.relation_type === 'mother') {
        parentId = r.related_person_id; childId = r.person_id;
      }
      if (parentId && childId) {
        if (!childrenOfFull.has(parentId)) childrenOfFull.set(parentId, new Set());
        childrenOfFull.get(parentId)!.add(childId);
        if (!parentsOfFull.has(childId)) parentsOfFull.set(childId, new Set());
        parentsOfFull.get(childId)!.add(parentId);
      }
    });

    // 외족 배우자이면 혈족 배우자로 교체
    const spouseOfCenter = coupleMapFull.get(centerPersonId);
    if (spouseOfCenter) {
      const centerHasParent = parentsOfFull.has(centerPersonId);
      const centerHasChild = childrenOfFull.has(centerPersonId);
      const spouseHasParent = parentsOfFull.has(spouseOfCenter);
      const spouseHasChild = childrenOfFull.has(spouseOfCenter);
      // 중심 인물이 부모/자녀 없고 배우자는 있으면 → 외족, 배우자로 교체
      if (!centerHasParent && !centerHasChild && (spouseHasParent || spouseHasChild)) {
        centerPersonId = spouseOfCenter;
      }
    }

    // 위로: 부모 → 조부모 → 증조부모 (최대 3세대)
    // 본인 + 배우자 양쪽 부모 모두 탐색
    const addAncestors = (id: string, depth: number) => {
      includeIds.add(id);
      const spouse = coupleMapFull.get(id);
      if (spouse) includeIds.add(spouse);
      if (depth <= 0) return;
      // 본인 부모
      (parentsOfFull.get(id) || new Set()).forEach(parentId => {
        addAncestors(parentId, depth - 1);
      });
      // 배우자 부모 (배우자가 혈족인 경우 커버)
      if (spouse) {
        (parentsOfFull.get(spouse) || new Set()).forEach(parentId => {
          addAncestors(parentId, depth - 1);
        });
      }
    };

    // 아래로: 자녀 → 손자 → 증손자 (최대 3세대)
    // 본인 + 배우자 양쪽 자녀 모두 탐색
    const addDescendants = (id: string, depth: number) => {
      includeIds.add(id);
      const spouse = coupleMapFull.get(id);
      if (spouse) includeIds.add(spouse);
      if (depth <= 0) return;
      // 본인 자녀
      (childrenOfFull.get(id) || new Set()).forEach(childId => {
        addDescendants(childId, depth - 1);
      });
      // 배우자 자녀 (배우자 쪽으로만 입력된 경우 커버)
      if (spouse) {
        (childrenOfFull.get(spouse) || new Set()).forEach(childId => {
          addDescendants(childId, depth - 1);
        });
      }
    };

    addAncestors(centerPersonId, 3);
    addDescendants(centerPersonId, 3);

    // ── 형제자매 추가 (본인 + 배우자 양쪽) ────────────────
    const centerSpouse = coupleMapFull.get(centerPersonId);
    const siblingSources = [centerPersonId, centerSpouse].filter(Boolean) as string[];
    siblingSources.forEach(sourceId => {
    const myParents = parentsOfFull.get(sourceId) || new Set<string>();
    myParents.forEach(parentId => {
      (childrenOfFull.get(parentId) || new Set<string>()).forEach(siblingId => {
        includeIds.add(siblingId);
        // 형제자매의 배우자도 포함
        const siblingSpouse = coupleMapFull.get(siblingId);
        if (siblingSpouse) includeIds.add(siblingSpouse);
        // 형제자매의 자녀(조카)도 포함 - 본인+배우자 양쪽 커버
        const siblingSpouseId = siblingSpouse;
        [siblingId, siblingSpouseId].forEach(sid => {
          if (!sid) return;
          (childrenOfFull.get(sid) || new Set<string>()).forEach(nephewId => {
            includeIds.add(nephewId);
            const nephewSpouse = coupleMapFull.get(nephewId);
            if (nephewSpouse) includeIds.add(nephewSpouse);
            // 조카의 자녀(종손)도 포함
            [nephewId, nephewSpouse].forEach(nid => {
              if (!nid) return;
              (childrenOfFull.get(nid) || new Set<string>()).forEach(grandNephewId => {
                includeIds.add(grandNephewId);
                const gnSpouse = coupleMapFull.get(grandNephewId);
                if (gnSpouse) includeIds.add(gnSpouse);
              });
            });
          });
        });
      });
    });
    }); // siblingSources.forEach

    filteredPersons = persons.filter(p => includeIds.has(p.id));
    filteredRels = rels.filter(r =>
      includeIds.has(r.person_id) && includeIds.has(r.related_person_id)
    );
  }

  // ── 부부 관계 맵 ──────────────────────────────────────
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

  // ── 대표 ID (자녀가 더 많은 쪽 우선) ─────────────────
  const countChildren = (id: string) => {
    const childIds = new Set<string>();
    filteredRels.forEach(r => {
      if (r.person_id === id && (r.relation_type === 'son' || r.relation_type === 'daughter'))
        childIds.add(r.related_person_id);
      if (r.related_person_id === id && (r.relation_type === 'father' || r.relation_type === 'mother'))
        childIds.add(r.person_id);
    });
    return childIds.size;
  };

  const getRepId = (id: string) => {
    const spouse = coupleMap.get(id);
    if (!spouse) return id;
    const idCount = countChildren(id);
    const spouseCount = countChildren(spouse);
    if (idCount > spouseCount) return id;
    if (spouseCount > idCount) return spouse;
    // 자녀 수 동수일 때: 부모 있는 쪽 우선
    const hasParent = (pid: string) => filteredRels.some(r =>
      (r.person_id === pid && (r.relation_type === 'son' || r.relation_type === 'daughter')) ||
      (r.related_person_id === pid && (r.relation_type === 'father' || r.relation_type === 'mother'))
    );
    const idHasParent = hasParent(id);
    const spouseHasParent = hasParent(spouse);
    if (idHasParent && !spouseHasParent) return id;
    if (spouseHasParent && !idHasParent) return spouse;
    return [id, spouse].sort()[0];
  };

  // ── 부모-자녀 관계 맵 (son/daughter + father/mother 모두 처리) ──
  // 부부는 대표 1명(repId)으로만 처리 → inDegree=1 보장
  const childrenOf = new Map<string, Set<string>>();
  const parentsOf = new Map<string, Set<string>>();

  // 먼저 모든 부모-자녀 쌍을 수집 (중복 제거)
  const parentChildPairs = new Set<string>();
  filteredRels.forEach(r => {
    let parentId: string | null = null;
    let childId: string | null = null;
    if (r.relation_type === 'son' || r.relation_type === 'daughter') {
      parentId = r.person_id; childId = r.related_person_id;
    } else if (r.relation_type === 'father' || r.relation_type === 'mother') {
      parentId = r.related_person_id; childId = r.person_id;
    }
    if (parentId && childId) parentChildPairs.add(`${parentId}|${childId}`);
  });

  // repId 기준으로 통일해서 childrenOf/parentsOf 구성
  parentChildPairs.forEach(pair => {
    const [parentId, childId] = pair.split('|');
    const repParentId = getRepId(parentId);
    if (!childrenOf.has(repParentId)) childrenOf.set(repParentId, new Set());
    childrenOf.get(repParentId)!.add(childId);
    if (!parentsOf.has(childId)) parentsOf.set(childId, new Set());
    parentsOf.get(childId)!.add(repParentId);
  });

  // ── 생년 조회 헬퍼 ────────────────────────────────────
  const personMap = new Map<string, PersonRow>();
  filteredPersons.forEach(p => personMap.set(p.id, p));

  const getBirthYear = (id: string): number => {
    return personMap.get(id)?.birth_year ?? 9999;
  };

  // ── 가족 단위 자녀 맵 (repId 기준으로 통합) ────────────────
  const familyChildren = new Map<string, Set<string>>();
  // childrenOf는 repId 기준으로만 쌓이므로 repId만 순회
  childrenOf.forEach((children, repId) => {
    if (!familyChildren.has(repId)) familyChildren.set(repId, new Set<string>());
    children.forEach((childId: string) => {
      familyChildren.get(repId)!.add(childId);
    });
  });

  // ── 자녀 배열을 생년 오름차순으로 정렬 ───────────────
  const getSortedChildren = (repId: string): string[] => {
    return Array.from(familyChildren.get(repId) || new Set<string>())
      .sort((a, b) => getBirthYear(a) - getBirthYear(b));
  };

  // ── depth 계산 (위상정렬) ─────────────────────────────
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

  // ── displayDepth (배우자 y좌표 보정) ─────────────────
  // 먼저 배우자 depth 보정
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

  // ── displayDepth 기준으로 자녀 depth 재계산 ─────────────────
  // 루트가 배우자 depth로 보정된 경우 자녀 depth도 재계산
  let recalcChanged = true;
  while (recalcChanged) {
    recalcChanged = false;
    childrenOf.forEach((children, repId) => {
      const parentDepth = displayDepth.get(repId) ?? 0;
      children.forEach(childId => {
        const current = displayDepth.get(childId) ?? 0;
        const expected = parentDepth + 1;
        if (expected > current) {
          displayDepth.set(childId, expected);
          // 배우자도 업데이트
          const childSpouse = coupleMap.get(childId);
          if (childSpouse) displayDepth.set(childSpouse, expected);
          recalcChanged = true;
        }
      });
    });
  }

  // ── 레이아웃 배치 ─────────────────────────────────────
  const posMap = new Map<string, { x: number; y: number }>();
  const placed = new Set<string>();

  const getSubtreeWidth = (repId: string, visited = new Set<string>()): number => {
    if (visited.has(repId)) return NODE_W;
    visited.add(repId);
    const spouseId = coupleMap.get(repId);
    const children = getSortedChildren(repId);
    const coupleW = spouseId ? NODE_W * 2 + H_GAP : NODE_W;
    if (children.length === 0) return coupleW;
    let childrenTotalW = 0;
    children.forEach((childId: string, i) => {
      childrenTotalW += getSubtreeWidth(getRepId(childId), new Set(visited));
      if (i < children.length - 1) childrenTotalW += H_GAP;
    });
    return Math.max(coupleW, childrenTotalW);
  };

  const placeSubtree = (repId: string, centerX: number, depth: number) => {
    if (placed.has(repId)) return;
    placed.add(repId);
    const spouseId = coupleMap.get(repId);
    const effectiveDepth = Math.max(displayDepth.get(repId) ?? depth, depth);
    const y = effectiveDepth * (NODE_H + V_GAP);
    const coupleW = spouseId ? NODE_W * 2 + H_GAP : NODE_W;
    const startX = centerX - coupleW / 2;
    posMap.set(repId, { x: startX, y });
    if (spouseId && !placed.has(spouseId)) {
      placed.add(spouseId);
      posMap.set(spouseId, { x: startX + NODE_W + H_GAP, y });
    }
    const children = getSortedChildren(repId);
    if (children.length === 0) return;
    const childWidths = children.map((childId: string) => getSubtreeWidth(getRepId(childId)));
    const totalChildW = childWidths.reduce((a, b) => a + b, 0) + H_GAP * (children.length - 1);
    let cx = centerX - totalChildW / 2;
    children.forEach((childId: string, i) => {
      const childRep = getRepId(childId);
      const childDepth = displayDepth.get(childId) ?? depth + 1;
      if (!placed.has(childRep)) placeSubtree(childRep, cx + childWidths[i] / 2, childDepth);
      cx += childWidths[i] + H_GAP;
    });
  };

  // roots 생년 오름차순 정렬
  const sortedRoots = [...roots].sort((a, b) => (a.birth_year ?? 9999) - (b.birth_year ?? 9999));

  let curX = NODE_W;
  sortedRoots.forEach(root => {
    const rep = getRepId(root.id);
    if (!placed.has(rep)) {
      const w = getSubtreeWidth(rep);
      placeSubtree(rep, curX + w / 2, 0);
      curX += w + H_GAP * 6;
    } else if (!placed.has(root.id)) {
      // rep는 이미 배치됐지만 본인(외족 배우자)은 아직 미배치 → 배우자 옆에 붙이기
      const repPos = posMap.get(rep);
      if (repPos) {
        placed.add(root.id);
        posMap.set(root.id, { x: repPos.x + NODE_W + H_GAP, y: repPos.y });
      }
    }
  });

  filteredPersons.forEach(p => {
    if (!placed.has(p.id)) {
      const d = displayDepth.get(p.id) ?? 0;
      posMap.set(p.id, { x: curX, y: d * (NODE_H + V_GAP) });
      curX += NODE_W + H_GAP;
    }
  });

  // ── 노드 생성 ─────────────────────────────────────────
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

  // ── 엣지 생성 ─────────────────────────────────────────
  const newEdges: Edge[] = [];
  const addedEdges = new Set<string>();

  // 부부 엣지
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

  // 부모-자녀 엣지 (repId 기준으로 통일 → 이중선 방지)
  filteredRels.forEach(r => {
    let parentId: string | null = null;
    let childId: string | null = null;

    if (r.relation_type === 'son' || r.relation_type === 'daughter') {
      parentId = r.person_id;
      childId = r.related_person_id;
    } else if (r.relation_type === 'father' || r.relation_type === 'mother') {
      parentId = r.related_person_id;
      childId = r.person_id;
    }

    if (parentId && childId) {
      const repParentId = getRepId(parentId);
      const edgeId = `child-${repParentId}-${childId}`;
      if (!addedEdges.has(edgeId)) {
        addedEdges.add(edgeId);
        newEdges.push({
          id: edgeId,
          source: repParentId,
          target: childId,
          type: 'smoothstep',
          style: { stroke: '#92400e', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#92400e' },
        });
      }
      // 배우자도 자동 연결
      const spouseId = coupleMap.get(repParentId);
      if (spouseId) {
        const spouseEdgeId = `child-${spouseId}-${childId}`;
        if (!addedEdges.has(spouseEdgeId)) {
          addedEdges.add(spouseEdgeId);
          newEdges.push({
            id: spouseEdgeId,
            source: spouseId,
            target: childId,
            type: 'smoothstep',
            style: { stroke: '#92400e', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#92400e' },
          });
        }
      }
    }
  });

  return { nodes: newNodes, edges: newEdges };
}