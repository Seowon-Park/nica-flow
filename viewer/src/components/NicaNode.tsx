import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FlowNode } from "../graph";

const EFFECT_LABELS: Record<string, string> = {
  db: "DB",
  file: "FILE",
  network: "NET",
  console: "CONSOLE",
  ui: "UI",
  other: "ETC",
  none: "PURE",
};

export default function NicaNodeCard({ data }: NodeProps<FlowNode>) {
  const n = data.nica;
  return (
    <div className={`nica-card${data.isEntry ? " entry" : ""}`}>
      <Handle type="target" position={Position.Left} id="tgt:_node" className="h-node" isConnectable={false} />
      <Handle type="source" position={Position.Right} id="src:_node" className="h-node" isConnectable={false} />

      <div className="card-header">
        <span className="fn-name">{n.name}</span>
        {data.isEntry && <span className="entry-badge">entry</span>}
        {n.trigger && <span className="trigger-badge">trigger: {n.trigger}</span>}
      </div>

      <div className="purpose">{n.purpose}</div>

      {n.effects.length > 0 && (
        <div className="effects">
          {n.effects.map((ef) => (
            <span key={ef} className={`effect effect-${ef}`}>
              {EFFECT_LABELS[ef] ?? ef.toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {n.inputs.length > 0 && (
        <div className="section">
          <div className="section-title">인풋</div>
          {n.inputs.map((p) => (
            <div key={p.name} className="row">
              <Handle
                type="target"
                position={Position.Left}
                id={`tgt:in:${p.name}`}
                className="h-field"
                isConnectable={false}
              />
              <span className="var-name">{p.name}</span>
              <span className="var-type">{p.type}</span>
            </div>
          ))}
        </div>
      )}

      {n.outputs.length > 0 && (
        <div className="section">
          <div className="section-title">아웃풋</div>
          {n.outputs.map((p) => (
            <div key={p.name} className="row">
              <span className="var-name">{p.name}</span>
              <span className="var-type">{p.type}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={`src:out:${p.name}`}
                className="h-field"
                isConnectable={false}
              />
            </div>
          ))}
        </div>
      )}

      {n.globalsUsed.length > 0 && (
        <div className="section">
          <div className="section-title">전역변수</div>
          {n.globalsUsed.map((gv, i) => (
            <div key={`${gv.name}:${gv.mode}:${i}`} className="row">
              <span className="var-name">{gv.name}</span>
              <span className={`rw rw-${gv.mode}`}>{gv.mode === "read" ? "R" : "W"}</span>
            </div>
          ))}
        </div>
      )}

      {n.locals.length > 0 && (
        <div className="section">
          <div className="section-title">지역변수</div>
          {n.locals.map((lv) => (
            <div key={lv.name} className="row" title={lv.purpose}>
              <span className="var-name">{lv.name}</span>
              <span className="var-type">{lv.type}</span>
            </div>
          ))}
        </div>
      )}

      {n.errors.length > 0 && (
        <div className="section warn">
          <div className="section-title">예상 에러</div>
          {n.errors.map((er, i) => (
            <div key={i} className="row small">
              {er}
            </div>
          ))}
        </div>
      )}

      {n.constraints.length > 0 && (
        <div className="section constraint">
          <div className="section-title">제약조건</div>
          {n.constraints.map((c, i) => (
            <div key={i} className="row small">
              {c}
            </div>
          ))}
        </div>
      )}

      <div className="card-footer">
        {n.sourceLoc.file}:{n.sourceLoc.lines.join("–")}
      </div>
    </div>
  );
}
