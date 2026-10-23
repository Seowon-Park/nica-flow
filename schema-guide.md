# nica JSON 작성 가이드 (스키마 v0.1)

LLM 없이 **직접 nica JSON을 작성**하는 사람을 위한 필드 설명서입니다.
빈 틀은 [`examples/template.nica.json`](./examples/template.nica.json)을 복사해서 시작하세요.

## 최상위 구조

```json
{
  "schemaVersion": "0.1",
  "project": { ... },
  "nodes": [ ... ],
  "edges": [ ... ]
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `schemaVersion` | ✅ | 항상 `"0.1"` |
| `project` | ✅ | 프로젝트 전체 정보 (내부 필드는 전부 생략 가능) |
| `nodes` | ✅ (1개 이상) | 함수 하나당 노드 하나 |
| `edges` | 생략 가능 | 함수 간 호출·데이터 관계 |

## project

| 필드 | 생략 시 | 설명 |
|---|---|---|
| `name` | `"unknown"` | 프로젝트명 |
| `goal` | `"unknown"` | 이 프로젝트를 왜 만들었는가 (1문장) |
| `deliverable` | `"unknown"` | 실행하면 무엇을 얻는가 (1문장) |
| `language` | `"unknown"` | 주 언어, 소문자 (예: `"python"`) |
| `entryPoint` | `"unknown"` | 실행이 시작되는 노드 id — 해당 노드가 보라색 테두리로 강조됨 |
| `flow` | `[]` | 대표 실행 흐름을 노드 id 배열로 (호출→복귀 포함, 최대 20개) — 뷰어의 ▶ 재생 기능이 이 순서를 따라감 |
| `globals` | `[]` | 전역변수: `{ name, type, purpose, writtenBy: [노드id], readBy: [노드id] }` |
| `rules` | `[]` | 코드에서 일관되게 관찰되는 규칙 (문자열 배열) |

## nodes[] — 함수 하나당 노드 하나

| 필드 | 필수/생략 시 | 설명 |
|---|---|---|
| `id` | ✅ | `"파일경로::함수명"`, 클래스 메서드는 `"파일경로::클래스.메서드"`. **edges·flow에서 이 값을 그대로 참조하므로 오타 금지** |
| `name` | ✅ | 함수명 (카드 머리에 표시) |
| `sourceLoc` | ✅ | `{ "file": "파일명", "lines": [시작줄, 끝줄] }` — 함수 정의의 실제 위치 |
| `purpose` | `"unknown"` | 이 함수가 존재하는 이유 (1문장) |
| `inputs` | `[]` | 매개변수 `{ name, type }[]` — 카드 왼쪽에 연결 포트가 생김 |
| `outputs` | `[]` | 반환값 `{ name, type }[]` — 카드 오른쪽에 연결 포트가 생김. 이름이 마땅치 않으면 `"return"` |
| `locals` | `[]` | 중요한 지역변수만 최대 5개: `{ name, type, purpose }[]` |
| `globalsUsed` | `[]` | `{ name, mode }[]` — `mode`는 `"read"` 또는 `"write"`만 허용. `name`은 `project.globals`에 있어야 함 |
| `effects` | `[]` | 외부 효과: `"db"` `"file"` `"network"` `"console"` `"ui"` `"other"` 중 해당하는 것들. 순수 함수면 `["none"]` |
| `errors` | `[]` | `"에러타입 — 발생 조건"` 형식의 문자열 배열 |
| `constraints` | `[]` | 올바른 동작을 위한 전제조건·제약 (문자열 배열) |
| `trigger` | `null` | 이벤트 핸들러처럼 호출자 없이 외부 계기로 실행되는 함수면 트리거 이름 (예: `"click"`, `"timer"`) — 카드 머리에 주황 배지로 표시됨 |

## edges[] — 함수 간 관계

| 필드 | 필수/생략 시 | 설명 |
|---|---|---|
| `from`, `to` | ✅ | 노드 id (`nodes[].id`와 정확히 일치해야 함) |
| `type` | ✅ | `"call"`(빨강 실선, 호출) / `"data"`(파랑 점선, 데이터 흐름) / `"error"`(주황 점선, from의 예외를 to가 잡음) |
| `via` | `""` | `data` 엣지에서 전달되는 값의 이름. **from 노드의 `outputs` 이름/ to 노드의 `inputs` 이름과 일치하면 해당 필드 포트에 꽂힘** (불일치 시 노드 머리에 연결). `error` 엣지면 예외 타입명 |
| `condition` | `null` | 조건부로만 발생하는 관계면 조건을 문자열로 (엣지 라벨로 표시됨) |
| `loop` | `false` | 반복문 안에서 일어나는 호출/전달이면 `true` (라벨에 `loop` 표시) |
| `async` | `false` | await·콜백·스레드 등 비동기 실행이면 `true` (라벨에 `async` 표시) |
| `sourceLoc` | 생략 가능 | 호출/전달이 일어나는 위치 |

## 작성 순서 추천

1. `nodes` — 함수마다 노드를 먼저 만든다 (id 규칙 준수)
2. `edges` — 호출 관계(`call`)부터, 그다음 데이터 흐름(`data`)
3. `project.flow` — 대표 실행 경로를 노드 id로 나열
4. 뷰어에 붙여넣기 — 참조 오류(없는 id 등)는 뷰어가 **경고 목록으로 알려줌**

## 자주 하는 실수

- `edges`의 `from`/`to`가 `nodes[].id`와 불일치 → 해당 엣지는 경고와 함께 **제외됨**
- `via`가 `outputs`/`inputs`의 `name`과 다름 → 필드 포트가 아닌 노드 머리에 연결됨
- `flow`·`globalsUsed`에 존재하지 않는 id/이름 → 경고 표시
- JSON에 주석(`//`)이나 트레일링 콤마 → **파싱 실패** (JSON 표준이 허용하지 않음)
