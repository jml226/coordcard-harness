# CoordCard

**유튜브 댓글창의 "조직적 댓글 부대"를 잡아, 증거와 함께 빨간 카드로 박제하는 크롬 MV3 확장 — 단, 개인은 절대 범인 취급하지 않는다.**

당신이 어떤 영상 댓글창에서 느낀 그 위화감 — *"왜 똑같은 칭찬이 30개씩 동시에 달리지?"* — 그게 착각인지 진짜 작전인지, 지금까지는 확인할 방법이 없었습니다. CoordCard는 툴바 버튼 한 번으로 그걸 **수치로 판정**합니다. 거의-동일한 댓글이 짧은 시간에 여러 계정으로 쏟아진 **무리(cluster)**를 찾아내 빨간 배지를 붙이고, *"왜 이게 조직적인지"*를 증거로 보여줍니다. 무리 밖의 댓글 한 개는 절대 건드리지 않습니다.

![demo](docs/demo.png)

---

## 1. 프로젝트 — 이게 왜 진짜 문제인가

### 30초 요약
유튜브 댓글 여론조작은 음모론이 아니라 **구글·맨디언트·국정원·학계가 분기마다 숫자로 적발하는 산업**입니다. 규모는 수천 채널, 수법은 판박이, 그런데 **일반 사용자 손에 쥐어진 무기는 "댓글 1개 신고 버튼"이 전부**입니다. CoordCard는 그 비대칭을 깹니다 — 작전의 *지문*인 "거의 동일한 텍스트 + 짧은 버스트 + 여러 계정"을 결정적 알고리즘으로 잡아, 증거와 함께 눈앞에 펼칩니다.

### 이건 "느낌"이 아니다 — 적발된 숫자들

| 무슨 일이 | 얼마나 | 출처 |
|---|---|---|
| 구글 TAG가 **한 분기에** PRC 연계 유튜브 채널을 통째로 종료 | **2,254 + 2,602 + 1,096개** (2026 Q1) | blog.google TAG |
| DRAGONBRIDGE/Spamouflage 부대의 실체 | **80%가 구독자 0명**, 영상 65%가 조회수 100 미만 — 자기들끼리 댓글 핑퐁 | Google TAG |
| 맨디언트가 본 제조법 | 사칭 계정 **같은 달 일괄 생성**, 아바타 공유, **거의 동일 텍스트** 살포 | Mandiant 2022 |
| 한국 한 영상에서 벌어진 일 | 의심 계정 **239개**, 기사 하나에 댓글 **2,698개**, 한 계정이 **하루 130개** | yna.co.kr (2024) |

핵심은 이겁니다: **수법이 "정형적"이라는 것.** 일괄 생성 계정 · 공유 아바타 · 거의 동일 텍스트 · 짧은 시간 버스트 · 자기들끼리 리플 — 이건 사람의 "직관"으로는 흐릿하지만, **기계의 결정적 알고리즘으로는 또렷한 패턴**입니다. CoordCard는 정확히 그 패턴만 봅니다.

### 절대 안 하는 것 (이게 더 중요하다)
힘 있는 도구일수록 *안 하는 것*이 정체성입니다.

- 🚫 **단일 댓글 채점 금지.** 댓글 하나만 보고 "조작범"이라 하는 건 범주 오류. **탐지된 무리에 속할 때만** 표시합니다.
- 🚫 **사람 라벨링 금지.** 라벨은 오직 한 문장 — **"Matches coordinated-posting patterns in this video"**. `bot / 외국인 / 특정 국적 / 공작 / 간첩` 같은 단어는 소스·번들 어디에도 못 들어가게 `forbidden-words.spec`이 빌드에서 강제 차단합니다.
- 🚫 IP 추적 ✗ · 영상 간 댓글 이력 수집 ✗ · 자동 신고 제출 ✗ · ML 블랙박스 모델 ✗.

> CoordCard는 **무리(패턴)**를 지목하지, **사람**을 지목하지 않습니다. 그게 이 도구가 선동 도구가 되지 않는 이유입니다.

### "조직적"의 정의 — 추측이 아니라 공식 (점수 알고리즘 v2)
v1(단어 3-gram)은 바꿔쓰기를 놓치고 팬덤 떼창을 오탐했습니다. v2는 전면 재설계됐습니다.

