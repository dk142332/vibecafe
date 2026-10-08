/**
 * ===================================================
 * 바이브 카페 주문서 및 주문 내역 자바스크립트 (script.js)
 * ===================================================
 */

// ===================================================
// Supabase 설정 상수 및 클라이언트 초기화
// ※ 아래 큰따옴표 안에 본인의 Supabase 프로젝트 정보를 직접 입력해주세요.
// ===================================================
const SUPABASE_URL = "https://zjeyctolvgmdzkjlcjrb.supabase.co"; // 예: "https://xyzcompany.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqZXljdG9sdmdtZHpramxjanJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MDU2MjksImV4cCI6MjEwNjk4MTYyOX0.Rpif31ffszzqIzXhMZe2wG0CH9PaF6woqjXmhMWPW00"; // 예: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// Supabase 클라이언트 생성 (CDN으로 로드된 window.supabase 사용)
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// --- 주문 목록을 저장하는 배열 및 주문 번호 카운터 ---
const orders = [];
let orderIdCounter = 1;

// --- DOM 요소 (HTML 태그들) 가져오기 ---
// 탭 관련 요소
const tabOrderBtn = document.getElementById('tab-order');
const tabHistoryBtn = document.getElementById('tab-history');
const tabContentOrder = document.getElementById('tab-content-order');
const tabContentHistory = document.getElementById('tab-content-history');
const orderCountBadge = document.getElementById('order-count-badge');

// 주문 내역 탭 내부 요소
const orderListEl = document.getElementById('order-list');
const orderSummarySectionEl = document.getElementById('order-summary-section');
const totalSummaryTextEl = document.getElementById('total-summary-text');
const clearOrdersBtn = document.getElementById('clear-orders-btn');

// 주문서 폼 관련 요소
const orderForm = document.getElementById('order-form');
const nameInput = document.getElementById('customer-name');
const phoneInput = document.getElementById('customer-phone');
const beverageSelect = document.getElementById('beverage-select');
const sizeRadios = document.querySelectorAll('input[name="size"]');
const optionCheckboxes = document.querySelectorAll('input[name="options"]');
const quantityInput = document.getElementById('quantity');
const requestsInput = document.getElementById('requests');
const totalPriceEl = document.getElementById('total-price');
const submitBtn = document.getElementById('submit-btn');
const orderConfirmationEl = document.getElementById('order-confirmation');

/**
 * ---------------------------------------------------
 * 예상 금액을 계산하고 화면에 표시하는 함수
 * ---------------------------------------------------
 * @returns {number} 계산된 총 금액 반환
 */
function calculateTotal() {
  // 1. 선택된 음료 확인 및 기본 가격 가져오기
  const selectedBeverageOption = beverageSelect.options[beverageSelect.selectedIndex];
  const beveragePrice = Number(selectedBeverageOption.dataset.price) || 0;

  // 음료를 선택하지 않았다면(값이 비어있거나 0원이면) 총 금액은 0원으로 표시
  if (!beverageSelect.value || beveragePrice === 0) {
    totalPriceEl.textContent = '예상 금액: 0원';
    return 0;
  }

  // 2. 선택된 사이즈의 추가 가격 가져오기
  let sizePrice = 0;
  const selectedSizeRadio = document.querySelector('input[name="size"]:checked');
  if (selectedSizeRadio) {
    sizePrice = Number(selectedSizeRadio.dataset.price) || 0;
  }

  // 3. 체크된 추가 옵션들의 가격 합산
  let optionsPrice = 0;
  optionCheckboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      optionsPrice += Number(checkbox.dataset.price) || 0;
    }
  });

  // 4. 수량 가져오기 (1 미만이거나 빈 값이면 기본값 1로 처리)
  let quantity = parseInt(quantityInput.value, 10);
  if (isNaN(quantity) || quantity < 1) {
    quantity = 1;
  }

  // 5. 총 금액 = (음료 가격 + 사이즈 추가금 + 옵션 추가금) * 수량
  const singleCupPrice = beveragePrice + sizePrice + optionsPrice;
  const total = singleCupPrice * quantity;

  // 6. 천 단위 콤마(toLocaleString) 적용
  totalPriceEl.textContent = `예상 금액: ${total.toLocaleString()}원`;

  return total;
}

/**
 * ---------------------------------------------------
 * 주문 내역 목록을 화면에 그리는 함수
 * 보안을 위해 손님이 입력한 내용은 innerHTML 대신 textContent 사용
 * ---------------------------------------------------
 */
