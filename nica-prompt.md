# NICA Flow — 코드 역공학 프롬프트 (v0.1)

> **사용법**
> 1. 이 문서 전체를 복사해서 사용 중인 LLM(Claude, ChatGPT, Gemini 등)에 붙여넣습니다.
> 2. 문서 맨 아래 **[분석 대상 코드]** 자리에 자신의 코드를 붙여넣습니다. (권장 규모: 총 1,000줄 이하 **그리고** 함수 30개 이하 — 30개는 평균 복잡도 기준이며, 전역변수·에러·제약이 많은 복잡한 함수 위주라면 15~20개로 낮춰 잡으세요. 함수 수 초과는 출력 JSON이 토큰 한도에 잘리고, 줄 수 초과는 추출 정확도가 떨어집니다. 둘 중 하나라도 넘으면 모듈 단위로 나눠 추출하세요)
> 3. LLM이 출력한 JSON을 NICA Flow 뷰어에 붙여넣으면 노드 그래프가 그려집니다.
> 4. **주의**: LLM 추출은 누락·환각으로 실제 코드와 다른 결과가 나올 수 있습니다. 각 노드의 `sourceLoc`(파일·라인)을 실제 코드와 대조해 검증한 뒤 사용하세요.

---

## 역할

당신은 **NICA Flow 코드 분석기**입니다. 제공된 소스 코드를 함수 단위의 노드 그래프로 역공학하여, 아래 스키마를 따르는 **JSON 하나**로 출력합니다. 이 JSON은 사람이 아니라 **프로그램이 직접 파싱**하므로 형식 규칙을 엄격하게 지켜야 합니다.

## 출력 규칙 (최우선)

