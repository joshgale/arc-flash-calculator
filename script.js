function calculateIncidentEnergy() {
    // Get all input values
    const voltage = parseFloat(document.getElementById('voltage').value);
    const faultCurrent = parseFloat(document.getElementById('faultCurrent').value);
    const workingDistance = parseFloat(document.getElementById('workingDistance').value);
    const arcDurationNormal = parseFloat(document.getElementById('arcDurationNormal').value) / 1000; // ms to s
    const arcDurationMin = parseFloat(document.getElementById('arcDurationMin').value) / 1000; // ms to s
    const equipmentType = document.getElementById('equipmentType').value;
    const electrodeConfig = document.getElementById('electrodeConfig').value;
    const height = parseFloat(document.getElementById('height').value);
    const width = parseFloat(document.getElementById('width').value);
    const depth = parseFloat(document.getElementById('depth').value);
    const electrodeGap = parseFloat(document.getElementById('electrodeGap').value);
  
    // Example coefficients for electrode configuration (IEEE 1584-2018 uses different formulas for each)
    const configFactors = {
      VCB: 1.0,
      VCBB: 1.1,
      HCB: 1.2,
      VOA: 0.8,
      HOA: 0.9
    };
    const configFactor = configFactors[electrodeConfig] || 1.0;
  
    // Example calculation for incident energy (cal/cm²)
    // This is a simplified version for demonstration purposes only
    // Real IEEE 1584 calculation is much more complex!
    const k = 0.0001; // scaling factor for demonstration
    const incidentEnergy = k * faultCurrent * voltage * arcDurationNormal * configFactor * (electrodeGap / 25.4) / (workingDistance / 610);
  
    // Calculate arc flash boundary (distance where energy = 1.2 cal/cm²)
    // Rearranged formula: boundary = workingDistance * sqrt(incidentEnergy / 1.2)
    let boundary = 0;
    if (incidentEnergy > 0) {
      boundary = workingDistance * Math.sqrt(incidentEnergy / 1.2);
      boundary = Math.round(boundary * 10) / 10; // round to 1 decimal
    }
  
    // Display results
    document.getElementById('incidentEnergy').textContent = incidentEnergy.toFixed(2);
    displayArcFlashBoundary(boundary);
  
    drawChart(energy);
  }
  
  function displayArcFlashBoundary(boundary) {
    // Show arc flash boundary in results panel
    let boundaryElem = document.getElementById('arcFlashBoundary');
    if (!boundaryElem) {
      const resultsPanel = document.querySelector('.output-panel');
      boundaryElem = document.createElement('p');
      boundaryElem.id = 'arcFlashBoundary';
      resultsPanel.appendChild(boundaryElem);
    }
    boundaryElem.textContent = `Arc Flash Boundary: ${boundary} mm (where energy = 1.2 cal/cm²)`;
  }
  
  function drawChart(energy) {
    const ctx = document.getElementById('safetyChart').getContext('2d');
  
    if (window.chartInstance) window.chartInstance.destroy();
  
    window.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Safe', 'Hazard'],
        datasets: [{
          data: [8.0, Math.max(energy - 8.0, 0)],
          backgroundColor: ['#4caf50', '#f44336'],
          borderWidth: 1
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'PPE Level Visualization'
          }
        }
      }
    });
  }
  
  function drawDimensionShape() {
    const canvas = document.getElementById('dimensionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Get dimensions
    const h = parseInt(document.getElementById('height').value, 10);
    const w = parseInt(document.getElementById('width').value, 10);
    const d = parseInt(document.getElementById('depth').value, 10);
  
    // Normalize for drawing (fit box in canvas)
    const maxDim = Math.max(h, w, d);
    const scale = 80 / maxDim;
    const nh = h * scale;
    const nw = w * scale;
    const nd = d * scale;
  
    // Isometric projection points
    const x0 = 40, y0 = 120;
    const x1 = x0 + nw, y1 = y0;
    const x2 = x0 + nw - nd * 0.5, y2 = y0 - nd * 0.5;
    const x3 = x0 - nd * 0.5, y3 = y0 - nd * 0.5;
  
    // Draw front face
    ctx.strokeStyle = "#1976d2";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1, y1 - nh);
    ctx.lineTo(x0, y0 - nh);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "#90caf9";
    ctx.globalAlpha = 0.5;
    ctx.fill();
  
    // Draw top face
    ctx.beginPath();
    ctx.moveTo(x0, y0 - nh);
    ctx.lineTo(x1, y1 - nh);
    ctx.lineTo(x2, y2 - nh);
    ctx.lineTo(x3, y3 - nh);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "#64b5f6";
    ctx.fill();
  
    // Draw side face
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2, y2 - nh);
    ctx.lineTo(x1, y1 - nh);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "#42a5f5";
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
  
  // Call drawDimensionShape after updating dimensions
  function updateDimensions() {
    const equipmentType = document.getElementById('equipmentType').value;
    let dims = {};
  
    // IEEE1584 typical dimensions (example values, adjust as needed)
    if (equipmentType === 'switchgear') {
      dims = { height: 2000, width: 1000, depth: 600, workingDistance: 610 };
    } else if (equipmentType === 'panel') {
      dims = { height: 1200, width: 800, depth: 300, workingDistance: 455 };
    } else if (equipmentType === 'cable') {
      dims = { height: 100, width: 100, depth: 100, workingDistance: 305 };
    } else {
      dims = { height: 500, width: 500, depth: 250, workingDistance: 450 };
    }
  
    document.getElementById('height').value = dims.height;
    document.getElementById('width').value = dims.width;
    document.getElementById('depth').value = dims.depth;
    document.getElementById('workingDistance').value = dims.workingDistance;
  
    drawDimensionShape();
  }
  
  // Draw initial shape on page load
  window.addEventListener('DOMContentLoaded', drawDimensionShape);