function renderOrders() {
  // 1. 탭 옆의 둥근 갈색 배지에 주문 건수 표시
  orderCountBadge.textContent = orders.length;

  // 2. 기존 목록 비우기
  orderListEl.textContent = '';

  // 3. 주문이 한 건도 없는 경우
  if (orders.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-orders';
    emptyMsg.textContent = '아직 주문 내역이 없어요 ☕';
    orderListEl.appendChild(emptyMsg);

    // 하단 전체 금액 요약 및 전체 삭제 버튼 숨기기
    orderSummarySectionEl.classList.add('hidden');
    return;
  }

  // 4. 주문이 있는 경우 하단 요약 섹션 표시
  orderSummarySectionEl.classList.remove('hidden');

  // 총 주문 금액 합산
  const grandTotal = orders.reduce((sum, item) => sum + item.total, 0);
  totalSummaryTextEl.textContent = `총 주문 금액: ${grandTotal.toLocaleString()}원 (${orders.length}건)`;

  // 5. 각 주문 카드를 생성하여 목록에 추가
  orders.forEach((order) => {
    // 카드 컨테이너
    const card = document.createElement('div');
    card.className = 'order-card';

    // [1줄] #1 홍길동님 · 5,000원
    const headerEl = document.createElement('div');
    headerEl.className = 'order-card-header';

    const titleEl = document.createElement('div');
    titleEl.className = 'order-title';
    // textContent로 안전하게 문자열 삽입
    titleEl.textContent = `#${order.id} ${order.name}님 · ${order.total.toLocaleString()}원`;
    headerEl.appendChild(titleEl);

    // [취소 버튼] 오른쪽 상단 배치
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'order-cancel-btn';
    cancelBtn.textContent = '취소';
    cancelBtn.addEventListener('click', () => {
      // confirm으로 삭제 여부 확인
      if (confirm(`#${order.id} 주문을 정말 취소하시겠습니까?`)) {
        // 배열에서 해당 주문 찾아서 삭제
        const targetIndex = orders.findIndex((item) => item.id === order.id);
        if (targetIndex !== -1) {
          orders.splice(targetIndex, 1);
          renderOrders(); // 화면 다시 그리기
        }
      }
    });
    card.appendChild(cancelBtn);
    card.appendChild(headerEl);

    // [2줄] 카페라떼 M사이즈 (샷 추가) 1잔
    const detailEl = document.createElement('div');
    detailEl.className = 'order-detail';
    const optionText = order.options ? ` (${order.options})` : '';
    detailEl.textContent = `${order.beverage} ${order.size}사이즈${optionText} ${order.quantity}잔`;
    card.appendChild(detailEl);

    // [3줄] 요청사항(있을 때만) · 주문 시간
    const metaEl = document.createElement('div');
    metaEl.className = 'order-meta';

    if (order.requests) {
      const reqEl = document.createElement('span');
      reqEl.className = 'order-request';
      reqEl.textContent = `요청: ${order.requests}`;
      metaEl.appendChild(reqEl);
    }

    const timeEl = document.createElement('span');
    timeEl.textContent = `주문 시간: ${order.orderTime}`;
    metaEl.appendChild(timeEl);

    card.appendChild(metaEl);

    // 목록에 카드 추가
    orderListEl.appendChild(card);
  });
}

/**
 * ---------------------------------------------------
 * 현재 시간을 "오전/오후 H:MM" 형식으로 변환하는 함수
 * ---------------------------------------------------
 * @returns {string} 포맷팅된 시간 문자열
 */
function formatCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ===================================================
// 탭 전환 이벤트 리스너
// ===================================================
tabOrderBtn.addEventListener('click', () => {
  // 주문하기 탭 활성화
  tabOrderBtn.classList.add('active');
  tabHistoryBtn.classList.remove('active');

  // 컨텐츠 전환 (hidden 클래스 사용)
  tabContentOrder.classList.remove('hidden');
  tabContentHistory.classList.add('hidden');
});

tabHistoryBtn.addEventListener('click', () => {
  // 주문 내역 탭 활성화
  tabHistoryBtn.classList.add('active');
  tabOrderBtn.classList.remove('active');

  // 컨텐츠 전환
  tabContentHistory.classList.remove('hidden');
  tabContentOrder.classList.add('hidden');

  // 주문 내역 화면 갱신
  renderOrders();
});

// ===================================================
// 실시간 금액 계산 이벤트 리스너 등록
// ===================================================
beverageSelect.addEventListener('change', calculateTotal);

sizeRadios.forEach((radio) => {
  radio.addEventListener('change', calculateTotal);
});

optionCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener('change', calculateTotal);
});

quantityInput.addEventListener('input', calculateTotal);
quantityInput.addEventListener('change', calculateTotal);