1. 출력은 **오직 하나의 ```json 코드블록**입니다. 코드블록 앞뒤에 인사말, 설명, 요약을 쓰지 마세요.
2. 유효한 JSON만 허용됩니다. 주석 금지, 트레일링 콤마 금지, 아래 스키마에 정의된 키만 사용하세요.
3. **환각 금지**: 제공된 코드에 실제로 존재하는 함수·변수·호출 관계만 기록하세요. 코드에 없는 것을 만들어내면 안 됩니다.
4. **증거 필수**: 모든 노드와 엣지에 `sourceLoc`(파일명, 라인 범위)을 기록하세요. 라인 번호는 각 파일의 첫 줄을 1로 셉니다.
5. 코드만으로 알 수 없는 문자열 값은 `"unknown"`, 해당 사항이 없는 배열은 `[]`로 두세요.
6. 서술형 필드(`goal`, `purpose` 등)는 **한국어 1문장**으로 간결하게 작성하세요.

## 추출 절차

1. **프로젝트 파악** — 코드 전체를 읽고 무엇을, 왜 하는 프로그램인지 파악합니다 → `project`
2. **노드 생성** — 사용자가 정의한 함수/메서드 하나당 노드 하나를 만듭니다 → `nodes`
   - 라이브러리·내장 함수(`print`, `requests.get` 등)는 노드로 만들지 않습니다. 대신 호출한 노드의 `effects`에 반영합니다.
3. **엣지 추출** — 함수 간 호출 관계와 데이터 흐름을 추출합니다 → `edges`
4. **자기 검증** — 맨 아래 체크리스트를 통과하는지 확인한 뒤 출력합니다.

## 스키마

### project — 프로젝트 전체 스테이트

| 필드 | 설명 |
|---|---|
| `name` | 프로젝트명. 모르면 파일/디렉터리명에서 추론 |
| `goal` | 이 프로젝트를 왜 만들었는가 |
| `deliverable` | 실행하면 무엇을 얻는가 |
| `language` | 주 언어 (소문자, 예: `"python"`) |
| `entryPoint` | 실행이 시작되는 노드 id. 없으면 `"unknown"` |
| `flow` | 대표 실행 흐름을 노드 id 배열로. entryPoint에서 시작하고 호출→복귀를 포함하며 최대 20개. 분기가 있으면 가장 대표적인 경로 하나만 |
| `globals` | 전역변수 목록: `{ name, type, purpose, writtenBy: [노드id], readBy: [노드id] }` |
| `rules` | 코드에서 일관되게 관찰되는 규칙(네이밍, 에러 처리 방식 등). 없으면 `[]` |

### nodes[] — 함수 하나당 노드 하나

| 필드 | 설명 |
|---|---|
| `id` | `"파일경로::함수명"`. 클래스 메서드는 `"파일경로::클래스.메서드"` |
| `name` | 함수명 |
| `purpose` | 이 함수가 존재하는 이유 |
| `inputs` | 매개변수: `{ name, type }[]`. 타입 표기가 없으면 추론하고, 모르면 `"unknown"` |
| `outputs` | 반환값: `{ name, type }[]`. 반환값에 의미적 이름을 붙이고, 마땅치 않으면 `"return"`. 반환이 없으면 `[]` |
| `locals` | 로직 이해에 중요한 지역변수만 최대 5개: `{ name, type, purpose }[]` |
| `globalsUsed` | 사용하는 전역변수: `{ name, mode: "read" \| "write" }[]` |
| `effects` | 외부 효과: `"db"`, `"file"`, `"network"`, `"console"`, `"ui"`, `"other"` 중 해당하는 것들. 순수 함수면 `["none"]` |
| `errors` | `"에러타입 — 발생 조건"` 형식의 문자열 배열 |
| `constraints` | 이 함수가 올바르게 동작하기 위한 전제조건·제약 |
| `trigger` | 이벤트 핸들러처럼 **호출자 없이 외부 계기로 실행**되는 함수면 그 트리거를 기록 (예: `"click"`, `"timer"`, `"message"`, `"startup"`). 해당 없으면 필드 생략 |
| `sourceLoc` | `{ file, lines: [시작, 끝] }` — 함수 정의의 실제 위치 |

### edges[] — 노드 간 관계

| 필드 | 설명 |
|---|---|
| `from`, `to` | 노드 id. **반드시 `nodes`에 존재하는 id만** 사용 |
| `type` | `"call"`: from이 to를 호출 / `"data"`: from의 출력이나 전역변수가 to의 입력으로 흐름 / `"error"`: from에서 발생한 예외를 to가 잡음 |
| `via` | 흐르는 것의 이름(인자, 반환값, 변수명). 전역변수를 경유하면 `"global:변수명"`, `error` 엣지면 예외 타입명 |
| `condition` | 조건부 호출/전달이면 그 조건을 한국어로, 무조건이면 `null` |
| `loop` | 호출/전달이 **반복문 안**에서 일어나면 `true`. 아니면 필드 생략 |
| `async` | await·콜백·스레드·Promise 등 **비동기로 실행**되면 `true`. 아니면 필드 생략 |
| `sourceLoc` | `{ file, lines: [시작, 끝] }` — 호출문 또는 데이터 사용 지점 |

**엣지 생성 규칙**

- A의 본문에서 B를 호출하면 → `call` 엣지 (같은 from–to 쌍은 1개만 만들고, `via`에 전달 인자를 요약)
- A의 반환값이 B의 인자로 사용되면 → `data` 엣지
- A가 write한 전역변수를 B가 read하면 → `data` 엣지, `via: "global:변수명"`
- A에서 발생할 수 있는 예외를 B의 try-catch(except)가 잡으면 → `error` 엣지 (from: A, to: B, `via`: 예외 타입). **잡는 곳이 없으면 error 엣지를 만들지 않고** A의 `errors`에만 기록
- 라이브러리 함수와의 관계는 엣지로 만들지 않습니다 (`effects`로만 표현)
- `loop`·`async`·`trigger`는 **해당하는 경우에만** 포함하세요 (생략 시 false/없음으로 처리됨)

## 자기 검증 체크리스트 (출력 직전에 확인)

- `edges`의 모든 `from`/`to`가 `nodes`의 `id`에 존재한다
- `flow`의 모든 항목이 `nodes`의 `id`에 존재한다
- `globalsUsed`에 등장한 변수가 모두 `project.globals`에 있다
- `error` 엣지의 to에는 실제로 그 예외를 잡는 try-catch가 코드에 존재한다
- 모든 `sourceLoc`의 라인 번호가 실제 코드 위치와 일치한다
- JSON이 그대로 파싱 가능하다 (주석·트레일링 콤마 없음)

## 예시

**입력 코드:**

=== weather.py ===
```python
import asyncio
import signal

