class DatabricksService {
  constructor() {
    // Configuration for Databricks SQL warehouse connection
    this.config = {
      serverHostname: process.env.REACT_APP_DATABRICKS_HOST || '',
      httpPath: process.env.REACT_APP_DATABRICKS_HTTP_PATH || '',
      token: process.env.REACT_APP_DATABRICKS_TOKEN || '',
      catalog: process.env.REACT_APP_DATABRICKS_CATALOG || 'main',
      schema: process.env.REACT_APP_DATABRICKS_SCHEMA || 'default',
      tableName: process.env.REACT_APP_DATABRICKS_TABLE || 'sensor_bronze_table'
    };
    
    this.tableFullName = `${this.config.catalog}.${this.config.schema}.${this.config.tableName}`;
  }

  async executeQuery(query) {
    const url = `https://${this.config.serverHostname}/api/2.0/sql/statements/`;
    
    const requestBody = {
      statement: query,
      warehouse_id: this.extractWarehouseId(this.config.httpPath),
      wait_timeout: "30s",
      on_wait_timeout: "CONTINUE"
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status?.state === 'SUCCEEDED') {
        return result.result;
      } else if (result.status?.state === 'FAILED') {
        throw new Error(result.status.error?.message || 'Query failed');
      } else {
        // Query is still running, wait for completion
        return await this.waitForCompletion(result.statement_id);
      }
    } catch (error) {
      console.error('Error executing Databricks query:', error);
      throw error;
    }
  }

  async waitForCompletion(statementId) {
    const url = `https://${this.config.serverHostname}/api/2.0/sql/statements/${statementId}`;
    
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          }
        });

        const result = await response.json();
        
        if (result.status?.state === 'SUCCEEDED') {
          return result.result;
        } else if (result.status?.state === 'FAILED') {
          throw new Error(result.status.error?.message || 'Query failed');
        }
        
        // Wait 1 second before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('Error checking query status:', error);
        throw error;
      }
    }
    
    throw new Error('Query timed out');
  }

  extractWarehouseId(httpPath) {
    // Extract warehouse ID from path like "/sql/1.0/warehouses/abc123def456"
    const match = httpPath.match(/\/warehouses\/([^/]+)/);
    return match ? match[1] : '';
  }

  async fetchLatestTelemetry() {
    const query = `
      SELECT 
        component_id,
        sensor_temperature as sensorAReading,
        sensor_pressure as sensorBReading, 
        sensor_vibration as sensorCReading,
        sensor_speed as sensorDReading,
        timestamp
      FROM (
        SELECT *,
               ROW_NUMBER() OVER (PARTITION BY component_id ORDER BY timestamp DESC) as rn
        FROM ${this.tableFullName}
        WHERE timestamp >= date_sub(current_timestamp(), INTERVAL 1 HOUR)
      ) t
      WHERE rn = 1
    `;

    try {
      const result = await this.executeQuery(query);
      
      if (result?.data_array) {
        return result.data_array.map(row => ({
          componentID: row[0],
          sensorAReading: parseFloat(row[1]) || 0.0,
          sensorBReading: parseFloat(row[2]) || 0.0,
          sensorCReading: parseFloat(row[3]) || 0.0,
          sensorDReading: parseFloat(row[4]) || 0.0,
          timestamp: row[5]
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching latest telemetry:', error);
      return [];
    }
  }

  async fetchComponentTelemetry(componentId, hoursBack = 24) {
    const query = `
      SELECT 
        component_id,
        sensor_temperature as sensorAReading,
        sensor_pressure as sensorBReading,
        sensor_vibration as sensorCReading,
        sensor_speed as sensorDReading,
        timestamp
      FROM ${this.tableFullName}
      WHERE component_id = '${componentId}'
      AND timestamp >= date_sub(current_timestamp(), INTERVAL ${hoursBack} HOUR)
      ORDER BY timestamp DESC
      LIMIT 1000
    `;

    try {
      const result = await this.executeQuery(query);
      
      if (result?.data_array) {
        return result.data_array.map(row => ({
          componentID: row[0],
          sensorAReading: parseFloat(row[1]) || 0.0,
          sensorBReading: parseFloat(row[2]) || 0.0,
          sensorCReading: parseFloat(row[3]) || 0.0,
          sensorDReading: parseFloat(row[4]) || 0.0,
          timestamp: row[5]
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching component telemetry:', error);
      return [];
    }
  }

  async fetchTelemetryByTimeRange(startTime, endTime) {
    const query = `
      SELECT 
        component_id,
        sensor_temperature as sensorAReading,
        sensor_pressure as sensorBReading,
        sensor_vibration as sensorCReading,
        sensor_speed as sensorDReading,
        timestamp
      FROM ${this.tableFullName}
      WHERE timestamp >= '${startTime}'
      AND timestamp <= '${endTime}'
      ORDER BY timestamp DESC
      LIMIT 10000
    `;

    try {
      const result = await this.executeQuery(query);
      
      if (result?.data_array) {
        return result.data_array.map(row => ({
          componentID: row[0],
          sensorAReading: parseFloat(row[1]) || 0.0,
          sensorBReading: parseFloat(row[2]) || 0.0,
          sensorCReading: parseFloat(row[3]) || 0.0,
          sensorDReading: parseFloat(row[4]) || 0.0,
          timestamp: row[5]
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching telemetry by time range:', error);
      return [];
    }
  }

  isConfigured() {
    return !!(this.config.serverHostname && 
              this.config.httpPath && 
              this.config.token);
  }
}

export default DatabricksService;