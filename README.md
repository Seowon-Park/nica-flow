# NICA Flow

**Node-based Interface for Code Administration**  
AI가 생성한 코드를 함수 단위의 노드 그래프로 역공학해 시각화하는 도구입니다.

[한국어](#nica-flow) · [English](#nica-flow-english)

> **Research in Progress**: 실험 단계의 프로젝트입니다. Issue, PR, 피드백 모두 환영합니다.

## 왜 만들었나

AI로 코드를 짜면 구현은 빠르지만, 코드베이스가 커질수록 유지보수가 급격히 어려워집니다.

- **블랙박스화**: 동작은 하지만 왜 이렇게 돌아가는지 파악하지 못하는 구간이 쌓입니다.
- **코드 팽창**: 기존 코드를 리팩토링하는 대신 비슷한 함수가 옆에 하나씩 늘어납니다.
- **사이드 이펙트**: 한 줄을 수정했을 때 어디까지 영향을 주는지 가늠하기 어렵습니다.

**NICA Flow**는 코드를 입출력과 제약조건이 정리된 **함수 단위 노드**로 쪼개 보여줌으로써, 전체 구조와 흐름을 한눈에 파악하고 관리할 수 있게 돕는 도구입니다.

## 동작 방식

별도의 언어별 파서나 복잡한 설치 없이, 이미 사용 중인 LLM을 그대로 활용합니다.

```
내 코드 ──▶ [LLM + nica-prompt.md] ──▶ nica JSON ──▶ [뷰어] ──▶ 노드 그래프
```

1. **추출**: [`nica-prompt.md`](./nica-prompt.md)를 복사해 사용 중인 LLM(Claude, ChatGPT, Gemini 등)에 분석할 코드와 함께 입력하면 스키마(v0.1) 형식의 JSON이 출력됩니다.
2. **시각화**: 출력된 JSON을 뷰어에 붙여넣으면 함수 간 호출·데이터·예외 흐름이 노드 그래프로 그려집니다.

LLM을 거치지 않고 [`schema-guide.md`](./schema-guide.md)를 참고해 JSON을 직접 작성해도 뷰어는 동일하게 동작합니다.

## 빠른 시작

### 1. nica JSON 준비하기

#### 방법 A: LLM으로 추출 (빠름, 검증 필요)

1. [`nica-prompt.md`](./nica-prompt.md) 전문을 복사해 LLM에 붙여넣습니다.
2. 프롬프트 맨 아래의 `[분석 대상 코드]` 자리에 분석할 코드를 넣습니다.
3. 출력된 JSON을 복사합니다.

> **주의**: LLM 추출 결과에는 함수·호출 관계 누락이나 환각(코드에 없는 내용 생성)이 포함될 수 있습니다. 중요한 판단에 사용하기 전에 각 노드의 `sourceLoc`(파일명·라인 범위)을 실제 코드와 대조해 확인하세요.

##### 권장 입력 규모: 총 1,000줄 이하 & 함수 30개 이하 (파일 수 무관)

코드가 이 범위를 넘으면 폴더나 모듈 단위로 나누어 추출하는 것을 권장합니다.

- **함수 30개 제한 이유**
  - **출력 토큰 한도**: 함수 하나당 약 200~400토큰의 JSON이 생성됩니다. 30개면 약 6,000~12,000토큰으로, 일반적인 LLM의 1회 출력 한도(8,000~16,000토큰)를 넘기지 않기 위한 기준입니다. 전역변수·예상 에러·제약조건·선택 속성(`error`, `loop`, `async`, `trigger`)이 많이 붙는 복잡한 함수는 하나당 500~600토큰까지 커지므로 **15~20개**로 줄여서 넣는 것이 안전합니다. (출력 도중 JSON이 잘려 뷰어에서 파싱 에러가 나면 입력 범위를 더 줄여야 합니다.)
  - **화면 가독성**: 노드 카드(폭 280px)가 30개를 넘어가면 전체 화면으로 맞췄을 때 배율이 0.5배 수준으로 축소되어 본문 글자(12px)를 읽기 어려워집니다. 추후 그룹화·접기 기능이 추가되면 완화할 예정입니다.
- **코드 1,000줄 제한 이유**
  - 함수 개수가 적더라도 전체 코드가 수천 줄로 길어지면 LLM이 세부 로직을 놓치거나 환각을 일으킬 확률이 높아집니다.

#### 방법 B: 직접 작성 (느리지만 정확)

[`examples/template.nica.json`](./examples/template.nica.json)을 복사한 뒤, [`schema-guide.md`](./schema-guide.md)의 필드 설명을 참고해 직접 채웁니다. 존재하지 않는 노드 ID 등 잘못된 참조가 있으면 뷰어에서 경고로 알려줍니다.

### 2. 뷰어 실행하기

```bash
cd viewer
npm install
npm run dev
# http://localhost:5173 접속 후 JSON 붙여넣기 (또는 "예시 불러오기" 클릭)
```

- **주요 기능**
  - **▶ 흐름 재생**: `project.flow`에 기록된 순서대로 노드를 하이라이트하며 대표 실행 흐름을 보여줍니다.
  - **분기 탐색**: `entryPoint`에서 시작해 조건 분기(`condition`), 반복(`loop`), 비동기(`async`), 예외(`error`) 갈림길을 직접 선택하며 실행 경로를 따라가 볼 수 있습니다.
  - **참조 검증**: 존재하지 않는 노드 ID나 미정의 전역변수 참조 등을 감지해 경고를 표시합니다.
- **입력 제한**: 입력 텍스트가 **1,000,000자(약 1MB)**를 넘으면 에러가 발생하며, 노드가 **30개**를 넘으면 가독성 경고가 표시됩니다.

## 스키마 요약 (v0.1)

| 구성 | 설명 |
|---|---|
| `project` | 프로젝트 목표, 결과물, 대표 실행 흐름(`flow`), 전역변수(`globals`), 코드 규칙(`rules`) |
| `nodes[]` | 함수 1개 = 노드 1개. 목적, 입출력(`inputs`/`outputs`), 지역·전역변수, 외부 효과(`effects`), 예상 에러, 제약조건, 이벤트 트리거(`trigger`), 소스 위치(`sourceLoc`) |
| `edges[]` | `call`(빨강, 호출) / `data`(파랑, 데이터 흐름) / `error`(주황, 예외 전파). 조건(`condition`), 반복(`loop`), 비동기(`async`) 속성 포함 |

자세한 스키마 정의는 [`schema-guide.md`](./schema-guide.md)(직접 작성용)와 [`nica-prompt.md`](./nica-prompt.md)(LLM 추출용), 실제 샘플은 [`examples/`](./examples) 폴더를 참고하세요.

## 폴더 구조

```
nica-flow/
├─ nica-prompt.md      # LLM용 추출 프롬프트 (스키마 정의 포함)
├─ schema-guide.md     # 직접 작성용 필드 설명서
├─ examples/           # 샘플 코드, 기대 출력 JSON, 직접 작성용 템플릿
└─ viewer/             # React Flow 기반 노드 그래프 뷰어
```

## 로드맵

- [x] 추출 프롬프트 및 스키마 정의 (v0.1)
- [x] 뷰어 MVP (노드 그래프 렌더링, 흐름 재생, 분기 탐색, 참조 검증)
- [ ] 멀티 LLM 프롬프트 검증 및 보강
- [ ] 영향 범위 하이라이트 (특정 노드 클릭 시 하류 노드·엣지 강조)
- [ ] 그래프 diff (코드 수정 전/후 그래프 비교로 변경 영향 시각화)
- [ ] 순방향 제어 (노드 조건을 수정해 검증 가능한 코드를 재생성 — 최종 목표)

## 연구 및 인용

NICA Flow는 진행 중인 연구 프로젝트입니다. 학술 목적으로 이 프로젝트의 개념이나 방법론을 참고·인용하실 때는 아래 형식을 사용해 주세요.

```bibtex
@misc{nicaflow2026,
  author = {Park, Seowon},
  title  = {NICA Flow: Node-based Interface for Code Administration},
  year   = {2026},
  url    = {https://github.com/Seowon-Park/nica-flow}
}
```

## 라이선스

[MIT License](./LICENSE) © 2026 Seowon Park (박서원)

---

# NICA Flow (English)

**Node-based Interface for Code Administration**  
A tool that reverse-engineers and visualizes AI-generated code as a function-level node graph.

> **Research in Progress**: This is an experimental research project. Issues, PRs, and feedback are all welcome.

## Why NICA Flow?

Writing code with AI is fast, but maintaining the codebase becomes increasingly difficult as it grows:

- **Black-box code**: Code works, but segments accumulate where no one fully understands why or how they work.
- **Code bloat**: Instead of refactoring existing logic, similar functions get duplicated side by side.
- **Unpredictable side effects**: It becomes hard to tell how far a single-line change will ripple across the codebase.

**NICA Flow** decomposes code into **function-level nodes** with explicit inputs, outputs, side effects, and constraints—helping you grasp and administer the overall structure and execution flow at a glance.

## How It Works

Instead of requiring language-specific AST parsers or complex setup, NICA Flow uses the LLM you already work with.

```
Your Code ──▶ [LLM + nica-prompt.md] ──▶ nica JSON ──▶ [Viewer] ──▶ Node Graph
```

1. **Extract**: Copy [`nica-prompt.md`](./nica-prompt.md) and paste it into your LLM (Claude, ChatGPT, Gemini, etc.) along with your source code to produce a `nica JSON (v0.1)` output.
2. **Visualize**: Paste the resulting JSON into the web viewer to render function calls, data flow, and exception propagation as an interactive node graph.

You can also write or edit the JSON manually without an LLM by following [`schema-guide.md`](./schema-guide.md).

## Quick Start

### 1. Prepare `nica JSON`

#### Option A: Extract with an LLM (fast, requires verification)

1. Copy the full contents of [`nica-prompt.md`](./nica-prompt.md) into your LLM.
2. Paste your target source code at the bottom under `[분석 대상 코드]`.
3. Copy the generated JSON block.

> **Note**: LLM extraction may contain missing calls or hallucinations. Before relying on the graph for critical decisions, verify each node's `sourceLoc` (file name and line range) against the actual source code.

##### Recommended Input Size: ≤ 1,000 lines total & ≤ 30 functions (regardless of file count)

If your codebase exceeds this range, extract it module by module or folder by folder.

- **Why ≤ 30 functions?**
  - **Output token limits**: Each function generates roughly 200–400 tokens of JSON (6,000–12,000 tokens for 30 functions), staying within typical single-turn LLM output limits (8,000–16,000 tokens). Complex functions with many globals, errors, constraints, or optional edge attributes (`error`, `loop`, `async`, `trigger`) can take 500–600 tokens each—in that case, aim for **15–20 functions** per batch.
  - **Visual readability**: Beyond 30 node cards (280px wide), fitting the entire graph on screen scales the viewport down to ~0.5x, making body text (12px) hard to read. Node grouping and folding are planned for future updates.
- **Why ≤ 1,000 lines?**
  - Even with few functions, feeding several thousand lines of code at once increases the likelihood of the LLM missing details or hallucinating relationships.

#### Option B: Write Manually (slower, exact)

Copy [`examples/template.nica.json`](./examples/template.nica.json) and fill in the fields using [`schema-guide.md`](./schema-guide.md). The viewer automatically checks reference integrity and warns you about missing node IDs or undefined globals.

### 2. Run the Viewer

```bash
cd viewer
npm install
npm run dev
# Open http://localhost:5173 and paste your JSON (or click "예시 불러오기" to load the example)
```

- **Key Features**
  - **▶ Flow Playback**: Highlights nodes in sequence according to `project.flow` to demonstrate the primary execution path.
  - **Branch Walk**: Start from `entryPoint` and interactively step through conditional branches (`condition`), loops (`loop`), async calls (`async`), exception jumps (`error`), and call-stack returns.
  - **Reference Validation**: Detects and warns about non-existent node IDs in edges/flows or undeclared global variables.
- **Input Limits**: Inputs exceeding **1,000,000 characters (~1MB)** are rejected with an error, and graphs with more than **30 nodes** display a readability warning.

## Schema Overview (v0.1)

| Section | Description |
|---|---|
| `project` | Project goal, deliverable, primary execution sequence (`flow`), global variables (`globals`), and observed coding conventions (`rules`) |
| `nodes[]` | 1 function = 1 node. Purpose, `inputs`/`outputs`, local & global variables, side `effects`, expected `errors`, `constraints`, event `trigger`, and `sourceLoc` |
| `edges[]` | `call` (red, function call) / `data` (blue, data flow) / `error` (orange, exception caught by target). Supports `condition`, `loop`, and `async` attributes |

See [`schema-guide.md`](./schema-guide.md) (manual authoring), [`nica-prompt.md`](./nica-prompt.md) (LLM extraction), and [`examples/`](./examples) for complete specifications and samples.

## Project Structure

```
nica-flow/
├─ nica-prompt.md      # LLM extraction prompt (includes v0.1 schema rules)
├─ schema-guide.md     # Field-by-field guide for manual JSON authoring
├─ examples/           # Sample Python code, expected nica JSON, and blank template
└─ viewer/             # React Flow + dagre + Zod interactive graph viewer
```

## Roadmap

- [x] Extraction prompt & schema specification (v0.1)
- [x] Viewer MVP (node graph rendering, flow playback, interactive branch walk, reference validation)
- [ ] Cross-LLM prompt evaluation and refinement
- [ ] Impact range highlighting (highlight downstream nodes and edges on click)
- [ ] Graph diff (compare before/after graphs to visualize change impact)
- [ ] Forward control (regenerate deterministic, verifiable code by editing node constraints — ultimate goal)

## Research & Citation

NICA Flow is an ongoing research project. If you reference or build upon the concepts or methodology of this project for academic purposes, please cite it using the following BibTeX entry:

```bibtex
@misc{nicaflow2026,
  author = {Park, Seowon},
  title  = {NICA Flow: Node-based Interface for Code Administration},
  year   = {2026},
  url    = {https://github.com/Seowon-Park/nica-flow}
}
```

## License

[MIT License](./LICENSE) © 2026 Seowon Park (박서원)
