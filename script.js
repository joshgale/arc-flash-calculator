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
  
    // --- Input validation ---
    // Voltage: 208V - 15000V
    if (voltage < 208 || voltage > 15000) {
        alert("Voltage must be between 208V and 15000V.");
        return;
    }
    // Fault current
    if (voltage < 600) {
        if (faultCurrent < 0.5 || faultCurrent > 106) {
            alert("For voltages < 600V, fault current must be between 0.5kA and 106kA.");
            return;
        }
    } else {
        if (faultCurrent < 0.2 || faultCurrent > 65) {
            alert("For voltages ≥ 600V, fault current must be between 0.2kA and 65kA.");
            return;
        }
    }
    // Conductor gap
    if (voltage <= 600) {
        if (electrodeGap < 6.35 || electrodeGap > 76.2) {
            alert("For voltages ≤ 600V, conductor gap must be between 6.35mm and 76.2mm.");
            return;
        }
    } else {
        if (electrodeGap < 19.05 || electrodeGap > 254) {
            alert("For voltages > 600V, conductor gap must be between 19.05mm and 254mm.");
            return;
        }
    }
    // Working distance > 305mm
    if (workingDistance <= 305) {
        alert("Working distance must be greater than 305mm.");
        return;
    }
    // Enclosure height or width max 1244.6mm
    if (height > 1244.6 || width > 1244.6) {
        alert("Enclosure height and width must not exceed 1244.6mm.");
        return;
    }
    // Maximum opening area (height x width) ≤ 1.549 m² (1549000 mm²)
    if ((height * width) > 1549000) {
        alert("Maximum opening area (height x width) must not exceed 1.549 m².");
        return;
    }
    // Minimum width at least 4 times the electrode gap
    if (width < 4 * electrodeGap) {
        alert("Enclosure width must be at least 4 times the electrode gap.");
        return;
    }
    // --- End validation ---
  
    // --- Enclosure size correction factor ---
    const enclosureType = getEnclosureType(voltage, height, width, depth);
    const eqHeight = getEquivalentDimension(height, voltage, electrodeConfig, true);
    const eqWidth = getEquivalentDimension(width, voltage, electrodeConfig, false);
    const EES = Math.max(getEES(eqHeight, eqWidth), 20); // min EES = 20 for typical
    const CF = calcEnclosureCF(enclosureType, electrodeConfig, EES);
  
    // --- IEEE 1584 Arcing Current Calculation ---
    // Coefficients for Equation 1 at 600V, 2700V, 14300V for each configuration
    const coeffs = {
        VCB: {
            V600:   { K1: -0.04287,  K2: 1.035,  K3: -0.083,   K4: 0,         K5: 0,         K6: -4.783e-09, K7: 1.962e-06,  K8: -0.000229,  K9: 0.003141,   K10: 1.092 },
            V2700:  { K1: 0.0065,    K2: 1.001,  K3: -0.024,   K4: -1.557e-12,K5: 4.556e-10, K6: -4.186e-08, K7: 8.346e-07,  K8: 5.482e-05,  K9: -0.003191,  K10: 0.9729 },
            V14300: { K1: 0.005795,  K2: 1.015,  K3: -0.01,    K4: -1.557e-12,K5: 4.556e-10, K6: -4.186e-08, K7: 8.346e-07,  K8: 5.482e-05,  K9: -0.003191,  K10: 0.9729 }
        },
        VCBB: {
            V600:   { K1: -0.017432, K2: 0.98,   K3: -0.05,    K4: 0,         K5: 0,         K6: -5.767e-09, K7: -3.524e-06, K8: -0.00034,   K9: 0.01187,    K10: 1.013 },
            V2700:  { K1: 0.002823,  K2: 0.995,  K3: -0.0125,  K4: 0,         K5: -9.204e-11,K6: 2.901e-08,  K7: -3.262e-06, K8: 0.0001569,  K9: -0.004003,  K10: 0.9825 },
            V14300: { K1: 0.014827,  K2: 1.01,   K3: -0.01,    K4: 0,         K5: -9.204e-11,K6: 2.901e-08,  K7: -3.262e-06, K8: 0.0001569,  K9: -0.004003,  K10: 0.9825 }
        },
        HCB: {
            V600:   { K1: 0.054292,  K2: 0.988,  K3: -0.11,    K4: 0,         K5: 0,         K6: -5.382e-09, K7: -3.16e-06,  K8: -0.000302,  K9: 0.001097,   K10: 0.9725 },
            V2700:  { K1: 0.001011,  K2: 1.003,  K3: -0.0249,  K4: 0,         K5: 0,         K6: 4.859e-10,  K7: -1.814e-07, K8: -9.128e-06, K9: -0.0007,    K10: 0.9881 },
            V14300: { K1: 0.008693,  K2: 0.999,  K3: -0.02,    K4: 0,         K5: -5.043e-11,K6: 2.233e-08,  K7: -3.046e-06, K8: 0.000116,   K9: -0.001145,  K10: 0.9839 }
        },
        VOA: {
            V600:   { K1: 0.043785,  K2: 1.04,   K3: -0.18,    K4: 0,         K5: -1.557e-12,K6: 4.556e-10,  K7: -4.783e-09, K8: 1.962e-06,  K9: 0.003141,   K10: 1.092 },
            V2700:  { K1: -0.02395,  K2: 1.006,  K3: -0.048,   K4: -1.557e-12,K5: 4.556e-10, K6: -4.186e-08, K7: 8.346e-07,  K8: 5.482e-05,  K9: -0.003191,  K10: 0.9729 },
            V14300: { K1: 0.005371,  K2: 1.0102, K3: -0.029,   K4: -1.557e-12,K5: 4.556e-10, K6: -4.186e-08, K7: 8.346e-07,  K8: 5.482e-05,  K9: -0.003191,  K10: 0.9729 }
        },
        HOA: {
            V600:   { K1: 0.111147,  K2: 1.008,  K3: -0.24,    K4: 0,         K5: 0,         K6: -3.895e-09, K7: -1.641e-06, K8: -0.000197,  K9: 0.006051,   K10: 1.1 },
            V2700:  { K1: 0.000435,  K2: 1.006,  K3: -0.038,   K4: 0,         K5: 0,         K6: 7.859e-10,  K7: -1.914e-07, K8: -9.128e-06, K9: -0.0007,    K10: 0.9981 },
            V14300: { K1: 0.000904,  K2: 0.999,  K3: -0.02,    K4: 0,         K5: 0,         K6: 7.859e-10,  K7: -1.914e-07, K8: -9.128e-06, K9: -0.0007,    K10: 0.9981 }
        }
    };

    // Helper: Equation 1 (see IEEE 1584-2018)
    function calcLogIarc(Ibf, V, Gap, H, W, c) {
        // I_arc = 10^(K1 + K2*log10(Ibf) + K3*log10(Gap)) * (K4*Ibf^6 + K5*Ibf^5 + K6*Ibf^4 + K7*Ibf^3 + K8*Ibf^2 + K9*Ibf + K10)
        const logPart = c.K1
            + c.K2 * Math.log10(Ibf)
            + c.K3 * Math.log10(Gap);
        const polyPart =
            c.K4 * Math.pow(Ibf, 6) +
            c.K5 * Math.pow(Ibf, 5) +
            c.K6 * Math.pow(Ibf, 4) +
            c.K7 * Math.pow(Ibf, 3) +
            c.K8 * Math.pow(Ibf, 2) +
            c.K9 * Ibf +
            c.K10;
        return (Math.pow(10, logPart)) * polyPart;
    }

    let Iarc = 0;
    let Iarc1, Iarc2, Iarc3;
    if (voltage > 600) {
        // Calculate at 600V, 2700V, 14300V
        const V1 = 600, V2 = 2700, V3 = 14300;
        const c1 = coeffs[electrodeConfig].V600;
        const c2 = coeffs[electrodeConfig].V2700;
        const c3 = coeffs[electrodeConfig].V14300;
        Iarc1 = calcLogIarc(faultCurrent, V1, electrodeGap, height, width, c1);
        Iarc2 = calcLogIarc(faultCurrent, V2, electrodeGap, height, width, c2);
        Iarc3 = calcLogIarc(faultCurrent, V3, electrodeGap, height, width, c3);

        // Interpolate using Equations 16, 17, 18 and Section 4.9
        if (voltage <= 2700) {
            Iarc = Iarc1 + (Iarc2 - Iarc1) * (voltage - V1) / (V2 - V1);
        } else {
            Iarc = Iarc2 + (Iarc3 - Iarc2) * (voltage - V2) / (V3 - V2);
        }
    } else {
        // For ≤ 600V, use Equation 1 and Equation 25 (Section 4.10)
        const cLow = coeffs[electrodeConfig].V600;
        const logIarc = calcLogIarc(faultCurrent, voltage, electrodeGap, height, width, cLow);
        let IarcEq1 = logIarc;
        Iarc = IarcEq1;
        Iarc1 = Iarc; // for E_600
    }

    // --- Arcing current variation correction factor ---
    const VarCf = calcVarCf(electrodeConfig, voltage);
    const Iarc_min = Iarc * (1 - 0.5 * VarCf);

    // --- Intermediate incident energy and AFB calculation ---
    let E_600 = 0, E_2700 = 0, E_14300 = 0, E_le600 = 0;
    let AFB_600 = 0, AFB_2700 = 0, AFB_14300 = 0, AFB_le600 = 0;
    if (voltage > 600) {
        E_600 = calcIntermediateEnergy(Iarc1, electrodeGap, arcDurationNormal * 1000, workingDistance, energyCoeffs.V600[electrodeConfig], workingDistance, CF);
        E_2700 = calcIntermediateEnergy(Iarc2, electrodeGap, arcDurationNormal * 1000, workingDistance, energyCoeffs.V2700[electrodeConfig], workingDistance, CF);
        E_14300 = calcIntermediateEnergy(Iarc3, electrodeGap, arcDurationNormal * 1000, workingDistance, energyCoeffs.V14300[electrodeConfig], workingDistance, CF);

        AFB_600 = calcIntermediateAFB(Iarc1, electrodeGap, arcDurationNormal * 1000, energyCoeffs.V600[electrodeConfig], CF);
        AFB_2700 = calcIntermediateAFB(Iarc2, electrodeGap, arcDurationNormal * 1000, energyCoeffs.V2700[electrodeConfig], CF);
        AFB_14300 = calcIntermediateAFB(Iarc3, electrodeGap, arcDurationNormal * 1000, energyCoeffs.V14300[electrodeConfig], CF);
    } else {
        E_le600 = calcIntermediateEnergy(Iarc1, electrodeGap, arcDurationNormal * 1000, workingDistance, energyCoeffs.V600[electrodeConfig], workingDistance, CF);
        AFB_le600 = calcIntermediateAFB(Iarc1, electrodeGap, arcDurationNormal * 1000, energyCoeffs.V600[electrodeConfig], CF);
    }

    // --- Final values using IEEE 1584 interpolation equations ---
    let finalIarc = 0, finalE = 0, finalAFB = 0;
    const V_kV = voltage / 1000;

    if (voltage > 600) {
        if (V_kV <= 2.7) {
            finalIarc = Iarc1 + (Iarc2 - Iarc1) * (V_kV - 0.6) / (2.1);
            finalE = E_600 + (E_2700 - E_600) * (V_kV - 0.6) / (2.1);
            finalAFB = AFB_600 + (AFB_2700 - AFB_600) * (V_kV - 0.6) / (2.1);
        } else {
            finalIarc = Iarc2 + (Iarc3 - Iarc2) * (V_kV - 2.7) / (11.6);
            finalE = E_2700 + (E_14300 - E_2700) * (V_kV - 2.7) / (11.6);
            finalAFB = AFB_2700 + (AFB_14300 - AFB_2700) * (V_kV - 2.7) / (11.6);
        }
    } else {
        finalIarc = Iarc1;
        finalE = E_le600;
        finalAFB = AFB_le600;
    }

    // Convert incident energy from J/cm² to cal/cm² (1 cal = 4.184 J)
    finalE = finalE / 4.184;

    // --- Display results ---
    document.getElementById('incidentEnergy').textContent = finalE.toFixed(2);
    displayArcFlashBoundary(Math.round(finalAFB * 10) / 10);

    drawChart(finalE);

    // --- Output calculation steps for user verification ---
    let resultsPanel = document.querySelector('.output-panel');
    if (!resultsPanel) return;

    // Remove previous details if any
    let detailsElem = document.getElementById('calcDetails');
    if (detailsElem) detailsElem.remove();

    detailsElem = document.createElement('div');
    detailsElem.id = 'calcDetails';
    detailsElem.style.marginTop = '1em';
    detailsElem.innerHTML = `
      <h4>Calculation Details</h4>
      <ul>
        <li><b>Intermediate average arcing currents (kA):</b>
          <ul>
            <li>Iarc@600V: ${Iarc1 ? Iarc1.toFixed(3) : '-'} kA</li>
            <li>Iarc@2700V: ${Iarc2 ? Iarc2.toFixed(3) : '-'} kA</li>
            <li>Iarc@14300V: ${Iarc3 ? Iarc3.toFixed(3) : '-'} kA</li>
            <li>Iarc_min: ${Iarc_min ? Iarc_min.toFixed(3) : '-'} kA</li>
          </ul>
        </li>
        <li><b>Arcing current variation correction factor (VarCf):</b> ${VarCf.toFixed(4)}</li>
        <li><b>Intermediate incident energy (J/cm²):</b>
          <ul>
            <li>E@600V: ${E_600 ? E_600.toFixed(2) : '-'} J/cm²</li>
            <li>E@2700V: ${E_2700 ? E_2700.toFixed(2) : '-'} J/cm²</li>
            <li>E@14300V: ${E_14300 ? E_14300.toFixed(2) : '-'} J/cm²</li>
            <li>E@≤600V: ${E_le600 ? E_le600.toFixed(2) : '-' } J/cm²</li>
          </ul>
        </li>
        <li><b>Intermediate arc flash boundary (mm):</b>
          <ul>
            <li>AFB@600V: ${AFB_600 ? Math.round(AFB_600) : '-'} mm</li>
            <li>AFB@2700V: ${AFB_2700 ? Math.round(AFB_2700) : '-'} mm</li>
            <li>AFB@14300V: ${AFB_14300 ? Math.round(AFB_14300) : '-'} mm</li>
            <li>AFB@≤600V: ${AFB_le600 ? Math.round(AFB_le600) : '-' } mm</li>
          </ul>
        </li>
        <li><b>Enclosure size correction factor (CF):</b> ${CF.toFixed(4)}</li>
      </ul>
    `;
    resultsPanel.appendChild(detailsElem);
} // <-- Make sure this closes the calculateIncidentEnergy function
  
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
  window.addEventListener('DOMContentLoaded', drawDimensionShape);

