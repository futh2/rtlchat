(() => {
  'use strict';

  const input = document.getElementById('input');
  const output = document.getElementById('output');
  const count = document.getElementById('count');
  const status = document.getElementById('status');
  const pasteBtn = document.getElementById('pasteBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyTextBtn = document.getElementById('copyText');
  const copyHtmlBtn = document.getElementById('copyHtml');
  const toast = document.getElementById('toast');

  let mode = 'smart';
  let html = '';

  function hasArabic(text) {
    const arabic = text.match(/[\u0600-\u06FF]/g);
    const letters = text.match(/[\u0600-\u06FFA-Za-z]/g);
    return !!arabic && !!letters && arabic.length / letters.length > 0.22;
  }

  function escapeHtml(text) {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function isCodeLine(line) {
    const text = line.trim();
    if (!text) return false;
    const heads = ['npm', 'yarn', 'pnpm', 'git', 'node', 'python', 'pip', 'const ', 'let ', 'var ', 'function ', 'return ', 'import ', 'export ', 'http://', 'https://'];
    return heads.some(head => text.startsWith(head)) || /[{}<>;=]/.test(text);
  }

  function toHtml(text) {
    const blocks = [];
    let textBuf = [];
    let codeBuf = [];

    const flushText = () => {
      if (textBuf.join('').trim()) blocks.push({ type: 'text', value: textBuf.join('\n').trim() });
      textBuf = [];
    };
    const flushCode = () => {
      if (codeBuf.join('').trim()) blocks.push({ type: 'code', value: codeBuf.join('\n').trimEnd() });
      codeBuf = [];
    };

    for (const line of text.split('\n')) {
      if (isCodeLine(line)) {
        flushText();
        codeBuf.push(line);
      } else if (!line.trim()) {
        flushText();
        flushCode();
      } else {
        flushCode();
        textBuf.push(line);
      }
    }

    flushText();
    flushCode();

    return blocks.map(block => {
      if (block.type === 'code') return `<pre><code>${escapeHtml(block.value)}</code></pre>`;
      const dir = mode === 'rtl' ? 'rtl' : mode === 'ltr' ? 'ltr' : hasArabic(block.value) ? 'rtl' : 'ltr';
      const align = dir === 'rtl' ? 'right' : 'left';
      return `<p class="p" dir="${dir}" style="text-align:${align}">${escapeHtml(block.value)}</p>`;
    }).join('');
  }

  function render() {
    const text = input.value || '';
    count.textContent = `${text.length} حرف`;

    if (!text.trim()) {
      output.innerHTML = '';
      html = '';
      status.textContent = 'بانتظار النص...';
      copyTextBtn.disabled = true;
      copyHtmlBtn.disabled = true;
      return;
    }

    html = toHtml(text);
    output.innerHTML = html;
    status.textContent = 'جاهز للنسخ';
    copyTextBtn.disabled = false;
    copyHtmlBtn.disabled = false;
  }

  function clearWorkspace() {
    if (!input) return;
    input.value = '';
    render();
    showToast('تم مسح مساحة العمل');
    input.focus();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  async function copy(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(message);
    } catch (error) {
      showToast('تعذر النسخ');
    }
  }

  document.querySelectorAll('.mode').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.mode').forEach(item => item.classList.toggle('active', item === button));
      mode = button.dataset.mode || 'smart';
      render();
    });
  });

  input.addEventListener('input', render);
  clearBtn?.addEventListener('click', clearWorkspace);
  pasteBtn.addEventListener('click', async () => {
    try {
      input.value = await navigator.clipboard.readText();
      render();
    } catch (error) {
      showToast('الصق يدويًا باستخدام Ctrl+V');
    }
  });
  copyTextBtn.addEventListener('click', () => copy(output.innerText.trim(), 'تم نسخ النص'));
  copyHtmlBtn.addEventListener('click', () => copy(html, 'تم نسخ HTML'));

  render();
})();