- **① 군집 구성** — 정규화(소문자·URL·이모지·구두점 제거·NFKC) 후 **글자 4-gram Jaccard 유사도**. `sim ≥ 0.70`이면 "거의 중복" → union-find로 무리 묶음. *글자 단위*라서 바꿔쓰기·띄어쓰기 변형·유사문자(homoglyph)까지 관통합니다. 5토큰 미만(ㅋㅋㅋ, lol)은 노이즈로 스킵.
- **② 4개 신호** — `T` 텍스트 중복 강도 · `B` 시간 버스트(상대시각 버킷) · `R` 리플라이-링(같은 문구가 여러 스레드에 복제) · `A` 계정 신규성(API 모드 한정).
- **③ 유기적 버스트 억제기** — 추도(RIP·고인의 명복)·웃음 폭주·**팬덤 떼창 사전(93토큰)**·이모지 밀도 ≥0.30 중 하나라도 걸리면 `SUPP=true` → **점수가 아무리 높아도 표시 안 함**. BTS 떼창을 공작으로 매도하지 않기 위한 결정적 안전장치.
- **④ 합성 점수(no-API)** — `S = 0.50·T + 0.30·B + 0.20·R`
- **⑤ 플래그 4중 가드** — `S ≥ 0.70` **그리고** 무리 크기 ≥ 3 **그리고** 신호 2개 이상 양수 **그리고** `SUPP=false`. 네 개 다 충족해야만 빨간 카드.

**17행 합성 픽스처 = 알고리즘의 결정적 정답지** (momus 7라운드 검증으로 임계값·가중치 동결):

| 무리 | 구성 | 점수 S | 판정 | 무엇을 증명하나 |
|---|---|:---:|:---:|---|
| **X** | 동일 문구 5인 | **0.80** | 🔴 **FLAGGED** | 진짜 작전은 잡는다 |
| **Z** | 리플라이-링 3인 | 0.68 | ⚪ NOT | 작은 무리는 과탐 안 한다 (0.70 미만) |
| **M** | 팬덤 떼창 5인 | 0.80 | 🛡️ **SUPPRESSED** | 0.80이어도 떼창은 억제기가 막는다 |

> **잡을 건 잡고(X), 작은 건 안 잡고(Z), 떼창은 막는다(M).** 이 세 줄이 CoordCard의 영혼입니다.

---

## 2. 화면으로 보는 데모

위 스크린샷(`docs/demo.png`)은 가짜 그림이 아닙니다. **실제 파이프라인** `runScan(document)` → `scrape` → `cluster` → `score` → `injectBadges`를 실제 유튜브 영상 DOM에 돌린 결과이고, 한 화면에 알고리즘의 세 경로가 동시에 살아 있습니다:

- **🔴 빨간 카드 (군집 X — FLAGGED)** — `@user8x3k1`·`@k9m2x7q`·`@zz1p4w8`·`@x7q2k9m1`·`@q7w8e9r2`, 다섯 계정이 *"이 영상 정말 최고예요 꼭 보세요 추천합니다"* 동일 문구를 짧은 시간에 도배. `S=0.80`으로 플래그되어 각 댓글에 **"Matches coordinated-posting patterns in this video — 80% · 5 near-duplicate comments in the same recent window"** 배지.
- **⚪ 배지 없음 (organic — 정직성)** — `@normaluser`의 *"저는 이 의견에 동의하지 않습니다 근거가 부족해 보이네요"*. 무리에 안 속한 정상 반대 의견은 **배지가 없습니다.** 그냥 의견이 다른 사람을 조작범으로 몰지 않는다는 산 증거.
- **🛡️ 억제됨 (군집 M — SUPPRESSED)** — `@bts_fan_kr`·`@army4ever`의 *"오빠 정국 사랑해 영원히 응원할게 보라해 아미"*. 5명 동일 문구라 `S=0.80`이지만, **떼창 사전**이 잡아 표시 안 함. 팬덤을 작전으로 오탐하지 않는다는 증거.

