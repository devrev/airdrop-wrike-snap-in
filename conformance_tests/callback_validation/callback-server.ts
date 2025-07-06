import express from 'express';
import { Server } from 'http';

export interface CallbackData {
  timestamp: string;
  [key: string]: any;
}

export class CallbackServer {
  private app = express();
  private server: Server | null = null;
  private receivedData: CallbackData[] = [];
  private port: number;
  private shouldFail: boolean = false;

  constructor(port: number = 8002) {
    this.port = port;
    this.app.use(express.json());
    
    this.app.post('*', (req, res) => {
      if (this.shouldFail) {
        console.log('Callback server simulating failure with 500 status');
        res.status(500).json({ error: 'Simulated server error' });
        return;
      }
      
      const data = req.body;
      this.receivedData.push(data);
      console.log('Callback server received data:', JSON.stringify(data));
      console.log('Callback server responding with 200 status');
      res.status(200).json({ success: true });
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Callback server started and listening on port ${this.port}`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      
      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.server = null;
          console.log('Callback server stopped');
          resolve();
        }
      });
    });
  }

  public getReceivedData(): CallbackData[] {
    return [...this.receivedData];
  }

  public clearReceivedData(): void {
    this.receivedData = [];
  }

  public simulateFailure(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  public getCallbackUrl(): string {
    return `http://localhost:${this.port}/callback`;
  }
}