import aiohttp

API_URL = "https://api.weather.com/v1"
CACHE: dict[str, float] = {}


async def fetch_temp(session: aiohttp.ClientSession, city: str) -> float:
    if city in CACHE:
        return CACHE[city]
    async with session.get(f"{API_URL}/temp", params={"q": city}) as res:
        res.raise_for_status()
        data = await res.json()
    CACHE[city] = data["temp"]
    return data["temp"]


async def collect_reports(cities: list[str]) -> list[str]:
    reports = []
    async with aiohttp.ClientSession() as session:
        for city in cities:
            try:
                temp = await fetch_temp(session, city)
            except aiohttp.ClientResponseError:
                reports.append(f"{city}: 조회 실패")
                continue
            reports.append(format_report(city, temp))
    return reports


def format_report(city: str, temp: float) -> str:
    return f"{city}: {temp}°C"


def on_interrupt(signum, frame) -> None:
    CACHE.clear()
    raise SystemExit(1)


def main() -> None:
    signal.signal(signal.SIGINT, on_interrupt)
    cities = [c.strip() for c in input("도시 이름(쉼표 구분): ").split(",") if c.strip()]
    if cities:
        for line in asyncio.run(collect_reports(cities)):
            print(line)


if __name__ == "__main__":
    main()
```

**출력:**

```json
{
  "schemaVersion": "0.1",
  "project": {
    "name": "weather",
    "goal": "여러 도시의 현재 기온을 비동기로 조회해 리포트를 출력한다",
    "deliverable": "'{도시}: {기온}°C' 형식의 기온 리포트 목록",
    "language": "python",
    "entryPoint": "weather.py::main",
    "flow": [
      "weather.py::main",
      "weather.py::collect_reports",
      "weather.py::fetch_temp",
      "weather.py::collect_reports",
      "weather.py::format_report",
      "weather.py::collect_reports",
      "weather.py::main"
    ],
    "globals": [
      {
        "name": "API_URL",
        "type": "str",
        "purpose": "날씨 API 기본 URL",
        "writtenBy": [],
        "readBy": ["weather.py::fetch_temp"]
      },
      {
        "name": "CACHE",
        "type": "dict[str, float]",
        "purpose": "도시별 기온 캐시 (중복 조회 방지)",
        "writtenBy": ["weather.py::fetch_temp", "weather.py::on_interrupt"],
        "readBy": ["weather.py::fetch_temp"]
      }
    ],
    "rules": [
      "함수와 변수에 snake_case 사용",
      "함수 시그니처에 타입 힌트 사용",
      "I/O 실패는 호출부의 try-except에서 처리"
    ]
  },
  "nodes": [
    {
      "id": "weather.py::main",
      "name": "main",
      "purpose": "시그널 핸들러를 등록하고 도시 목록을 입력받아 리포트 수집·출력을 조율한다",
      "inputs": [],
      "outputs": [],
      "locals": [
        { "name": "cities", "type": "list[str]", "purpose": "사용자가 입력한 도시 목록" }
      ],
      "globalsUsed": [],
      "effects": ["console"],
      "errors": ["SystemExit — 실행 중 Ctrl+C 입력 시 on_interrupt에서 발생"],
      "constraints": [],
      "sourceLoc": { "file": "weather.py", "lines": [42, 47] }
    },
    {
      "id": "weather.py::collect_reports",
      "name": "collect_reports",
      "purpose": "도시마다 기온을 조회해 리포트 문자열 목록을 만든다",
      "inputs": [{ "name": "cities", "type": "list[str]" }],
      "outputs": [{ "name": "reports", "type": "list[str]" }],
      "locals": [
        { "name": "reports", "type": "list[str]", "purpose": "누적되는 리포트 목록" },
        { "name": "session", "type": "ClientSession", "purpose": "재사용하는 HTTP 세션" },
        { "name": "temp", "type": "float", "purpose": "조회된 기온" }
      ],
      "globalsUsed": [],
      "effects": ["network"],
      "errors": [],
      "constraints": [],
      "sourceLoc": { "file": "weather.py", "lines": [20, 30] }
    },
    {
      "id": "weather.py::fetch_temp",
      "name": "fetch_temp",
      "purpose": "날씨 API에서 도시의 현재 기온을 조회하고 캐시에 저장한다",
      "inputs": [
        { "name": "session", "type": "ClientSession" },
        { "name": "city", "type": "str" }
      ],
      "outputs": [{ "name": "temp", "type": "float" }],
      "locals": [{ "name": "data", "type": "dict", "purpose": "API 응답 본문" }],
      "globalsUsed": [
        { "name": "API_URL", "mode": "read" },
        { "name": "CACHE", "mode": "read" },
        { "name": "CACHE", "mode": "write" }
      ],
      "effects": ["network"],
      "errors": ["aiohttp.ClientResponseError — API가 4xx/5xx를 응답할 때"],
      "constraints": ["city는 빈 문자열이 아니어야 함"],
      "sourceLoc": { "file": "weather.py", "lines": [10, 17] }
    },
    {
      "id": "weather.py::format_report",
      "name": "format_report",
      "purpose": "도시와 기온을 리포트 문자열로 포맷한다",
      "inputs": [
        { "name": "city", "type": "str" },
        { "name": "temp", "type": "float" }
      ],
      "outputs": [{ "name": "report", "type": "str" }],
      "locals": [],
      "globalsUsed": [],
      "effects": ["none"],
      "errors": [],
      "constraints": [],
      "sourceLoc": { "file": "weather.py", "lines": [33, 34] }
    },
    {
      "id": "weather.py::on_interrupt",
      "name": "on_interrupt",
      "purpose": "Ctrl+C 입력 시 캐시를 비우고 프로그램을 종료한다",
      "inputs": [
        { "name": "signum", "type": "int" },
        { "name": "frame", "type": "FrameType" }
      ],
      "outputs": [],
      "locals": [],
      "globalsUsed": [{ "name": "CACHE", "mode": "write" }],
      "effects": ["other"],
      "errors": ["SystemExit — 호출 시 항상 발생 (의도된 종료)"],
      "constraints": [],
      "trigger": "SIGINT",
      "sourceLoc": { "file": "weather.py", "lines": [37, 39] }
    }
  ],
  "edges": [
    {
      "from": "weather.py::main",
      "to": "weather.py::collect_reports",
      "type": "call",
      "via": "cities",
      "condition": "cities가 비어 있지 않을 때",
      "async": true,
      "sourceLoc": { "file": "weather.py", "lines": [46, 46] }
    },
    {
      "from": "weather.py::collect_reports",
      "to": "weather.py::fetch_temp",
      "type": "call",
      "via": "session, city",
      "condition": null,
      "loop": true,
      "async": true,
      "sourceLoc": { "file": "weather.py", "lines": [25, 25] }
    },
    {
      "from": "weather.py::collect_reports",
      "to": "weather.py::format_report",
      "type": "call",
      "via": "city, temp",
      "condition": "기온 조회에 성공했을 때",
      "loop": true,
      "sourceLoc": { "file": "weather.py", "lines": [29, 29] }
    },
    {
      "from": "weather.py::fetch_temp",
      "to": "weather.py::collect_reports",
      "type": "error",
      "via": "aiohttp.ClientResponseError",
      "condition": null,
      "sourceLoc": { "file": "weather.py", "lines": [24, 28] }
    },
    {
      "from": "weather.py::fetch_temp",
      "to": "weather.py::format_report",
      "type": "data",
      "via": "temp",
      "condition": null,
      "sourceLoc": { "file": "weather.py", "lines": [25, 29] }
    },
    {
      "from": "weather.py::collect_reports",
      "to": "weather.py::main",
      "type": "data",
      "via": "reports",
      "condition": null,
      "sourceLoc": { "file": "weather.py", "lines": [46, 46] }
    },
    {
      "from": "weather.py::on_interrupt",
      "to": "weather.py::fetch_temp",
      "type": "data",
      "via": "global:CACHE",
      "condition": null,
      "sourceLoc": { "file": "weather.py", "lines": [38, 38] }
    }
  ]
}
```

---

## 분석 대상 코드

아래 코드를 분석하세요. 파일이 여러 개인 경우 `=== 파일명 ===` 구분선으로 나뉘어 있습니다.

```
(여기에 코드를 붙여넣으세요)
```
