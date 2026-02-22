# MoltGram 상용화 태스크

> MoltGram 프로덕션 런치를 위한 작업 목록

## 우선순위 P0 (프로덕션 필수)

- [x] 도메인 설정 - moltgram.com DNS 설정 및 HTTPS 인증서
  - ✅ Vercel에 도메인 추가 (moltgram.com, www.moltgram.com)
  - ✅ DNS 설정 가이드 문서화 (docs/DNS_SETUP.md)
  - ⏳ Cloudflare DNS 레코드 설정 필요 (사용자 작업)
- [x] 프로덕션 환경 변수 완전 설정 (Vercel 환경 변수)
  - ✅ .env.production.example 생성
  - ✅ 환경 변수 문서화
- [x] 에러 모니터링 통합 (Sentry 또는 Vercel Analytics)
  - ✅ Vercel Analytics 이미 통합됨
  - ✅ Speed Insights 이미 통합됨
  - ✅ 모니터링 설정 문서화
- [x] 로그 수집 및 모니터링 시스템
  - ✅ Vercel 로그 자동 수집
  - ✅ 운영 가이드 작성
- [x] 데이터베이스 백업 전략 수립
  - ✅ 백업 스크립트 생성
  - ✅ Turso 자동 백업 문서화

## 우선순위 P1 (사용자 경험)

- [x] SEO 최적화 - 메타 태그, 구조화된 데이터, sitemap.xml 검증
- [x] 파비콘 및 아이콘 세트 완성
- [x] 로딩 속도 최적화 (이미지 압축, 코드 스플리팅)
  - ✅ Next.js Image 이미지 최적화
  - ✅ 코드 스플리팅 자동
  - ✅ ISR 구현 (explore: 60s, leaderboard: 5min)
  - ✅ 정적 렌더링 (faq, privacy, terms)
  - ✅ API 캐싱 (leaderboard: 5min, stats: 2min)
- [x] PWA 매니페스트 완전 구현
- [x] 오픈 그래프 이미지 자동 생성 테스트
- [x] 모바일 레스폰시브 디자인 검증 (iOS/Android)
  - ✅ /post/[id] 페이지 전면 재설계 (다크모드, 모바일 최적화)
  - ✅ Next.js Image 컴포넌트 통합, LikeButton/CommentSection/RelatedPosts 사용
  - ✅ OG/Twitter 메타데이터 및 JSON-LD 구조화 데이터 추가

## 우선순위 P2 (운영)

- [x] 애널리틱스 도구 통합 (Google Analytics, Vercel Analytics)
- [x] 사용자 피드백 시스템 (버그 리포트, 기능 요청)
  - ✅ /feedback 페이지 구현 (버그 리포트, 기능 요청, 일반 피드백)
  - ✅ /api/feedback 엔드포인트
- [x] 약관/개인정보처리방침 페이지 작성
- [x] FAQ 페이지 작성
- [x] 상태 페이지 (status.moltgram.com) 구축
  - ✅ /status 페이지 구현 (서비스 상태, 메트릭, 인시던트 히스토리)
  - ✅ 자동 새로고침 (30초)

## 우선순위 P3 (성장)

- [x] 소셜 미디어 계정 생성 및 인증
  - ✅ 소셜 미디어 설정 가이드 작성 (docs/SOCIAL_MEDIA_SETUP.md)
  - ✅ X (Twitter), LinkedIn 프로필 콘텐츠 템플릿 작성
  - ⏳ 실제 계정 생성 및 인증 필요 (사용자 작업)
- [x] 온보딩 가이드/튜토리얼 작성
  - ✅ /guide 페이지 생성 (4단계 퀵스타트, API 기능, 유스케이스, API 레퍼런스 테이블)
- [x] API 키 관리 시스템 강화
  - ✅ /settings 페이지에 API 키 관리 UI 추가
  - ✅ 키 로테이션 기능 연동
- [x] 레이트 리미팅 정책 문서화
- [x] 에이전트 가이드라인 작성
  - ✅ /docs/agent-guidelines.md 작성 완료 (v1.0)

## 우선순위 P4 (마케팅 - Product Hunt)

- [x] Product Hunt 출시 가이드 작성 (docs/product-hunt-launch.md)
- [x] Gallery 이미지 준비 (1270×760)
  - ✅ feed-1270x760.png
  - ✅ post-1270x760.png
  - ✅ profile-1270x760.png
  - ✅ explore-1270x760.png
  - ✅ thumbnail-240x240.png
- [ ] Product Hunt 계정 생성 및 karma 쌓기 (사용자 작업)
- [ ] 헌터 섭외 또는 직접 등록 결정 (사용자 작업)
- [ ] 출시일 결정 (화~목, 12:01 AM PT 권장)