> ⚠️ 데모의 X·M 무리는 *시연용 합성 데이터*입니다. 실제 이 영상의 진짜 댓글은 organic해서 **라이브 스캔 시 플래그 0개**였습니다 — CoordCard는 **없는 조작을 지어내지 않습니다.** 이 화면은 "만약 조작이 있었다면 이렇게 박제된다"의 시연입니다.

### 직접 써보기
```
1. pnpm i && pnpm build
2. chrome://extensions → 개발자 모드 ON → "압축해제된 확장 프로그램을 로드" → dist/ 선택
3. 툴바에 CoordCard 아이콘 등장
4. 유튜브 영상(watch?v=...) 열고 댓글 스크롤로 로드
5. CoordCard 아이콘 → Scan
```

---

## 3. 하네스 — 이 확장을 사람 손 0번으로, 90분에 만든 기계

여기서부터가 진짜입니다. **이 확장은 사람이 코딩한 게 아닙니다.** "랄프톤 하네스"라는 Claude Code 플러그인에 엔터를 한 번 치면, AI 에이전트가 **90분 동안 사람 개입 0번**으로 V0부터 V7까지 빌드하고, 테스트를 짜고, 스스로 검증하고, 출하 판정까지 내립니다. 하네스는 *제품*이 아니라 **에이전트가 표류·정지·파괴·예산소진 없이 목적지까지 흘러가도록 강제하는 배수관**입니다.

핵심 통찰 한 줄: **"루프를 안 멈추게 하는 것"과 "루프를 목적지로 수렴시키는 것"은 완전히 다른 문제다.** Stop 훅이 *추진력*(안 멈춤)을 주고, 그 위에 다섯 개의 *벽*이 *방향*을 줍니다.

### 막아야 할 4대 자율-실패 모드
무인 에이전트가 망하는 길은 정확히 넷이고, 하네스의 모든 코드는 이 넷을 막기 위해 존재합니다.

| 실패 모드 | 무슨 일이 벌어지나 | 어느 벽이 막나 |
|---|---|---|
| **표류 (drift)** | 미션 잊고 엉뚱한 걸 만든다 | SessionStart 앵커 |
| **조기 정지 (early stop)** | "이제 뭐 할까요?" 하고 멈춘다 | Stop 루프 엔진 |
| **데이터 파괴 (destruction)** | 누적 자산을 덮어쓴다 | PreToolUse veto + 멱등 부트스트랩 |
| **예산 소진 (budget burn)** | 느린 검증/삽질에 90분을 태운다 | 스코프 거버너 + 검증 사다리 |

### 작동 원리 — 모든 훅은 "진짜로" 막는다
각 훅은 stdin으로 들어온 이벤트 JSON을 `jq`로 파싱하고, **진짜로 차단/주입**합니다. echo 경고나 "제발 하지 마세요" 프롬프트가 아니라, **exit 코드와 `permissionDecision`으로 물리적으로 막습니다.** 전부 `hooks/hooks.json`에 `bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/*`로 와이어링됩니다.

| 벽 | 이벤트 (matcher) | 스크립트 | 실제 동작 |
|---|---|---|---|
| 미션 앵커 | `SessionStart` (startup\|resume\|clear\|compact) | `session-start.sh` | startup엔 `mission-anchor.md` 그대로 주입; compact엔 `reanchor.md` + 현재 `state.md`를 `{{INJECTED_STATE}}`에 splice |
| 도구 veto | `PreToolUse` (Bash\|Write\|Edit\|MultiEdit) | `pre-tool-use.sh` | 항상 exit 0. `coordcard-PRD.md`로 끝나는 Write/Edit, `rm -rf`/`rm -fr` Bash → `permissionDecision:"deny"` JSON으로 **거부** |
| 출력 검증 | `PostToolUse` | `post-tool-use.sh` | Write 내용에 §4.4 금지어(`grep -iowE` 단어 단위) → 경고; 테스트 출력에 `FAIL`/`failed`/`AssertionError` 또는 exit≠0 → "red" 경고 주입 |
| 스코프 거버너 | `PostToolUse` | `scope-governor.sh` | 경과분 계산 후 시간대별 자동 스코프 컷 (아래 표) |
| 무결성 감시 | `PostToolUse` | `watchdog.sh` | `results.jsonl` 스캔 → 무결성 위반 시 `.harness/degraded` 기록 (아래) |
| 압축 가드 | `PreCompact` (manual\|auto) | `pre-compact.sh` | 압축 직전, "PRD와 `.harness/{state,scope,continue,progress}`를 다시 읽어라" 리마인드 주입 |
| 루프 엔진 | `Stop` (matcher 없음 — 항상 실행) | `stop.sh` | 계속하려면 block, 막다른 곳에선 스스로 항복 (아래) |
| 부트스트랩 | 명령 `[0]` (훅 아님) | `bootstrap.sh` | 작업 저장소 시드 + fail-closed (아래) |