// ===================================================
// 폼 제출 (주문하기 버튼 클릭) 처리
// Supabase의 cafe_menu03 테이블에 주문 데이터를 비동기로 저장합니다.
// ===================================================
orderForm.addEventListener('submit', async (event) => {
  event.preventDefault(); // 새로고침 방지

  // 1. 이름 필수 입력 검사
  const customerName = nameInput.value.trim();
  if (!customerName) {
    alert('이름을 입력해주세요');
    nameInput.focus();
    return;
  }

  // 2. 음료 선택 여부 검사
  if (!beverageSelect.value) {
    alert('음료를 선택해주세요');
    beverageSelect.focus();
    return;
  }

  // 3. 총 금액 계산
  const total = calculateTotal();

  // 4. 주문 상세 정보 추출
  const rawBeverageText = beverageSelect.options[beverageSelect.selectedIndex].textContent;
  const beverageName = rawBeverageText.split('(')[0].trim();
  const beveragePrice = Number(beverageSelect.options[beverageSelect.selectedIndex].dataset.price) || 0;

  const selectedSizeRadio = document.querySelector('input[name="size"]:checked');
  const sizeName = selectedSizeRadio ? selectedSizeRadio.value : '';

  // 선택된 추가 옵션 텍스트 배열
  const selectedOptions = [];
  optionCheckboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      const label = document.querySelector(`label[for="${checkbox.id}"]`);
      if (label) {
        const optionText = label.textContent.split('(')[0].trim();
        selectedOptions.push(optionText);
      }
    }
  });

  const optionString = selectedOptions.join(', ');
  const optionDisplay = optionString ? ` (${optionString})` : '';
  const quantity = parseInt(quantityInput.value, 10) || 1;
  const requests = requestsInput.value.trim();
  const phone = phoneInput.value.trim();
  const orderTime = formatCurrentTime();

  // ---------------------------------------------------
  // 5. 중복 클릭 방지 (버튼 비활성화)
  // ---------------------------------------------------
  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '주문 처리 중...';

  try {
    // ---------------------------------------------------
    // 6. Supabase DB (orders 테이블)에 데이터 저장
    // 제공해주신 orders 테이블 컬럼에 정확하게 매핑합니다:
    // - customer_name (TEXT)
    // - customer_phone (TEXT)
    // - beverage (TEXT)
    // - size (VARCHAR(2))
    // - options (TEXT) - 문자열 형태
    // - quantity (INTEGER)
    // - requests (TEXT)
    // - total_price (INTEGER)
    // - status (TEXT) - 기본값 '접수완료'
    // ---------------------------------------------------
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('orders')
        .insert([
          {
            customer_name: customerName,
            customer_phone: phone,
            beverage: beverageName,
            size: sizeName,
            options: optionString, // TEXT 타입에 맞게 문자열로 전달 (예: '샷 추가, 크림 추가')
            quantity: quantity,
            requests: requests,
            total_price: total,
            status: '접수완료',
          },
        ])
        .select();

      if (error) {
        throw error;
      }
    } else {
      console.warn('Supabase 클라이언트가 초기화되지 않았습니다. URL 및 KEY를 확인해주세요.');
    }

    // ---------------------------------------------------
    // 7. 성공 시: 로컬 주문 배열에도 저장 & 확인 메시지 표시
    // ---------------------------------------------------
    const newOrder = {
      id: orderIdCounter++,
      name: customerName,
      beverage: beverageName,
      size: sizeName,
      options: optionString,
      quantity: quantity,
      requests: requests,
      total: total,
      orderTime: orderTime,
    };

    orders.unshift(newOrder); // 최신 주문이 맨 위에 오도록 배열의 시작 부분에 삽입

    // 주문 확인 안내 문구 표시 (주문하기 탭 내)
    const confirmationMessage = `${customerName}님, ${beverageName} ${sizeName}사이즈${optionDisplay} ${quantity}잔, 총 ${total.toLocaleString()}원 주문이 접수되었습니다!`;
    orderConfirmationEl.textContent = confirmationMessage;
    orderConfirmationEl.classList.remove('hidden');

    // 부드럽게 스크롤
    orderConfirmationEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // 주문 내역 및 배지 수량 갱신
    renderOrders();

  } catch (err) {
    // ---------------------------------------------------
    // 실패 시: 에러 알림 및 콘솔 출력
    // ---------------------------------------------------
    console.error('Supabase 주문 저장 에러:', err);
    alert('주문 저장에 실패했어요');
  } finally {
    // ---------------------------------------------------
    // 8. 저장이 완료되거나 실패한 후 버튼 다시 활성화
    // ---------------------------------------------------
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
});

// ===================================================
// 다시 작성(reset) 버튼 처리
// 주문서 입력폼만 초기화하고, 기존 주문 내역은 유지합니다.
// ===================================================
orderForm.addEventListener('reset', () => {
  setTimeout(() => {
    // 예상 금액 0원으로 초기화
    calculateTotal();

    // 이전에 떴던 주문 확인 메시지 숨기기
    orderConfirmationEl.textContent = '';
    orderConfirmationEl.classList.add('hidden');

    nameInput.focus();
  }, 0);
});

// ===================================================
// 내역 모두 지우기 버튼 처리
// ===================================================
clearOrdersBtn.addEventListener('click', () => {
  if (orders.length === 0) return;

  if (confirm('주문 내역을 모두 지우시겠습니까?')) {
    orders.length = 0; // 배열 비우기
    renderOrders(); // 화면 갱신
  }
});

// 초기화: 첫 실행 시 뱃지 및 빈 내역 렌더링
renderOrders();