// Table 2 coefficients for arcing current variation correction factor (VarCf)
const varCfCoeffs = {
    VCB:  { k1: 0,         k2: -0.0000014269, k3: 0.000083137,  k4: -0.0019382,  k5: 0.022366,  k6: -0.12645,  k7: 0.30226 },
    VCBB: { k1: 1.138e-6,  k2: -6.0278e-5,    k3: 0.0012758,    k4: -0.0137738,  k5: 0.080217,  k6: -0.24066,  k7: 0.35324 },
    HCB:  { k1: -3.996e-6, k2: 0.00014605,    k3: -0.003609,    k4: 0.033308,    k5: -0.16182,  k6: 0.34627,   k7: 0.33467 },
    VOA:  { k1: 9.5606e-7, k2: -5.1543e-5,    k3: 0.0011161,    k4: -0.01242,    k5: 0.071525,  k6: -0.23584,  k7: 0.33469 },
    HOA:  { k1: 0,         k2: -3.1555e-6,    k3: 0.0001682,    k4: -0.0034607,  k5: 0.034124,  k6: -0.1599,   k7: 0.34629 }
};

// Table 3, 4, 5: Coefficients for intermediate incident energy equations
const energyCoeffs = {
    V600: {
        VCB:  { K1: 0.753364, K2: 0.566, K3: 1.752636, K4: 0, K5: 0, K6: -4.783e-09, K7: 1.962e-06, K8: -0.000229, K9: 0.003141, K10: 1.092, K11: 0.958, K12: 0.957, K13: 0 },
        VCBB: { K1: 0.084369, K2: 0.36, K3: -0.908171, K4: 0, K5: 0, K6: -5.767e-09, K7: -3.524e-06, K8: -0.00034, K9: 0.01187, K10: 1.013, K11: 0.959, K12: 0.957, K13: 0 },
        HCB:  { K1: 0.473745, K2: 0.344, K3: -0.370529, K4: 0, K5: 0, K6: -5.382e-09, K7: -3.16e-06, K8: -0.000302, K9: 0.001097, K10: 0.9725, K11: 0.975, K12: 0.975, K13: 0 },
        VOA:  { K1: 0.679294, K2: 0.476, K3: 0.194, K4: 0, K5: 0, K6: -4.783e-09, K7: 1.962e-06, K8: -0.000229, K9: 0.003141, K10: 1.092, K11: 0.958, K12: 0.957, K13: 0 },
        HOA:  { K1: 0.470471, K2: 0.445, K3: -0.261663, K4: 0, K5: 0, K6: -3.895e-09, K7: -1.641e-06, K8: -0.000197, K9: 0.006051, K10: 1.1, K11: 1.194, K12: 1.04, K13: 0 }
    },
    V2700: {
        VCB:  { K1: 2.40021, K2: 0.165, K3: 0.354201, K4: 1.4556e-10, K5: -4.186e-08, K6: 3.346e-07, K7: 5.482e-05, K8: -0.003191, K9: -0.001391, K10: 0.9729, K11: 0.579, K12: 0.978, K13: 0 },
        VCBB: { K1: 3.87093, K2: 0.153, K3: -0.763163, K4: 1.901e-08, K5: -3.262e-06, K6: 0.0001569, K7: -0.004003, K8: -0.001391, K9: 0.9825, K10: 0.579, K11: 0.978, K12: 0, K13: 0 },
        HCB:  { K1: 3.86591, K2: 0.177, K3: -0.191301, K4: 4.859e-10, K5: -1.814e-07, K6: -9.128e-06, K7: -0.0007, K8: -0.0007, K9: 0.9881, K10: 1.723, K11: 0.979, K12: 0, K13: 0 },
        VOA:  { K1: 3.61265, K2: 0.149, K3: -0.761561, K4: 7.859e-10, K5: -1.914e-07, K6: -9.128e-06, K7: -0.0007, K8: -0.0007, K9: 0.9981, K10: 1.639, K11: 1.078, K12: 0, K13: 0 },
        HOA:  { K1: 3.61265, K2: 0.149, K3: -0.761561, K4: 7.859e-10, K5: -1.914e-07, K6: -9.128e-06, K7: -0.0007, K8: -0.0007, K9: 0.9981, K10: 1.639, K11: 1.078, K12: 0, K13: 0 }
    },
    V14300: {
        VCB:  { K1: 3.825917, K2: 0.171, K3: -0.999749, K4: -1.557e-12, K5: -4.186e-08, K6: 3.346e-07, K7: 5.482e-05, K8: -0.003191, K9: -1.569, K10: 0.969, K11: 0.969, K12: 0, K13: 0 },
        VCBB: { K1: 3.87093, K2: 0.153, K3: -0.904141, K4: 9.204e-11, K5: -3.262e-06, K6: 0.0001569, K7: -0.004003, K8: -1.569, K9: 0.969, K10: 0.969, K11: 0, K12: 0, K13: 0 },
        HCB:  { K1: 3.044515, K2: 0.125, K3: -1.19103, K4: -5.043e-11, K5: 2.233e-08, K6: -3.046e-06, K7: 0.000116, K8: -0.001145, K9: 1.723, K10: 0.979, K11: 0, K12: 0, K13: 0 },
        VOA:  { K1: 2.04949, K2: 0.213, K3: -1.557e-12, K4: 4.556e-10, K5: -4.186e-08, K6: 3.346e-07, K7: 5.482e-05, K8: -0.003191, K9: 1.151, K10: 0, K11: 0, K12: 0, K13: 0 },
        HOA:  { K1: 2.04949, K2: 0.177, K3: 1.005092, K4: 7.859e-10, K5: -1.914e-07, K6: -9.128e-06, K7: -0.0007, K8: -0.0007, K9: 1.151, K10: 0, K11: 0, K12: 0, K13: 0 }
    }
};

