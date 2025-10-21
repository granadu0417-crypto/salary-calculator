// Cloudflare Pages Function - 연봉 계산기 결과 공유 동적 OG 태그
// KakaoTalk, Facebook, Twitter 등의 크롤러가 접근할 때 동적 OG 메타 태그 생성

// 크롤러 User-Agent 패턴
const CRAWLER_PATTERNS = [
  'kakaotalk',
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'TelegramBot',
  'WhatsApp',
  'Pinterest',
  'Google-InspectionTool',
  'Googlebot',
  'bingbot',
  'Discordbot'
];

// 크롤러 감지
function isCrawler(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_PATTERNS.some(pattern => ua.includes(pattern.toLowerCase()));
}

// 숫자 포맷팅 (천 단위 콤마)
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 동적 OG 태그 생성
function generateOGTags(urlParams) {
  const gross = urlParams.get('gross');
  const net = urlParams.get('net');
  const deduction = urlParams.get('deduction');

  if (!gross || !net || !deduction) {
    return null;
  }

  const grossFormatted = formatNumber(parseInt(gross));
  const netFormatted = formatNumber(parseInt(net));
  const deductionFormatted = formatNumber(parseInt(deduction));

  const shareTitle = `💰 나의 월급 실수령액: ${netFormatted}원!`;
  const shareDescription = `세전 ${grossFormatted}원 → 공제 ${deductionFormatted}원 → 실수령 ${netFormatted}원\n당신의 실수령액도 계산해보세요 👉`;

  return {
    title: shareTitle,
    description: shareDescription
  };
}

// HTML에 OG 태그 주입
function injectOGTags(html, ogData) {
  if (!ogData) return html;

  // 기존 OG 태그 제거
  let modifiedHtml = html.replace(/<meta property="og:.*?".*?>/g, '');

  // 새로운 OG 태그 생성
  const ogTags = `
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeHtml(ogData.title)}">
    <meta property="og:description" content="${escapeHtml(ogData.description)}">
    <meta property="og:url" content="https://salary-calculator-bce.pages.dev/">
    <meta property="og:site_name" content="월급 실수령액 계산기">
    <meta property="og:image" content="https://salary-calculator-bce.pages.dev/og-image.jpg">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(ogData.title)}">
    <meta name="twitter:description" content="${escapeHtml(ogData.description)}">
    <meta name="twitter:image" content="https://salary-calculator-bce.pages.dev/og-image.jpg">
  `;

  // <head> 태그 내부에 삽입
  modifiedHtml = modifiedHtml.replace('</head>', `${ogTags}\n</head>`);

  return modifiedHtml;
}

// HTML 이스케이프
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 메인 미들웨어 함수
export async function onRequest(context) {
  const { request, next } = context;
  const userAgent = request.headers.get('User-Agent') || '';
  const url = new URL(request.url);

  // 크롤러가 아니면 그냥 통과
  if (!isCrawler(userAgent)) {
    return next();
  }

  // URL 파라미터 확인
  const ogData = generateOGTags(url.searchParams);

  // 파라미터가 없으면 기본 OG 태그 사용
  if (!ogData) {
    return next();
  }

  // 원본 응답 가져오기
  const response = await next();

  // HTML이 아니면 그냥 반환
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  // HTML 읽기
  let html = await response.text();

  // OG 태그 주입
  html = injectOGTags(html, ogData);

  // 새로운 응답 반환
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
