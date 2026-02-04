import { io as ioClient, Socket } from "socket.io-client";
import { httpServer } from "../../index";
import { setupIntegrationTests, teardownIntegrationTests } from "./setup";

describe("WebSocket Integration Tests", () => {
  let clientSocket: Socket;
  let serverPort: number;

  beforeAll(async () => {
    await setupIntegrationTests();

    // Start server on random port for testing
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        if (address && typeof address === "object") {
          serverPort = address.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.close();
    }

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });

    await teardownIntegrationTests();
  });

  beforeEach((done) => {
    clientSocket = ioClient(`http://localhost:${serverPort}`);
    clientSocket.on("connect", done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.close();
    }
  });

  describe("Connection", () => {
    it("should connect to WebSocket server", (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it("should disconnect gracefully", (done) => {
      clientSocket.on("disconnect", () => {
        expect(clientSocket.connected).toBe(false);
        done();
      });

      clientSocket.close();
    });

    it("should reconnect after disconnect", (done) => {
      let reconnected = false;

      clientSocket.on("reconnect", () => {
        reconnected = true;
        expect(clientSocket.connected).toBe(true);
        done();
      });

      // Force disconnect
      clientSocket.io.engine.close();

      // Wait for reconnection
      setTimeout(() => {
        if (!reconnected) {
          done(new Error("Failed to reconnect"));
        }
      }, 5000);
    });
  });

  describe("Room Management", () => {
    it("should join project room", (done) => {
      const projectId = "test-project-123";

      clientSocket.emit("join-project", projectId);

      clientSocket.on("joined-project", (data) => {
        expect(data.projectId).toBe(projectId);
        done();
      });
    });

    it("should leave project room", (done) => {
      const projectId = "test-project-123";

      clientSocket.emit("join-project", projectId);

      clientSocket.on("joined-project", () => {
        clientSocket.emit("leave-project", projectId);

        clientSocket.on("left-project", (data) => {
          expect(data.projectId).toBe(projectId);
          done();
        });
      });
    });

    it("should receive messages only in joined room", (done) => {
      const projectId1 = "project-1";
      const projectId2 = "project-2";

      let messagesReceived = 0;

      clientSocket.emit("join-project", projectId1);

      clientSocket.on("progress-update", (data) => {
        messagesReceived++;
        expect(data.projectId).toBe(projectId1);

        if (messagesReceived === 1) {
          done();
        }
      });

      // Simulate server sending message to project-1
      setTimeout(() => {
        clientSocket.emit("test-broadcast", {
          room: `project:${projectId1}`,
          message: { type: "progress-update", projectId: projectId1 },
        });
      }, 100);
    });
  });

  describe("Progress Updates", () => {
    it("should receive progress updates", (done) => {
      const projectId = "test-project-123";

      clientSocket.emit("join-project", projectId);

      clientSocket.on("progress-update", (data) => {
        expect(data).toHaveProperty("agentName");
        expect(data).toHaveProperty("status");
        expect(data).toHaveProperty("message");
        done();
      });

      // Simulate progress update
      setTimeout(() => {
        clientSocket.emit("test-progress", {
          projectId,
          agentName: "SpecificationAgent",
          status: "in_progress",
          message: "Analyzing specification...",
        });
      }, 100);
    });

    it("should receive error notifications", (done) => {
      const projectId = "test-project-123";

      clientSocket.emit("join-project", projectId);

      clientSocket.on("error-notification", (data) => {
        expect(data).toHaveProperty("error");
        expect(data).toHaveProperty("severity");
        done();
      });

      // Simulate error
      setTimeout(() => {
        clientSocket.emit("test-error", {
          projectId,
          error: "Test error",
          severity: "critical",
        });
      }, 100);
    });

    it("should receive completion notification", (done) => {
      const projectId = "test-project-123";

      clientSocket.emit("join-project", projectId);

      clientSocket.on("generation-complete", (data) => {
        expect(data).toHaveProperty("projectId");
        expect(data).toHaveProperty("readinessScore");
        done();
      });

      // Simulate completion
      setTimeout(() => {
        clientSocket.emit("test-complete", {
          projectId,
          readinessScore: 85,
        });
      }, 100);
    });
  });

  describe("Multiple Clients", () => {
    let client2: Socket;

    afterEach(() => {
      if (client2 && client2.connected) {
        client2.close();
      }
    });

    it("should broadcast to all clients in room", (done) => {
      const projectId = "test-project-123";
      let client1Received = false;
      let client2Received = false;

      // Connect second client
      client2 = ioClient(`http://localhost:${serverPort}`);

      client2.on("connect", () => {
        // Both clients join same room
        clientSocket.emit("join-project", projectId);
        client2.emit("join-project", projectId);

        clientSocket.on("progress-update", () => {
          client1Received = true;
          checkBothReceived();
        });

        client2.on("progress-update", () => {
          client2Received = true;
          checkBothReceived();
        });

        // Broadcast message
        setTimeout(() => {
          clientSocket.emit("test-broadcast", {
            room: `project:${projectId}`,
            message: { type: "progress-update" },
          });
        }, 200);
      });

      function checkBothReceived() {
        if (client1Received && client2Received) {
          done();
        }
      }
    });

    it("should not broadcast to clients in different rooms", (done) => {
      const projectId1 = "project-1";
      const projectId2 = "project-2";

      let client1Received = false;
      let client2Received = false;

      client2 = ioClient(`http://localhost:${serverPort}`);

      client2.on("connect", () => {
        // Clients join different rooms
        clientSocket.emit("join-project", projectId1);
        client2.emit("join-project", projectId2);

        clientSocket.on("progress-update", () => {
          client1Received = true;
        });

        client2.on("progress-update", () => {
          client2Received = true;
        });

        // Broadcast to project-1 only
        setTimeout(() => {
          clientSocket.emit("test-broadcast", {
            room: `project:${projectId1}`,
            message: { type: "progress-update" },
          });
        }, 200);

        // Check results after delay
        setTimeout(() => {
          expect(client1Received).toBe(true);
          expect(client2Received).toBe(false);
          done();
        }, 500);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid room names", (done) => {
      clientSocket.emit("join-project", "");

      clientSocket.on("error", (error) => {
        expect(error).toBeTruthy();
        done();
      });

      setTimeout(() => {
        done(new Error("No error received"));
      }, 1000);
    });

    it("should handle connection errors", (done) => {
      const badClient = ioClient("http://localhost:9999", {
        reconnection: false,
      });

      badClient.on("connect_error", (error) => {
        expect(error).toBeTruthy();
        badClient.close();
        done();
      });
    });
  });

  describe("Message Format", () => {
    it("should send messages in correct format", (done) => {
      const projectId = "test-project-123";

      clientSocket.emit("join-project", projectId);

      clientSocket.on("progress-update", (data) => {
        expect(data).toHaveProperty("timestamp");
        expect(data).toHaveProperty("agentName");
        expect(data).toHaveProperty("status");
        expect(data).toHaveProperty("message");
        expect(["started", "in_progress", "completed", "failed"]).toContain(
          data.status,
        );
        done();
      });

      setTimeout(() => {
        clientSocket.emit("test-progress", {
          projectId,
          agentName: "TestAgent",
          status: "in_progress",
          message: "Test message",
        });
      }, 100);
    });
  });
});