// Calculate VarCf for a given configuration and voltage (V in volts)
function calcVarCf(electrodeConfig, voltage) {
    const V = voltage / 1000; // V_oc in kV
    const c = varCfCoeffs[electrodeConfig];
    if (!c) return 0;
    return c.k1 * Math.pow(V, 6)
         + c.k2 * Math.pow(V, 5)
         + c.k3 * Math.pow(V, 4)
         + c.k4 * Math.pow(V, 3)
         + c.k5 * Math.pow(V, 2)
         + c.k6 * V
         + c.k7;
}

// Calculate intermediate incident energy (J/cm²) per IEEE 1584-2018 4.6
function calcIntermediateEnergy(Iarc, electrodeGap, arcDurationMs, workingDistance, coeffs, D, CF = 1) {
    // E = (12.552 / 50) * T * 10^[ (k1 + k2*lgG + k3*lgIarc + k4*lgD + k5*lgIarc*lgG + k6*lgIarc*lgD + k7*lgG*lgD + k8*(lgIarc)^2 + k9*(lgG)^2 + k10*(lgD)^2 + k11*lgIarc*lgG*lgD + k12*lgIarc^3 + k13*lgG^3) ] * (1/CF)
    // All logs are base 10, T in ms, D in mm, G in mm, Iarc in kA
    const lgG = Math.log10(electrodeGap);
    const lgIarc = Math.log10(Iarc);
    const lgD = Math.log10(D);
    const k = coeffs;
    const exp =
        k.K1 +
        k.K2 * lgG +
        k.K3 * lgIarc +
        k.K4 * lgD +
        (k.K5 || 0) * lgIarc * lgG +
        (k.K6 || 0) * lgIarc * lgD +
        (k.K7 || 0) * lgG * lgD +
        (k.K8 || 0) * Math.pow(lgIarc, 2) +
        (k.K9 || 0) * Math.pow(lgG, 2) +
        (k.K10 || 0) * Math.pow(lgD, 2) +
        (k.K11 || 0) * lgIarc * lgG * lgD +
        (k.K12 || 0) * Math.pow(lgIarc, 3) +
        (k.K13 || 0) * Math.pow(lgG, 3);
    const E = (12.552 / 50) * arcDurationMs * Math.pow(10, exp) * (1 / CF);
    return E;
}

