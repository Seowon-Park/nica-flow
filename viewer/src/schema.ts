import { z } from "zod";

const sourceLocSchema = z.object({
  file: z.string(),
  lines: z.array(z.number()).min(1),
});

const ioItemSchema = z.object({
  name: z.string(),
  type: z.string().default("unknown"),
});

const localVarSchema = z.object({
  name: z.string(),
  type: z.string().default("unknown"),
  purpose: z.string().default(""),
});

const globalUseSchema = z.object({
  name: z.string(),
  mode: z.enum(["read", "write"]),
});

const globalVarSchema = z.object({
  name: z.string(),
  type: z.string().default("unknown"),
  purpose: z.string().default(""),
  writtenBy: z.array(z.string()).default([]),
  readBy: z.array(z.string()).default([]),
});

const nodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  purpose: z.string().default("unknown"),
  inputs: z.array(ioItemSchema).default([]),
  outputs: z.array(ioItemSchema).default([]),
  locals: z.array(localVarSchema).default([]),
  globalsUsed: z.array(globalUseSchema).default([]),
  effects: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  trigger: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  sourceLoc: sourceLocSchema,
});

const edgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.enum(["call", "data", "error"]),
  via: z.string().default(""),
  condition: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  loop: z.boolean().default(false),
  async: z.boolean().default(false),
  sourceLoc: sourceLocSchema.optional(),
});

export const nicaGraphSchema = z.object({
  schemaVersion: z.string(),
  project: z.object({
    name: z.string().default("unknown"),
    goal: z.string().default("unknown"),
    deliverable: z.string().default("unknown"),
    language: z.string().default("unknown"),
    entryPoint: z.string().default("unknown"),
    flow: z.array(z.string()).default([]),
    globals: z.array(globalVarSchema).default([]),
    rules: z.array(z.string()).default([]),
  }),
  nodes: z.array(nodeSchema).min(1, "nodes가 비어 있습니다"),
  edges: z.array(edgeSchema).default([]),
});

export type NicaGraph = z.infer<typeof nicaGraphSchema>;
export type NicaNode = NicaGraph["nodes"][number];
export type NicaEdge = NicaGraph["edges"][number];

export interface ParseResult {
  graph: NicaGraph | null;
  errors: string[];
  warnings: string[];
}

export const MAX_INPUT_CHARS = 1_000_000;
export const RECOMMENDED_MAX_NODES = 30;

export function parseNicaJson(raw: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (raw.length > MAX_INPUT_CHARS) {
    errors.push(
      `입력이 ${MAX_INPUT_CHARS.toLocaleString()}자를 초과했습니다 (현재 ${raw.length.toLocaleString()}자). 코드를 모듈 단위로 나눠 추출해 주세요.`
    );
    return { graph: null, errors, warnings };
  }

  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) text = fence[1];
  if (!text.startsWith("{")) {
    // LLM이 JSON 앞뒤에 설명을 붙이는 경우가 잦아 { } 구간만 잘라 파싱을 시도한다
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    if (s !== -1 && e > s) {
      text = text.slice(s, e + 1);
      warnings.push("JSON 외의 텍스트가 섞여 있어 { } 구간만 파싱했습니다.");
    }
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    errors.push(`JSON 파싱 실패: ${(e as Error).message}`);
    return { graph: null, errors, warnings };
  }

  const result = nicaGraphSchema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.length ? issue.path.join(".") : "(root)";
      errors.push(`${path}: ${issue.message}`);
    }
    return { graph: null, errors, warnings };
  }

  const graph = result.data;

  if (graph.schemaVersion !== "0.1") {
    warnings.push(
      `schemaVersion "${graph.schemaVersion}" — 뷰어는 v0.1 기준으로 렌더링합니다.`
    );
  }

  if (graph.nodes.length > RECOMMENDED_MAX_NODES) {
    warnings.push(
      `노드 ${graph.nodes.length}개 — 권장치(${RECOMMENDED_MAX_NODES}개)를 넘어 그래프 가독성이 떨어질 수 있습니다. 모듈 단위 분할 추출을 권장합니다.`
    );
  }

  const ids = new Set(graph.nodes.map((n) => n.id));
  const seen = new Set<string>();
  for (const n of graph.nodes) {
    if (seen.has(n.id)) warnings.push(`중복된 노드 id: ${n.id}`);
    seen.add(n.id);
  }

  graph.edges = graph.edges.filter((e, i) => {
    const missing = [e.from, e.to].filter((id) => !ids.has(id));
    if (missing.length) {
      warnings.push(`edges[${i}] 제외됨 — 존재하지 않는 노드: ${missing.join(", ")}`);
      return false;
    }
    return true;
  });

  for (const id of graph.project.flow) {
    if (!ids.has(id)) warnings.push(`flow에 존재하지 않는 노드 id: ${id}`);
  }

  const globalNames = new Set(graph.project.globals.map((g) => g.name));
  for (const n of graph.nodes) {
    for (const g of n.globalsUsed) {
      if (!globalNames.has(g.name)) {
        warnings.push(`${n.name}의 전역변수 "${g.name}"가 project.globals에 없습니다.`);
      }
    }
  }

  return { graph, errors, warnings };
}