### 🔧 루프 엔진 (`stop.sh`) — 하네스에서 가장 중요한 코드
Claude Code 공식 Stop 훅 의미론을 정확히 따릅니다. 매 정지 시점마다 이 순서로 판정하고, **전부 exit 0**입니다 (차이는 stdout):

1. `stop_hook_active == true` → **빈 출력** (자기 자신이 만든 무한루프 가드)
2. `.harness/DONE` 존재 → **빈 출력** (출하 완료, 세션 정지 허용)
3. `.harness/ABORT` 존재 → **빈 출력** (예산/실패로 중단, 정지 허용)
4. `state.md`의 `stall_count ≥ 7` → **`.harness/ABORT` 기록 후 빈 출력** (스스로 항복)
5. 그 외 → 아래 JSON으로 **block**, `continue.md`를 다음 행동으로 주입:

```json
{
  "decision": "block",
  "reason": "<continue.md에서 추린 다음 행동>",
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": "<continue.md 본문>"
  }
}
```

> **왜 7사이클에 스스로 항복하나?** Claude Code는 Stop 훅이 **8번 연속 block**하면 자동으로 override해 통제권을 가져갑니다. 그래서 루프 엔진은 같은 실패가 7사이클 반복되면(`stall_count ≥ 7`) **강제 override 당하기 전에** 자기 손으로 `ABORT`를 쓰고 깨끗하게 빠집니다. 통제권을 빼앗기느니 스스로 내려놓는 설계.
> (참고: `stop.sh`는 `DONE`을 *읽기만* 합니다 — 출하 판정과 `DONE` 기록은 §10.A 셸 체크를 통과한 뒤 별도로 일어납니다.)

### 🧠 블랙보드 — "디스크가 곧 기억"
무인 에이전트의 최대 적은 *컨텍스트 증발*입니다. 그래서 모든 상태를 컨텍스트가 아니라 작업 저장소의 `.harness/`에 둡니다. 컨텍스트가 압축돼도, 세션이 죽어도, 다음 사이클이 **디스크에서 그대로 이어받습니다.** `validate-blackboard.sh`가 이 스키마를 강제합니다.

| 파일 | 내용 | 불변식 |
|---|---|---|
| `start_ts` | 90분 예산 시계 (epoch초) | 부트스트랩이 **단 한 번** 기록, 절대 리셋 안 함 |
| `state.md` | `slice`(V0~V12) · `last_action` · `last_l1/l2/codex` | 5개 키 항상 존재 |
| `progress.md` | 사이클별 로그 | **append-only**, 절대 truncate 안 함 |
| `results.jsonl` | 검증 1줄/실행 `{ts,layer,exit_code,duration_ms,suite,asserted}` | `asserted:false`면 watchdog가 경고 |
| `continue.md` | 다음 구체적 행동 | 사이클마다 재생성 |
| `scope.json` | `{cuts:[...], frozen_to}` | 거버너가 컷을 누적 기록 |
| `bootstrap.ok` | 시드 증명 `{plugin_version,cwd,prd_lines,node,pnpm,l2_ready,ts}` | fail-closed 통과의 영수증 |
| `DONE` / `ABORT` / `degraded` | 센티넬 | 존재 자체가 신호 |

### ⏱️ 스코프 거버너 (`scope-governor.sh`) — LLM 판단 0%, 순수 시간 산수
경과 시간을 `now(HARNESS_NOW 또는 date +%s) − start_ts`로 분 단위 내림 계산한 뒤, **가장 높은 밴드부터** 적용합니다. AI의 판단이 아니라 **bash 산술**이라 흔들리지 않습니다 (테스트는 `HARNESS_NOW` 모의 시계로 결정적 검증).

