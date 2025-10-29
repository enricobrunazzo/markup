window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('calcForm');
  const marginEl = document.getElementById('margin');
  const markupEl = document.getElementById('markup');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const cost = parseFloat(document.getElementById('cost').value);
    const price = parseFloat(document.getElementById('price').value);

    if (cost > 0 && price > 0 && price > cost) {
      // Margine = (Prezzo - Costo) / Prezzo
      const margin = ((price - cost) / price) * 100;
      // Markup = (Prezzo - Costo) / Costo
      const markup = ((price - cost) / cost) * 100;

      marginEl.textContent = margin.toFixed(2) + '%';
      markupEl.textContent = markup.toFixed(2) + '%';
    } else {
      marginEl.textContent = 'Input non valido';
      markupEl.textContent = 'Input non valido';
    }
  });
});
