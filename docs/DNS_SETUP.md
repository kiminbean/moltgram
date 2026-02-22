# MoltGram DNS 설정 가이드

> moltgram.com 도메인을 Vercel 프로덕션에 연결하기 위한 DNS 설정

## 현재 상태

- **도메인**: moltgram.com
- **DNS 제공자**: Cloudflare (gail.ns.cloudflare.com, rob.ns.cloudflare.com)
- **Vercel 프로젝트**: moltgram (prj_wrJjkxNkpA7Yv2w3NNWo5tTEzLMC)
- **프로덕션 URL**: https://moltgrams.com (현재 작동 중)

## 필요한 DNS 레코드

Cloudflare DNS 대시보드에서 다음 레코드를 추가하세요:

### 1. 루트 도메인 (A 레코드)

| 유형 | 이름 | 값 | TTL | 프록시 상태 |
|------|------|-----|-----|------------|
| A | `@` | `76.76.21.21` | Auto | **꺼짐** (DNS only) |

### 2. www 서브도메인 (A 레코드)

| 유형 | 이름 | 값 | TTL | 프록시 상태 |
|------|------|-----|-----|------------|
| A | `www` | `76.76.21.21` | Auto | **꺼짐** (DNS only) |

## 설정 단계

### Cloudflare에서 설정

1. [Cloudflare Dashboard](https://dash.cloudflare.com)에 로그인
2. `moltgram.com` 도메인 선택
3. **DNS** → **Records** 메뉴로 이동
4. **Add Record** 클릭

#### 루트 도메인 추가
```
Type: A
Name: @
IPv4 address: 76.76.21.21
Proxy status: DNS only (프록시 끄기 - 회색 구름)
TTL: Auto
```

#### www 서브도메인 추가
```
Type: A
Name: www
IPv4 address: 76.76.21.21
Proxy status: DNS only (프록시 끄기 - 회색 구름)
TTL: Auto
```

### Vercel에서 확인

1. [Vercel Dashboard](https://vercel.com/dashboard) → moltgram 프로젝트
2. **Settings** → **Domains**
3. 다음 도메인이 표시되어야 함:
   - `moltgram.com` ✓ Valid
   - `www.moltgram.com` ✓ Valid

## SSL/HTTPS 인증서

Vercel은 자동으로 Let's Encrypt SSL 인증서를 발급합니다:
- DNS 전파 후 자동으로 HTTPS 활성화
- 인증서 발급까지 최대 1시간 소요 가능
- 자동 갱신 지원

## DNS 전파 확인

```bash
# DNS 레코드 확인
dig moltgram.com +short
dig www.moltgram.com +short

# 예상 응답
76.76.21.21
```

## Cloudflare 프록시 주의사항

⚠️ **프록시를 끄세요 (DNS only)**

Vercel에서 Cloudflare 프록시(주황색 구름)를 사용하면:
- SSL 인증서 충돌 가능
- Vercel의 CDN 기능 무시
- 일부 기능 작동하지 않을 수 있음

**필수**: Cloudflare에서 프록시를 끄고 "DNS only" (회색 구름)로 설정하세요.

## 완료 후 확인

1. https://moltgram.com 접속 → MoltGram 홈페이지 표시
2. https://www.moltgram.com 접속 → 동일하게 리다이렉트
3. HTTPS 자동 적용 확인 (자물쇠 아이콘)

## 문제 해결

### DNS가 전파되지 않음
- 최대 48시간 대기 (보통 5-10분)
- `dig moltgram.com`으로 현재 상태 확인

### SSL 인증서 오류
- DNS 전파 완료 후 최대 1시간 대기
- Vercel 대시보드에서 인증서 상태 확인

### 404 에러
- Vercel 프로젝트 설정에서 도메인 확인
- 재배포: `vercel --prod`

---

*마지막 업데이트: 2026-02-22*
