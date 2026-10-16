document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app-container');

  guideData.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    
    // 第一張卡片（出發點）預設為展開狀態
    if (index === 0) card.classList.add('active');
    
    // --- 卡片標題區 (可點擊收合) ---
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <h2>${item.title}</h2>
      <span class="toggle-icon">▼</span>
    `;
    
    // 點擊事件：打開這張卡片，並關閉其他卡片
    header.addEventListener('click', () => {
      const isActive = card.classList.contains('active');
      
      // 先把所有卡片關閉
      document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
      
      // 如果原本沒打開，就打開它並自動捲動到畫面頂端
      if (!isActive) {
        card.classList.add('active');
        setTimeout(() => {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    });

    // --- 卡片內容區 (預設隱藏) ---
    const body = document.createElement('div');
    body.className = 'card-body';
    
    if (item.type === 'intro') {
      body.innerHTML = `
        <audio controls class="main-audio" preload="none" src="${item.audioSrc}"></audio>
        <div style="font-size: 15px; margin-top: 10px;">${item.content}</div>
      `;
    } else {
      let html = '';
      
      // 1. 主語音播放器挪到最上方
      if (item.mainAudioSrc) {
        html += `
          <audio controls class="main-audio" preload="none">
            <source src="${item.mainAudioSrc}" type="audio/mpeg">
          </audio>
        `;
      }
      
      if (item.image) {
        html += `<img src="${item.image}" alt="${item.title} 實景對照圖" class="station-img">`;
      }
      
      if (item.meta) html += `<div class="meta-info">${item.meta}</div>`;
      if (item.question) html += `<div class="question-box">💡 這站的問題：<br>${item.question}</div>`;
      
      if (item.observation) html += `<div class="section-title">👣 現場找找看</div><p>${item.observation}</p>`;
      if (item.history) html += `<div class="section-title">${item.historyTitle || '🪚 這裡發生過什麼'}</div><p>${item.history}</p>`;
      if (item.extraSection) html += `<div class="section-title">${item.extraSection.title}</div><p>${item.extraSection.content}</p>`;
      
      // 2. 獨立職人故事區塊與各自的語音播放器
      if (item.stories && item.stories.length > 0) {
        html += `<div class="section-title">📖 職人故事</div>`;
        item.stories.forEach(story => {
          html += `
            <div class="story-item">
              <strong>${story.name}</strong>
              <p>${story.desc}</p>
              ${story.audioSrc ? `<audio controls class="story-audio" preload="none" src="${story.audioSrc}"></audio>` : ''}
            </div>
          `;
        });
      }
      
      if (item.collapsibles && item.collapsibles.length > 0) {
        item.collapsibles.forEach(col => {
          html += `
            <details>
              <summary>▸ 點開閱讀｜${col.title}</summary>
              <div class="details-content">${col.content}</div>
            </details>
          `;
        });
      }
      
      body.innerHTML = html;
    }
    
    card.appendChild(header);
    card.appendChild(body);
    container.appendChild(card);
  });

  // 註冊 Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => document.getElementById('status').innerText = '✅ 已啟用離線瀏覽，斷網也可使用')
      .catch(err => document.getElementById('status').innerText = '❌ 離線快取失敗');
  }
});