| 시점 | 조건 | 액션 | `scope.json` 부작용 |
|---|---|---|---|
| **T+30** | V0~V6 미완 | V11(신고)·V10(블록리스트) 드롭 | `cuts += V11, V10` |
| **T+60** | V7 미완 | V9·V8 드롭, V7에 올인 | `cuts += V9, V8` |
| **T+75** | V7 여전히 미완 | logic-only 데모로 **freeze** | `frozen_to = "demo-path"` |
| **T+85** | 최종 | §10.A 셸 체크 → DONE 또는 ABORT | (변경 없음, 판정만) |

### 🛡️ 무결성 감시 (`watchdog.sh`) — "통과했지만 거짓말인 테스트"를 잡는다
가장 교묘한 자기기만은 *"초록불인데 아무것도 검증 안 한 테스트"*입니다. watchdog는 `results.jsonl`을 스캔해 둘을 잡습니다:
- **존재만 하는 테스트**: `exit_code:0`인데 `asserted:false` (실행은 됐지만 단언이 0개) → `.harness/degraded` 기록 + 경고.
- **플래키 테스트**: 같은 suite가 0과 non-0 exit를 **둘 다** 기록한 이력 (순서 무관, 섞여만 있으면) → 비결정성 경고.

### 🪜 검증 3단 사다리 — 싼 것 먼저, 비싼 것 최후
예산 소진을 막는 핵심: 검증을 *비용 순서*로 쌓습니다.
- **L1** Vitest 합성 17행 픽스처 = **유일한 결정적 차단 게이트.** L1이 green이어야 다음 슬라이스로.
- **L2** playwright 실유튜브 헤드리스 스모크 = **비차단.** 실제 페이지는 비결정적이라 chromium 없으면 skip+로그. "픽스처는 되는데 실물 셀렉터가 바뀜"의 빈틈을 메우는 confidence 신호.
- **Codex** 코드리뷰 = L1 통과 후 제한적으로.

### ✅ "출하됨(Shipped)"의 정의 — §10.A, 의견이 아니라 8개의 이진 셸 체크
에이전트가 "다 됐어요"라고 *선언*하는 게 아니라, **8개의 셸 술어가 전부 통과**해야만 출하입니다:
1. `pnpm test` 통과 (스펙 10개+) · 2. `pnpm build` + `dist/manifest.json`(MV3) · 3. 매니페스트 정적 검사(matches+권한) · 4. L1 합성 픽스처 파이프라인 · 5. jsdom 인젝터 스모크 · 6. `forbidden-words.spec`(src+dist) · 7. `pnpm package` → zip(manifest 포함) · 8. README/MANUAL/SHIP 존재.

8개 전부 green일 때만 `DONE`. **"green은 스스로 정의하는 게 아니다 — 술어 집합이 정의한다."**

### 🐞 90분 동안 이 규율이 실제로 잡은 버그 3개
이 설계가 장식이 아니란 증거 — 실행 중 실제로 잡힌 것들:
1. **시작 즉시 T+85 freeze 오발** — `start_ts`가 초기화 전이라 거버너가 "이미 85분"으로 오판. 부트스트랩이 시계를 먼저 박아 해결.
2. **NFKC 정규화가 억제기 regex를 깨뜨림** — 호환 자모(ㅋ U+314B → U+110F) 재작성 때문에 떼창 사전의 literal 매칭이 빗나감. 양쪽을 같은 형태로 정규화해 해결.
3. **(L2의 보상) 실제 유튜브엔 `data-cid`가 0개** — 픽스처는 `data-cid` 전제인데 라이브 DOM은 그게 없어 원래 스크래퍼는 실제 유튜브에서 댓글 0개를 긁었을 것. `ytd-comment-view-model` 폴백을 추가하고, 캡처한 실제 160-thread DOM 스냅샷에 대한 결정적 테스트로 증명.

---

## 검증 명령
```
pnpm test            # 단위 테스트 (알고리즘 결정적 정답지 포함)
pnpm build           # dist/manifest.json (manifest_version 3)
pnpm validate:ship   # MV3 + youtube matches + 권한 검사
pnpm package         # coordcard-0.1.0.zip
```

## 라이선스
MIT
