/**
 * AdPlatform - Campaign Creation Form Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const chkTikTok = document.getElementById('chkTikTok');
  const chkInstagram = document.getElementById('chkInstagram');
  const chkGoogle = document.getElementById('chkGoogle');

  const tiktokBox = document.getElementById('tiktokBox');
  const instagramBox = document.getElementById('instagramBox');
  const googleBox = document.getElementById('googleBox');

  const tiktokSettings = document.getElementById('tiktokSettings');
  const instagramSettings = document.getElementById('instagramSettings');
  const googleSettings = document.getElementById('googleSettings');

  const tiktokDays = document.getElementById('tiktok_days');
  const igBudget = document.getElementById('instagram_budget');
  const googleBudget = document.getElementById('google_budget');

  // Summary Elements
  const summaryBudget = document.getElementById('summaryTotalBudget');
  const summaryFee = document.getElementById('summaryTotalFee');
  const summaryGrandTotal = document.getElementById('summaryGrandTotal');
  const selectedPlatformsList = document.getElementById('selectedPlatformsList');

  function updateCalculations() {
    let totalAdBudget = 0;
    let totalFees = 0;
    let selectedSummaryHtml = '';

    // 1. TikTok
    if (chkTikTok && chkTikTok.checked) {
      tiktokBox.classList.add('active');
      tiktokSettings.style.display = 'block';

      const tt = PricingCalculator.calculateTikTok(tiktokDays ? tiktokDays.value : 1);
      document.getElementById('tiktokCalcUsd').textContent = `$${tt.budgetUsd} USD`;
      document.getElementById('tiktokCalcNgn').textContent = formatNaira(tt.budgetNgn);
      document.getElementById('tiktokSubtotal').textContent = formatNaira(tt.total);

      totalAdBudget += tt.budgetNgn;
      totalFees += tt.serviceFee;

      selectedSummaryHtml += `
        <div class="summary-line" style="font-size: 13px;">
          <span>🎵 TikTok (${tt.days} days):</span>
          <span>${formatNaira(tt.total)}</span>
        </div>
      `;
    } else if (tiktokSettings) {
      tiktokBox.classList.remove('active');
      tiktokSettings.style.display = 'none';
    }

    // 2. Instagram
    if (chkInstagram && chkInstagram.checked) {
      instagramBox.classList.add('active');
      instagramSettings.style.display = 'block';

      const ig = PricingCalculator.calculateInstagram(igBudget ? igBudget.value : 50000);
      document.getElementById('igCalcNgn').textContent = formatNaira(ig.budgetNgn);
      document.getElementById('igSubtotal').textContent = formatNaira(ig.total);

      totalAdBudget += ig.budgetNgn;
      totalFees += ig.serviceFee;

      selectedSummaryHtml += `
        <div class="summary-line" style="font-size: 13px;">
          <span>📸 Instagram / Meta:</span>
          <span>${formatNaira(ig.total)}</span>
        </div>
      `;
    } else if (instagramSettings) {
      instagramBox.classList.remove('active');
      instagramSettings.style.display = 'none';
    }

    // 3. Google
    if (chkGoogle && chkGoogle.checked) {
      googleBox.classList.add('active');
      googleSettings.style.display = 'block';

      const g = PricingCalculator.calculateGoogle(googleBudget ? googleBudget.value : 50000);
      document.getElementById('googleCalcNgn').textContent = formatNaira(g.budgetNgn);
      document.getElementById('googleSubtotal').textContent = formatNaira(g.total);

      totalAdBudget += g.budgetNgn;
      totalFees += g.serviceFee;

      selectedSummaryHtml += `
        <div class="summary-line" style="font-size: 13px;">
          <span>🔍 Google Ads:</span>
          <span>${formatNaira(g.total)}</span>
        </div>
      `;
    } else if (googleSettings) {
      googleBox.classList.remove('active');
      googleSettings.style.display = 'none';
    }

    // Update Summary Card
    if (summaryBudget) summaryBudget.textContent = formatNaira(totalAdBudget);
    if (summaryFee) summaryFee.textContent = formatNaira(totalFees);
    if (summaryGrandTotal) summaryGrandTotal.textContent = formatNaira(totalAdBudget + totalFees);

    if (selectedPlatformsList) {
      selectedPlatformsList.innerHTML = selectedSummaryHtml || '<p style="font-size: 13px; color: var(--color-muted); text-align: center;">No platforms selected yet.</p>';
    }
  }

  // Bind Platform Change Events
  [chkTikTok, chkInstagram, chkGoogle].forEach(chk => {
    if (chk) chk.addEventListener('change', updateCalculations);
  });

  [tiktokDays, igBudget, googleBudget].forEach(sel => {
    if (sel) sel.addEventListener('change', updateCalculations);
  });

  // Initial Calculation Run
  updateCalculations();

  // File Upload Previews
  function setupDropzone(dropzoneId, inputId, textId) {
    const dropzone = document.getElementById(dropzoneId);
    const input = document.getElementById(inputId);
    const textElem = document.getElementById(textId);

    if (!dropzone || !input || !textElem) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        handleFileChange(input.files[0], textElem);
      }
    });

    input.addEventListener('change', () => {
      if (input.files.length) {
        handleFileChange(input.files[0], textElem);
      }
    });
  }

  function handleFileChange(file, textElem) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    textElem.innerHTML = `
      <span style="font-size: 24px;">✅</span>
      <p style="color: var(--color-primary); font-weight: bold;">${file.name}</p>
      <span class="file-hint">${sizeMb} MB &bull; Selected</span>
    `;
  }

  setupDropzone('videoDropzone', 'videoFile', 'videoText');
  setupDropzone('imageDropzone', 'imageFile', 'imageText');

  // Form Validation Before Submit
  const form = document.getElementById('campaignForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      const anySelected = (chkTikTok && chkTikTok.checked) ||
                          (chkInstagram && chkInstagram.checked) ||
                          (chkGoogle && chkGoogle.checked);

      if (!anySelected) {
        e.preventDefault();
        alert('Please select at least one advertising network (TikTok, Instagram, or Google Ads).');
        return false;
      }
    });
  }
});

