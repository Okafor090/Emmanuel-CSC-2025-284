/* ── State ───────────────────────────────────────────── */
const state = {
  current:      '0',   // number being typed
  previous:     null,  // first operand
  operator:     null,  // pending operator symbol
  justEvaled:   false, // prevent chaining quirks
  freshOperand: false, // next digit replaces current
};

/* ── DOM refs ─────────────────────────────────────────── */
const $result     = document.getElementById('result');
const $expression = document.getElementById('expression');

/* ── Render ───────────────────────────────────────────── */
function render() {
  // Result
  $result.textContent = format(state.current);

  // Resize font for long numbers
  const len = $result.textContent.length;
  $result.className = 'display__result' +
    (len > 12 ? ' shrink-3' : len > 9 ? ' shrink-2' : len > 6 ? ' shrink-1' : '');

  // Expression line — wrap operator in a span for colour
  if (state.operator && state.previous !== null) {
    const op = `<span class="op-highlight"> ${state.operator} </span>`;
    $expression.innerHTML = format(state.previous) + op;
  } else {
    $expression.innerHTML = '&nbsp;';
  }

  // Highlight active operator button
  document.querySelectorAll('.btn--operator').forEach(btn => {
    btn.classList.toggle(
      'is-active',
      btn.dataset.value === state.operator && !state.justEvaled
    );
  });
}

/* ── Format number for display ───────────────────────── */
function format(val) {
  if (val === null || val === undefined) return '';
  const num = parseFloat(val);
  if (isNaN(num)) return val;                 // 'Error'
  // Max 10 significant digits; strip trailing zeros after decimal
  let str = parseFloat(num.toPrecision(10)).toString();
  return str;
}

/* ── Arithmetic ───────────────────────────────────────── */
function calculate(a, op, b) {
  a = parseFloat(a);
  b = parseFloat(b);
  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? 'Error' : a / b;
    default:  return b;
  }
}

/* ── Action handlers ──────────────────────────────────── */
const actions = {
  number(val) {
    if (state.freshOperand || state.current === '0' || state.justEvaled) {
      state.current    = val;
      state.freshOperand = false;
      state.justEvaled  = false;
    } else {
      if (state.current.replace('-','').length >= 12) return; // digit cap
      state.current += val;
    }
  },

  decimal() {
    if (state.freshOperand || state.justEvaled) {
      state.current     = '0.';
      state.freshOperand = false;
      state.justEvaled  = false;
      return;
    }
    if (!state.current.includes('.')) state.current += '.';
  },

  operator(op) {
    // Chain: evaluate pending op first
    if (state.operator && !state.freshOperand) {
      const result = calculate(state.previous, state.operator, state.current);
      state.current  = result.toString();
      state.previous = state.current;
    } else {
      state.previous = state.current;
    }
    state.operator     = op;
    state.freshOperand = true;
    state.justEvaled   = false;
  },

  equals() {
    if (state.operator === null || state.previous === null) return;
    const result      = calculate(state.previous, state.operator, state.current);
    state.current     = result.toString();
    state.operator    = null;
    state.previous    = null;
    state.freshOperand = true;
    state.justEvaled  = true;
  },

  clear() {
    state.current      = '0';
    state.previous     = null;
    state.operator     = null;
    state.freshOperand = false;
    state.justEvaled   = false;
  },

  'toggle-sign'() {
    if (state.current === '0' || state.current === 'Error') return;
    state.current = state.current.startsWith('-')
      ? state.current.slice(1)
      : '-' + state.current;
  },

  percent() {
    const n = parseFloat(state.current);
    if (isNaN(n)) return;
    state.current = (n / 100).toString();
  },
};

/* ── Event delegation ─────────────────────────────────── */
document.querySelector('.buttons').addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  const action = btn.dataset.action;
  const value  = btn.dataset.value;

  if (action === 'number')   actions.number(value);
  else if (action === 'operator') actions.operator(value);
  else if (actions[action])  actions[action]();

  render();
  ripple(btn, e);
});

/* ── Keyboard support ─────────────────────────────────── */
const keyMap = {
  '0':'0','1':'1','2':'2','3':'3','4':'4',
  '5':'5','6':'6','7':'7','8':'8','9':'9',
  '+':'+', '-':'−', '*':'×', '/':'÷',
  'Enter':'=', '=':'=', 'Escape':'AC',
  'Backspace':'backspace', '.':'.', ',':'.',
  '%':'%',
};

document.addEventListener('keydown', e => {
  const mapped = keyMap[e.key];
  if (!mapped) return;
  e.preventDefault();

  if ('0123456789'.includes(mapped))  actions.number(mapped);
  else if ('+-×÷−'.includes(mapped))  actions.operator(mapped);
  else if (mapped === '=')            actions.equals();
  else if (mapped === 'AC')           actions.clear();
  else if (mapped === '.')            actions.decimal();
  else if (mapped === '%')            actions.percent();
  else if (mapped === 'backspace') {
    if (state.current.length > 1 && !state.justEvaled) {
      state.current = state.current.slice(0, -1) || '0';
    } else {
      state.current = '0';
    }
  }
  render();
});

/* ── Ripple ───────────────────────────────────────────── */
function ripple(btn, e) {
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x    = (e.clientX - rect.left) - size / 2;
  const y    = (e.clientY - rect.top)  - size / 2;
  const el   = document.createElement('span');
  el.className = 'ripple';
  el.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  btn.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

/* ── Initial render ───────────────────────────────────── */
render();
