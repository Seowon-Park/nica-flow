import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { parseNicaJson, type NicaGraph } from "./schema";
import { toFlow, type FlowNode } from "./graph";
import NicaNodeCard from "./components/NicaNode";
import ProjectPanel from "./components/ProjectPanel";
import fixture from "./fixtures/weather.nica.json";

const nodeTypes = { nica: NicaNodeCard };

function shortName(id: string): string {
  const ix = id.indexOf("::");
  return ix === -1 ? id : id.slice(ix + 2);
}

interface WalkState {
  current: string;
  stack: string[];
  visited: string[];
  lastEdgeId: string | null;
}

interface WalkChoice {
  kind: "call" | "error" | "return" | "end";
  to?: string;
  edgeIndex?: number;
  label: string;
  sub?: string;
}

export default function App() {
  const [raw, setRaw] = useState("");
  const [graph, setGraph] = useState<NicaGraph | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const render = useCallback((text: string) => {
    const r = parseNicaJson(text);
    setErrors(r.errors);
    setWarnings(r.warnings);
    if (r.graph) setGraph(r.graph);
  }, []);

  const loadExample = () => {
    const text = JSON.stringify(fixture, null, 2);
    setRaw(text);
    render(text);
  };

  const flow = useMemo(() => (graph ? toFlow(graph) : null), [graph]);

  const [step, setStep] = useState<number | null>(null);
  const [rf, setRf] = useState<ReactFlowInstance<FlowNode, Edge> | null>(null);

  const flowSeq = useMemo(() => graph?.project.flow ?? [], [graph]);
  const nodeIds = useMemo(() => new Set(graph?.nodes.map((n) => n.id) ?? []), [graph]);

  useEffect(() => {
    if (step === null) return;
    if (step >= flowSeq.length) {
      const t = setTimeout(() => {
        setStep(null);
        rf?.fitView({ duration: 600 });
      }, 1200);
      return () => clearTimeout(t);
    }
    const id = flowSeq[step];
    if (nodeIds.has(id)) {
      rf?.fitView({ nodes: [{ id }], duration: 450, maxZoom: 1, padding: 0.4 });
    }
    const t = setTimeout(() => setStep(step + 1), 1100);
    return () => clearTimeout(t);
  }, [step, flowSeq, nodeIds, rf]);

  const [walk, setWalk] = useState<WalkState | null>(null);

  const toggleFlowPlay = useCallback(() => {
    setWalk(null);
    setStep((s) => (s === null ? 0 : null));
  }, []);

  const endWalk = useCallback(() => {
    setWalk(null);
    rf?.fitView({ duration: 600 });
  }, [rf]);

  const toggleWalk = useCallback(() => {
    if (walk) {
      endWalk();
      return;
    }
    if (!graph) return;
    setStep(null);
    const entry = nodeIds.has(graph.project.entryPoint)
      ? graph.project.entryPoint
      : graph.nodes[0].id;
    setWalk({ current: entry, stack: [], visited: [], lastEdgeId: null });
  }, [walk, endWalk, graph, nodeIds]);

  useEffect(() => {
    if (!walk) return;
    if (nodeIds.has(walk.current)) {
      rf?.fitView({ nodes: [{ id: walk.current }], duration: 450, maxZoom: 1, padding: 0.4 });
    }
  }, [walk, nodeIds, rf]);

  const walkChoices = useMemo<WalkChoice[]>(() => {
    if (!walk || !graph) return [];
    const out: WalkChoice[] = [];
    graph.edges.forEach((e, i) => {
      if (e.from !== walk.current || !nodeIds.has(e.to)) return;
      if (e.type === "call") {
        out.push({
          kind: "call",
          edgeIndex: i,
          to: e.to,
          label: `호출 → ${shortName(e.to)}`,
          sub:
            [e.condition, e.loop ? "loop" : null, e.async ? "async" : null]
              .filter(Boolean)
              .join(" · ") || undefined,
        });
      } else if (e.type === "error") {
        out.push({
          kind: "error",
          edgeIndex: i,
          to: e.to,
          label: `예외 → ${shortName(e.to)}`,
          sub: e.via || undefined,
        });
      }
    });
    if (walk.stack.length > 0) {
      const caller = walk.stack[walk.stack.length - 1];
      out.push({ kind: "return", to: caller, label: `복귀 → ${shortName(caller)}` });
    } else {
      out.push({ kind: "end", label: "탐색 종료" });
    }
    return out;
  }, [walk, graph, nodeIds]);

  const choose = useCallback(
    (c: WalkChoice) => {
      if (!walk || !graph) return;
      if (c.kind === "end" || !c.to) {
        endWalk();
        return;
      }
      const visited = walk.visited.includes(walk.current)
        ? walk.visited
        : [...walk.visited, walk.current];
      const edgeId =
        c.edgeIndex !== undefined
          ? `e${c.edgeIndex}:${graph.edges[c.edgeIndex].from}->${graph.edges[c.edgeIndex].to}`
          : null;
      if (c.kind === "call") {
        setWalk({ current: c.to, stack: [...walk.stack, walk.current], visited, lastEdgeId: edgeId });
      } else if (c.kind === "error") {
        // 예외는 스택을 거슬러 올라가 잡는 곳으로 점프한다
        const ix = walk.stack.lastIndexOf(c.to);
        const stack = ix === -1 ? walk.stack : walk.stack.slice(0, ix);
        setWalk({ current: c.to, stack, visited, lastEdgeId: edgeId });
      } else {
        setWalk({ current: c.to, stack: walk.stack.slice(0, -1), visited, lastEdgeId: null });
      }
    },
    [walk, graph, endWalk]
  );

  const displayNodes = useMemo(() => {
    if (!flow) return [];
    if (walk) {
      return flow.nodes.map((n) =>
        n.id === walk.current
          ? { ...n, className: "flow-current" }
          : walk.visited.includes(n.id)
            ? { ...n, className: "flow-visited" }
            : n
      );
    }
    if (step === null) return flow.nodes;
    const current = step < flowSeq.length ? flowSeq[step] : undefined;
    const visited = new Set(flowSeq.slice(0, step));
    return flow.nodes.map((n) =>
      n.id === current
        ? { ...n, className: "flow-current" }
        : visited.has(n.id)
          ? { ...n, className: "flow-visited" }
          : n
    );
  }, [flow, step, flowSeq, walk]);

  const displayEdges = useMemo(() => {
    if (!flow) return [];
    if (!walk?.lastEdgeId) return flow.edges;
    return flow.edges.map((e) =>
      e.id === walk.lastEdgeId
        ? { ...e, style: { ...e.style, strokeWidth: 3.2 }, animated: true }
        : e
    );
  }, [flow, walk?.lastEdgeId]);

  if (!graph || !flow) {
    return (
      <div className="input-screen">
        <h1>NICA Flow</h1>
        <p className="tagline">
          LLM이 추출했거나 직접 작성한 nica JSON을 붙여넣으면 함수 단위 노드 그래프가 그려집니다.
          <br />
          입력 한도 1,000,000자(약 1MB) · 권장 노드 30개 이하
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder='{"schemaVersion": "0.1", "project": { ... }, "nodes": [ ... ], "edges": [ ... ]}'
          spellCheck={false}
        />
        <div className="btn-row">
          <button className="primary" onClick={() => render(raw)} disabled={!raw.trim()}>
            그래프 그리기
          </button>
          <button onClick={loadExample}>예시 불러오기</button>
        </div>
        {errors.length > 0 && (
          <div className="msg error">
            <strong>JSON을 읽을 수 없습니다</strong>
            <ul>
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {warnings.length > 0 && errors.length === 0 && (
          <div className="msg warn">
            <ul>
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="viewer-screen">
      <header className="topbar">
        <span className="logo">NICA Flow</span>
        <span className="legend">
          <span className="legend-item">
            <span className="line call" /> call (호출)
          </span>
          <span className="legend-item">
            <span className="line data" /> data (데이터)
          </span>
          <span className="legend-item">
            <span className="line error" /> error (예외)
          </span>
        </span>
        <button
          onClick={() => {
            setGraph(null);
            setErrors([]);
            setWarnings([]);
            setStep(null);
            setWalk(null);
            setRf(null);
          }}
        >
          JSON 다시 입력
        </button>
      </header>
      {warnings.length > 0 && (
        <div className="warn-bar">경고 {warnings.length}건: {warnings.join(" / ")}</div>
      )}
      <div className="main-area">
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          onInit={setRf}
          fitView
          minZoom={0.15}
          nodesConnectable={false}
        >
          <Background gap={18} />
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />
        </ReactFlow>
        {walk && (
          <div className="walk-panel">
            <div className="walk-head">
              <span className="walk-now">
                현재 <strong>{shortName(walk.current)}</strong>
              </span>
              <span className="walk-stack">
                스택 {[...walk.stack, walk.current].map(shortName).join(" ▸ ")}
              </span>
            </div>
            <div className="walk-choices">
              {walkChoices.map((c, i) => (
                <button key={i} className={`walk-choice ${c.kind}`} onClick={() => choose(c)}>
                  <span className="walk-choice-label">{c.label}</span>
                  {c.sub && <span className="walk-choice-sub">{c.sub}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        <ProjectPanel
          graph={graph}
          playing={step !== null}
          activeStep={step !== null && step < flowSeq.length ? step : null}
          onPlayToggle={flowSeq.length > 0 ? toggleFlowPlay : undefined}
          walking={walk !== null}
          onWalkToggle={graph.edges.length > 0 ? toggleWalk : undefined}
        />
      </div>
    </div>
  );
}
