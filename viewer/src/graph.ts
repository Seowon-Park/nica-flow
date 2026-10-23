import dagre from "@dagrejs/dagre";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { NicaGraph, NicaNode } from "./schema";

export const NODE_WIDTH = 280;

export interface NicaNodeData extends Record<string, unknown> {
  nica: NicaNode;
  isEntry: boolean;
}

export type FlowNode = Node<NicaNodeData, "nica">;

function estimateHeight(n: NicaNode): number {
  const ROW = 24;
  const SECTION = 26;
  let h = 44; // header
  h += 36; // purpose
  if (n.effects.length) h += 26;
  if (n.inputs.length) h += SECTION + n.inputs.length * ROW;
  if (n.outputs.length) h += SECTION + n.outputs.length * ROW;
  if (n.globalsUsed.length) h += SECTION + n.globalsUsed.length * ROW;
  if (n.locals.length) h += SECTION + n.locals.length * ROW;
  if (n.errors.length) h += SECTION + n.errors.length * ROW;
  if (n.constraints.length) h += SECTION + n.constraints.length * ROW;
  h += 28; // footer
  return h;
}

export function toFlow(graph: NicaGraph): { nodes: FlowNode[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of graph.nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: estimateHeight(n) });
  }
  for (const e of graph.edges) {
    g.setEdge(e.from, e.to);
  }
  dagre.layout(g);

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  const nodes: FlowNode[] = graph.nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: "nica",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - pos.height / 2 },
      data: { nica: n, isEntry: n.id === graph.project.entryPoint },
    };
  });

  const edges: Edge[] = graph.edges.map((e, i) => {
    const isData = e.type === "data";
    const isError = e.type === "error";
    const from = nodeById.get(e.from)!;
    const to = nodeById.get(e.to)!;

    let sourceHandle = "src:_node";
    let targetHandle = "tgt:_node";
    if (isData) {
      if (from.outputs.some((o) => o.name === e.via)) sourceHandle = `src:out:${e.via}`;
      if (to.inputs.some((p) => p.name === e.via)) targetHandle = `tgt:in:${e.via}`;
    }

    const color = isError ? "#e8870e" : isData ? "#2f6fed" : "#e5484d";
    const label = [e.via, e.condition, e.loop ? "loop" : null, e.async ? "async" : null]
      .filter(Boolean)
      .join("  ·  ");

    return {
      id: `e${i}:${e.from}->${e.to}`,
      source: e.from,
      target: e.to,
      sourceHandle,
      targetHandle,
      type: "default",
      animated: isData,
      label: label || undefined,
      labelStyle: { fontSize: 10, fill: "#555" },
      labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
      style: {
        stroke: color,
        strokeWidth: 1.8,
        strokeDasharray: isData ? "6 3" : isError ? "3 3" : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
    };
  });

  return { nodes, edges };
}
