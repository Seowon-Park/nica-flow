import type { NicaGraph } from "../schema";

function shortName(id: string): string {
  const ix = id.indexOf("::");
  return ix === -1 ? id : id.slice(ix + 2);
}

export default function ProjectPanel({
  graph,
  playing,
  activeStep,
  onPlayToggle,
  walking,
  onWalkToggle,
}: {
  graph: NicaGraph;
  playing: boolean;
  activeStep: number | null;
  onPlayToggle?: () => void;
  walking: boolean;
  onWalkToggle?: () => void;
}) {
  const p = graph.project;
  return (
    <aside className="project-panel">
      <h2>{p.name}</h2>
      <div className="meta">
        {p.language} · entry: {shortName(p.entryPoint)}
      </div>

      <section>
        <h3>프로젝트 목표</h3>
        <p>{p.goal}</p>
      </section>

      <section>
        <h3>프로젝트 결과물</h3>
        <p>{p.deliverable}</p>
      </section>

      {p.flow.length > 0 && (
        <section>
          <h3>
            전체 함수 흐름
            {onPlayToggle && (
              <button
                className="flow-play"
                onClick={onPlayToggle}
                title={playing ? "재생 정지" : "흐름 순서대로 노드 하이라이트"}
              >
                {playing ? "■" : "▶"}
              </button>
            )}
            {onWalkToggle && (
              <button
                className="flow-play"
                onClick={onWalkToggle}
                title={walking ? "분기 탐색 종료" : "갈림길을 직접 선택하며 흐름 탐색"}
              >
                {walking ? "탐색 종료" : "분기 탐색"}
              </button>
            )}
          </h3>
          <div className="flow-seq">
            {p.flow.map((id, i) => (
              <span key={i} className={activeStep === i ? "flow-step active" : "flow-step"}>
                {shortName(id)}
                {i < p.flow.length - 1 && <span className="arrow"> → </span>}
              </span>
            ))}
          </div>
        </section>
      )}

      {p.globals.length > 0 && (
        <section>
          <h3>전역변수</h3>
          {p.globals.map((gv) => (
            <div key={gv.name} className="global-item">
              <div>
                <span className="var-name">{gv.name}</span>{" "}
                <span className="var-type">{gv.type}</span>
              </div>
              {gv.purpose && <div className="global-purpose">{gv.purpose}</div>}
              <div className="global-rw">
                W: {gv.writtenBy.length ? gv.writtenBy.map(shortName).join(", ") : "—"} · R:{" "}
                {gv.readBy.length ? gv.readBy.map(shortName).join(", ") : "—"}
              </div>
            </div>
          ))}
        </section>
      )}

      {p.rules.length > 0 && (
        <section>
          <h3>코드 규칙</h3>
          <ul>
            {p.rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
