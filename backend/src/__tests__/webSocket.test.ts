/**
 * WebSocket Service tests
 */

import { createServer } from "http";
import { WebSocketService } from "../services/WebSocketService";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";

describe("WebSocket Service", () => {
  let httpServer: any;
  let wsService: WebSocketService;
  let serverPort: number;
  let clientSocket: ClientSocket;

  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();
    wsService = new WebSocketService();
    wsService.initialize(httpServer);

    // Start server on random port
    httpServer.listen(0, () => {
      serverPort = httpServer.address().port;
      done();
    });
  });

  afterAll((done) => {
    wsService.close();
    httpServer.close(done);
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe("Connection Management", () => {
    it("should accept client connections", (done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "test-project-1" },
      });

      clientSocket.on("connected", (data: any) => {
        expect(data.projectId).toBe("test-project-1");
        expect(data.message).toBeDefined();
        expect(wsService.getConnectedClientsCount("test-project-1")).toBe(1);
        done();
      });
    });

    it("should track multiple clients for same project", (done) => {
      const client1 = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "test-project-2" },
      });

      const client2 = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "test-project-2" },
      });

      let connectedCount = 0;

      const checkConnections = () => {
        connectedCount++;
        if (connectedCount === 2) {
          expect(wsService.getConnectedClientsCount("test-project-2")).toBe(2);
          client1.disconnect();
          client2.disconnect();
          done();
        }
      };

      client1.on("connected", checkConnections);
      client2.on("connected", checkConnections);
    });

    it("should handle client disconnection", (done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "test-project-3" },
      });

      clientSocket.on("connected", () => {
        expect(wsService.getConnectedClientsCount("test-project-3")).toBe(1);

        clientSocket.disconnect();

        setTimeout(() => {
          expect(wsService.getConnectedClientsCount("test-project-3")).toBe(0);
          done();
        }, 100);
      });
    });

    it("should respond to ping with pong", (done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "test-project-4" },
      });

      clientSocket.on("connected", () => {
        clientSocket.emit("ping");
      });

      clientSocket.on("pong", (data: any) => {
        expect(data.timestamp).toBeDefined();
        done();
      });
    });
  });

  describe("Progress Updates", () => {
    beforeEach((done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "test-project-progress" },
      });

      clientSocket.on("connected", () => {
        done();
      });
    });

    it("should send progress updates to project room", (done) => {
      clientSocket.on("message", (message: any) => {
        expect(message.type).toBe("progress");
        expect(message.payload.agentName).toBe("Test Agent");
        expect(message.payload.status).toBe("in_progress");
        expect(message.payload.message).toBe("Processing...");
        done();
      });

      wsService.sendProgress("test-project-progress", {
        timestamp: new Date().toISOString(),
        agentName: "Test Agent",
        status: "in_progress",
        message: "Processing...",
      });
    });

    it("should send agent started notification", (done) => {
      clientSocket.on("message", (message: any) => {
        expect(message.type).toBe("progress");
        expect(message.payload.status).toBe("started");
        expect(message.payload.agentName).toBe("Specification Agent");
        done();
      });

      wsService.sendAgentStarted(
        "test-project-progress",
        "Specification Agent",
        "Starting analysis...",
      );
    });

    it("should send agent progress notification with details", (done) => {
      clientSocket.on("message", (message: any) => {
        expect(message.type).toBe("progress");
        expect(message.payload.status).toBe("in_progress");
        expect(message.payload.details).toEqual({ protocol: "AXI" });
        done();
      });

      wsService.sendAgentProgress(
        "test-project-progress",
        "RTL Agent",
        "Detected protocol",
        { protocol: "AXI" },
      );
    });

    it("should send agent completed notification", (done) => {
      clientSocket.on("message", (message: any) => {
        expect(message.type).toBe("progress");
        expect(message.payload.status).toBe("completed");
        done();
      });

      wsService.sendAgentCompleted(
        "test-project-progress",
        "Alignment Agent",
        "Alignment complete",
      );
    });

    it("should send agent failed notification", (done) => {
      clientSocket.on("message", (message: any) => {
        expect(message.type).toBe("progress");
        expect(message.payload.status).toBe("failed");
        done();
      });

      wsService.sendAgentFailed(
        "test-project-progress",
        "Generator Agent",
        "Generation failed",
      );
    });
  });

  describe("Error Notifications", () => {
    beforeEach((done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "test-project-error" },
      });

      clientSocket.on("connected", () => {
        done();
      });
    });

    it("should send error notifications", (done) => {
      clientSocket.on("message", (message: any) => {
        expect(message.type).toBe("error");
        expect(message.payload.severity).toBe("error");
        expect(message.payload.agentName).toBe("Test Agent");
        expect(message.payload.message).toBe("Test error");
        expect(message.payload.recoverable).toBe(true);
        done();
      });

      wsService.sendError("test-project-error", {
        timestamp: new Date().toISOString(),
        agentName: "Test Agent",
        severity: "error",
        message: "Test error",
        recoverable: true,
      });
    });
  });

  describe("Completion Notifications", () => {
    beforeEach((done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "test-project-complete" },
      });

      clientSocket.on("connected", () => {
        done();
      });
    });

    it("should send completion notifications", (done) => {
      clientSocket.on("message", (message: any) => {
        expect(message.type).toBe("complete");
        expect(message.payload.success).toBe(true);
        expect(message.payload.generatedFiles).toBe(24);
        done();
      });

      wsService.sendComplete("test-project-complete", {
        timestamp: new Date().toISOString(),
        success: true,
        generatedFiles: 24,
        message: "Generation complete",
      });
    });
  });

  describe("Statistics", () => {
    it("should track connected clients count", (done) => {
      const client1 = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "test-project-stats" },
      });

      const client2 = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "test-project-stats" },
      });

      let connectedCount = 0;

      const checkStats = () => {
        connectedCount++;
        if (connectedCount === 2) {
          expect(wsService.getConnectedClientsCount("test-project-stats")).toBe(
            2,
          );
          expect(wsService.getTotalConnectedClients()).toBeGreaterThanOrEqual(
            2,
          );
          expect(wsService.hasConnectedClients("test-project-stats")).toBe(
            true,
          );

          client1.disconnect();
          client2.disconnect();
          done();
        }
      };

      client1.on("connected", checkStats);
      client2.on("connected", checkStats);
    });

    it("should list connected projects", (done) => {
      const client1 = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "project-a" },
      });

      const client2 = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "project-b" },
      });

      let connectedCount = 0;

      const checkProjects = () => {
        connectedCount++;
        if (connectedCount === 2) {
          const projects = wsService.getConnectedProjects();
          expect(projects).toContain("project-a");
          expect(projects).toContain("project-b");

          client1.disconnect();
          client2.disconnect();
          done();
        }
      };

      client1.on("connected", checkProjects);
      client2.on("connected", checkProjects);
    });
  });

  describe("Project Management", () => {
    it("should disconnect all clients from a project", (done) => {
      const client1 = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "test-project-disconnect" },
      });

      const client2 = ioClient(`http://localhost:${serverPort}`, {
        query: { projectId: "test-project-disconnect" },
      });

      let connectedCount = 0;
      let disconnectedCount = 0;

      const checkConnections = () => {
        connectedCount++;
        if (connectedCount === 2) {
          expect(
            wsService.getConnectedClientsCount("test-project-disconnect"),
          ).toBe(2);

          // Disconnect all clients
          wsService.disconnectProject("test-project-disconnect");
        }
      };

      const checkDisconnections = () => {
        disconnectedCount++;
        if (disconnectedCount === 2) {
          setTimeout(() => {
            expect(
              wsService.getConnectedClientsCount("test-project-disconnect"),
            ).toBe(0);
            done();
          }, 100);
        }
      };

      client1.on("connected", checkConnections);
      client2.on("connected", checkConnections);
      client1.on("disconnect", checkDisconnections);
      client2.on("disconnect", checkDisconnections);
    });
  });
});
