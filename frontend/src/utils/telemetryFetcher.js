export class TelemetryFetcher {
  constructor() {
    this.mockData = this.generateMockTelemetryData();
  }

  generateMockTelemetryData() {
    const components = ['component11', 'component12', 'component21', 'component22'];
    const data = [];
    
    const now = new Date();
    
    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(now.getTime() - (i * 60000));
      
      components.forEach(componentID => {
        data.push({
          componentID,
          sensorAReading: Math.random() * 120,
          sensorBReading: Math.random() * 80,
          sensorCReading: Math.random() * 150,
          sensorDReading: Math.random() * 90,
          timestamp: timestamp.toISOString()
        });
      });
    }
    
    return data;
  }

  async fetchLatestTelemetry(componentID) {
    await this.simulateDelay();
    
    const componentData = this.mockData
      .filter(data => data.componentID === componentID)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return componentData[0] || null;
  }

  async fetchHistoricalTelemetry(componentID, startTime, endTime) {
    await this.simulateDelay();
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return this.mockData
      .filter(data => {
        const dataTime = new Date(data.timestamp);
        return data.componentID === componentID && 
               dataTime >= start && 
               dataTime <= end;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async fetchAllLatestTelemetry() {
    await this.simulateDelay();
    
    const latest = {};
    
    this.mockData.forEach(data => {
      if (!latest[data.componentID] || 
          new Date(data.timestamp) > new Date(latest[data.componentID].timestamp)) {
        latest[data.componentID] = data;
      }
    });
    
    return Object.values(latest);
  }

  async fetchTelemetryByTimeRange(startTime, endTime) {
    await this.simulateDelay();
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    return this.mockData
      .filter(data => {
        const dataTime = new Date(data.timestamp);
        return dataTime >= start && dataTime <= end;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  simulateDelay() {
    return new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
  }

  getSensorDefinitions() {
    return {
      sensorAReading: { label: 'Temperature', unit: '°C', min: 0, max: 120 },
      sensorBReading: { label: 'Pressure', unit: 'PSI', min: 0, max: 80 },
      sensorCReading: { label: 'Vibration', unit: 'Hz', min: 0, max: 150 },
      sensorDReading: { label: 'Speed', unit: 'RPM', min: 0, max: 90 }
    };
  }

  getHealthThresholds() {
    return {
      sensorAReading: { warning: 90, critical: 100 },
      sensorBReading: { warning: 60, critical: 70 },
      sensorCReading: { warning: 120, critical: 140 },
      sensorDReading: { warning: 75, critical: 85 }
    };
  }

  analyzeSensorHealth(sensorValue, sensorType) {
    const thresholds = this.getHealthThresholds()[sensorType];
    if (!thresholds) return 'unknown';
    
    if (sensorValue >= thresholds.critical) return 'critical';
    if (sensorValue >= thresholds.warning) return 'warning';
    return 'healthy';
  }

  getComponentHealth(telemetryData) {
    if (!telemetryData) return 'unknown';
    
    const sensors = ['sensorAReading', 'sensorBReading', 'sensorCReading', 'sensorDReading'];
    const healthLevels = sensors.map(sensor => 
      this.analyzeSensorHealth(telemetryData[sensor], sensor)
    );
    
    if (healthLevels.includes('critical')) return 'critical';
    if (healthLevels.includes('warning')) return 'warning';
    return 'healthy';
  }
}