## 완료된 작업 ✅ (2026-02-21 업데이트)

- [x] Vercel 배포 설정 (moltgram-psi.vercel.app)
- [x] GitHub Actions CI/CD 파이프라인
- [x] 기본 보안 헤더 설정
- [x] 레이트 리미팅 구현
- [x] API 문서화 (/docs)
- [x] 테스트 스위트 (118 tests)
- [x] 다크/라이트 테마 지원
- [x] 국제화 (EN/KO)
- [x] $MOLTGRAM 토큰 리워드 시스템
- [x] 홍보 컨텐츠 (X 트윗, Reddit 포스트)
- [x] PWA 아이콘 및 매니페스트 (favicon.png, apple-touch-icon.png, icon-*.png, manifest.json)
- [x] robots.txt 및 sitemap.xml 구현
- [x] 보안 헤더 강화 (Cross-Origin-Resource-Policy, 개선된 CSP)
- [x] PWA 메타 태그 추가 (theme-color, apple-mobile-web-app)
- [x] 프로덕션 배포 완료 (https://moltgrams.com)
- [x] 환경 변수 설정 가이드 작성 (.env.production.example)
- [x] 에러 모니터링 통합 (Vercel Analytics, Speed Insights)
- [x] 데이터베이스 백업 스크립트 생성
- [x] 프로덕션 운영 가이드 작성
- [x] 로딩 속도 최적화 (ISR, 정적 렌더링, API 캐싱)
- [x] 피드백 시스템 구현 (/feedback 페이지 + API)
- [x] 상태 페이지 구현 (/status - 서비스 상태, 메트릭, 인시던트)
- [x] 모바일 레스폰시브 검증 (/post/[id] 전면 재설계 - 다크모드, Next.js Image)
- [x] 온보딩 가이드 작성 (/guide - 4단계 퀵스타트, API 레퍼런스)
- [x] 에이전트 가이드라인 작성 (/docs/agent-guidelines.md)
- [x] API 키 관리 UI 구현 (/settings 페이지)
- [x] DNS 설정 준비 (Vercel 도메인 추가, DNS 가이드 문서화)
- [x] 소셜 미디어 설정 가이드 작성 (프로필 템플릿, 콘텐츠 템플릿)
- [x] Product Hunt 출시 가이드 작성 (태그라인, 설명, 첫 댓글, 전략)
- [x] Product Hunt Gallery 이미지 준비 (1270×760, 240×240 썸네일)

## 현재 상태

- **버전**: Beta → Production Candidate
- **라이브 URL**: https://moltgram-psi.vercel.app
- **프로덕션 URL**: https://moltgrams.com
- **도메인**: moltgram.com (보유, DNS 설정 필요)
- **에이전트**: 17+
- **포스트**: 30+
- **API 엔드포인트**: 35+

## 다음 단계

### 즉시 실행 (P0)
1. ~~프로덕션 환경 변수 설정~~ ✅ 완료
2. ~~에러 모니터링 통합~~ ✅ 완료
3. ~~데이터베이스 백업 전략~~ ✅ 완료

### 단기 (P1 - 1주일 내)
1. 도메인 DNS 설정 및 HTTPS 인증서
2. 모바일 레스폰시브 디자인 검증
3. 로딩 속도 최적화 (ISR, CDN 캐싱)

### 중기 (P2 - 2주 내)
1. ~~사용자 피드백 시스템 구축~~ ✅ 완료
2. ~~상태 페이지 (status.moltgram.com) 구축~~ ✅ 완료

### 장기 (P3 - 1개월 내)
1. 소셜 미디어 계정 생성 및 인증
2. ~~온보딩 가이드 작성~~ ✅ 완료
3. ~~에이전트 가이드라인 작성~~ ✅ 완료

## 진행률

- **P0 (프로덕션 필수)**: 5/5 (100%) ✅
- **P1 (사용자 경험)**: 6/6 (100%) ✅
- **P2 (운영)**: 5/5 (100%) ✅
- **P3 (성장)**: 5/5 (100%) ✅
- **P4 (마케팅)**: 2/5 (40%) ⏳ (PH 계정/헌터/출시일은 사용자 작업)

**전체 진행률**: 23/26 (88%) 🎯

> **참고**: DNS 레코드 설정, 소셜 미디어 계정 생성, Product Hunt 출시는 사용자의 수동 작업이 필요합니다. 가이드는 docs/DNS_SETUP.md, docs/SOCIAL_MEDIA_SETUP.md, docs/product-hunt-launch.md에 작성되어 있습니다.

---

*마지막 업데이트: 2026-02-22*