// Calculate intermediate arc-flash boundary (mm) per IEEE 1584-2018 4.7
function calcIntermediateAFB(Iarc, electrodeGap, arcDurationMs, coeffs, CF = 1) {
    // AFB = 10^[ (k1 + k2*lgG + k3*lgIarc + k4*lgT + k5*lgIarc*lgG + k6*lgIarc*lgT + k7*lgG*lgT + k8*(lgIarc)^2 + k9*(lgG)^2 + k10*(lgT)^2 + k11*lgIarc*lgG*lgT + k12*lgIarc^3 + k13*lgG^3) + lg(1/CF) + lg(70) - lg(T) ]
    // All logs are base 10, T in ms, G in mm, Iarc in kA
    const lgG = Math.log10(electrodeGap);
    const lgIarc = Math.log10(Iarc);
    const lgT = Math.log10(arcDurationMs);
    const k = coeffs;
    const exp =
        k.K1 +
        k.K2 * lgG +
        k.K3 * lgIarc +
        k.K4 * lgT +
        (k.K5 || 0) * lgIarc * lgG +
        (k.K6 || 0) * lgIarc * lgT +
        (k.K7 || 0) * lgG * lgT +
        (k.K8 || 0) * Math.pow(lgIarc, 2) +
        (k.K9 || 0) * Math.pow(lgG, 2) +
        (k.K10 || 0) * Math.pow(lgT, 2) +
        (k.K11 || 0) * lgIarc * lgG * lgT +
        (k.K12 || 0) * Math.pow(lgIarc, 3) +
        (k.K13 || 0) * Math.pow(lgG, 3)
        + Math.log10(1 / CF)
        + Math.log10(70)
        - lgT;
    return Math.pow(10, exp);
}

