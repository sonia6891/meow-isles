// Canvas helper shared by the games: sized to its box, crisp on high-DPI screens.
export function makeCanvas(stage) {
  const c = document.createElement('canvas');
  stage.append(c);
  const ctx = c.getContext('2d');
  const fit = () => {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.w = r.width;
    c.h = r.height;
  };
  fit();
  return { c, ctx, fit };
}

// A cat face drawn on canvas, matching the SVG faces in the catalog.
export function drawCatFace(ctx, x, y, s, coat) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 40, s / 40);
  ctx.translate(-20, -20);
  ctx.beginPath();
  ctx.moveTo(7, 5); ctx.lineTo(14, 13); ctx.lineTo(26, 13); ctx.lineTo(33, 5); ctx.lineTo(34, 22);
  ctx.ellipse(20, 22, 14, 13, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = coat.head;
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,25,50,.45)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  if (coat.patch) { ctx.fillStyle = coat.patch; ctx.beginPath(); ctx.moveTo(22, 10); ctx.quadraticCurveTo(30, 8, 34, 16); ctx.lineTo(28, 18); ctx.fill(); }
  ctx.fillStyle = '#1d1b22';
  for (const ex of [15, 25]) { ctx.beginPath(); ctx.arc(ex, 23, 1.9, 0, 7); ctx.fill(); }
  ctx.strokeStyle = '#E79AA4';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(18.6, 27); ctx.lineTo(20, 28.4); ctx.lineTo(21.4, 27); ctx.stroke();
  ctx.restore();
}
