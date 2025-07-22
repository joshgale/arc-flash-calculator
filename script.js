function calculateIncidentEnergy() {
    const distance = parseFloat(document.getElementById("workingDistance").value) / 10; // mm to cm
    const current = parseFloat(document.getElementById("faultCurrent").value); // kA
    const time = parseFloat(document.getElementById("arcDuration").value); // s
  
    // Simplified IEEE-style calculation
    const energy = 0.012 * current * current * time / Math.pow(distance, 1.5);
  
    document.getElementById("incidentEnergy").innerText = energy.toFixed(2);
  
    drawChart(energy);
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
  