// Table 7 coefficients for enclosure size correction factor (CF)
const enclosureCFTable = {
    Typical: {
        VCB:  { b1: -0.000302, b2: 0.03441, b3: 0.4325 },
        VCBB: { b1: -0.0002976, b2: 0.032, b3: 0.479 },
        HCB:  { b1: 0.0002193, b2: 0.01935, b3: 0.6899 }
    },
    Shallow: {
        VCB:  { b1: 0.0002222, b2: -0.025556, b3: 0.6 },
        VCBB: { b1: -0.002778, b2: 0.1194, b3: 0.2778 },
        HCB:  { b1: -0.0005556, b2: 0.03722, b3: 0.4778 }
    }
};

// Determine enclosure type ("Typical" or "Shallow")
function getEnclosureType(voltage, height, width, depth) {
    if (
        voltage < 600 &&
        height < 508 &&
        width < 508 &&
        depth <= 203.2
    ) {
        return "Shallow";
    }
    return "Typical";
}

// Determine equivalent height and width per Table 6, 4.8.3
function getEquivalentDimension(actual, voltage, config, isHeight) {
    // VCB: B=20, VCBB: B=24, HCB: B=22, A=4 for VCB, A=10 for VCBB/HCB
    let B = 20, A = 4;
    if (config === "VCBB") { B = 24; A = 10; }
    if (config === "HCB") { B = 22; A = 10; }
    const V_kV = voltage / 1000;

    if (actual < 508) {
        return 20;
    } else if (actual >= 508 && actual <= 660.4) {
        return 0.03937 * actual;
    } else if (actual > 660.4 && actual <= 1244.6) {
        // Use Equation 11/12
        return (660.4 + (actual - 660.4) * ((V_kV + A) / B)) / 25.4;
    } else {
        // >1244.6
        return isHeight ? 49 : 49; // 1244.6mm/25.4 = 49 in
    }
}

// Calculate equivalent enclosure size (EES)
function getEES(eqHeight, eqWidth) {
    return (eqHeight + eqWidth) / 2;
}

// Calculate enclosure size correction factor (CF)
function calcEnclosureCF(type, config, EES) {
    const c = enclosureCFTable[type][config];
    if (!c) return 1;
    if (type === "Typical") {
        return c.b1 * EES * EES + c.b2 * EES + c.b3;
    } else {
        return 1 / (c.b1 * EES * EES + c.b2 * EES + c.b3);
    }
}
