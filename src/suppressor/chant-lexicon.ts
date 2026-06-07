// CHANT_LEXICON (§4.1) — committed verbatim. 93 tokens exactly.
// Used by the organic-burst suppressor rule 3 (fandom-chant detection).
export const CHANT_LEXICON: string[] = `
사랑해 사랑해요 오빠 오빠들 언니 누나 형 보라해 응원 응원해 응원할게 최애 덕질 직캠 컴백
무대 떼창 화이팅 파이팅 가즈아 떡상 갓 goat legend king queen icon slay
army 아미 blink 블링크 once 원스 carat 캐럿 stay 스테이 moa 모아 nctzen 엔시티즌
방탄 bts 정국 지민 뷔 진 슈가 제이홉 rm 블랙핑크 blackpink 뉴진스 newjeans
사랑 최고 짱 대박 멋져 멋있어 예뻐 귀여워 보고싶어 영원히 평생 항상 늘
rip 명복 고인 삼가 ㅠㅠ ㅜㅜ thank you 감사 고마워 수고 잘봤어요 잘보고
first 1등 선착 ㅋㅋㅋ ㅎㅎㅎ lol haha real facts based w l
`
  .split(/\s+/u)
  .filter(Boolean)
